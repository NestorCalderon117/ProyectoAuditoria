"""
Worker de sincronizacion de Azure Blob Storage para HealthTech.
Valida que las claves de imagen guardadas en la base de datos existan en Azure Blob Storage.
"""

import logging
import os
import sys
import time
from datetime import datetime, timedelta, timezone

import pymysql
from azure.core.exceptions import AzureError, ResourceNotFoundError
from azure.storage.blob import BlobSasPermissions, BlobServiceClient, generate_blob_sas
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("blob_worker")

# Configuracion principal del worker
AZURE_STORAGE_ACCOUNT = os.environ.get("AZURE_STORAGE_ACCOUNT", "imageneshealthtech2026")
AZURE_STORAGE_KEY = os.environ.get("AZURE_STORAGE_KEY", "")
AZURE_CONTAINER_NAME = os.environ.get("AZURE_CONTAINER_NAME", "medical-images")
AZURE_CONNECTION_STRING = os.environ.get("AZURE_CONNECTION_STRING", "")
DATABASE_URL = os.environ.get("DATABASE_URL", "")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL_SECONDS", "30"))
SAS_TOKEN_EXPIRY_MINUTES = int(os.environ.get("SAS_TOKEN_EXPIRY_MINUTES", "15"))


def get_db_connection():
    """Parsea DATABASE_URL y retorna una conexion pymysql."""
    # Formato esperado: mysql+pymysql://user:pass@host:port/dbname
    url = DATABASE_URL.replace("mysql+pymysql://", "")
    userpass, hostdb = url.split("@", 1)
    user, password = userpass.split(":", 1)
    hostport, dbname = hostdb.split("/", 1)
    host, port = hostport.split(":", 1) if ":" in hostport else (hostport, "3306")

    return pymysql.connect(
        host=host,
        port=int(port),
        user=user,
        password=password,
        database=dbname,
        cursorclass=pymysql.cursors.DictCursor,
    )


def get_blob_service_client():
    """Crea un cliente de Azure Blob Service con las credenciales configuradas."""
    # Prioridad 1: usar connection string completa si fue provista.
    if AZURE_CONNECTION_STRING:
        return BlobServiceClient.from_connection_string(AZURE_CONNECTION_STRING)

    # Prioridad 2: construir connection string desde cuenta + clave.
    if AZURE_STORAGE_KEY:
        connection_string = (
            "DefaultEndpointsProtocol=https;"
            f"AccountName={AZURE_STORAGE_ACCOUNT};"
            f"AccountKey={AZURE_STORAGE_KEY};"
            "EndpointSuffix=core.windows.net"
        )
        return BlobServiceClient.from_connection_string(connection_string)

    logger.error("Debe configurarse AZURE_CONNECTION_STRING o AZURE_STORAGE_KEY.")
    sys.exit(1)


def ensure_container_exists(blob_service_client: BlobServiceClient):
    """Asegura que el contenedor de Azure exista con acceso privado."""
    container_client = blob_service_client.get_container_client(AZURE_CONTAINER_NAME)
    try:
        container_client.get_container_properties()
        logger.info("Contenedor '%s' verificado.", AZURE_CONTAINER_NAME)
    except ResourceNotFoundError:
        logger.info("Creando contenedor '%s'...", AZURE_CONTAINER_NAME)
        blob_service_client.create_container(name=AZURE_CONTAINER_NAME, public_access=None)
        logger.info("Contenedor '%s' creado con acceso privado.", AZURE_CONTAINER_NAME)


def generate_sas_url(blob_name: str, expiry_minutes: int = SAS_TOKEN_EXPIRY_MINUTES) -> str:
    """Genera una URL SAS de solo lectura para un blob."""
    if not AZURE_STORAGE_KEY:
        logger.error("AZURE_STORAGE_KEY es requerido para generar URLs SAS.")
        return ""

    sas_token = generate_blob_sas(
        account_name=AZURE_STORAGE_ACCOUNT,
        container_name=AZURE_CONTAINER_NAME,
        blob_name=blob_name,
        account_key=AZURE_STORAGE_KEY,
        permission=BlobSasPermissions(read=True),
        expiry=datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes),
    )

    return (
        f"https://{AZURE_STORAGE_ACCOUNT}.blob.core.windows.net/"
        f"{AZURE_CONTAINER_NAME}/{blob_name}?{sas_token}"
    )


def upload_blob(blob_service_client: BlobServiceClient, local_path: str, blob_name: str) -> bool:
    """Sube un archivo a Azure Blob Storage."""
    container_client = blob_service_client.get_container_client(AZURE_CONTAINER_NAME)
    try:
        with open(local_path, "rb") as data:
            container_client.upload_blob(blob_name, data, overwrite=True)
        logger.info("Subido: %s", blob_name)
        return True
    except FileNotFoundError:
        logger.error("Archivo local no encontrado: %s", local_path)
        return False
    except AzureError:
        logger.exception("Error al subir: %s", blob_name)
        return False


def verify_blob_storage(blob_service_client: BlobServiceClient, db_conn):
    """Verifica que las claves en medical_records existan como blobs en Azure."""
    # Paso 1: obtener todos los registros que tienen clave de imagen.
    with db_conn.cursor() as cursor:
        cursor.execute(
            "SELECT id, s3_image_key FROM medical_records WHERE s3_image_key IS NOT NULL"
        )
        records = cursor.fetchall()

    container_client = blob_service_client.get_container_client(AZURE_CONTAINER_NAME)
    verified = 0
    missing = 0

    # Paso 2: validar uno por uno que el blob exista en el contenedor.
    for record in records:
        blob_name = record["s3_image_key"]
        try:
            container_client.get_blob_client(blob_name).get_blob_properties()
            verified += 1
        except ResourceNotFoundError:
            missing += 1
            logger.warning("Blob faltante para el registro %s: %s", record["id"], blob_name)
        except AzureError:
            missing += 1
            logger.warning("Error verificando blob para el registro %s: %s", record["id"], blob_name)

    # Paso 3: emitir un resumen del estado de consistencia.
    logger.info(
        "Verificacion de blobs: %s verificados, %s faltantes de %s registros",
        verified,
        missing,
        len(records),
    )
    return verified, missing


def main():
    """Loop principal del worker: consulta BD y verifica blobs periodicamente."""
    logger.info("Iniciando worker de sincronizacion de Azure Blob Storage de HealthTech...")

    if not DATABASE_URL:
        logger.error("DATABASE_URL no esta configurada. Saliendo.")
        sys.exit(1)

    # Inicializacion unica al arrancar: cliente de Azure y contenedor.
    blob_service_client = get_blob_service_client()
    ensure_container_exists(blob_service_client)

    # Ciclo continuo:
    # 1) abre conexion a BD
    # 2) valida consistencia de blobs
    # 3) espera el intervalo configurado
    while True:
        try:
            db_conn = get_db_connection()
            verify_blob_storage(blob_service_client, db_conn)
            db_conn.close()
        except Exception:
            logger.exception("Error durante el ciclo de sincronizacion")

        logger.info("Proxima sincronizacion en %ss...", POLL_INTERVAL)
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
