let cy = null;
let currentInvestigation = null;
let activeFinding = null;
let currentGraphData = null;

document.addEventListener("DOMContentLoaded", async () => {
    initCytoscape();
    await loadStatus();
    await loadGraph();
    await loadQueryHistory();
    // Auto-run initial triage
    await runInvestigation();
    // Auto-run initial blast radius
    await runBlastRadius();

    window.addEventListener('resize', () => {
        if (cy) {
            cy.resize();
            cy.fit(null, 45);
        }
    });

    // Close modals on Escape key
    window.addEventListener('keydown', (e) => {
        if (e.key === "Escape") {
            closeModal('evidence-modal');
            closeModal('fix-modal');
        }
    });
});

/**
 * Sidebar Tab Switching
 */
function switchSidebarTab(tabName) {
    const tabs = ['triage', 'blast', 'audit'];
    tabs.forEach(t => {
        const btn = document.getElementById(`btn-tab-${t}`);
        const pane = document.getElementById(`pane-${t}`);
        if (btn) btn.classList.toggle('active', t === tabName);
        if (pane) pane.classList.toggle('active', t === tabName);
    });
}

/**
 * Status and Health Indicators
 */
function setPostureStatus(activeCount) {
    const label = document.querySelector(".threat-label");
    const dot = document.querySelector(".threat-dot");
    const findingPill = document.getElementById("finding-count-tag");

    if (activeCount > 0) {
        if (label) label.innerText = `${activeCount} Active ${activeCount === 1 ? 'Vulnerability' : 'Vulnerabilities'}`;
        if (dot) {
            dot.className = "threat-dot alert";
            dot.style.background = "var(--color-danger)";
        }
        if (findingPill) {
            findingPill.innerText = activeCount;
            findingPill.style.background = "var(--color-danger)";
        }
    } else {
        if (label) label.innerText = "0 Active Threats • Compliant";
        if (dot) {
            dot.className = "threat-dot ok";
            dot.style.background = "var(--color-success)";
        }
        if (findingPill) {
            findingPill.innerText = "0";
            findingPill.style.background = "var(--color-success)";
        }
    }
}

