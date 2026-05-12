export type AuditStatus = 
  | 'PENDING' 
  | 'SCANNING' 
  | 'AWAITING_APPROVAL' 
  | 'PATCHING' 
  | 'COMPLETED' 
  | 'FAILED';

export type VulnerabilityStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Vulnerability {
  id?: string;
  type: string; // e.g., 'OWASP', 'GDPR', 'HIPAA'
  severity: SeverityLevel;
  description: string;
  file: string;
  line: number;
  proposedFixSnippet: string;
  status: VulnerabilityStatus;
}

export interface Audit {
  id?: string; // Document ID
  githubUrl: string;
  status: AuditStatus;
  reportUrl?: string | null;
  createdBy: string; // User ID
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
  error?: string | null;
}
