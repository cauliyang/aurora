// globalAnalysis.js
// Global (cross-graph) analysis dashboard for multi-graph TSG/GTA files.
//
// Aggregates every graph in STATE.graph_jsons into a set of linked
// visualizations:
//   1. All-edges circle plot (circos) across all graphs
//   2. Edge variation (SV) type frequency bar chart
//   3. Edge weight distribution histogram
//   4. Per-graph summary statistics table
//
// The dashboard is bidirectionally connected to the single-graph view:
//   - Charts -> Graph: clicking a circle-plot ribbon / summary row switches
//     STATE.cy to the owning graph, selects/centers the element, and jumps to
//     the Graph View tab.
//   - Graph -> Charts: selecting an edge in the single graph highlights the
//     matching ribbon/bar and the active graph row (see highlightInCharts).
//
// Data source is the shared STATE.graph_jsons array (array of JSON strings,
// one per graph). Each graph's edges are parsed from raw JSON here (there is
// no live cy for non-loaded graphs), mirroring the breakpoint parsing logic
// used by breakpointCirclePlot.js so SV typing stays consistent.

import { STATE } from "./graph";
import {
    colorFor,
    normaliseChrom,
    HG38_CHROM_SIZES,
    loadD3,
    renderCirclePlot,
    renderLegend,
    ensureStyles,
    geneLabelForNode,
} from "./breakpointCirclePlot";
import {
    loadGeneData,
    annotateNodeData,
    isGeneDataReady,
} from "./geneAnnotation";

// --------------------------------------------------------------------------
// Gene aggregation cache (built on demand by annotateGenesAllGraphs)
// --------------------------------------------------------------------------
let _geneCache = null;
let _geneCacheKey = null;

// --------------------------------------------------------------------------
// Aggregation cache (recomputed when graph_jsons identity / length changes)
// --------------------------------------------------------------------------
let _cache = null;
let _cacheKey = null;

function cacheKey() {
    // Cheap identity key: number of graphs + length of first/last JSON string.
    const n = STATE.graph_jsons ? STATE.graph_jsons.length : 0;
    if (!n) return "empty";
    const first = STATE.graph_jsons[0]?.length || 0;
    const last = STATE.graph_jsons[n - 1]?.length || 0;
    return `${n}:${first}:${last}`;
}

/**
 * Invalidate the aggregation cache. Call after a new file upload.
 */
export function invalidateGlobalAnalysisCache() {
    _cache = null;
    _cacheKey = null;
    _geneCache = null;
    _geneCacheKey = null;
}

// --------------------------------------------------------------------------
// JSON-based breakpoint parser (mirrors breakpointCirclePlot.parseEdgeBreakpoint
// but operates on raw graph JSON instead of live cytoscape edges).
// --------------------------------------------------------------------------
function parseEdgeBreakpointFromData(edgeData, nodeMap, graphIndex) {
    const bpStr = edgeData.breakpoints;
    const srcData = nodeMap.get(edgeData.source);
    const tgtData = nodeMap.get(edgeData.target);
    let chr1, chr2, pos1, pos2, svType;

    if (typeof bpStr === "string" && bpStr.length > 0) {
        const parts = bpStr.split(",").map((s) => s.trim());
        if (parts.length >= 5) {
            [chr1, chr2, pos1, pos2, svType] = parts;
            pos1 = Number(pos1);
            pos2 = Number(pos2);
        }
    }

    // Fallback: reconstruct from connected node coordinates
    if (!chr1 || !chr2 || !Number.isFinite(pos1) || !Number.isFinite(pos2)) {
        if (!srcData || !tgtData) return null;
        chr1 = srcData.chrom;
        chr2 = tgtData.chrom;
        pos1 = Number(srcData.ref_end);
        pos2 = Number(tgtData.ref_start);
        if (!chr1 || !chr2 || !Number.isFinite(pos1) || !Number.isFinite(pos2)) {
            return null;
        }
        if (!svType) svType = chr1 === chr2 ? "INTRA" : "INTER";
    }

    chr1 = normaliseChrom(chr1);
    chr2 = normaliseChrom(chr2);

    return {
        edgeId: edgeData.id,
        displayLabel: edgeData.label || edgeData.name || edgeData.id ||
            `${edgeData.source || "?"} -> ${edgeData.target || "?"}`,
        sourceId: edgeData.source,
        targetId: edgeData.target,
        weight: Number(edgeData.weight) || 1,
        chr1,
        chr2,
        pos1,
        pos2,
        svType: (svType || "").toUpperCase() || "DEFAULT",
        sourceGene: resolveGeneLabel(edgeData.source, srcData, graphIndex),
        targetGene: resolveGeneLabel(edgeData.target, tgtData, graphIndex),
    };
}