/**
 * Initialize Cytoscape with developer security styling
 */
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
                    'color': '#f4f4f6',
                    'font-family': 'Inter, sans-serif',
                    'font-size': '10px',
                    'font-weight': '500',
                    'text-valign': 'bottom',
                    'text-margin-y': '6px',
                    'text-wrap': 'wrap',
                    'text-max-width': '110px',
                    'background-color': '#16161c',
                    'border-width': 1.5,
                    'border-color': '#2e2e38',
                    'width': 34,
                    'height': 34,
                    'text-outline-color': '#09090b',
                    'text-outline-width': 2.5,
                    'transition-property': 'background-color, border-color, width, height, opacity',
                    'transition-duration': '0.15s'
                }
            },
            {
                selector: 'node[type = "File"]',
                style: {
                    'background-color': '#1d4ed8',
                    'border-color': '#3b82f6',
                    'shape': 'round-rectangle',
                    'width': 44,
                    'height': 28
                }
            },
            {
                selector: 'node[type = "Function"]',
                style: {
                    'background-color': '#047857',
                    'border-color': '#10b981',
                    'shape': 'ellipse',
                    'width': 30,
                    'height': 30
                }
            },
            {
                selector: 'node[type = "RouteHandler"]',
                style: {
                    'background-color': '#b45309',
                    'border-color': '#f59e0b',
                    'shape': 'round-hexagon',
                    'width': 36,
                    'height': 36
                }
            },
            {
                selector: 'node[type = "Model"]',
                style: {
                    'background-color': '#b91c1c',
                    'border-color': '#ef4444',
                    'shape': 'diamond',
                    'width': 38,
                    'height': 38
                }
            },
            {
                selector: 'edge',
                style: {
                    'curve-style': 'bezier',
                    'width': 1.2,
                    'target-arrow-shape': 'triangle',
                    'line-color': '#272732',
                    'target-arrow-color': '#3f3f4e',
                    'arrow-scale': 0.7,
                    'label': 'data(type)',
                    'font-family': 'JetBrains Mono, monospace',
                    'font-size': '8px',
                    'color': '#71717a',
                    'text-rotation': 'autorotate',
                    'text-margin-y': -6,
                    'text-opacity': 0,
                    'transition-property': 'line-color, target-arrow-color, width, text-opacity, opacity',
                    'transition-duration': '0.15s'
                }
            },
            {
                selector: 'edge:selected, edge.active-edge',
                style: {
                    'text-opacity': 1,
                    'line-color': '#3b82f6',
                    'target-arrow-color': '#3b82f6',
                    'color': '#93c5fd',
                    'width': 2
                }
            },
            {
                selector: '.dimmed',
                style: {
                    'opacity': 0.12
                }
            },
            {
                selector: '.attack-node',
                style: {
                    'background-color': '#ef4444',
                    'border-color': '#ffffff',
                    'border-width': 2.5,
                    'width': 44,
                    'height': 44,
                    'opacity': 1,
                    'z-index': 99
                }
            },
            {
                selector: '.attack-edge',
                style: {
                    'line-color': '#ef4444',
                    'target-arrow-color': '#ef4444',
                    'width': 2.8,
                    'text-opacity': 1,
                    'color': '#fca5a5',
                    'opacity': 1,
                    'z-index': 98
                }
            },
            {
                selector: '.blast-target',
                style: {
                    'background-color': '#ef4444',
                    'border-color': '#ffffff',
                    'border-width': 2.5,
                    'width': 44,
                    'height': 44,
                    'opacity': 1,
                    'z-index': 99
                }
            },
            {
                selector: '.blast-direct',
                style: {
                    'background-color': '#f97316',
                    'border-color': '#ffedd5',
                    'border-width': 2,
                    'width': 36,
                    'height': 36,
                    'opacity': 1,
                    'z-index': 90
                }
            },
            {
                selector: '.blast-indirect',
                style: {
                    'background-color': '#eab308',
                    'border-color': '#fef08a',
                    'border-width': 1.5,
                    'width': 32,
                    'height': 32,
                    'opacity': 1,
                    'z-index': 80
                }
            }
        ]
    });

    cy.on('tap', 'node', function(evt){
        const node = evt.target;
        focusOnNode(node);
    });

    cy.on('tap', function(evt){
        if (evt.target === cy) {
            resetGraphView();
        }
    });

    // Tooltip
    const tooltip = document.getElementById('graph-tooltip');
    cy.on('mouseover', 'node', function(evt){
        const node = evt.target;
        const d = node.data();
        const renderedPos = node.renderedPosition();

        tooltip.innerHTML = `
            <div style="font-weight: 600; color: #f4f4f6;">${d.label}</div>
            <div style="color: #a1a1aa; font-size: 0.68rem; margin-top: 2px;">
                <span>Type:</span> <span style="color: #e4e4e7;">${d.type}</span> &bull; 
                <span>File:</span> <span style="color: #e4e4e7;">${d.properties.file || d.properties.path || 'module'}</span>
            </div>
            ${d.properties.start_line ? `<div style="color: #71717a; font-size: 0.65rem; font-family: monospace;">Lines: ${d.properties.start_line}-${d.properties.end_line}</div>` : ''}
        `;
        tooltip.style.left = `${renderedPos.x + 18}px`;
        tooltip.style.top = `${renderedPos.y - 12}px`;
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
    addTimelineStep("Node Focus", `[${d.type}] ${d.label} (${d.properties.file || 'module'})`, "info");
}

async function loadStatus() {
    try {
        const res = await fetch("/api/status");
        const data = await res.json();
        
        const dbStatusEl = document.getElementById("db-status-text");
        if (dbStatusEl) dbStatusEl.innerText = data.mode || "FalkorDB Connected";

        const summaryEl = document.getElementById("node-edge-summary");
        if (summaryEl) {
            summaryEl.innerText = `${data.nodes} Nodes • ${data.edges} Edges`;
        }
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
    if (!list) return;

    if (!queries || queries.length === 0) {
        list.innerHTML = `<div style="color: #71717a; font-size: 0.68rem; padding: 4px;">No Cypher queries executed yet.</div>`;
        return;
    }

    list.innerHTML = queries.map(q => `
        <div class="query-entry">
            <code>${escapeHtml(q.query)}</code>
            <span class="query-meta">${q.duration_ms}ms &bull; ${q.records} records [${q.timestamp}]</span>
        </div>
    `).join("");
}

async function scanCodebase() {
    addTimelineStep("Codebase AST Scan", "Parsing Python abstract syntax trees into graph...", "info");
    try {
        const res = await fetch("/api/scan", { method: "POST" });
        const data = await res.json();
        currentGraphData = data.graph;
        renderCytoscape(data.graph);
        await loadStatus();
        await loadQueryHistory();
        addTimelineStep("AST Synchronized", `Indexed ${data.ingest_result.node_count} entities & ${data.ingest_result.edge_count} relations (${data.ingest_result.ingest_time_ms}ms)`, "action");
        await runInvestigation();
    } catch (e) {
        addTimelineStep("Scan Failed", e.toString(), "alert");
    }
}

/**
 * Spaced Tiered Architectural Column Layout
 */
function applyTieredLayout() {
    if (!cy) return;

    const files = cy.nodes('[type = "File"]');
    const routes = cy.nodes('[type = "RouteHandler"]');
    const functions = cy.nodes('[type = "Function"]');
    const models = cy.nodes('[type = "Model"]');

    const colX = {
        files: 60,
        routes: 280,
        functions: 520,
        models: 760
    };

    function layoutColumn(collection, x) {
        const count = collection.length;
        if (count === 0) return;
        const totalHeight = 480;
        const step = count > 1 ? totalHeight / (count - 1) : totalHeight / 2;
        const startY = 50;

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

    cy.fit(null, 45);
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

/**
 * Multi-Hop Investigation (Evidence-Based Snyk/GitHub Security Display)
 */
async function runInvestigation() {
    addTimelineStep("Agent Cypher Evaluation", "Querying: MATCH (r:RouteHandler {has_auth: false})-[:CALLS*]->(m:Model {sensitive: true})", "info");
    const container = document.getElementById("findings-container");

    try {
        const res = await fetch("/api/investigate");
        const data = await res.json();
        currentInvestigation = data;
        loadQueryHistory();

        if (data.timeline) {
            data.timeline.forEach(t => addTimelineStep(t.title, t.detail, t.level));
        }

        const count = data.findings ? data.findings.length : 0;
        setPostureStatus(count);

        if (count === 0) {
            container.innerHTML = `
                <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 6px; padding: 14px; font-size: 0.74rem; color: #a7f3d0; line-height: 1.5;">
                    <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; margin-bottom: 4px; color: #6ee7b7;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Zero Exposed Ingress Routes
                    </div>
                    All multi-hop execution paths to sensitive models require validated authentication token claims.
                </div>
            `;
            return;
        }

        activeFinding = data.findings[0];

        let html = "";
        data.findings.forEach((f, idx) => {
            const attackSteps = (f.attack_path || []).map((step, sIdx) => {
                const isFirst = sIdx === 0;
                const isLast = sIdx === f.attack_path.length - 1;
                return `
                    <div class="step-row">
                        <span class="step-badge">${sIdx + 1}</span>
                        <span class="step-text ${isLast ? 'target' : ''}">
                            ${isFirst ? 'Ingress: ' : (isLast ? 'Sink: ' : 'Call: ')}
                            <strong>${escapeHtml(step)}</strong>
                        </span>
                    </div>
                `;
            }).join("");

            html += `
                <div class="finding-item">
                    <div class="finding-header">
                        <span class="cve-id">${f.id} &bull; CWE-306</span>
                        <span class="severity-chip">${f.severity}</span>
                    </div>

                    <div class="finding-title-text">
                        Missing Authentication on Sensitive Financial Operation
                    </div>

                    <div class="attack-stepper">
                        ${attackSteps}
                    </div>

                    <div style="font-size: 0.7rem; color: var(--text-secondary); line-height: 1.4;">
                        <span style="color: var(--text-muted);">Source Evidence:</span> <code>${f.entry_file}:${f.entry_lines}</code> &bull; 
                        <span style="color: var(--color-success); font-weight: 500;">${Math.round(f.confidence * 100)}% AST Verified</span>
                    </div>

                    <div class="finding-actions">
                        <button class="btn-secondary-sm" onclick="viewEvidence(${idx})">
                            Inspect Code
                        </button>
                        <button class="btn-secondary-sm" onclick="showAttackPath(${idx})">
                            Isolate Path
                        </button>
                    </div>

                    <button class="btn-action-primary" onclick="openFixPreview(${idx})">
                        Review Safe Patch Proposal
                    </button>
                </div>
            `;
        });

        container.innerHTML = html;

    } catch (e) {
        addTimelineStep("Investigation Error", e.toString(), "alert");
    }
}

/**
 * Show Attack Path on Canvas
 */
function showAttackPath(index) {
    if (!currentInvestigation || !currentInvestigation.findings[index]) return;
    const f = currentInvestigation.findings[index];
    resetGraphView();

    cy.elements().addClass('dimmed');

    const pathNodes = [];
    f.path_ids.forEach(id => {
        const node = cy.getElementById(id);
        if (node.length > 0) {
            node.removeClass('dimmed').addClass('attack-node');
            pathNodes.push(node);
        }
    });

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
                padding: 60
            },
            duration: 300
        });
    }
}

