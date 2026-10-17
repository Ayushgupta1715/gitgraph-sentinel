let cy = null;
let currentInvestigation = null;
let activeFinding = null;
let currentGraphData = null;

document.addEventListener("DOMContentLoaded", async () => {
    initCytoscape();
    await loadStatus();
    await loadGraph();
    await loadQueryHistory();
    // Auto-run initial triage so judges immediately see findings!
    await runInvestigation();
    // Auto-run initial blast radius
    await runBlastRadius();

    window.addEventListener('resize', () => {
        if (cy) {
            cy.resize();
            cy.fit(null, 50);
        }
    });
});

function setScanStatus(statusText, colorClass = "ready") {
    const textEl = document.getElementById("scan-status-text");
    if (textEl) textEl.innerText = statusText;
}

function initCytoscape() {
    cy = cytoscape({
        container: document.getElementById('cy'),
        boxSelectionEnabled: false,
        autounselectify: true,
        style: [
            {
                selector: 'node',
                style: {
                    'content': 'data(shortLabel)',
                    'color': '#f8fafc',
                    'font-family': 'Plus Jakarta Sans, sans-serif',
                    'font-size': '10px',
                    'font-weight': '600',
                    'text-valign': 'bottom',
                    'text-margin-y': '6px',
                    'text-wrap': 'wrap',
                    'text-max-width': '110px',
                    'background-color': '#334155',
                    'border-width': 2,
                    'border-color': 'rgba(255,255,255,0.18)',
                    'width': 36,
                    'height': 36,
                    'text-outline-color': '#060911',
                    'text-outline-width': 3,
                    'transition-property': 'background-color, border-color, width, height, opacity',
                    'transition-duration': '0.25s'
                }
            },
            {
                selector: 'node[type = "File"]',
                style: {
                    'background-color': '#2563eb',
                    'shape': 'round-rectangle',
                    'width': 54,
                    'height': 32
                }
            },
            {
                selector: 'node[type = "Function"]',
                style: {
                    'background-color': '#10b981',
                    'shape': 'ellipse',
                    'width': 34,
                    'height': 34
                }
            },
            {
                selector: 'node[type = "RouteHandler"]',
                style: {
                    'background-color': '#f59e0b',
                    'shape': 'hexagon',
                    'width': 44,
                    'height': 44
                }
            },
            {
                selector: 'node[type = "Model"]',
                style: {
                    'background-color': '#ec4899',
                    'shape': 'diamond',
                    'width': 44,
                    'height': 44
                }
            },
            /* Clean, Subtle Connecting Edges (No harsh white webs) */
            {
                selector: 'edge',
                style: {
                    'curve-style': 'bezier',
                    'width': 1.4,
                    'target-arrow-shape': 'triangle',
                    'line-color': 'rgba(100, 116, 139, 0.28)',
                    'target-arrow-color': 'rgba(100, 116, 139, 0.4)',
                    'arrow-scale': 0.7,
                    'label': 'data(type)',
                    'font-family': 'JetBrains Mono, monospace',
                    'font-size': '8px',
                    'color': '#38bdf8',
                    'text-rotation': 'autorotate',
                    'text-margin-y': -8,
                    'text-opacity': 0, /* Hidden by default to prevent visual clutter! */
                    'transition-property': 'line-color, target-arrow-color, width, text-opacity, opacity',
                    'transition-duration': '0.25s'
                }
            },
            /* Hover/Focus Edge display */
            {
                selector: 'edge:selected, edge.active-edge',
                style: {
                    'text-opacity': 1,
                    'line-color': '#38bdf8',
                    'target-arrow-color': '#38bdf8',
                    'width': 2.2
                }
            },
            /* Dimmed background */
            {
                selector: '.dimmed',
                style: {
                    'opacity': 0.08
                }
            },
            /* Attack Path Highlight (Neon Crimson) */
            {
                selector: '.attack-node',
                style: {
                    'background-color': '#ef4444',
                    'border-color': '#ffffff',
                    'border-width': 4,
                    'width': 50,
                    'height': 50,
                    'opacity': 1
                }
            },
            {
                selector: '.attack-edge',
                style: {
                    'line-color': '#ef4444',
                    'target-arrow-color': '#ef4444',
                    'width': 3.6,
                    'text-opacity': 1,
                    'color': '#fca5a5',
                    'opacity': 1
                }
            },
            /* Blast Radius Highlights */
            {
                selector: '.blast-target',
                style: {
                    'background-color': '#ef4444',
                    'border-color': '#ffffff',
                    'border-width': 4,
                    'width': 50,
                    'height': 50,
                    'opacity': 1
                }
            },
            {
                selector: '.blast-direct',
                style: {
                    'background-color': '#f97316',
                    'border-color': '#ffedd5',
                    'border-width': 3,
                    'width': 44,
                    'height': 44,
                    'opacity': 1
                }
            },
            {
                selector: '.blast-indirect',
                style: {
                    'background-color': '#eab308',
                    'border-color': '#fef08a',
                    'border-width': 2.5,
                    'width': 38,
                    'height': 38,
                    'opacity': 1
                }
            }
        ]
    });

    // Node Tap Focus
    cy.on('tap', 'node', function(evt){
        const node = evt.target;
        focusOnNode(node);
    });

    // Background Click Reset
    cy.on('tap', function(evt){
        if (evt.target === cy) {
            resetGraphView();
        }
    });

    // Hover Tooltip & Edge Label
    const tooltip = document.getElementById('graph-tooltip');
    cy.on('mouseover', 'node', function(evt){
        const node = evt.target;
        const d = node.data();
        const renderedPos = node.renderedPosition();

        tooltip.innerHTML = `
            <strong>${d.label}</strong><br>
            <span style="color: #94a3b8;">Type:</span> ${d.type}<br>
            <span style="color: #94a3b8;">File:</span> ${d.properties.file || d.properties.path || 'module'}<br>
            ${d.properties.start_line ? `<span style="color: #94a3b8;">Lines:</span> ${d.properties.start_line}-${d.properties.end_line}` : ''}
        `;
        tooltip.style.left = `${renderedPos.x + 20}px`;
        tooltip.style.top = `${renderedPos.y - 10}px`;
        tooltip.classList.remove('hidden');
    });

    cy.on('mouseout', 'node', function(){
        tooltip.classList.add('hidden');
    });

    cy.on('mouseover', 'edge', function(evt){
        evt.target.addClass('active-edge');
    });
    cy.on('mouseout', 'edge', function(evt){
        if (!evt.target.hasClass('attack-edge')) {
            evt.target.removeClass('active-edge');
        }
    });
}