/**
 * Resolve a gene label for a node in a (possibly non-loaded) graph.
 * Annotations live on the live Cytoscape nodes, so for the currently-loaded
 * graph we prefer the live node (which may carry user gene annotations);
 * otherwise we fall back to whatever gene fields exist in the raw JSON node
 * data, defaulting to "NEO".
 * @param {string} nodeId
 * @param {object} rawNodeData - node data from the parsed JSON
 * @param {number} graphIndex
 * @returns {string}
 */
function resolveGeneLabel(nodeId, rawNodeData, graphIndex) {
    if (
        graphIndex === STATE.currentGraphIndex &&
        STATE.cy &&
        nodeId != null
    ) {
        const live = STATE.cy.getElementById(String(nodeId));
        if (live && !live.empty()) return geneLabelForNode(live);
    }
    return geneLabelForNode(rawNodeData);
}

// --------------------------------------------------------------------------
// Collect & aggregate all graphs
// --------------------------------------------------------------------------
/**
 * Parse every graph in STATE.graph_jsons and build aggregate structures.
 * Result is cached until graph_jsons changes.
 * @returns {{
 *   perGraph: Array<object>,
 *   breakpoints: Array<object>,
 *   svTypeCounts: Map<string, number>,
 *   weights: number[],
 *   totalNodes: number,
 *   totalEdges: number
 * }}
 */
export function collectAllGraphData() {
    const key = cacheKey();
    if (_cache && _cacheKey === key) return _cache;

    const perGraph = [];
    const breakpoints = [];
    const svTypeCounts = new Map();
    const weights = [];
    let totalNodes = 0;
    let totalEdges = 0;

    const jsons = STATE.graph_jsons || [];
    for (let gi = 0; gi < jsons.length; gi++) {
        let graph;
        try {
            graph = JSON.parse(jsons[gi]);
        } catch (e) {
            console.warn(`[globalAnalysis] Failed to parse graph ${gi}:`, e);
            continue;
        }

        const els = graph.elements || graph;
        const nodes = (els.nodes || []).map((n) => n.data || n);
        const edges = (els.edges || []).map((e) => e.data || e);

        const nodeMap = new Map();
        for (const nd of nodes) nodeMap.set(nd.id, nd);

        const chromosomes = new Set();
        const svTypesInGraph = new Set();
        let graphWeightSum = 0;

        for (const ed of edges) {
            const bp = parseEdgeBreakpointFromData(ed, nodeMap, gi);
            if (!bp) continue;
            bp.graphIndex = gi;
            // Only include in the circle plot if both chroms are known hg38
            if (HG38_CHROM_SIZES[bp.chr1] && HG38_CHROM_SIZES[bp.chr2]) {
                breakpoints.push(bp);
            }
            svTypeCounts.set(bp.svType, (svTypeCounts.get(bp.svType) || 0) + 1);
            svTypesInGraph.add(bp.svType);
            weights.push(bp.weight);
            graphWeightSum += bp.weight;
            if (bp.chr1) chromosomes.add(bp.chr1);
            if (bp.chr2) chromosomes.add(bp.chr2);
        }

        // Also collect chromosomes from node coordinates
        for (const nd of nodes) {
            const c = normaliseChrom(nd.chrom);
            if (c) chromosomes.add(c);
        }

        totalNodes += nodes.length;
        totalEdges += edges.length;

        perGraph.push({
            graphIndex: gi,
            graphId: (STATE.graph_ids && STATE.graph_ids[gi]) || null,
            nodeCount: nodes.length,
            edgeCount: edges.length,
            svTypeCount: svTypesInGraph.size,
            chromosomes: Array.from(chromosomes).sort(),
            totalWeight: graphWeightSum,
        });
    }

    _cache = {
        perGraph,
        breakpoints,
        svTypeCounts,
        weights,
        totalNodes,
        totalEdges,
    };
    _cacheKey = key;
    return _cache;
}