/**
 * View Source AST Evidence Modal
 */
function viewEvidence(index) {
    if (!currentInvestigation || !currentInvestigation.findings[index]) return;
    const f = currentInvestigation.findings[index];
    activeFinding = f;

    document.getElementById("evidence-title").innerText = `${f.entry_file} (${f.entry_point})`;
    document.getElementById("evidence-meta").innerHTML = `
        <span style="font-family: monospace; color: var(--text-secondary); font-size: 0.72rem;">File: ${f.entry_file} | Lines: ${f.entry_lines} | AST Verified Confidence: ${Math.round(f.confidence * 100)}%</span>
    `;
    document.getElementById("evidence-explanation").innerText = f.evidence_explanation;
    document.getElementById("evidence-code").innerText = f.evidence_snippet;

    document.getElementById("evidence-modal").classList.remove("hidden");
}

/**
 * Safe Fix Proposal Modal
 */
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
    
    addTimelineStep("Patch Injected", `Applying verified token validation patch to '${activeFinding.entry_point}'...`, "info");
    
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

        addTimelineStep("Remediation Verified", `${data.pr_status} on ${data.target_file}`, "action");

        if (data.updated_graph) {
            currentGraphData = data.updated_graph;
            renderCytoscape(data.updated_graph);
            await loadStatus();
            await loadQueryHistory();
        }

        setTimeout(() => {
            runInvestigation();
        }, 700);

    } catch (e) {
        addTimelineStep("Patch Error", e.toString(), "alert");
    }
}

