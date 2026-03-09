// ── Enums matching backend Prisma schema ──

export type Role = "ADMIN" | "DOCTOR" | "NURSE" | "AUDITOR" | "LAB_EXTERNAL" | "PHARMACIST";
export type AuditAction = "CREATE" | "READ" | "UPDATE" | "DELETE";
export type FindingCategory = "Administrative" | "Technical" | "Physical";
export type FindingSeverity = "Critical" | "High" | "Medium" | "Low" | "Informational";
export type FindingStatus = "Open" | "InProgress" | "Remediated" | "AcceptedRisk" | "Closed";
export type HipaaControlStatus = "Implemented" | "PartiallyImplemented" | "NotImplemented" | "NotApplicable";
export type SafeguardType = "Administrative" | "Technical" | "Physical";
export type IncidentType = "Breach" | "NearMiss" | "SecurityEvent" | "PolicyViolation";
export type IncidentStatus = "Open" | "Investigating" | "Resolved" | "Closed";

// ── Models ──

export interface User {
  id: number;
  email: string;
  role: Role;
  isActive: boolean;
  mfaEnabled: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export interface Patient {
  id: number;
  mrn: string;
  name: string;
  dob: string;
  ssn: string;
  diagnosis: string | null;
  createdById: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: number;
  userId: number | null;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  httpMethod: string;
  endpoint: string;
  statusCode: number;
  timestamp: string;
  user?: { id: number; email: string; role: Role };
}

export interface AuditFinding {
  id: number;
  category: FindingCategory;
  severity: FindingSeverity;
  hipaaControlCode: string;
  description: string;
  status: FindingStatus;
  assignedToId: number | null;
  dueDate: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: number; email: string };
}

export interface HipaaControl {
  id: number;
  safeguardType: SafeguardType;
  controlCode: string;
  description: string;
  status: HipaaControlStatus;
  evidenceRef: string | null;
  lastReviewedAt: string | null;
  reviewedById: number | null;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: { id: number; email: string };
}

export interface SecurityIncident {
  id: number;
  type: IncidentType;
  description: string;
  affectedCount: number;
  reportedById: number | null;
  status: IncidentStatus;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reportedBy?: { id: number; email: string };
}

export interface MedicalRecord {
  id: number;
  patientId: number;
  recordType: string;
  content: string;
  s3ImageKey: string | null;
  accessedById: number;
  createdAt: string;
  patient?: { id: number; mrn: string };
  accessedBy?: { id: number; email: string };
}

// ── API responses ──

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ComplianceSummary {
  total: number;
  implemented: number;
  partial: number;
  percentage: number;
  byCategory: Record<string, { total: number; implemented: number; percentage: number }>;
}

export interface DashboardData {
  compliance: {
    total: number;
    implemented: number;
    partial: number;
    notImplemented: number;
    percentage: number;
  };
  findingsBySeverity: Record<string, number>;
  recentIncidents: SecurityIncident[];
  topUsers: { user: { id: number; email: string; role: Role }; actionCount: number }[];
  activityByHour: { hour: number; count: number }[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  mfaRequired?: boolean;
  tempToken?: string;
  passwordExpired?: boolean;
}