// --------------------------------------------------------------------------
// Gene annotation across all graphs
// --------------------------------------------------------------------------
/**
 * Resolve the gene-name list for a node. Prefers existing annotations on the
 * raw node data; otherwise runs span/exon overlap annotation against the loaded
 * gene database via annotateNodeData. Returns an array of unique gene names.
 * @param {Object} nodeData
 * @returns {string[]}
 */
function geneNamesForNodeData(nodeData) {
    let annotations = nodeData.geneAnnotations;
    if (!Array.isArray(annotations) || annotations.length === 0) {
        annotations = annotateNodeData(nodeData);
    }
    if (!Array.isArray(annotations) || annotations.length === 0) return [];
    const names = annotations.map((a) => a && a.geneName).filter(Boolean);
    return Array.from(new Set(names));
}

/**
 * Annotate every node across all graphs and build gene-level aggregates:
 *   - geneFrequency: gene -> total node occurrences across all graphs
 *   - geneGraphs:    gene -> Set of graph indices containing it
 *   - perGraphGenes: graphIndex -> Set of gene names in that graph
 *   - sharedDistribution: number of graphs (k) -> count of genes shared by k graphs
 *
 * Requires the gene database to be loaded (loadGeneData). Cached until the
 * graph data changes.
 * @returns {Promise<object|null>}
 */
export async function annotateGenesAllGraphs() {
    const key = cacheKey();
    if (_geneCache && _geneCacheKey === key) return _geneCache;

    if (!isGeneDataReady()) {
        const ok = await loadGeneData();
        if (!ok) return null;
    }

    const geneFrequency = new Map(); // gene -> occurrence count (nodes)
    const geneGraphs = new Map(); // gene -> Set<graphIndex>
    const perGraphGenes = []; // [graphIndex] -> Set<gene>
    let annotatedNodes = 0;
    let totalNodes = 0;

    const jsons = STATE.graph_jsons || [];
    for (let gi = 0; gi < jsons.length; gi++) {
        let graph;
        try {
            graph = JSON.parse(jsons[gi]);
        } catch (e) {
            perGraphGenes[gi] = new Set();
            continue;
        }
        const els = graph.elements || graph;
        const nodes = (els.nodes || []).map((n) => n.data || n);
        const genesInGraph = new Set();

        for (const nd of nodes) {
            totalNodes++;
            const names = geneNamesForNodeData(nd);
            if (names.length) annotatedNodes++;
            for (const name of names) {
                geneFrequency.set(name, (geneFrequency.get(name) || 0) + 1);
                genesInGraph.add(name);
                if (!geneGraphs.has(name)) geneGraphs.set(name, new Set());
                geneGraphs.get(name).add(gi);
            }
        }
        perGraphGenes[gi] = genesInGraph;
    }

    // Distribution: how many genes are shared by exactly k graphs.
    const sharedDistribution = new Map(); // k -> gene count
    for (const graphs of geneGraphs.values()) {
        const k = graphs.size;
        sharedDistribution.set(k, (sharedDistribution.get(k) || 0) + 1);
    }

    _geneCache = {
        geneFrequency,
        geneGraphs,
        perGraphGenes,
        sharedDistribution,
        annotatedNodes,
        totalNodes,
        graphCount: jsons.length,
    };
    _geneCacheKey = key;
    return _geneCache;
}

// --------------------------------------------------------------------------
// Cross-graph navigation helper (Charts -> Graph)
// --------------------------------------------------------------------------
function navigateToGraph(graphIndex) {
    // Use the window-exposed helper to avoid a static import cycle with
    // eventHandlers.js (which imports this module).
    if (window.loadGraphByIndex) window.loadGraphByIndex(graphIndex);
    activateGraphViewTab();
    // The graph is built while the Graph View pane is still hidden (0x0
    // container), so its initial fit is wrong. Re-fit once the pane is visible.
    fitGraphViewWhenVisible();
}