/**
 * Blast Radius Engine
 */
async function runBlastRadius() {
    const targetSelect = document.getElementById("blast-target");
    if (!targetSelect) return;
    const target = targetSelect.value;
    resetGraphView();
    addTimelineStep("Blast Radius Evaluated", `Calculating reverse dependencies for '${target}' in FalkorDB`, "info");

    try {
        const res = await fetch(`/api/blast-radius?target=${encodeURIComponent(target)}`);
        const data = await res.json();
        loadQueryHistory();

        const container = document.getElementById("blast-results-container");
        if (!container) return;

        if (data.error) {
            container.innerHTML = `<p style="color: #ef4444; font-size: 0.72rem;">${data.error}</p>`;
            return;
        }

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

        container.innerHTML = `
            <div class="blast-metrics-box">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="font-size: 0.76rem; color: #ffffff; font-family: var(--font-mono);">${target}()</strong>
                    <span class="severity-chip" style="font-size: 0.62rem;">${data.risk_level} IMPACT</span>
                </div>
                
                <div class="blast-grid">
                    <div class="blast-stat">
                        <div class="num">${data.direct_count}</div>
                        <div class="lbl">Direct Dependents</div>
                    </div>
                    <div class="blast-stat">
                        <div class="num">${data.indirect_count}</div>
                        <div class="lbl">Indirect Callers</div>
                    </div>
                    <div class="blast-stat">
                        <div class="num">${data.affected_routes.length}</div>
                        <div class="lbl">Affected Routes</div>
                    </div>
                    <div class="blast-stat">
                        <div class="num">${data.affected_models.length}</div>
                        <div class="lbl">Affected Models</div>
                    </div>
                </div>

                <div style="font-size: 0.7rem; color: var(--text-secondary); line-height: 1.4; margin-top: 6px;">
                    <span style="color: var(--text-muted);">Impact Rationale:</span> ${data.risk_reason}
                </div>
            </div>
        `;

        if (highlightedElements.length > 0) {
            cy.animate({
                fit: {
                    eles: cy.collection(highlightedElements),
                    padding: 55
                },
                duration: 300
            });
        }

    } catch (e) {
        addTimelineStep("Blast Radius Error", e.toString(), "alert");
    }
}

/**
 * Agent Audit Log Helper
 */
function addTimelineStep(title, detail, level = "info") {
    const timeline = document.getElementById("action-timeline");
    if (!timeline) return;

    const item = document.createElement("div");
    item.className = `audit-item ${level}`;
    const time = new Date().toLocaleTimeString();

    item.innerHTML = `
        <span class="audit-time">[${time}]</span>
        <div class="audit-msg">
            <strong>${escapeHtml(title)}:</strong> ${escapeHtml(detail)}
        </div>
    `;
    timeline.prepend(item);
}

function resetGraphView() {
    if (!cy) return;
    cy.elements().removeClass('dimmed attack-node attack-edge blast-target blast-direct blast-indirect active-edge');
    cy.animate({
        fit: { padding: 45 },
        duration: 250
    });
}

function fitGraph() {
    if (cy) {
        resetGraphView();
        cy.fit(null, 45);
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
    if (body) body.classList.toggle("hidden");
}

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add("hidden");
}

function handleBackdropClick(event, modalId) {
    if (event.target.id === modalId) {
        closeModal(modalId);
    }
}

function setActiveTab(tab) {
    // Currently graph is always visible
}

function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