function focusOnNode(node) {
    const connectedEdges = node.connectedEdges();
    const connectedNodes = connectedEdges.connectedNodes();

    cy.elements().addClass('dimmed');
    node.removeClass('dimmed');
    connectedNodes.removeClass('dimmed');
    connectedEdges.removeClass('dimmed').addClass('active-edge');

    const d = node.data();
    addTimelineStep("Node Inspected", `[${d.type}] ${d.label} in ${d.properties.file || 'module'}`, "info");
}

async function loadStatus() {
    try {
        const res = await fetch("/api/status");
        const data = await res.json();
        
        document.getElementById("db-status-text").innerText = data.mode;
        document.getElementById("node-count").innerText = data.nodes;
        document.getElementById("edge-count").innerText = data.edges;

        const dot = document.querySelector("#scan-status-badge .status-pulse-dot");
        if (dot) dot.style.background = "#10b981";
    } catch (e) {
        console.error("Status fetch error:", e);
    }
}

async function loadGraph() {
    try {
        const res = await fetch("/api/graph");
        const data = await res.json();
        currentGraphData = data;
        renderCytoscape(data);
        if (data.query_history) {
            renderQueryHistory(data.query_history);
        }
    } catch (e) {
        console.error("Graph fetch error:", e);
    }
}