/**
 * Resize the Cytoscape viewport and fit the whole graph into view, deferred
 * until the Graph View tab is actually shown (the container has no real size
 * while its tab-pane is hidden, which breaks fit/center).
 */
function fitGraphViewWhenVisible() {
    const doFit = () => {
        if (!STATE.cy) return;
        STATE.cy.resize();
        STATE.cy.fit(STATE.cy.elements(), 40);
    };
    const tabBtn = document.getElementById("graphViewTab");
    if (tabBtn) {
        // Fire after the tab transition completes (one-shot listener).
        tabBtn.addEventListener("shown.bs.tab", () => requestAnimationFrame(doFit), {
            once: true,
        });
    }
    // Fallback in case the tab is already visible (no shown.bs.tab fires).
    setTimeout(doFit, 250);
}

function activateGraphViewTab() {
    const tabBtn = document.getElementById("graphViewTab");
    if (tabBtn && window.bootstrap?.Tab) {
        window.bootstrap.Tab.getOrCreateInstance(tabBtn).show();
    } else if (tabBtn) {
        tabBtn.click();
    }
}

// --------------------------------------------------------------------------
// Chart renderers (D3)
// --------------------------------------------------------------------------
function renderSummaryTable(container, perGraph, agg) {
    if (!perGraph.length) {
        container.innerHTML =
            '<div class="ga-empty">No graphs to summarize.</div>';
        return;
    }

    const rows = perGraph
        .map((g) => {
            const label = g.graphId || `Graph ${g.graphIndex + 1}`;
            const active = g.graphIndex === STATE.currentGraphIndex;
            return `
        <tr class="ga-summary-row${active ? " ga-active-row" : ""}"
            data-graph-index="${g.graphIndex}"
            title="Click to load this graph">
          <td><code>${escapeHtml(label)}</code></td>
          <td class="text-end">${g.nodeCount}</td>
          <td class="text-end">${g.edgeCount}</td>
          <td class="text-end">${g.svTypeCount}</td>
          <td class="text-end">${g.totalWeight}</td>
        </tr>`;
        })
        .join("");

    container.innerHTML = `
    <div class="table-responsive ga-table-wrap">
      <table class="table table-sm table-hover align-middle ga-summary-table mb-0">
        <thead>
          <tr>
            <th>Graph</th>
            <th class="text-end">Nodes</th>
            <th class="text-end">Edges</th>
            <th class="text-end">SV types</th>
            <th class="text-end">&Sigma; weight</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr class="ga-total-row">
            <td><strong>Total (${perGraph.length})</strong></td>
            <td class="text-end"><strong>${agg.totalNodes}</strong></td>
            <td class="text-end"><strong>${agg.totalEdges}</strong></td>
            <td class="text-end"><strong>${agg.svTypeCounts.size}</strong></td>
            <td class="text-end"><strong>${agg.weights.reduce((a, b) => a + b, 0)}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>`;

    container.querySelectorAll(".ga-summary-row").forEach((row) => {
        row.addEventListener("click", () => {
            const idx = parseInt(row.getAttribute("data-graph-index"), 10);
            navigateToGraph(idx);
        });
    });
}

