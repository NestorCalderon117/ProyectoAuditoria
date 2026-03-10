#!/bin/sh
# Backend de HealthTech: punto de entrada de Docker
# Ejecuta migraciones y semillas antes de iniciar la aplicación

set -e

echo "Iniciando el backend de HealthTech..."

# Esperar a que MySQL esté completamente listo (healthcheck ya lo valida, pero por si acaso)
echo "Esperando conexión a la base de datos..."
sleep 5

# Generar cliente de Prisma
echo "Generando cliente de Prisma..."
npx prisma generate

# Aplicar migraciones pendientes
echo "Ejecutando migraciones de bases de datos..."
npx prisma migrate deploy || echo "No se pudieron aplicar migraciones (esto está bien si ya se aplicaron)"

# Ejecutar seed directamente con tsx (evita problemas de configuración de prisma db seed)
echo "Ejecutando semilla de base de datos..."
npx tsx prisma/seed.ts || echo "La semilla ya se ejecutó o falló (esto está bien si existen datos)"

# Iniciar la aplicación
echo "Iniciando la aplicación NestJS..."
exec node dist/src/main.js