async function loadQueryHistory() {
    try {
        const res = await fetch("/api/queries");
        const data = await res.json();
        renderQueryHistory(data.history || []);
    } catch (e) {
        console.error("Query history error:", e);
    }
}

function renderQueryHistory(queries) {
    const list = document.getElementById("cypher-history-list");
    const countBadge = document.getElementById("query-count-badge");
    countBadge.innerText = `${queries.length} Queries Recorded`;

    if (!queries || queries.length === 0) {
        list.innerHTML = `<div style="color: #64748b;">No Cypher queries recorded yet.</div>`;
        return;
    }

    list.innerHTML = queries.map(q => `
        <div class="query-entry">
            <code>${q.query}</code>
            <span class="query-meta">${q.duration_ms}ms | ${q.records} records [${q.timestamp}]</span>
        </div>
    `).join("");
}

async function scanCodebase() {
    setScanStatus("SCANNING REPO...");
    addTimelineStep("Codebase Scan", "Parsing Python AST and indexing graph...", "info");
    try {
        const res = await fetch("/api/scan", { method: "POST" });
        const data = await res.json();
        currentGraphData = data.graph;
        renderCytoscape(data.graph);
        await loadStatus();
        await loadQueryHistory();
        addTimelineStep("FalkorDB Synced", `Indexed ${data.ingest_result.node_count} nodes & ${data.ingest_result.edge_count} relationships (${data.ingest_result.ingest_time_ms}ms)`, "action");
        setScanStatus("ANALYSIS COMPLETE");
    } catch (e) {
        addTimelineStep("Scan Failed", e.toString(), "alert");
        setScanStatus("SCAN FAILED");
    }
}

/**
 * 🌟 Spaced Tiered Architectural Column Layout:
 * Col 0: Files (Left)
 * Col 1: Route Handlers
 * Col 2: Business Logic Functions
 * Col 3: Database Models (Right)
 */
function applyTieredLayout() {
    if (!cy) return;

    const files = cy.nodes('[type = "File"]');
    const routes = cy.nodes('[type = "RouteHandler"]');
    const functions = cy.nodes('[type = "Function"]');
    const models = cy.nodes('[type = "Model"]');

    const colX = {
        files: 60,
        routes: 320,
        functions: 600,
        models: 880
    };

    function layoutColumn(collection, x) {
        const count = collection.length;
        if (count === 0) return;
        const totalHeight = 540;
        const step = count > 1 ? totalHeight / (count - 1) : totalHeight / 2;
        const startY = 40;

        collection.forEach((node, idx) => {
            node.position({
                x: x,
                y: startY + (idx * step)
            });
        });
    }

    layoutColumn(files, colX.files);
    layoutColumn(routes, colX.routes);
    layoutColumn(functions, colX.functions);
    layoutColumn(models, colX.models);

    cy.fit(null, 50);
}

function renderCytoscape(graphData) {
    if (!cy) return;
    cy.elements().remove();

    const elements = [];

    // Nodes
    graphData.nodes.forEach(n => {
        const rawName = n.properties.name || n.id;
        let shortName = rawName;
        if (shortName.length > 20) {
            shortName = shortName.substring(0, 18) + '…';
        }

        elements.push({
            group: 'nodes',
            data: {
                id: n.id,
                label: rawName,
                shortLabel: shortName,
                type: n.label || 'Node',
                properties: n.properties
            }
        });
    });

    // Edges
    graphData.edges.forEach((e, idx) => {
        elements.push({
            group: 'edges',
            data: {
                id: `e-${idx}`,
                source: e.source,
                target: e.target,
                type: e.type
            }
        });
    });

    cy.add(elements);
    applyTieredLayout();
}

function switchLayout(mode) {
    if (mode === 'tiered') {
        applyTieredLayout();
    }
}

