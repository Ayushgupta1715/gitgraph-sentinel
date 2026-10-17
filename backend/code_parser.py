import ast
import os
from typing import List, Dict, Any

class CodebaseGraphExtractor:
    """
    Parses Python codebases into genuine, evidence-based nodes and edges for FalkorDB graph ingestion.
    Extracts:
    - Nodes: File, Function, RouteHandler, Model
    - Relationships:
      * IMPORTS (File -> File)
      * EXPOSES (File -> RouteHandler)
      * CALLS (Function/Route -> Function)
      * ACCESSES (Function -> Model) [Evidence-based: calls model methods]
      * AUTHENTICATES (Function -> Function) [Evidence-based: calls verify_jwt]
    - Accurate line numbers & source code snippets for evidence display.
    """
    def __init__(self, root_dir: str):
        self.root_dir = root_dir
        self.nodes = []
        self.edges = []
        self.source_lines = {}  # file_path -> lines

    def extract(self) -> Dict[str, Any]:
        self.nodes = []
        self.edges = []
        self.source_lines = {}
        
        file_map = {}

        for root, _, files in os.walk(self.root_dir):
            for file in files:
                if file.endswith(".py"):
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, self.root_dir).replace("\\", "/")
                    file_id = f"file:{rel_path}"
                    
                    with open(full_path, "r", encoding="utf-8") as f:
                        code_content = f.read()
                        lines = code_content.splitlines()
                        self.source_lines[rel_path] = lines

                    self.nodes.append({
                        "id": file_id,
                        "label": "File",
                        "properties": {
                            "name": file,
                            "path": rel_path,
                            "lines": len(lines)
                        }
                    })
                    file_map[file.replace(".py", "")] = file_id

                    try:
                        tree = ast.parse(code_content, filename=rel_path)
                        self._visit_ast(tree, file_id, rel_path, lines)
                    except Exception as e:
                        print(f"Error parsing AST {rel_path}: {e}")

        return {"nodes": self.nodes, "edges": self.edges}

    def _visit_ast(self, tree: ast.AST, file_id: str, rel_path: str, raw_lines: List[str]):
        # First pass: find imports
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    target_file = f"file:{alias.name}.py"
                    self.edges.append({
                        "source": file_id,
                        "target": target_file,
                        "type": "IMPORTS",
                        "properties": {"module": alias.name}
                    })
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    target_file = f"file:{node.module}.py"
                    self.edges.append({
                        "source": file_id,
                        "target": target_file,
                        "type": "IMPORTS",
                        "properties": {"names": [a.name for a in node.names]}
                    })

            # Classes (Models)
            elif isinstance(node, ast.ClassDef):
                class_id = f"model:{rel_path}::{node.name}" if "Model" in node.name else f"class:{rel_path}::{node.name}"
                is_sensitive = "Model" in node.name and any(
                    assign.targets[0].id == "sensitive" and getattr(assign.value, "value", False) is True
                    for assign in node.body if isinstance(assign, ast.Assign) and isinstance(assign.targets[0], ast.Name)
                )
                
                snippet = "\n".join(raw_lines[node.lineno - 1 : min(len(raw_lines), node.end_lineno or node.lineno + 10)])

                self.nodes.append({
                    "id": class_id,
                    "label": "Model" if "Model" in node.name else "Class",
                    "properties": {
                        "name": node.name,
                        "file": rel_path,
                        "start_line": node.lineno,
                        "end_line": getattr(node, "end_lineno", node.lineno + 5),
                        "sensitive": is_sensitive,
                        "code_snippet": snippet[:400]
                    }
                })
                self.edges.append({
                    "source": file_id,
                    "target": class_id,
                    "type": "DEFINES",
                    "properties": {}
                })
                # Methods
                for item in node.body:
                    if isinstance(item, ast.FunctionDef):
                        func_id = f"func:{rel_path}::{node.name}.{item.name}"
                        m_snippet = "\n".join(raw_lines[item.lineno - 1 : min(len(raw_lines), item.end_lineno or item.lineno + 5)])
                        self.nodes.append({
                            "id": func_id,
                            "label": "Function",
                            "properties": {
                                "name": f"{node.name}.{item.name}",
                                "file": rel_path,
                                "start_line": item.lineno,
                                "end_line": getattr(item, "end_lineno", item.lineno + 4),
                                "code_snippet": m_snippet,
                                "is_method": True
                            }
                        })
                        self.edges.append({
                            "source": class_id,
                            "target": func_id,
                            "type": "EXPOSES_METHOD",
                            "properties": {}
                        })

            # Functions & Route Handlers
            elif isinstance(node, ast.FunctionDef):
                is_route = "handler" in node.name.lower() or "route" in node.name.lower()
                func_id = f"route:{rel_path}::{node.name}" if is_route else f"func:{rel_path}::{node.name}"
                
                # Check for genuine verify_jwt call in AST
                has_auth_call = False
                for sub in ast.walk(node):
                    if isinstance(sub, ast.Call):
                        if isinstance(sub.func, ast.Name) and sub.func.id in ("verify_jwt", "authenticate"):
                            has_auth_call = True

                snippet = "\n".join(raw_lines[node.lineno - 1 : min(len(raw_lines), node.end_lineno or node.lineno + 8)])

                self.nodes.append({
                    "id": func_id,
                    "label": "RouteHandler" if is_route else "Function",
                    "properties": {
                        "name": node.name,
                        "file": rel_path,
                        "start_line": node.lineno,
                        "end_line": getattr(node, "end_lineno", node.lineno + 6),
                        "is_route": is_route,
                        "has_auth": has_auth_call,
                        "code_snippet": snippet
                    }
                })
                self.edges.append({
                    "source": file_id,
                    "target": func_id,
                    "type": "EXPOSES" if is_route else "DECLARES",
                    "properties": {}
                })
                
                self._extract_evidence_calls(node, func_id, rel_path)

    def _extract_evidence_calls(self, func_node: ast.FunctionDef, caller_id: str, rel_path: str):
        for sub in ast.walk(func_node):
            if isinstance(sub, ast.Call):
                call_target = None
                is_model_access = False
                is_auth_operation = False

                if isinstance(sub.func, ast.Name):
                    call_target = sub.func.id
                    if call_target in ("verify_jwt", "authenticate"):
                        is_auth_operation = True
                elif isinstance(sub.func, ast.Attribute):
                    val_id = getattr(sub.func.value, "id", "")
                    if val_id and val_id not in ("self", "cls", "request", "request_headers", "request_body"):
                        call_target = f"{val_id}.{sub.func.attr}"
                        if "Model" in val_id:
                            is_model_access = True
                            # Also add direct ACCESSES edge to Model
                            self.edges.append({
                                "source": caller_id,
                                "target_name": val_id,
                                "type": "ACCESSES",
                                "properties": {"method": sub.func.attr, "line": sub.lineno}
                            })

                if call_target and not call_target.startswith("_") and call_target not in ("print", "len", "range", "get", "dict", "str", "int", "float", "list"):
                    edge_type = "AUTHENTICATES" if is_auth_operation else "CALLS"
                    self.edges.append({
                        "source": caller_id,
                        "target_name": call_target,
                        "type": edge_type,
                        "properties": {"line": sub.lineno}
                    })
