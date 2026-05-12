from firebase_functions import firestore_fn, options
from firebase_admin import initialize_app, firestore
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
import os
import json
import subprocess
import tempfile
import time
import uuid
import git

from .models import AuditState, AuditStatus, VulnerabilityOutput

# Initialize Firebase Admin
app = initialize_app()
db = firestore.client()

# Initialize Gemini Model
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite")

# --- LangGraph Nodes ---

RULES_DIR = os.path.join(os.path.dirname(__file__), "semgrep-rules")

def ensure_semgrep_rules():
    """Ensures semgrep rules are cloned and up-to-date."""
    if not os.path.exists(RULES_DIR):
        print("Cloning semgrep rules...")
        git.Repo.clone_from("https://github.com/ezazulhaq/semgrep-rules.git", RULES_DIR)
    else:
        print("Updating semgrep rules...")
        try:
            repo = git.Repo(RULES_DIR)
            origin = repo.remotes.origin
            origin.pull()
        except Exception as e:
            print(f"Warning: Failed to update rules, using cached version: {e}")

def is_cancelled(audit_id: str) -> bool:
    if not audit_id: return False
    try:
        doc = db.collection("audits").document(audit_id).get()
        return doc.exists and doc.to_dict().get("status") == "CANCELLED"
    except:
        return False

def update_progress(audit_id: str, msg: str):
    if not audit_id: return
    try:
        db.collection("audits").document(audit_id).update({"progressMessage": msg})
    except Exception as e:
        print("Failed to update progress:", e)

def scanner_node(state: AuditState) -> AuditState:
    """Runs semgrep against the user's Github repository."""
    github_url = state.get("github_url")
    audit_id = state.get("audit_id")
    if not github_url:
        return {"status": "FAILED", "error": "No github URL provided."}
        
    vulnerabilities = []
    
    if is_cancelled(audit_id):
        return {"status": "CANCELLED"}

    # Ensure rules are present locally on the instance
    try:
        update_progress(audit_id, "Downloading Semgrep Rules...")
        ensure_semgrep_rules()
    except Exception as e:
        return {"status": "FAILED", "error": f"Failed to download semgrep rules: {e}"}
    
    with tempfile.TemporaryDirectory() as temp_dir:
        repo_dir = os.path.join(temp_dir, "repo")
        
        try:
            if is_cancelled(audit_id):
                return {"status": "CANCELLED"}

            # Clone user repo
            update_progress(audit_id, "Cloning Repository...")
            git.Repo.clone_from(github_url, repo_dir)
            
            if is_cancelled(audit_id):
                return {"status": "CANCELLED"}
            
            # Run semgrep
            update_progress(audit_id, "Running Semgrep Scan...")
            process = subprocess.Popen(
                ["semgrep", "scan", "--config", RULES_DIR, repo_dir, "--json"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            while True:
                if is_cancelled(audit_id):
                    process.terminate()
                    process.wait()
                    return {"status": "CANCELLED"}
                try:
                    result_stdout, result_stderr = process.communicate(timeout=2)
                    break
                except subprocess.TimeoutExpired:
                    continue
            
            update_progress(audit_id, "Processing Vulnerabilities...")
            if result_stdout:
                semgrep_output = json.loads(result_stdout)
                results = semgrep_output.get("results", [])
                
                for finding in results:
                    file_path = finding.get("path", "").replace(repo_dir + "/", "", 1)
                    if file_path.startswith(repo_dir):
                        file_path = file_path[len(repo_dir):].lstrip("/")

                    vuln = {
                        "id": str(uuid.uuid4()),
                        "type": finding.get("check_id", "Unknown"),
                        "severity": finding.get("extra", {}).get("severity", "UNKNOWN"),
                        "description": finding.get("extra", {}).get("message", "No description"),
                        "file": file_path,
                        "line": finding.get("start", {}).get("line", 0),
                        "proposedFixSnippet": "",
                        "status": "PENDING"
                    }
                    vulnerabilities.append(vuln)
                    
        except Exception as e:
            return {"status": "SCANNING", "vulnerabilities": [{"id": str(uuid.uuid4()), "type": "Error", "severity": "ERROR", "description": f"Scanning failed: {str(e)}", "file": "", "line": 0, "proposedFixSnippet": "", "status": "PENDING"}]}
            
    return {
        "status": "SCANNING", 
        "vulnerabilities": vulnerabilities
    }

def analyzer_node(state: AuditState) -> AuditState:
    """Uses Gemini 2.5 Flash-Lite to propose a fix."""
    audit_id = state.get("audit_id")
    if audit_id:
        doc = db.collection("audits").document(audit_id).get()
        if doc.exists and doc.to_dict().get("status") == "CANCELLED":
             return {"status": "CANCELLED"}
    
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
    if state["status"] == "CANCELLED":
        return END
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
    
    # Update status to SCANNING immediately in DB
    try:
        db.collection("audits").document(audit_id).update({
            "status": "SCANNING",
            "progressMessage": "Runner Node: Starting..."
        })
    except Exception as e:
        print("Failed to initialize audit status:", e)
    
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
    current_doc = db.collection("audits").document(audit_id).get()
    if current_doc.exists and current_doc.to_dict().get("status") != "CANCELLED":
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