// Search Filter
function searchNodes(query) {
    if (!cy) return;
    resetGraphView();
    if (!query.trim()) return;

    const term = query.toLowerCase();
    const matches = cy.nodes().filter(n => n.data('label').toLowerCase().includes(term));

    if (matches.length > 0) {
        cy.elements().addClass('dimmed');
        matches.removeClass('dimmed').addClass('blast-direct');
        cy.center(matches);
    }
}

// 🛡️ Multi-Hop Investigation (Evidence-Based)
async function runInvestigation() {
    setScanStatus("TRIAGING GRAPH...");
    addTimelineStep("Agent Reasoning", "Executing Cypher: (r:RouteHandler {has_auth: false})-[:CALLS*]->(m:Model)", "info");
    const container = document.getElementById("findings-container");

    try {
        const res = await fetch("/api/investigate");
        const data = await res.json();
        currentInvestigation = data;
        loadQueryHistory();

        if (data.timeline) {
            data.timeline.forEach(t => addTimelineStep(t.title, t.detail, t.level));
        }

        if (data.findings.length === 0) {
            container.innerHTML = `
                <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; border-radius: 8px; padding: 12px; font-size: 0.78rem; color: #6ee7b7;">
                    ✅ <strong>All Access Paths Verified!</strong> Zero unauthenticated routes reaching sensitive models.
                </div>
            `;
            document.getElementById("finding-count-tag").innerText = "0 Detected";
            document.getElementById("finding-count-tag").style.color = "#10b981";
            setScanStatus("VERIFIED SECURE");
            return;
        }

        activeFinding = data.findings[0];
        document.getElementById("finding-count-tag").innerText = `${data.findings.length} Detected`;
        document.getElementById("finding-count-tag").style.color = "#ef4444";

        let html = "";
        data.findings.forEach((f, idx) => {
            html += `
                <div class="finding-card">
                    <div class="finding-head">
                        <span class="finding-title">Potential Vulnerability Detected</span>
                        <span class="severity-pill">${f.severity}</span>
                    </div>

                    <div class="finding-table">
                        <div class="finding-row">
                            <span class="finding-label">Entry Point:</span>
                            <span class="finding-val danger">${f.entry_point}</span>
                        </div>
                        <div class="finding-row">
                            <span class="finding-label">Affected Resource:</span>
                            <span class="finding-val">${f.sensitive_resource}</span>
                        </div>
                        <div class="finding-row">
                            <span class="finding-label">Issue:</span>
                            <span class="finding-val">Missing authorization check</span>
                        </div>
                        <div class="finding-row">
                            <span class="finding-label">Confidence:</span>
                            <span class="finding-val success">${Math.round(f.confidence * 100)}% (AST Verified)</span>
                        </div>
                        <div class="finding-row">
                            <span class="finding-label">Evidence:</span>
                            <span class="finding-val">${f.entry_file}:${f.entry_lines}</span>
                        </div>
                    </div>

                    <div class="finding-actions-grid">
                        <button class="btn btn-secondary" onclick="viewEvidence(${idx})">
                            📜 View Evidence
                        </button>
                        <button class="btn btn-outline" onclick="showAttackPath(${idx})">
                            🎯 Show Attack Path
                        </button>
                    </div>

                    <button class="btn btn-action w-100" style="margin-top: 8px; font-size: 0.74rem;" onclick="openFixPreview(${idx})">
                        🛡️ Review & Apply Safe Fix
                    </button>
                </div>
            `;
        });

        container.innerHTML = html;
        setScanStatus("ANALYSIS COMPLETE");

    } catch (e) {
        addTimelineStep("Investigation Error", e.toString(), "alert");
        setScanStatus("ANALYSIS FAILED");
    }
}