function renderSvTypeFrequency(container, svTypeCounts) {
    const d3 = window.d3;
    container.innerHTML = "";

    const data = Array.from(svTypeCounts.entries())
        .map(([svType, count]) => ({ svType, count }))
        .sort((a, b) => b.count - a.count);

    if (!data.length) {
        container.innerHTML = '<div class="ga-empty">No edges to summarize.</div>';
        return;
    }

    const W = container.clientWidth || 480;
    const H = container.clientHeight || 300;
    const margin = { top: 16, right: 16, bottom: 48, left: 48 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const svg = d3
        .select(container)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${W} ${H}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
        .scaleBand()
        .domain(data.map((d) => d.svType))
        .range([0, innerW])
        .padding(0.25);

    const y = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.count)])
        .nice()
        .range([innerH, 0]);

    g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-35)")
        .style("text-anchor", "end")
        .style("font-size", "10px");

    g.append("g").call(d3.axisLeft(y).ticks(5)).style("font-size", "10px");

    g.selectAll(".ga-bar")
        .data(data)
        .join("rect")
        .attr("class", "ga-bar ga-svbar")
        .attr("data-svtype", (d) => d.svType)
        .attr("x", (d) => x(d.svType))
        .attr("y", (d) => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", (d) => innerH - y(d.count))
        .attr("fill", (d) => colorFor(d.svType))
        .append("title")
        .text((d) => `${d.svType}: ${d.count} edge(s)`);

    g.selectAll(".ga-bar-label")
        .data(data)
        .join("text")
        .attr("class", "ga-bar-label")
        .attr("x", (d) => x(d.svType) + x.bandwidth() / 2)
        .attr("y", (d) => y(d.count) - 4)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "var(--bs-body-color, #333)")
        .text((d) => d.count);
}

function renderWeightHistogram(container, weights) {
    const d3 = window.d3;
    container.innerHTML = "";

    if (!weights.length) {
        container.innerHTML =
            '<div class="ga-empty">No edge weights to plot.</div>';
        return;
    }

    const W = container.clientWidth || 480;
    const H = container.clientHeight || 300;
    const margin = { top: 16, right: 16, bottom: 40, left: 48 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const svg = d3
        .select(container)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${W} ${H}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const maxW = d3.max(weights);
    const x = d3.scaleLinear().domain([0, maxW]).nice().range([0, innerW]);

    const bins = d3
        .bin()
        .domain(x.domain())
        .thresholds(Math.min(20, Math.max(5, Math.ceil(Math.sqrt(weights.length)))))(
            weights
        );

    const y = d3
        .scaleLinear()
        .domain([0, d3.max(bins, (b) => b.length)])
        .nice()
        .range([innerH, 0]);

    g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).ticks(6))
        .style("font-size", "10px");

    g.append("g").call(d3.axisLeft(y).ticks(5)).style("font-size", "10px");

    g.selectAll(".ga-hist-bar")
        .data(bins)
        .join("rect")
        .attr("class", "ga-bar ga-hist-bar")
        .attr("x", (b) => x(b.x0) + 1)
        .attr("y", (b) => y(b.length))
        .attr("width", (b) => Math.max(0, x(b.x1) - x(b.x0) - 1))
        .attr("height", (b) => innerH - y(b.length))
        .attr("fill", "#377eb8")
        .append("title")
        .text((b) => `weight ${b.x0}–${b.x1}: ${b.length} edge(s)`);

    // Axis label
    svg.append("text")
        .attr("x", margin.left + innerW / 2)
        .attr("y", H - 4)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("fill", "var(--bs-body-color, #333)")
        .text("Edge weight");
}

// State for the global circle plot's grouped/expanded mode and legend filter.
const _circleState = {
    items: [],
    activeTypes: new Set(),
    expand: false,
};

async function renderGlobalCirclePlot(container, breakpoints) {
    container.innerHTML = "";
    // Ensure the circle-plot legend chip styles are present even if the
    // Graph View modal was never opened on this page.
    ensureStyles();
    const legendEl = document.getElementById("ga-circle-legend");
    const expandBtn = document.getElementById("ga-circle-expand-btn");

    if (!breakpoints.length) {
        container.innerHTML =
            '<div class="ga-empty">No breakpoints across graphs to plot.</div>';
        if (legendEl) legendEl.innerHTML = "";
        return;
    }

    // Draw ALL edges from ALL graphs — the global view is not subject to the
    // single-graph MinEdge toolbar filter.
    _circleState.items = breakpoints;
    const types = Array.from(new Set(breakpoints.map((b) => b.svType))).sort();
    _circleState.activeTypes = new Set(types);
    _circleState.expand = false;

    // Reuse the circos renderer; click-through carries graphIndex for
    // cross-graph navigation (see focusEdgeOnGraph).
    drawGlobalCircle(container);

    // Legend: toggle SV types on/off (hides matching ribbons + count badges).
    if (legendEl) {
        renderLegend(legendEl, types, _circleState.activeTypes, () => {
            const svg = container.querySelector("svg");
            if (!svg) return;
            const filterFn = function() {
                const t = this.getAttribute("data-sv-type");
                return _circleState.activeTypes.has(t) ? null : "none";
            };
            const d3sel = window.d3.select(svg);
            d3sel.selectAll(".ribbons path").style("display", filterFn);
            d3sel.selectAll(".ribbon-count-badge").style("display", filterFn);
        });
    }

    // Group/Expand toggle (clone to drop any stale listeners across renders).
    if (expandBtn) {
        const fresh = expandBtn.cloneNode(true);
        expandBtn.parentNode.replaceChild(fresh, expandBtn);
        syncExpandBtn(fresh);
        fresh.addEventListener("click", () => {
            _circleState.expand = !_circleState.expand;
            syncExpandBtn(fresh);
            drawGlobalCircle(container);
        });
    }
}

