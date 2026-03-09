import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import * as bcrypt from "bcryptjs";

const DATABASE_URL = process.env["DATABASE_URL"];
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const adapter = new PrismaMariaDb(DATABASE_URL);
const prisma = new PrismaClient({ adapter });

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
      console.log(`  User ${u.email} already exists. Skipping.`);
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
    console.log(`  ✓ Created ${u.role}: ${u.email}`);
  }

  // ── 2. Controles HIPAA ─────────────────────────────

  const hipaaControls = [
    // Administrative Safeguards
    { safeguardType: "Administrative" as const, controlCode: "164.308(a)(1)", description: "Security Management Process — Policies and procedures to prevent, detect, contain, and correct security violations", status: "Implemented" as const },
    { safeguardType: "Administrative" as const, controlCode: "164.308(a)(2)", description: "Assigned Security Responsibility — Identify the security official responsible for developing and implementing policies", status: "Implemented" as const },
    { safeguardType: "Administrative" as const, controlCode: "164.308(a)(3)", description: "Workforce Security — Policies and procedures to ensure workforce members have appropriate access to ePHI", status: "Implemented" as const },
    { safeguardType: "Administrative" as const, controlCode: "164.308(a)(4)", description: "Information Access Management — Policies and procedures for authorizing access to ePHI", status: "Implemented" as const },
    { safeguardType: "Administrative" as const, controlCode: "164.308(a)(5)", description: "Security Awareness and Training — Security awareness and training program for all workforce members", status: "PartiallyImplemented" as const },
    { safeguardType: "Administrative" as const, controlCode: "164.308(a)(6)", description: "Security Incident Procedures — Policies and procedures to address security incidents", status: "Implemented" as const },
    { safeguardType: "Administrative" as const, controlCode: "164.308(a)(7)", description: "Contingency Plan — Establish policies and procedures for responding to emergencies or failures", status: "PartiallyImplemented" as const },
    { safeguardType: "Administrative" as const, controlCode: "164.308(a)(8)", description: "Evaluation — Perform periodic technical and nontechnical evaluations", status: "NotImplemented" as const },

    // Technical Safeguards
    { safeguardType: "Technical" as const, controlCode: "164.312(a)(1)", description: "Access Control — Technical policies and procedures for allowing access only to authorized persons", status: "Implemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(a)(2)(i)", description: "Unique User Identification — Assign a unique name and/or number for identifying and tracking user identity", status: "Implemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(a)(2)(ii)", description: "Emergency Access Procedure — Establish procedures for obtaining necessary ePHI during an emergency", status: "NotImplemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(a)(2)(iii)", description: "Automatic Logoff — Implement electronic procedures that terminate an electronic session after a period of inactivity", status: "Implemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(a)(2)(iv)", description: "Encryption and Decryption — Implement a mechanism to encrypt and decrypt ePHI", status: "Implemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(b)", description: "Audit Controls — Implement hardware, software, and/or procedural mechanisms to record and examine activity in systems", status: "Implemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(c)(1)", description: "Integrity — Policies and procedures to protect ePHI from improper alteration or destruction", status: "Implemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(c)(2)", description: "Mechanism to Authenticate ePHI — Implement electronic mechanisms to corroborate that ePHI has not been altered or destroyed", status: "PartiallyImplemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(d)", description: "Person or Entity Authentication — Implement procedures to verify that a person or entity seeking access to ePHI is the one claimed", status: "Implemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(e)(1)", description: "Transmission Security — Technical security measures to guard against unauthorized access to ePHI transmitted over networks", status: "Implemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(e)(2)(i)", description: "Integrity Controls — Security measures to ensure ePHI is not improperly modified without detection during transmission", status: "Implemented" as const },
    { safeguardType: "Technical" as const, controlCode: "164.312(e)(2)(ii)", description: "Encryption — Implement a mechanism to encrypt ePHI whenever deemed appropriate during transmission", status: "Implemented" as const },

    // Physical Safeguards
    { safeguardType: "Physical" as const, controlCode: "164.310(a)(1)", description: "Facility Access Controls — Policies and procedures to limit physical access to electronic information systems", status: "PartiallyImplemented" as const },
    { safeguardType: "Physical" as const, controlCode: "164.310(b)", description: "Workstation Use — Policies and procedures for proper functions, manner of performance, and physical attributes of workstations", status: "NotImplemented" as const },
    { safeguardType: "Physical" as const, controlCode: "164.310(c)", description: "Workstation Security — Physical safeguards for workstations that access ePHI, restricting access to authorized users only", status: "NotImplemented" as const },
    { safeguardType: "Physical" as const, controlCode: "164.310(d)(1)", description: "Device and Media Controls — Policies and procedures governing receipt and removal of hardware and electronic media containing ePHI", status: "PartiallyImplemented" as const },
  ];

  for (const ctrl of hipaaControls) {
    const existing = await prisma.hipaaControl.findUnique({ where: { controlCode: ctrl.controlCode } });
    if (existing) continue;
    await prisma.hipaaControl.create({ data: ctrl });
  }
  console.log(`  ✓ Seeded ${hipaaControls.length} HIPAA controls`);

  // ── 3. Sample Findings ────────────────────────────

  const auditor = await prisma.user.findUnique({ where: { email: "auditor@healthtech.com" } });
  const existingFindings = await prisma.auditFinding.count();

  if (existingFindings === 0 && auditor) {
    const findings = [
      { category: "Technical" as const, severity: "High" as const, hipaaControlCode: "164.312(a)(2)(ii)", description: "Emergency access procedure not yet documented or implemented", status: "Open" as const, assignedToId: auditor.id },
      { category: "Physical" as const, severity: "Medium" as const, hipaaControlCode: "164.310(b)", description: "Workstation use policy needs formal documentation and training", status: "Open" as const, assignedToId: auditor.id },
      { category: "Administrative" as const, severity: "Low" as const, hipaaControlCode: "164.308(a)(5)", description: "Security awareness training program partially implemented — need quarterly schedule", status: "InProgress" as const, assignedToId: auditor.id },
      { category: "Physical" as const, severity: "Medium" as const, hipaaControlCode: "164.310(c)", description: "Workstation security controls for remote access not enforced", status: "Open" as const },
      { category: "Technical" as const, severity: "Critical" as const, hipaaControlCode: "164.312(c)(2)", description: "ePHI integrity verification mechanism needs full implementation", status: "Open" as const, assignedToId: auditor.id },
    ];

    for (const f of findings) {
      await prisma.auditFinding.create({ data: f });
    }
    console.log(`  ✓ Seeded ${findings.length} sample findings`);
  }

  console.log("\n✅ Seed completed successfully.");
  console.log(`  Default password for all users: ${password}`);
  console.log("  ⚠ Change passwords after first login!\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