// 🎯 Show Attack Path (Key Hackathon Feature)
function showAttackPath(index) {
    if (!currentInvestigation || !currentInvestigation.findings[index]) return;
    const f = currentInvestigation.findings[index];
    resetGraphView();

    cy.elements().addClass('dimmed');

    // Highlight nodes in attack path
    const pathNodes = [];
    f.path_ids.forEach(id => {
        const node = cy.getElementById(id);
        if (node.length > 0) {
            node.removeClass('dimmed').addClass('attack-node');
            pathNodes.push(node);
        }
    });

    // Highlight connecting edges
    for (let i = 0; i < f.path_ids.length - 1; i++) {
        const src = f.path_ids[i];
        const tgt = f.path_ids[i + 1];
        const edge = cy.edges().filter(e => 
            (e.data('source') === src && e.data('target') === tgt) ||
            (e.data('source') === tgt && e.data('target') === src)
        );
        edge.removeClass('dimmed').addClass('attack-edge');
    }

    addTimelineStep("Attack Path Isolated", `Traced: ${f.attack_path.join(' ➔ ')}`, "warning");

    if (pathNodes.length > 0) {
        cy.animate({
            fit: {
                eles: cy.collection(pathNodes),
                padding: 70
            },
            duration: 400
        });
    }
}

// View Evidence Modal
function viewEvidence(index) {
    if (!currentInvestigation || !currentInvestigation.findings[index]) return;
    const f = currentInvestigation.findings[index];
    activeFinding = f;

    document.getElementById("evidence-title").innerText = `${f.id} Evidence: ${f.entry_point}`;
    document.getElementById("evidence-meta").innerText = `Source File: ${f.entry_file} (Lines ${f.entry_lines}) | Confidence: ${Math.round(f.confidence * 100)}%`;
    document.getElementById("evidence-explanation").innerText = f.evidence_explanation;
    document.getElementById("evidence-code").innerText = f.evidence_snippet;

    document.getElementById("evidence-modal").classList.remove("hidden");
}

// Safe Fix Preview Modal
function openFixPreview(index) {
    if (!currentInvestigation || !currentInvestigation.findings[index]) return;
    const f = currentInvestigation.findings[index];
    activeFinding = f;

    document.getElementById("diff-original").innerText = f.recommended_fix.original_code;
    document.getElementById("diff-patched").innerText = f.recommended_fix.patched_code;

    document.getElementById("fix-modal").classList.remove("hidden");
}

function switchToFixPreview() {
    closeModal("evidence-modal");
    if (activeFinding) {
        document.getElementById("diff-original").innerText = activeFinding.recommended_fix.original_code;
        document.getElementById("diff-patched").innerText = activeFinding.recommended_fix.patched_code;
        document.getElementById("fix-modal").classList.remove("hidden");
    }
}

async function confirmApplyPatch() {
    if (!activeFinding) return;
    closeModal("fix-modal");
    
    setScanStatus("APPLYING PATCH...");
    addTimelineStep("Patch Injection", `Injecting verified JWT verification middleware into '${activeFinding.entry_point}'...`, "info");
    
    try {
        const res = await fetch("/api/act", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action_type: "APPLY_SECURITY_PATCH",
                payload: { route: activeFinding.entry_point }
            })
        });
        const data = await res.json();

        addTimelineStep("Remediation Complete", `${data.pr_status} on ${data.target_file}`, "action");

        if (data.updated_graph) {
            currentGraphData = data.updated_graph;
            renderCytoscape(data.updated_graph);
            await loadStatus();
            await loadQueryHistory();
        }

        // Re-run investigation to confirm path is securely closed!
        setTimeout(() => {
            runInvestigation();
        }, 800);

    } catch (e) {
        addTimelineStep("Patch Error", e.toString(), "alert");
    }
}