function drawGlobalCircle(container) {
    renderCirclePlot(container, _circleState.items, {
        expand: _circleState.expand,
        activeTypes: _circleState.activeTypes,
    });
}

function syncExpandBtn(btn) {
    btn.innerHTML = _circleState.expand
        ? '<i class="bi bi-arrows-expand me-1"></i> Expanded'
        : '<i class="bi bi-arrows-collapse me-1"></i> Grouped';
    btn.classList.toggle("btn-outline-secondary", !_circleState.expand);
    btn.classList.toggle("btn-secondary", _circleState.expand);
}

// --------------------------------------------------------------------------
// Gene analysis renderers
// --------------------------------------------------------------------------
const GENE_TOP_N = 25;

/**
 * Render the top-N most frequent genes as a horizontal bar chart, where each
 * bar is annotated with how many graphs share that gene.
 */
function renderGeneFrequency(container, gene) {
    const d3 = window.d3;
    container.innerHTML = "";

    const data = Array.from(gene.geneFrequency.entries())
        .map(([name, count]) => ({
            name,
            count,
            graphs: gene.geneGraphs.get(name)?.size || 0,
        }))
        .sort((a, b) => b.count - a.count || b.graphs - a.graphs)
        .slice(0, GENE_TOP_N);

    if (!data.length) {
        container.innerHTML =
            '<div class="ga-empty">No genes annotated. No nodes overlapped the gene database.</div>';
        return;
    }

    const rowH = 20;
    const margin = { top: 8, right: 48, bottom: 24, left: 120 };
    const W = container.clientWidth || 480;
    const innerW = Math.max(120, W - margin.left - margin.right);
    const innerH = data.length * rowH;
    const H = innerH + margin.top + margin.bottom;

    const svg = d3
        .select(container)
        .append("svg")
        .attr("width", "100%")
        .attr("height", H)
        .attr("viewBox", `0 0 ${W} ${H}`)
        .attr("preserveAspectRatio", "xMinYMin meet");

    const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.count)])
        .range([0, innerW]);
    const y = d3
        .scaleBand()
        .domain(data.map((d) => d.name))
        .range([0, innerH])
        .padding(0.18);

    // Color by how widely shared the gene is (graphs containing it).
    const maxGraphs = Math.max(1, gene.graphCount);
    const color = d3
        .scaleSequential(d3.interpolateViridis)
        .domain([1, maxGraphs]);

    g.append("g").call(d3.axisLeft(y).tickSize(0)).style("font-size", "10px");

    g.selectAll(".ga-gene-bar")
        .data(data)
        .join("rect")
        .attr("class", "ga-bar ga-gene-bar")
        .attr("x", 0)
        .attr("y", (d) => y(d.name))
        .attr("width", (d) => Math.max(1, x(d.count)))
        .attr("height", y.bandwidth())
        .attr("fill", (d) => color(d.graphs))
        .append("title")
        .text(
            (d) =>
                `${d.name}: ${d.count} node(s), in ${d.graphs}/${gene.graphCount} graph(s)`
        );

    // Count + shared-graph label at the end of each bar.
    g.selectAll(".ga-gene-label")
        .data(data)
        .join("text")
        .attr("class", "ga-gene-label")
        .attr("x", (d) => x(d.count) + 4)
        .attr("y", (d) => y(d.name) + y.bandwidth() / 2)
        .attr("dominant-baseline", "central")
        .style("font-size", "9.5px")
        .style("fill", "var(--bs-body-color, #333)")
        .text((d) => `${d.count} · ${d.graphs}g`);
}

