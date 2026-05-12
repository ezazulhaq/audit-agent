from firebase_functions import firestore_fn, options
from firebase_admin import initialize_app, firestore
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
import os
import json

from .models import AuditState, AuditStatus, VulnerabilityOutput

# Initialize Firebase Admin
app = initialize_app()
db = firestore.client()

# Initialize Gemini Model
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite")

# --- LangGraph Nodes ---

def scanner_node(state: AuditState) -> AuditState:
    """Simulates Semgrep scanning."""
    # In a real app, you would clone the repo and run semgrep here.
    # For now, we simulate a finding.
    
    # Update status to indicate scanning is done, moving to analysis
    return {
        "status": "SCANNING", 
        "vulnerabilities": [{
            "id": "vuln_1",
            "type": "OWASP-CWE-78",
            "severity": "CRITICAL",
            "description": "Insecure wildcard permitAll() on entire repository path.",
            "file": "src/main/java/com/app/SecurityConfig.java",
            "line": 42,
            "proposedFixSnippet": "", # To be filled by analyzer
            "status": "PENDING"
        }]
    }

def analyzer_node(state: AuditState) -> AuditState:
    """Uses Gemini 2.5 Flash-Lite to propose a fix."""
    vulns = state.get("vulnerabilities", [])
    if not vulns:
        return {"status": "COMPLETED"}

    # Process pending vulnerabilities
    for vuln in vulns:
        if vuln["status"] == "PENDING":
            prompt = f"Analyze this vulnerability in {vuln['file']} at line {vuln['line']}: {vuln['description']} (Type: {vuln['type']}). Generate a code snippet to fix it."
            response = llm.invoke([SystemMessage(content="You are a senior security engineer."), HumanMessage(content=prompt)])
            # Basic extraction, in real app use structured output
            vuln["proposedFixSnippet"] = response.content
    
    # Pause execution for human approval
    return {"status": "AWAITING_APPROVAL", "vulnerabilities": vulns}

def patcher_node(state: AuditState) -> AuditState:
    """Applies the fix (simulated) if approved."""
    vulns = state.get("vulnerabilities", [])
    # Re-evaluate logic to check if all approved
    for vuln in vulns:
        if vuln["status"] == "APPROVED":
            # Simulate patching github repository
            print(f"Patching {vuln['file']}...")
            
    return {"status": "PATCHING", "vulnerabilities": vulns}

def reporter_node(state: AuditState) -> AuditState:
    """Generates final report."""
    # Simulate generating markdown and uploading to Firebase Storage
    report_url = "https://storage.googleapis.com/simulated/report.md"
    return {"status": "COMPLETED", "report_url": report_url}


# --- Build Graph ---
builder = StateGraph(AuditState)

builder.add_node("Scanner", scanner_node)
builder.add_node("Analyzer", analyzer_node)
builder.add_node("Patcher", patcher_node)
builder.add_node("Reporter", reporter_node)

builder.set_entry_point("Scanner")
builder.add_edge("Scanner", "Analyzer")

# Explicit interruption point / conditional routing
def route_after_analysis(state: AuditState) -> str:
    if state["status"] == "AWAITING_APPROVAL":
        return END # Pause execution by returning END
    return "Patcher" # Or go directly to patcher

builder.add_conditional_edges("Analyzer", route_after_analysis)
builder.add_edge("Patcher", "Reporter")
builder.add_edge("Reporter", END)

graph = builder.compile()

# --- Firebase Cloud Functions ---

@firestore_fn.on_document_created(document="audits/{auditId}", region="asia-south1")
# def on_audit_created(event: firestore_fn.Event[firestore_fn.DocumentSnapshot | None]) -> None:
def on_audit_created(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]) -> None:
    if event.data is None:
        return
        
    audit_data = event.data.to_dict()
    audit_id = event.params["auditId"]
    
    print(f"Triggered workflow for audit {audit_id}")
    
    initial_state = AuditState(
        audit_id=audit_id,
        github_url=audit_data.get("githubUrl", ""),
        status="SCANNING",
        vulnerabilities=[],
        report_url=None,
        created_by=audit_data.get("createdBy", ""),
        error=None
    )
    
    # Run graph until AWAITING_APPROVAL (which routes to END)
    final_state = graph.invoke(initial_state)
    
    # Persist the paused state to Firestore
    db.collection("audits").document(audit_id).update(final_state)


@firestore_fn.on_document_updated(document="audits/{auditId}", region="asia-south1")
# def on_audit_updated(event: firestore_fn.Event[firestore_fn.Change[firestore_fn.DocumentSnapshot | None]]) -> None:
def on_audit_updated(event: firestore_fn.Event[firestore_fn.Change[firestore_fn.DocumentSnapshot]]) -> None:
    if event.data is None or event.data.after is None or event.data.before is None:
         return
         
    before_data = event.data.before.to_dict()
    after_data = event.data.after.to_dict()
    
    # Detect transition from AWAITING_APPROVAL to PATCHING
    if before_data.get("status") == "AWAITING_APPROVAL" and after_data.get("status") == "PATCHING":
        audit_id = event.params["auditId"]
        
        # Resume the graph from the stored state but force entry to Patcher
        # In actual langgraph you'd use a checkpointer mechanism or simply invoke the remaining nodes
        
        # We manually invoke the rest of the flow here as a simplified demonstrator
        # of resuming execution.
        state = AuditState(**after_data)
        
        state = patcher_node(state)
        db.collection("audits").document(audit_id).update(state)
        
        state = reporter_node(state)
        db.collection("audits").document(audit_id).update(state)
