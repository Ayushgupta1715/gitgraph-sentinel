import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any

from falkor_client import FalkorDBClient
from code_parser import CodebaseGraphExtractor
from agent import GitGraphAgent

app = FastAPI(title="GitGraph Sentinel API", description="Autonomous Agent acting on FalkorDB Code Graph")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SAMPLE_REPO_DIR = os.path.join(BASE_DIR, "sample_repo")
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")

FALKOR_HOST = os.getenv("FALKORDB_HOST", "localhost")
FALKOR_PORT = int(os.getenv("FALKORDB_PORT", 6379))
FALKOR_PASSWORD = os.getenv("FALKORDB_PASSWORD", None)

falkor_client = FalkorDBClient(host=FALKOR_HOST, port=FALKOR_PORT, password=FALKOR_PASSWORD)
agent = GitGraphAgent(falkor_client, SAMPLE_REPO_DIR)

class ActionRequest(BaseModel):
    action_type: str
    payload: Optional[Dict[str, Any]] = None

@app.get("/api/status")
def get_status():
    graph_info = falkor_client.get_full_graph()
    return {
        "connected_to_falkordb": falkor_client.is_connected,
        "falkordb_host": f"{FALKOR_HOST}:{FALKOR_PORT}",
        "nodes": len(graph_info["nodes"]),
        "edges": len(graph_info["edges"]),
        "mode": "FalkorDB Live Instance" if falkor_client.is_connected else "Embedded Graph Engine (Local/Cloud Ready)"
    }

@app.post("/api/scan")
def scan_codebase():
    extractor = CodebaseGraphExtractor(SAMPLE_REPO_DIR)
    graph_data = extractor.extract()
    ingest_result = falkor_client.ingest_codebase(graph_data)
    agent.log_step("Codebase Scan", f"AST parsed {ingest_result['node_count']} nodes & {ingest_result['edge_count']} edges", "info")
    return {
        "message": "Codebase successfully parsed and ingested into FalkorDB Graph",
        "ingest_result": ingest_result,
        "graph": falkor_client.get_full_graph()
    }

@app.get("/api/graph")
def get_graph():
    return falkor_client.get_full_graph()

@app.get("/api/blast-radius")
def get_blast_radius(target: str = Query(..., description="Target function or node name")):
    res = falkor_client.query_blast_radius(target)
    agent.log_step("Blast Radius Executed", f"Target: '{target}', Total Impact: {res.get('total_impact_count')}, Risk: {res.get('risk_level')}", "info")
    return res

@app.get("/api/investigate")
def run_investigation():
    return agent.run_investigation()

@app.get("/api/queries")
def get_queries():
    return {"history": falkor_client.query_history}

@app.post("/api/act")
def execute_action(req: ActionRequest):
    res = agent.execute_action(req.action_type, req.payload)
    # Re-scan to update the graph state after code patch
    extractor = CodebaseGraphExtractor(SAMPLE_REPO_DIR)
    graph_data = extractor.extract()
    falkor_client.ingest_codebase(graph_data)
    res["updated_graph"] = falkor_client.get_full_graph()
    return res

# Mount static frontend
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    # Initial scan on startup
    extractor = CodebaseGraphExtractor(SAMPLE_REPO_DIR)
    graph_data = extractor.extract()
    falkor_client.ingest_codebase(graph_data)
    agent.log_step("System Initialized", "Codebase parsed into FalkorDB Graph engine", "info")
    uvicorn.run(app, host="127.0.0.1", port=8000)