/**
 * Render the cross-graph sharing summary: a small table + distribution of how
 * many genes are shared by exactly k graphs, plus the most widely shared genes.
 */
function renderGeneSharing(container, gene) {
    container.innerHTML = "";

    if (!gene.geneFrequency.size) {
        container.innerHTML =
            '<div class="ga-empty">No genes annotated.</div>';
        return;
    }

    const totalGenes = gene.geneFrequency.size;
    const shared = Array.from(gene.geneGraphs.values()).filter(
        (s) => s.size > 1
    ).length;
    const unique = totalGenes - shared;

    // Distribution rows: k graphs -> gene count (descending k).
    const distRows = Array.from(gene.sharedDistribution.entries())
        .sort((a, b) => b[0] - a[0])
        .map(
            ([k, n]) => `
        <tr>
          <td>${k} graph${k === 1 ? "" : "s"}</td>
          <td class="text-end">${n}</td>
          <td class="text-end text-muted">${((n / totalGenes) * 100).toFixed(0)}%</td>
        </tr>`
        )
        .join("");

    // Most widely shared genes (by number of graphs, then frequency).
    const topShared = Array.from(gene.geneGraphs.entries())
        .map(([name, graphs]) => ({
            name,
            graphs: graphs.size,
            count: gene.geneFrequency.get(name) || 0,
        }))
        .filter((d) => d.graphs > 1)
        .sort((a, b) => b.graphs - a.graphs || b.count - a.count)
        .slice(0, 15)
        .map(
            (d) =>
                `<span class="ga-gene-chip" title="${escapeHtml(d.name)}: in ${d.graphs} graphs, ${d.count} nodes">
           ${escapeHtml(d.name)} <span class="ga-gene-chip-badge">${d.graphs}g</span>
         </span>`
        )
        .join("");

    container.innerHTML = `
    <div class="ga-share-stats">
      <div class="ga-share-stat">
        <div class="ga-share-num">${totalGenes}</div>
        <div class="ga-share-lbl">genes</div>
      </div>
      <div class="ga-share-stat">
        <div class="ga-share-num">${shared}</div>
        <div class="ga-share-lbl">shared (&gt;1 graph)</div>
      </div>
      <div class="ga-share-stat">
        <div class="ga-share-num">${unique}</div>
        <div class="ga-share-lbl">graph-unique</div>
      </div>
      <div class="ga-share-stat">
        <div class="ga-share-num">${gene.annotatedNodes}/${gene.totalNodes}</div>
        <div class="ga-share-lbl">nodes annotated</div>
      </div>
    </div>

    <div class="ga-share-grid">
      <div>
        <div class="ga-share-subtitle">Sharing distribution</div>
        <table class="table table-sm ga-share-table mb-0">
          <thead><tr><th>Shared by</th><th class="text-end">Genes</th><th class="text-end">%</th></tr></thead>
          <tbody>${distRows}</tbody>
        </table>
      </div>
      <div>
        <div class="ga-share-subtitle">Most widely shared genes</div>
        <div class="ga-gene-chips">${topShared || '<span class="text-muted">None shared across graphs.</span>'}</div>
      </div>
    </div>`;
}

/**
 * Annotate genes across all graphs and render the gene frequency + sharing
 * panels. Triggered by the "Annotate Genes" button.
 */
