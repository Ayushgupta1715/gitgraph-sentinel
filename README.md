# ⚡ GitGraph Sentinel

> **Autonomous Codebase Security & Blast-Radius Impact Agent**  
> Built for the **FalkorDB Hackathon (Track 01: Agents That Act on Connected Data)**

🌐 **Live Demo:** [https://courts-recommend-mumbai-shame.trycloudflare.com](https://courts-recommend-mumbai-shame.trycloudflare.com)  
🎥 **Demo Video:** [Watch on YouTube](https://youtu.be/Ut3aSnAUs-8)

---

## 💡 What is GitGraph Sentinel?

Modern applications are deeply interconnected graphs of files, functions, API routes, database models, and third-party libraries. When vulnerabilities occur or code changes, traditional vector databases fail because **security flaws are multi-hop relationship problems**.

**GitGraph Sentinel** maps code repositories directly into **FalkorDB Graph Database**. Using **multi-hop Cypher queries**, the autonomous agent:
1. **Uncovers hidden security paths**: Detects unauthenticated routes that traverse intermediate functions to reach sensitive database models (e.g. `RouteHandler -> process_refund -> LedgerModel`).
2. **Calculates Blast Radius**: Performs reverse call-tree traversal before code modifications to show every impacted endpoint and model.
3. **Takes Autonomous Action**: Generates automated security patches, simulates Pull Requests with diffs, and re-evaluates the graph to confirm the vulnerability is closed.

---

## 🚀 Key FalkorDB Cypher Queries Used

### 1. Multi-Hop Security Path Traversal
Finds any route handler without authentication that reaches sensitive database models via intermediate function calls:
```cypher
MATCH path = (r:RouteHandler {has_auth: false})-[:CALLS*1..5]->(m:Model {sensitive: true})
RETURN r.name AS vulnerable_route, m.name AS exposed_model, path
```

### 2. Upstream Blast Radius Analysis
Traverses the reverse dependency graph to identify all upstream components that depend on a modified function:
```cypher
MATCH path = (target {name: $function_name})<-[:CALLS|EXPOSES*1..5]-(impacted)
RETURN path
```

---

## 🛠️ Project Architecture

```
challenge 2/
├── backend/
│   ├── app.py                  # FastAPI Server & REST APIs
│   ├── falkor_client.py        # FalkorDB client with Cypher queries & fallback engine
│   ├── code_parser.py          # Python AST Codebase-to-Graph parser
│   ├── agent.py                # Autonomous Agent (Multi-hop Reasoner + Action Runner)
│   └── sample_repo/            # Microservice with intentional multi-hop vulnerability
│       ├── auth.py
│       ├── payment.py
│       ├── routes.py
│       └── db.py
├── frontend/                   # Dark-mode Cyberpunk Dashboard
│   ├── index.html              # UI layout & Agent command center
│   ├── style.css               # Styling & glassmorphism
│   └── app.js                  # Cytoscape.js interactive graph visualizer
├── run.bat                     # 1-Click Windows Launcher
├── .env.example
└── README.md
```

---

## 🏃 How to Run

### Method 1: 1-Click Launch (Windows)
Double-click `run.bat` in the project root directory.

### Method 2: Manual Terminal
```powershell
# Activate virtual environment
.\venv\Scripts\activate

# Start the application
python backend\app.py
```

Open your browser at: **`http://localhost:8000`**

---

## 🔌 Connecting to FalkorDB

GitGraph Sentinel includes an **embedded graph engine** out of the box. To connect directly to a live FalkorDB instance:

1. **Via Docker (Local)**:
   ```bash
   docker run -p 6379:6379 -it --rm falkordb/falkordb
   ```

2. **Via FalkorDB Cloud (Free)**:
   - Create a free database at [app.falkordb.cloud](https://app.falkordb.cloud)
   - Add your connection details into `.env`:
     ```env
     FALKORDB_HOST=your-db.falkordb.cloud
     FALKORDB_PORT=6379
     FALKORDB_PASSWORD=your_password
     ```
