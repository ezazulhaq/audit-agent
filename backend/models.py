from typing import TypedDict, List, Optional, Literal
from dataclasses import dataclass

AuditStatus = Literal['PENDING', 'SCANNING', 'AWAITING_APPROVAL', 'PATCHING', 'COMPLETED', 'FAILED']
VulnerabilityStatus = Literal['PENDING', 'APPROVED', 'REJECTED']
SeverityLevel = Literal['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

class VulnerabilityOutput(TypedDict):
    id: str
    type: str # e.g., 'OWASP', 'GDPR', 'HIPAA'
    severity: SeverityLevel
    description: str
    file: str
    line: int
    proposedFixSnippet: str
    status: VulnerabilityStatus

class AuditState(TypedDict):
    """LangGraph State representation"""
    audit_id: str
    github_url: str
    status: AuditStatus
    vulnerabilities: List[VulnerabilityOutput]
    report_url: Optional[str]
    created_by: str
    error: Optional[str]

@dataclass
class Vulnerability:
    id: str
    type: str
    severity: str
    description: str
    file: str
    line: int
    proposedFixSnippet: str
    status: str

@dataclass
class Audit:
    id: str
    githubUrl: str
    status: str
    reportUrl: Optional[str]
    createdBy: str
    createdAt: int
    updatedAt: int
    error: Optional[str]