export async function renderGeneAnalysis() {
    const freqEl = document.getElementById("ga-gene-frequency");
    const shareEl = document.getElementById("ga-gene-sharing");
    if (!freqEl || !shareEl) return;

    if (!STATE.graph_jsons || STATE.graph_jsons.length === 0) {
        window.showAlert?.("Upload a TSG/GTA file first.", "warning", 2500);
        return;
    }

    const loadingId = `ga-genes-${Date.now()}`;
    window.loadingIndicator?.show(loadingId, {
        message: "Annotating genes across all graphs...",
        type: "spinner",
        overlay: true,
    });

    try {
        await loadD3();
        const gene = await annotateGenesAllGraphs();
        if (!gene) {
            window.showAlert?.("Failed to load gene database.", "error");
            return;
        }
        renderGeneFrequency(freqEl, gene);
        renderGeneSharing(shareEl, gene);
        window.showAlert?.(
            `Annotated ${gene.annotatedNodes}/${gene.totalNodes} nodes; ${gene.geneFrequency.size} genes found.`,
            "success",
            3000
        );
    } catch (e) {
        console.error("[globalAnalysis] Gene analysis failed:", e);
        window.showAlert?.("Gene analysis failed: " + e.message, "error");
    } finally {
        window.loadingIndicator?.hide(loadingId);
    }
}

// --------------------------------------------------------------------------
// Orchestrator
// --------------------------------------------------------------------------
/**
 * Render the full Global Analysis dashboard into its panel containers.
 * Lazy: should be called when the Global Analysis tab is shown (containers
 * must be visible so D3 can size SVGs correctly).
 */
export async function renderGlobalAnalysis() {
    const summaryEl = document.getElementById("ga-summary-table");
    const svTypeEl = document.getElementById("ga-svtype-chart");
    const histEl = document.getElementById("ga-weight-hist");
    const circleEl = document.getElementById("ga-circle-plot");

    if (!summaryEl || !svTypeEl || !histEl || !circleEl) {
        console.warn("[globalAnalysis] Dashboard containers not found");
        return;
    }

    if (!STATE.graph_jsons || STATE.graph_jsons.length === 0) {
        const empty =
            '<div class="ga-empty"><i class="bi bi-info-circle me-2"></i>Upload a TSG/GTA file to see global analysis.</div>';
        summaryEl.innerHTML = empty;
        svTypeEl.innerHTML = "";
        histEl.innerHTML = "";
        circleEl.innerHTML = "";
        return;
    }

    try {
        await loadD3();
    } catch (e) {
        console.error("[globalAnalysis] Failed to load D3:", e);
        window.showAlert?.("Failed to load D3 for charts", "error");
        return;
    }

    const agg = collectAllGraphData();

    renderSummaryTable(summaryEl, agg.perGraph, agg);
    renderSvTypeFrequency(svTypeEl, agg.svTypeCounts);
    renderWeightHistogram(histEl, agg.weights);
    await renderGlobalCirclePlot(circleEl, agg.breakpoints);
}

// --------------------------------------------------------------------------
// Graph -> Charts linking
// --------------------------------------------------------------------------
/**
 * Highlight the currently-selected edge / graph within the dashboard charts.
 * No-op if the dashboard has not been rendered yet (keeps the single-graph
 * view decoupled from the analysis panel).
 * @param {string} edgeId
 * @param {string} svType
 * @param {number} graphIndex
 */
export function highlightInCharts(edgeId, svType, graphIndex) {
    const svTypeEl = document.getElementById("ga-svtype-chart");
    const summaryEl = document.getElementById("ga-summary-table");
    if (!svTypeEl && !summaryEl) return;

    // Emphasize matching SV-type bar
    if (svTypeEl) {
        svTypeEl.querySelectorAll(".ga-svbar").forEach((bar) => {
            const match = bar.getAttribute("data-svtype") === svType;
            bar.classList.toggle("ga-bar-active", match);
        });
    }

    // Emphasize active graph row
    if (summaryEl) {
        summaryEl.querySelectorAll(".ga-summary-row").forEach((row) => {
            const match =
                parseInt(row.getAttribute("data-graph-index"), 10) === graphIndex;
            row.classList.toggle("ga-active-row", match);
        });
    }
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
function escapeHtml(s) {
    if (s == null) return "";
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Expose for debugging / console use
window.renderGlobalAnalysis = renderGlobalAnalysis;
window.renderGeneAnalysis = renderGeneAnalysis;