// 💥 Blast Radius Engine
async function runBlastRadius() {
    const target = document.getElementById("blast-target").value;
    resetGraphView();
    addTimelineStep("Blast Radius Query", `Traversing reverse dependencies for '${target}' in FalkorDB`, "info");

    try {
        const res = await fetch(`/api/blast-radius?target=${encodeURIComponent(target)}`);
        const data = await res.json();
        loadQueryHistory();

        const container = document.getElementById("blast-results-container");

        if (data.error) {
            container.innerHTML = `<p style="color: #f87171; font-size: 0.75rem;">${data.error}</p>`;
            return;
        }

        // Color coding on graph
        cy.elements().addClass('dimmed');

        const highlightedElements = [];

        if (data.target) {
            const targetNode = cy.getElementById(data.target.id);
            targetNode.removeClass('dimmed').addClass('blast-target');
            highlightedElements.push(targetNode);
        }

        data.direct_dependents.forEach(n => {
            const node = cy.getElementById(n.id);
            node.removeClass('dimmed').addClass('blast-direct');
            highlightedElements.push(node);
        });

        data.indirect_dependents.forEach(n => {
            const node = cy.getElementById(n.id);
            node.removeClass('dimmed').addClass('blast-indirect');
            highlightedElements.push(node);
        });

        const riskClass = data.risk_level === "CRITICAL" ? "risk-critical" : (data.risk_level === "HIGH" ? "risk-high" : "risk-low");

        container.innerHTML = `
            <div class="blast-summary-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong style="font-size: 0.8rem; color: #fdba74;">Target: ${target}()</strong>
                    <span class="risk-badge ${riskClass}">${data.risk_level} RISK</span>
                </div>
                
                <div class="blast-grid">
                    <div class="blast-stat-box">
                        <div class="blast-stat-number">${data.direct_count}</div>
                        <div class="blast-stat-label">Direct Dependents</div>
                    </div>
                    <div class="blast-stat-box">
                        <div class="blast-stat-number">${data.indirect_count}</div>
                        <div class="blast-stat-label">Indirect Dependents</div>
                    </div>
                    <div class="blast-stat-box">
                        <div class="blast-stat-number">${data.affected_routes.length}</div>
                        <div class="blast-stat-label">Affected Routes</div>
                    </div>
                    <div class="blast-stat-box">
                        <div class="blast-stat-number">${data.affected_models.length}</div>
                        <div class="blast-stat-label">Affected Models</div>
                    </div>
                </div>

                <div style="font-size: 0.72rem; color: #94a3b8; line-height: 1.35; margin-top: 4px;">
                    <strong>Downstream Risk:</strong> ${data.risk_reason}
                </div>
            </div>
        `;

        addTimelineStep("Blast Radius Computed", `Target: '${target}' affects ${data.total_impact_count} components (${data.risk_level} Risk)`, "action");

        if (highlightedElements.length > 0) {
            cy.animate({
                fit: {
                    eles: cy.collection(highlightedElements),
                    padding: 60
                },
                duration: 400
            });
        }

    } catch (e) {
        addTimelineStep("Blast Radius Error", e.toString(), "alert");
    }
}

// Timeline Helper
function addTimelineStep(title, detail, level = "info") {
    const timeline = document.getElementById("action-timeline");
    if (!timeline) return;

    const item = document.createElement("div");
    item.className = `timeline-item ${level}`;
    const time = new Date().toLocaleTimeString();

    item.innerHTML = `
        <span class="timeline-time">[${time}]</span>
        <div class="timeline-content">
            <strong>✓ ${title}:</strong> ${detail}
        </div>
    `;
    timeline.prepend(item);
}

function resetGraphView() {
    if (!cy) return;
    cy.elements().removeClass('dimmed attack-node attack-edge blast-target blast-direct blast-indirect active-edge');
    cy.animate({
        fit: { padding: 50 },
        duration: 300
    });
}

function fitGraph() {
    if (cy) {
        resetGraphView();
        cy.fit(null, 50);
    }
}

function zoomIn() {
    if (cy) cy.zoom(cy.zoom() * 1.25);
}

function zoomOut() {
    if (cy) cy.zoom(cy.zoom() * 0.8);
}

function toggleInspector() {
    const body = document.getElementById("inspector-body");
    const chevron = document.getElementById("inspector-toggle");
    body.classList.toggle("hidden");
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add("hidden");
}
