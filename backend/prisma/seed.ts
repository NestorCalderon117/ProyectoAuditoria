import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import * as bcrypt from "bcryptjs";
import { createCipheriv, randomBytes } from "crypto";

const DATABASE_URL = process.env["DATABASE_URL"];
if (!DATABASE_URL) {
  console.error("DATABASE_URL no está configurada");
  process.exit(1);
}

const adapter = new PrismaMariaDb(DATABASE_URL);
const prisma = new PrismaClient({ adapter });

const PHI_ENCRYPTION_KEY = process.env["PHI_ENCRYPTION_KEY"];
if (!PHI_ENCRYPTION_KEY) {
  console.error("PHI_ENCRYPTION_KEY no está configurada");
  process.exit(1);
}

const key = Buffer.from(PHI_ENCRYPTION_KEY, "hex");
if (key.length !== 32) {
  console.error("PHI_ENCRYPTION_KEY debe tener 32 bytes (64 caracteres hex)");
  process.exit(1);
}

function encryptPhi(plaintext: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

async function main() {
  // ── 1. Usuarios ───────────────────────────────────────

  const users = [
    { email: "admin@healthtech.com", role: "ADMIN" as const },
    { email: "doctor@healthtech.com", role: "DOCTOR" as const },
    { email: "nurse@healthtech.com", role: "NURSE" as const },
    { email: "auditor@healthtech.com", role: "AUDITOR" as const },
    { email: "lab@healthtech.com", role: "LAB_EXTERNAL" as const },
    { email: "pharma@healthtech.com", role: "PHARMACIST" as const },
  ];

  const password = "Admin123!";
  const hash = await bcrypt.hash(password, 12);

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`  El usuario ${u.email} ya existe. Omitiendo.`);
      continue;
    }
    await prisma.user.create({
      data: {
        email: u.email,
        password: hash,
        role: u.role,
        passwordHistory: { create: { hash } },
      },
    });
    console.log(`  ✓ Creado ${u.role}: ${u.email}`);
  }

  // ── 2. Controles HIPAA ─────────────────────────────

  const hipaaControls = [
    // Resguardos Administrativos
    { safeguardType: "Administrative" as const, controlCode: "164.308(a)(1)", description: "Proceso de Gestión de Seguridad — Políticas y procedimientos para prevenir, detectar, contener y corregir violaciones de seguridad", status: "Implemented" as const },
    { safeguardType: "Administrative" as const, controlCode: "164.308(a)(2)", description: "Responsabilidad de Seguridad Asignada — Identificar al oficial de seguridad responsable del desarrollo e implementación de políticas", status: "Implemented" as const },
    { safeguardType: "Administrative" as const, controlCode: "164.308(a)(3)", description: "Seguridad de la Fuerza Laboral — Políticas y procedimientos para asegurar que los miembros tengan acceso apropiado a ePHI", status: "Implemented" as const },
    { safeguardType: "Administrative" as const, controlCode: "164.308(a)(4)", description: "Gestión del Acceso a la Información — Políticas y procedimientos para autorizar el acceso a ePHI", status: "Implemented" as const },
    { safeguardType: "Administrative" as const, controlCode: "164.308(a)(5)", description: "Concienciación de Seguridad y Capacitación — Programa de concienciación y capacitación en seguridad para todos los miembros", status: "PartiallyImplemented" as const },
    { safeguardType: "Administrative" as const, controlCode: "164.308(a)(6)", description: "Procedimientos de Incidentes de Seguridad — Políticas y procedimientos para abordar incidentes de seguridad", status: "Implemented" as const },
    { safeguardType: "Administrative" as const, controlCode: "164.308(a)(7)", description: "Plan de Contingencia — Establecer políticas y procedimientos para responder a emergencias o fallas", status: "PartiallyImplemented" as const },
    { safeguardType: "Administrative" as const, controlCode: "164.308(a)(8)", description: "Evaluación — Realizar evaluaciones técnicas y no técnicas periódicas", status: "NotImplemented" as const },

    // Resguardos Técnicos
    { safeguardType: "Technical" as const, controlCode: "164.312(a)(1)", description: "Control de Acceso — Políticas y procedimientos técnicos para permitir acceso solo a personas autorizadas", status: "Implemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(a)(2)(i)", description: "Identificación Única del Usuario — Asignar un nombre y/o número único para identificar y rastrear la identidad del usuario", status: "Implemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(a)(2)(ii)", description: "Procedimiento de Acceso de Emergencia — Establecer procedimientos para obtener ePHI necesario durante una emergencia", status: "NotImplemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(a)(2)(iii)", description: "Cierre de Sesión Automático — Implementar procedimientos electrónicos que terminen una sesión electrónica después de un período de inactividad", status: "Implemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(a)(2)(iv)", description: "Cifrado y Descifrado — Implementar un mecanismo para cifrar y descifrar ePHI", status: "Implemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(b)", description: "Controles de Auditoría — Implementar mecanismos de hardware, software y/o procedimientos para registrar y examinar actividad en sistemas", status: "Implemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(c)(1)", description: "Integridad — Políticas y procedimientos para proteger ePHI de alteración o destrucción inadecuada", status: "Implemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(c)(2)", description: "Mecanismo para Autenticar ePHI — Implementar mecanismos electrónicos para corroborar que ePHI no ha sido alterado o destruido", status: "PartiallyImplemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(d)", description: "Autenticación de Persona o Entidad — Implementar procedimientos para verificar que una persona o entidad que busca acceso a ePHI es quien afirma ser", status: "Implemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(e)(1)", description: "Seguridad de Transmisión — Medidas de seguridad técnica para proteger contra acceso no autorizado a ePHI transmitido sobre redes", status: "Implemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(e)(2)(i)", description: "Controles de Integridad — Medidas de seguridad para asegurar que ePHI no sea modificado inadecuadamente sin detección durante la transmisión", status: "Implemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(e)(2)(ii)", description: "Cifrado — Implementar un mecanismo para cifrar ePHI cuando se considere apropiado durante la transmisión", status: "Implemented" as const },

    // Resguardos Físicos
    { safeguardType: "Physical" as const, controlCode: "164.310(a)(1)", description: "Controles de Acceso a Instalaciones — Políticas y procedimientos para limitar el acceso físico a sistemas de información electrónica", status: "PartiallyImplemented" as const },
    { safeguardType: "Physical" as const, controlCode: "164.310(b)", description: "Uso de Estaciones de Trabajo — Políticas y procedimientos para funciones adecuadas, manera del desempeño y atributos físicos de estaciones de trabajo", status: "NotImplemented" as const },
    { safeguardType: "Physical" as const, controlCode: "164.310(c)", description: "Seguridad de Estaciones de Trabajo — Resguardos físicos para estaciones de trabajo que accesan ePHI, restringiendo acceso solo a usuarios autorizados", status: "NotImplemented" as const },
    { safeguardType: "Physical" as const, controlCode: "164.310(d)(1)", description: "Controles de Dispositivos y Medios — Políticas y procedimientos que rigen la recepción y remoción de hardware y medios electrónicos que contienen ePHI", status: "PartiallyImplemented" as const },
  ];

  for (const ctrl of hipaaControls) {
    const existing = await prisma.hipaaControl.findUnique({ where: { controlCode: ctrl.controlCode } });
    if (existing) continue;
    await prisma.hipaaControl.create({ data: ctrl });
  }
  console.log(`  ✓ Sembrados ${hipaaControls.length} controles HIPAA`);

  // ── 3. Hallazgos de Ejemplo ────────────────────────────

  const auditor = await prisma.user.findUnique({ where: { email: "auditor@healthtech.com" } });
  const existingFindings = await prisma.auditFinding.count();

  if (existingFindings === 0 && auditor) {
    const findings = [
      { category: "Technical" as const, severity: "High" as const, hipaaControlCode: "164.312(a)(2)(ii)", description: "Procedimiento de acceso de emergencia aún no documentado o implementado", status: "Open" as const, assignedToId: auditor.id },
      { category: "Physical" as const, severity: "Medium" as const, hipaaControlCode: "164.310(b)", description: "Política de uso de estaciones de trabajo necesita documentación formal y capacitación", status: "Open" as const, assignedToId: auditor.id },
      { category: "Administrative" as const, severity: "Low" as const, hipaaControlCode: "164.308(a)(5)", description: "Programa de capacitación de concienciación de seguridad parcialmente implementado — se necesita calendario trimestral", status: "InProgress" as const, assignedToId: auditor.id },
      { category: "Physical" as const, severity: "Medium" as const, hipaaControlCode: "164.310(c)", description: "Controles de seguridad de estaciones de trabajo para acceso remoto no están aplicados", status: "Open" as const },
      { category: "Technical" as const, severity: "Critical" as const, hipaaControlCode: "164.312(c)(2)", description: "Mecanismo de verificación de integridad de ePHI necesita implementación completa", status: "Open" as const, assignedToId: auditor.id },
    ];

    for (const f of findings) {
      await prisma.auditFinding.create({ data: f });
    }
    console.log(`Sembrados ${findings.length} hallazgos de ejemplo`);
  }

  // ── 4. Pacientes de Ejemplo ────────────────────────────

  const doctor = await prisma.user.findUnique({ where: { email: "doctor@healthtech.com" } });

  const patients = [
    {
      mrn: "HT-MRN-0001",
      nameEnc: "Maria Gonzalez",
      dobEnc: "1984-02-14",
      ssnEnc: "123-45-6789",
      diagnosisEnc: "Hipertension arterial controlada",
    },
    {
      mrn: "HT-MRN-0002",
      nameEnc: "Carlos Ramirez",
      dobEnc: "1972-09-03",
      ssnEnc: "987-65-4321",
      diagnosisEnc: "Diabetes mellitus tipo 2",
    },
    {
      mrn: "HT-MRN-0003",
      nameEnc: "Lucia Herrera",
      dobEnc: "1991-11-22",
      ssnEnc: "111-22-3333",
      diagnosisEnc: "Asma persistente leve",
    },
  ];

  if (doctor) {
    let createdPatients = 0;
    for (const p of patients) {
      const existing = await prisma.patient.findUnique({ where: { mrn: p.mrn } });
      if (existing) continue;

      await prisma.patient.create({
        data: {
          mrn: p.mrn,
          nameEnc: encryptPhi(p.nameEnc),
          dobEnc: encryptPhi(p.dobEnc),
          ssnEnc: encryptPhi(p.ssnEnc),
          diagnosisEnc: encryptPhi(p.diagnosisEnc),
          createdById: doctor.id,
        },
      });
      createdPatients += 1;
    }
    console.log(`Sembrados ${createdPatients} pacientes de ejemplo`);
  } else {
    console.log("  ! No se encontraron usuarios DOCTOR para sembrar pacientes");
  }

  // ── 5. Registros Médicos de Ejemplo ───────────────────

  const nurse = await prisma.user.findUnique({ where: { email: "nurse@healthtech.com" } });
  const seededPatients = await prisma.patient.findMany({
    where: { mrn: { in: ["HT-MRN-0001", "HT-MRN-0002", "HT-MRN-0003"] } },
    select: { id: true, mrn: true },
  });

  if (nurse && seededPatients.length > 0) {
    const medicalRecords = [
      {
        patientMrn: "HT-MRN-0001",
        recordType: "ConsultaGeneral",
        contentEnc: "Paciente estable, se mantiene tratamiento antihipertensivo.",
      },
      {
        patientMrn: "HT-MRN-0002",
        recordType: "Laboratorio",
        contentEnc: "Hemoglobina glicosilada en 7.1%, ajustar dieta y control en 3 meses.",
      },
      {
        patientMrn: "HT-MRN-0003",
        recordType: "Urgencias",
        contentEnc: "Episodio leve de broncoespasmo, responde a broncodilatador inhalado.",
      },
    ];

    let createdMedicalRecords = 0;
    for (const record of medicalRecords) {
      const patient = seededPatients.find((p) => p.mrn === record.patientMrn);
      if (!patient) continue;

      const existing = await prisma.medicalRecord.findFirst({
        where: {
          patientId: patient.id,
          recordType: record.recordType,
        },
      });
      if (existing) continue;

      await prisma.medicalRecord.create({
        data: {
          patientId: patient.id,
          recordType: record.recordType,
          contentEnc: encryptPhi(record.contentEnc),
          accessedById: nurse.id,
        },
      });
      createdMedicalRecords += 1;
    }
    console.log(`Sembrados ${createdMedicalRecords} registros médicos de ejemplo`);
  } else {
    console.log("  ! No se pudieron sembrar registros médicos (falta NURSE o pacientes)");
  }

  // ── 6. Incidentes de Seguridad de Ejemplo ─────────────

  const admin = await prisma.user.findUnique({ where: { email: "admin@healthtech.com" } });
  const existingIncidents = await prisma.securityIncident.count();

  if (existingIncidents === 0) {
    const incidents = [
      {
        type: "SecurityEvent" as const,
        description: "Intentos de inicio de sesión fallidos repetidos en cuentas administrativas detectados por el SIEM.",
        affectedCount: 3,
        status: "Investigating" as const,
        reportedById: admin?.id,
      },
      {
        type: "PolicyViolation" as const,
        description: "Uso de dispositivo USB no autorizado en estación clínica identificado por controles DLP.",
        affectedCount: 1,
        status: "Open" as const,
        reportedById: admin?.id,
      },
      {
        type: "NearMiss" as const,
        description: "Correo con posible phishing fue reportado y bloqueado antes de interacción del usuario.",
        affectedCount: 0,
        status: "Resolved" as const,
        reportedById: admin?.id,
      },
    ];

    for (const incident of incidents) {
      await prisma.securityIncident.create({ data: incident });
    }
    console.log(`  ✓ Sembrados ${incidents.length} incidentes de seguridad de ejemplo`);
  }

  console.log("\n Seed completado exitosamente.");
  console.log(`  Contraseña predeterminada para todos los usuarios: ${password}`);
  console.log("¡Cambiar contraseñas después del primer inicio de sesión!\n");
}

main()
  .catch((e) => {
    console.error("Error en la siembra:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
