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

// --------------------------------------------------------------------------
// Rendering caps for very large files. Above these thresholds we virtualize /
// cap / defer heavy renders so the UI stays responsive at 7000+ graphs.
// --------------------------------------------------------------------------
const SUMMARY_TABLE_MAX_ROWS = 500; // rows rendered at once (see renderSummaryTable)

// Current sort for the per-graph summary table. `key` maps to a perGraph field;
// `dir` is 1 (ascending) or -1 (descending). Default: largest graphs first.
const _summarySort = { key: "edgeCount", dir: -1 };

// Last filtered aggregate (after applyGlobalFilters), retained so the CSV
// export can serialize the full filtered dataset (not just visible rows).
let _lastFilteredAgg = null;

// Signature of the last full dashboard render (data cache key + active filters).
// Used to skip a redundant re-render when the tab is re-shown but nothing
// changed — switching Graph View <-> Global Analysis repeatedly was re-drawing
// every chart each time even though the underlying data was identical.
let _lastRenderSignature = null;

const SCATTER_MAX_POINTS = 2000; // circles drawn in the nodes-vs-edges scatter

// --------------------------------------------------------------------------
// Global-analysis graph filters (Phase C). Filters which graphs are INCLUDED
// in the dashboard. Empty / zero values mean "no constraint".
// --------------------------------------------------------------------------
const _globalFilters = {
    minNodes: 0,
    minEdges: 0,
    minTotalWeight: 0,
    minTotalJsr: 0,
    svType: "", // require this SV type to be present in the graph
    chrom: "", // require this chromosome to be present in the graph
};

/**
 * Current global-analysis graph filters (read-only copy).
 * @returns {object}
 */
export function getGlobalFilters() {
    return { ..._globalFilters };
}

/**
 * Update the global-analysis graph filters.
 * @param {Partial<typeof _globalFilters>} patch
 */
export function setGlobalFilters(patch) {
    Object.assign(_globalFilters, patch);
}

/**
 * Update the filter status text and the toolbar badge to reflect how many
 * graphs are currently shown out of the total.
 * @param {number} shown
 * @param {number} total
 */
function updateFilterStatusUI(shown, total) {
    const statusEl = document.getElementById("ga-filter-status");
    if (statusEl) {
        statusEl.textContent = hasActiveGlobalFilters() ?
            `Showing ${shown.toLocaleString()} of ${total.toLocaleString()} graphs (filtered).` :
            `Showing all ${total.toLocaleString()} graphs.`;
    }
    const badge = document.getElementById("ga-filter-count");
    if (badge) {
        if (hasActiveGlobalFilters()) {
            badge.textContent = `${shown.toLocaleString()}/${total.toLocaleString()}`;
            badge.classList.remove("d-none");
        } else {
            badge.classList.add("d-none");
        }
    }
}

/**
 * Whether any global graph filter is currently active.
 * @returns {boolean}
 */
function hasActiveGlobalFilters() {
    return (
        _globalFilters.minNodes > 0 ||
        _globalFilters.minEdges > 0 ||
        _globalFilters.minTotalWeight > 0 ||
        _globalFilters.minTotalJsr > 0 ||
        !!_globalFilters.svType ||
        !!_globalFilters.chrom
    );
}

/**
 * Apply the global graph filters to an aggregate, returning a filtered view
 * (perGraph + breakpoints restricted to the qualifying graphs). SV-type counts
 * and weights are recomputed from the retained breakpoints so charts stay
 * consistent. The original aggregate is never mutated.
 * @param {object} agg - result from collectAllGraphData(Async)
 * @returns {object} filtered aggregate (same shape) plus `filtered` metadata
 */
function applyGlobalFilters(agg) {
    if (!hasActiveGlobalFilters()) {
        return { ...agg, filteredCount: agg.perGraph.length, totalGraphs: agg.perGraph.length };
    }

    const f = _globalFilters;
    const svWanted = (f.svType || "").toUpperCase();
    const chromWanted = f.chrom ? normaliseChrom(f.chrom) : "";

    // Pre-index breakpoints by graph so we can test SV/chrom presence and
    // rebuild the retained breakpoint list in one pass.
    const bpByGraph = new Map();
    for (const bp of agg.breakpoints) {
        let arr = bpByGraph.get(bp.graphIndex);
        if (!arr) {
            arr = [];
            bpByGraph.set(bp.graphIndex, arr);
        }
        arr.push(bp);
    }

    const perGraph = [];
    const breakpoints = [];
    const svTypeCounts = new Map();
    const weights = [];
    const allPathLengths = [];
    const pathCounts = [];
    let totalNodes = 0;
    let totalEdges = 0;

    for (const g of agg.perGraph) {
        if (g.nodeCount < f.minNodes) continue;
        if (g.edgeCount < f.minEdges) continue;
        if ((g.totalWeight || 0) < f.minTotalWeight) continue;
        if ((g.totalJsr || 0) < f.minTotalJsr) continue;

        const gbps = bpByGraph.get(g.graphIndex) || [];

        if (svWanted) {
            const hasSv = gbps.some((bp) => bp.svType === svWanted);
            if (!hasSv) continue;
        }
        if (chromWanted) {
            const hasChrom =
                (g.chromosomes && g.chromosomes.includes(chromWanted)) ||
                gbps.some((bp) => bp.chr1 === chromWanted || bp.chr2 === chromWanted);
            if (!hasChrom) continue;
        }

        perGraph.push(g);
        totalNodes += g.nodeCount;
        totalEdges += g.edgeCount;
        for (const bp of gbps) {
            breakpoints.push(bp);
            svTypeCounts.set(bp.svType, (svTypeCounts.get(bp.svType) || 0) + 1);
            weights.push(bp.weight);
        }
        if (g.pathLengths) {
            for (const len of g.pathLengths) allPathLengths.push(len);
        }
        pathCounts.push(g.pathCount || 0);
    }

    return {
        perGraph,
        breakpoints,
        svTypeCounts,
        weights,
        allPathLengths,
        pathCounts,
        totalNodes,
        totalEdges,
        filteredCount: perGraph.length,
        totalGraphs: agg.perGraph.length,
    };
}

function cacheKey() {
    // Identity key combining graph count, total length, and a cheap content
    // hash so that different files (even of identical size) get distinct keys.
    const jsons = STATE.graph_jsons || [];
    const n = jsons.length;
    if (!n) return "empty";

    let totalLen = 0;
    let hash = 5381; // djb2
    for (let i = 0; i < n; i++) {
        const s = jsons[i] || "";
        totalLen += s.length;
        // Sample a handful of chars per graph (cheap but distinguishing).
        const step = Math.max(1, Math.floor(s.length / 64));
        for (let j = 0; j < s.length; j += step) {
            hash = ((hash << 5) + hash + s.charCodeAt(j)) | 0;
        }
    }
    return `${n}:${totalLen}:${hash >>> 0}`;
}

/**
 * Invalidate the aggregation cache. Call after a new file upload.
 */
export function invalidateGlobalAnalysisCache() {
    _cache = null;
    _cacheKey = null;
    _geneCache = null;
    _geneCacheKey = null;
    _lastRenderSignature = null; // force the next render to redraw
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
        jsr: edgeData.jsr != null && edgeData.jsr !== "" ?
            Number(edgeData.jsr) :
            edgeData.sr != null && edgeData.sr !== "" ?
                Number(edgeData.sr) : null,
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
/**
 * Yield control back to the browser so the event loop can paint (keeps the
 * loading spinner animating and the UI responsive during large aggregations).
 * @returns {Promise<void>}
 */
function yieldToUI() {
    return new Promise((resolve) => {
        if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(() => resolve());
        } else {
            setTimeout(resolve, 0);
        }
    });
}

/**
 * Compute the max path length (in nodes) of a graph from its `possible_paths`
 * map, if present. Path elements interleave node and edge ids, so we count only
 * the node entries. Node ids conventionally start with "TSN".
 * @param {object} graph - parsed graph JSON (may carry `data` / `possible_paths`)
 * @returns {number|null} max node-count across paths, or null when unavailable
 */
function maxPathFromPossiblePaths(graph) {
    let pp = null;
    if (graph && Array.isArray(graph.data)) {
        const obj = Object.fromEntries(graph.data);
        pp = obj.possible_paths;
    } else if (graph && graph.possible_paths) {
        pp = graph.possible_paths;
    }
    if (!pp || typeof pp !== "object") return null;

    let max = 0;
    for (const key of Object.keys(pp)) {
        const elems = pp[key];
        if (!Array.isArray(elems)) continue;
        let n = 0;
        for (const e of elems) {
            const s = String(e);
            // Count node elements. Prefer the "TSN" convention; if a file uses
            // other ids, fall back to counting every other element (nodes are at
            // even indices in an interleaved node/edge path).
            if (s.startsWith("TSN")) n += 1;
        }
        if (n === 0 && elems.length) n = Math.ceil(elems.length / 2);
        if (n > max) max = n;
    }
    return max || null;
}

/**
 * Compute the longest path length (in nodes) of a DAG via topological dynamic
 * programming: O(V + E). Safe against cycles — if a cycle is detected (not all
 * nodes get processed), returns the best value found so far rather than looping.
 * Used as a fallback when no explicit path (P-line / possible_paths) is known.
 * @param {Array<object>} nodes - node data objects (must have `id`)
 * @param {Array<object>} edges - edge data objects (must have `source`,`target`)
 * @returns {number} longest path node-count (0 for empty graph)
 */
function longestPathNodes(nodes, edges) {
    if (!nodes.length) return 0;

    const indexById = new Map();
    nodes.forEach((n, i) => indexById.set(String(n.id), i));

    const adj = Array.from({ length: nodes.length }, () => []);
    const indeg = new Array(nodes.length).fill(0);
    for (const e of edges) {
        const s = indexById.get(String(e.source));
        const t = indexById.get(String(e.target));
        if (s === undefined || t === undefined) continue;
        adj[s].push(t);
        indeg[t] += 1;
    }

    // Kahn's topological order + DP for longest path (node count).
    const dp = new Array(nodes.length).fill(1); // each node is a path of length 1
    const queue = [];
    for (let i = 0; i < nodes.length; i++) {
        if (indeg[i] === 0) queue.push(i);
    }

    let processed = 0;
    let best = 1;
    // Copy indegrees so we don't mutate the array we may need again.
    const deg = indeg.slice();
    while (queue.length) {
        const u = queue.shift();
        processed += 1;
        if (dp[u] > best) best = dp[u];
        for (const v of adj[u]) {
            if (dp[u] + 1 > dp[v]) dp[v] = dp[u] + 1;
            deg[v] -= 1;
            if (deg[v] === 0) queue.push(v);
        }
    }

    // If not all nodes were processed there is a cycle; `best` still holds the
    // longest acyclic prefix found, which is a reasonable fallback.
    return best;
}

/**
 * Enumerate the node-count of every source->sink path in a DAG, up to a hard
 * cap on the number of paths (to stay safe on large/branchy graphs). Used as a
 * fallback for the path-length distribution when a graph has no explicit "P"
 * lines. Returns { lengths: number[], capped: boolean }.
 * @param {Array<object>} nodes
 * @param {Array<object>} edges
 * @param {number} [maxPaths=1000]
 * @returns {{lengths:number[], capped:boolean}}
 */
function enumeratePathNodeCounts(nodes, edges, maxPaths = 1000) {
    if (!nodes.length) return { lengths: [], capped: false };

    const indexById = new Map();
    nodes.forEach((n, i) => indexById.set(String(n.id), i));

    const adj = Array.from({ length: nodes.length }, () => []);
    const indeg = new Array(nodes.length).fill(0);
    for (const e of edges) {
        const s = indexById.get(String(e.source));
        const t = indexById.get(String(e.target));
        if (s === undefined || t === undefined) continue;
        adj[s].push(t);
        indeg[t] += 1;
    }

    const outdeg = adj.map((a) => a.length);
    const sources = [];
    for (let i = 0; i < nodes.length; i++) {
        if (indeg[i] === 0) sources.push(i);
    }
    // If there are no sources (cyclic) treat every node as a start to avoid
    // infinite loops; the visited guard below prevents cycles.
    const starts = sources.length ? sources : nodes.map((_, i) => i);

    const lengths = [];
    let capped = false;
    const visited = new Array(nodes.length).fill(false);

    function dfs(u, depth) {
        if (capped) return;
        if (lengths.length >= maxPaths) {
            capped = true;
            return;
        }
        visited[u] = true;
        if (outdeg[u] === 0) {
            lengths.push(depth); // reached a sink; depth = node count on path
        } else {
            for (const v of adj[u]) {
                if (!visited[v]) dfs(v, depth + 1);
                if (capped) break;
            }
        }
        visited[u] = false;
    }

    for (const s of starts) {
        if (capped) break;
        dfs(s, 1);
    }
    return { lengths, capped };
}

/**
 * Process a single parsed graph into the running aggregate accumulators.
 * Extracted so the sync and async collectors share identical logic.
 */
function accumulateGraph(gi, jsonStr, acc) {
    let graph;
    try {
        graph = JSON.parse(jsonStr);
    } catch (e) {
        console.warn(`[globalAnalysis] Failed to parse graph ${gi}:`, e);
        return;
    }

    const els = graph.elements || graph;
    const nodes = (els.nodes || []).map((n) => n.data || n);
    const edges = (els.edges || []).map((e) => e.data || e);

    const nodeMap = new Map();
    for (const nd of nodes) nodeMap.set(nd.id, nd);

    const chromosomes = new Set();
    const svTypesInGraph = new Set();
    let graphWeightSum = 0;
    let graphJsrSum = 0;

    for (const ed of edges) {
        const bp = parseEdgeBreakpointFromData(ed, nodeMap, gi);
        if (!bp) continue;
        bp.graphIndex = gi;
        // Only include in the circle plot if both chroms are known hg38
        if (HG38_CHROM_SIZES[bp.chr1] && HG38_CHROM_SIZES[bp.chr2]) {
            acc.breakpoints.push(bp);
        }
        acc.svTypeCounts.set(
            bp.svType,
            (acc.svTypeCounts.get(bp.svType) || 0) + 1
        );
        svTypesInGraph.add(bp.svType);
        acc.weights.push(bp.weight);
        graphWeightSum += bp.weight;
        graphJsrSum += bp.jsr || 0;
        if (bp.chr1) chromosomes.add(bp.chr1);
        if (bp.chr2) chromosomes.add(bp.chr2);
    }

    // Also collect chromosomes from node coordinates
    for (const nd of nodes) {
        const c = normaliseChrom(nd.chrom);
        if (c) chromosomes.add(c);
    }

    acc.totalNodes += nodes.length;
    acc.totalEdges += edges.length;

    // Path statistics. Source priority for the full list of path lengths:
    //   1. Raw "P" lines parsed at upload (STATE.graph_path_lengths)
    //   2. Bounded source->sink path enumeration fallback
    // Max path length additionally falls back to possible_paths / topo DP.
    let pathLengths =
        (STATE.graph_path_lengths && STATE.graph_path_lengths[gi]) || null;
    if (!pathLengths || !pathLengths.length) {
        const enumerated = enumeratePathNodeCounts(nodes, edges);
        pathLengths = enumerated.lengths;
    }
    const pathCount =
        (STATE.graph_path_count && STATE.graph_path_count[gi] != null) ?
            STATE.graph_path_count[gi] :
            pathLengths.length;

    let maxPathNodes =
        (STATE.graph_max_path_len && STATE.graph_max_path_len[gi]) || null;
    if (maxPathNodes == null && pathLengths.length) {
        maxPathNodes = Math.max(...pathLengths);
    }
    if (maxPathNodes == null) {
        maxPathNodes = maxPathFromPossiblePaths(graph);
    }
    if (maxPathNodes == null) {
        maxPathNodes = longestPathNodes(nodes, edges);
    }

    // Feed the global path-length distribution and paths-per-graph accumulators.
    for (const len of pathLengths) acc.allPathLengths.push(len);
    acc.pathCounts.push(pathCount);

    acc.perGraph.push({
        graphIndex: gi,
        graphId: (STATE.graph_ids && STATE.graph_ids[gi]) || null,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        svTypeCount: svTypesInGraph.size,
        chromosomes: Array.from(chromosomes).sort(),
        totalWeight: graphWeightSum,
        totalJsr: graphJsrSum,
        maxPathNodes: maxPathNodes || 0,
        pathCount,
        pathLengths, // retained so filtered views can rebuild the distribution
    });
}

function newAccumulator() {
    return {
        perGraph: [],
        breakpoints: [],
        svTypeCounts: new Map(),
        weights: [],
        allPathLengths: [], // node-count of every path across all graphs
        pathCounts: [], // number of paths per graph
        totalNodes: 0,
        totalEdges: 0,
    };
}

export function collectAllGraphData() {
    const key = cacheKey();
    if (_cache && _cacheKey === key) return _cache;

    const acc = newAccumulator();
    const jsons = STATE.graph_jsons || [];
    for (let gi = 0; gi < jsons.length; gi++) {
        accumulateGraph(gi, jsons[gi], acc);
    }

    _cache = acc;
    _cacheKey = key;
    return _cache;
}

/**
 * Async, chunked variant of collectAllGraphData. Processes graphs in batches,
 * yielding to the UI between batches so the loading spinner stays animated and
 * the page never freezes on large (7000+ graph) files. Reports progress via
 * the optional callback and reuses the same cache as the sync collector.
 * @param {(done:number,total:number)=>void} [onProgress]
 * @param {{chunkSize?:number}} [opts]
 * @returns {Promise<object>} aggregate result (same shape as collectAllGraphData)
 */
export async function collectAllGraphDataAsync(onProgress, opts = {}) {
    const key = cacheKey();
    if (_cache && _cacheKey === key) {
        if (onProgress) onProgress(_cache.perGraph.length, _cache.perGraph.length);
        return _cache;
    }

    const chunkSize = Math.max(1, opts.chunkSize || 200);
    const acc = newAccumulator();
    const jsons = STATE.graph_jsons || [];
    const total = jsons.length;

    for (let gi = 0; gi < total; gi++) {
        accumulateGraph(gi, jsons[gi], acc);
        if ((gi + 1) % chunkSize === 0) {
            if (onProgress) onProgress(gi + 1, total);
            // eslint-disable-next-line no-await-in-loop
            await yieldToUI();
        }
    }
    if (onProgress) onProgress(total, total);

    _cache = acc;
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

/**
 * Measure a chart container's usable content box (excluding padding), so the
 * SVG viewBox can be set to match the rendered pixel box exactly. This removes
 * the aspect-ratio letterboxing that was clipping the bottom (x) axis. Falls
 * back to sensible defaults when the container has not been laid out yet.
 * @param {HTMLElement} container
 * @param {number} defW - fallback width
 * @param {number} defH - fallback height
 * @returns {{W:number,H:number}}
 */
function measureChartBox(container, defW = 480, defH = 320) {
    let W = defW;
    let H = defH;
    if (container) {
        const cs = window.getComputedStyle(container);
        const padX =
            (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
        const padY =
            (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
        const cw = container.clientWidth - padX;
        const ch = container.clientHeight - padY;
        if (cw > 40) W = cw;
        if (ch > 40) H = ch;
    }
    // The viewBox MUST match the actual rendered box so the SVG (width/height
    // 100%) maps 1:1 and the bottom axis is never clipped. Only apply a minimum
    // width for horizontal breathing room; never force H larger than measured.
    return { W: Math.max(320, Math.round(W)), H: Math.max(160, Math.round(H)) };
}

// --------------------------------------------------------------------------
// Resize handling for the aspect-sensitive charts (scatter + weight-by-SV).
// A ResizeObserver re-renders them (debounced) whenever their container size
// changes, so the axes are never clipped by a stale/undersized first measure.
// --------------------------------------------------------------------------
let _resizeChartData = null;
let _chartResizeObserver = null;
let _chartResizeTimer = null;
const _chartLastSize = new WeakMap();

function reRenderResizeCharts() {
    if (!_resizeChartData) return;
    const { scatter, svbox, svtype, hist, pathLen, pathsPerGraph } =
        _resizeChartData;
    if (scatter && scatter.el && scatter.data) {
        renderNodesEdgesScatter(scatter.el, scatter.data);
    }
    if (svbox && svbox.el && svbox.data) {
        renderWeightBySvType(svbox.el, svbox.data);
    }
    if (svtype && svtype.el && svtype.data) {
        renderSvTypeFrequency(svtype.el, svtype.data);
    }
    if (hist && hist.el && hist.data) {
        renderWeightHistogram(hist.el, hist.data);
    }
    if (pathLen && pathLen.el && pathLen.data) {
        renderPathLengthDistribution(pathLen.el, pathLen.data);
    }
    if (pathsPerGraph && pathsPerGraph.el && pathsPerGraph.data) {
        renderPathsPerGraph(pathsPerGraph.el, pathsPerGraph.data);
    }
}

function setupChartResizeObserver() {
    if (typeof ResizeObserver === "undefined") return;
    if (_chartResizeObserver) return; // already installed

    _chartResizeObserver = new ResizeObserver((entries) => {
        let changed = false;
        for (const entry of entries) {
            const el = entry.target;
            const prev = _chartLastSize.get(el);
            const w = Math.round(entry.contentRect.width);
            const h = Math.round(entry.contentRect.height);
            // Ignore sub-pixel jitter; only react to meaningful size changes.
            if (!prev || Math.abs(prev.w - w) > 2 || Math.abs(prev.h - h) > 2) {
                _chartLastSize.set(el, { w, h });
                changed = true;
            }
        }
        if (!changed) return;
        clearTimeout(_chartResizeTimer);
        _chartResizeTimer = setTimeout(() => reRenderResizeCharts(), 120);
    });

    const ids = [
        "ga-nodes-edges-scatter",
        "ga-weight-by-svtype",
        "ga-svtype-chart",
        "ga-weight-hist",
        "ga-path-len-dist",
        "ga-paths-per-graph",
    ];
    for (const id of ids) {
        const el = document.getElementById(id);
        if (el) _chartResizeObserver.observe(el);
    }
}

// --------------------------------------------------------------------------
// KPI overview strip
// --------------------------------------------------------------------------
/**
 * Render the top-of-dashboard KPI tiles from the (filtered) aggregate.
 * @param {object} agg
 */
function renderKpiStrip(agg) {
    const el = document.getElementById("ga-kpi-strip");
    if (!el) return;

    const d3 = window.d3;
    const perGraph = agg.perGraph || [];
    const nGraphs = perGraph.length;
    const total = agg.totalGraphs != null ? agg.totalGraphs : nGraphs;

    if (!nGraphs) {
        el.innerHTML = "";
        return;
    }

    const totalPaths = (agg.pathCounts || []).reduce((a, b) => a + b, 0);
    const nodeCounts = perGraph.map((g) => g.nodeCount);
    const medianNodes = d3 ? Math.round(d3.median(nodeCounts) || 0) : 0;
    const pathLens = agg.allPathLengths || [];
    const medianPathLen = d3 && pathLens.length ? d3.median(pathLens) : 0;
    const chromSet = new Set();
    for (const g of perGraph) {
        (g.chromosomes || []).forEach((c) => chromSet.add(c));
    }

    const filtered = agg.filteredCount != null && agg.filteredCount !== total;
    const graphsValue = filtered ?
        `${nGraphs.toLocaleString()}<span class="ga-kpi-sub">/ ${total.toLocaleString()}</span>` :
        nGraphs.toLocaleString();

    const tiles = [
        { label: "Graphs", value: graphsValue, icon: "bi-diagram-3" },
        { label: "Nodes", value: agg.totalNodes.toLocaleString(), icon: "bi-circle" },
        { label: "Edges", value: agg.totalEdges.toLocaleString(), icon: "bi-arrow-left-right" },
        { label: "Paths", value: totalPaths.toLocaleString(), icon: "bi-signpost-split" },
        { label: "Median nodes/graph", value: medianNodes.toLocaleString(), icon: "bi-rulers" },
        {
            label: "Median path len",
            value: (medianPathLen || 0).toLocaleString(),
            icon: "bi-arrows-expand",
        },
        { label: "SV types", value: agg.svTypeCounts.size.toLocaleString(), icon: "bi-tags" },
        { label: "Chromosomes", value: chromSet.size.toLocaleString(), icon: "bi-bezier2" },
    ];

    el.innerHTML = tiles
        .map(
            (t) => `
        <div class="ga-kpi">
          <div class="ga-kpi-icon"><i class="bi ${t.icon}"></i></div>
          <div class="ga-kpi-body">
            <div class="ga-kpi-value">${t.value}</div>
            <div class="ga-kpi-label">${t.label}</div>
          </div>
        </div>`
        )
        .join("");
}

// Column definitions for the per-graph summary table. `sortable` numeric
// columns can be clicked to sort the entire dataset.
const SUMMARY_COLUMNS = [
    { key: "label", label: "Graph", sortable: true, numeric: false, align: "" },
    { key: "nodeCount", label: "Nodes", sortable: true, numeric: true, align: "text-end" },
    { key: "edgeCount", label: "Edges", sortable: true, numeric: true, align: "text-end" },
    { key: "svTypeCount", label: "SV types", sortable: true, numeric: true, align: "text-end" },
    { key: "totalWeight", label: "\u03A3 weight", sortable: true, numeric: true, align: "text-end" },
    { key: "maxPathNodes", label: "Max path", sortable: true, numeric: true, align: "text-end" },
];

// Retained references so header clicks can re-sort/re-render without recomputing
// the aggregate.
let _lastSummaryContainer = null;
let _lastSummaryPerGraph = null;
let _lastSummaryAgg = null;

/** Read the sortable value for a graph row by column key. */
function summaryCellValue(g, key) {
    if (key === "label") {
        return (g.graphId || `Graph ${g.graphIndex + 1}`).toLowerCase();
    }
    return g[key] ?? 0;
}

function renderSummaryTable(container, perGraph, agg) {
    _lastSummaryContainer = container;
    _lastSummaryPerGraph = perGraph;
    _lastSummaryAgg = agg;

    if (!perGraph.length) {
        container.innerHTML =
            '<div class="ga-empty">No graphs to summarize.</div>';
        return;
    }

    // Sort the FULL dataset by the active column (so sorting affects all graphs,
    // not just the visible slice), then virtualize to the first N rows.
    const { key, dir } = _summarySort;
    const sorted = [...perGraph].sort((a, b) => {
        const va = summaryCellValue(a, key);
        const vb = summaryCellValue(b, key);
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        // Stable tie-break by edge count then index.
        return (b.edgeCount - a.edgeCount) || (a.graphIndex - b.graphIndex);
    });

    const truncated = sorted.length > SUMMARY_TABLE_MAX_ROWS;
    const visible = truncated ? sorted.slice(0, SUMMARY_TABLE_MAX_ROWS) : sorted;

    const rows = visible
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
          <td class="text-end">${g.maxPathNodes || 0}</td>
        </tr>`;
        })
        .join("");

    const truncNote = truncated ?
        `<div class="ga-table-note text-muted small px-2 py-1">
           Showing top ${SUMMARY_TABLE_MAX_ROWS.toLocaleString()} of
           ${sorted.length.toLocaleString()} graphs (sorted). Use the filter
           panel to narrow results.
         </div>` :
        "";

    const headCells = SUMMARY_COLUMNS.map((c) => {
        const isActive = c.key === key;
        const caret = !c.sortable ?
            "" :
            isActive ?
                (dir === 1 ? " \u25B2" : " \u25BC") :
                ' <span class="ga-sort-caret">\u21C5</span>';
        const cls = [
            c.align,
            c.sortable ? "ga-sortable" : "",
            isActive ? "ga-sort-active" : "",
        ]
            .filter(Boolean)
            .join(" ");
        const attr = c.sortable ? ` data-sort-key="${c.key}"` : "";
        return `<th class="${cls}"${attr}>${c.label}${caret}</th>`;
    }).join("");

    const totalMaxPath = perGraph.reduce(
        (m, g) => Math.max(m, g.maxPathNodes || 0),
        0
    );

    container.innerHTML = `
    ${truncNote}
    <div class="table-responsive ga-table-wrap">
      <table class="table table-sm table-hover align-middle ga-summary-table mb-0">
        <thead>
          <tr>${headCells}</tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr class="ga-total-row">
            <td><strong>Total (${perGraph.length})</strong></td>
            <td class="text-end"><strong>${agg.totalNodes}</strong></td>
            <td class="text-end"><strong>${agg.totalEdges}</strong></td>
            <td class="text-end"><strong>${agg.svTypeCounts.size}</strong></td>
            <td class="text-end"><strong>${agg.weights.reduce((a, b) => a + b, 0)}</strong></td>
            <td class="text-end" title="Longest path across all graphs"><strong>${totalMaxPath}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>`;

    // Row click -> load that graph.
    container.querySelectorAll(".ga-summary-row").forEach((row) => {
        row.addEventListener("click", () => {
            const idx = parseInt(row.getAttribute("data-graph-index"), 10);
            navigateToGraph(idx);
        });
    });

    // Header click -> sort (toggle direction if same column).
    container.querySelectorAll("th.ga-sortable").forEach((th) => {
        th.addEventListener("click", () => {
            const clicked = th.getAttribute("data-sort-key");
            if (_summarySort.key === clicked) {
                _summarySort.dir *= -1;
            } else {
                _summarySort.key = clicked;
                // Text column defaults ascending; numeric defaults descending.
                _summarySort.dir = clicked === "label" ? 1 : -1;
            }
            if (_lastSummaryContainer && _lastSummaryPerGraph && _lastSummaryAgg) {
                renderSummaryTable(
                    _lastSummaryContainer,
                    _lastSummaryPerGraph,
                    _lastSummaryAgg
                );
            }
        });
    });
}

// --------------------------------------------------------------------------
// Exports: table -> CSV, figures -> PNG
// --------------------------------------------------------------------------

/** Quote a value for CSV if it contains a comma, quote, or newline. */
function csvCell(value) {
    const s = value == null ? "" : String(value);
    if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function timestamp() {
    return new Date().toISOString().slice(0, 19).replace(/:/g, "-");
}

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

/**
 * Export the per-graph summary table to CSV. Serializes the FULL filtered
 * dataset (every graph passing the active global filters, not just the visible
 * top-N rows), in the current sort order, with all columns.
 */
export function exportSummaryCsv() {
    const agg = _lastFilteredAgg;
    if (!agg || !agg.perGraph || !agg.perGraph.length) {
        window.showAlert?.("No graph data to export. Load a file first.", "warning", 3000);
        return;
    }

    // Sort a copy the same way the on-screen table is sorted.
    const { key, dir } = _summarySort;
    const rows = [...agg.perGraph].sort((a, b) => {
        const va = summaryCellValue(a, key);
        const vb = summaryCellValue(b, key);
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        return (b.edgeCount - a.edgeCount) || (a.graphIndex - b.graphIndex);
    });

    const header = [
        "graph_id",
        "graph_index",
        "nodes",
        "edges",
        "sv_types",
        "total_weight",
        "total_jsr",
        "path_count",
        "max_path_nodes",
        "chromosomes",
    ];

    const lines = [header.join(",")];
    for (const g of rows) {
        lines.push(
            [
                csvCell(g.graphId || `Graph ${g.graphIndex + 1}`),
                csvCell(g.graphIndex),
                csvCell(g.nodeCount),
                csvCell(g.edgeCount),
                csvCell(g.svTypeCount),
                csvCell(g.totalWeight),
                csvCell(g.totalJsr || 0),
                csvCell(g.pathCount || 0),
                csvCell(g.maxPathNodes || 0),
                csvCell((g.chromosomes || []).join("|")),
            ].join(",")
        );
    }

    const blob = new Blob([lines.join("\n")], {
        type: "text/csv;charset=utf-8",
    });
    triggerDownload(blob, `ga_summary_${timestamp()}.csv`);
    window.showAlert?.(
        `Exported ${rows.length.toLocaleString()} graph rows to CSV.`,
        "success",
        2500
    );
}

/**
 * Rasterize an SVG element to a PNG and download it. Clones the SVG, inlines a
 * white background and its viewBox dimensions, draws it onto a scaled canvas,
 * and saves the result.
 * @param {SVGElement} svgEl
 * @param {string} filename - without extension
 * @param {number} [scale=2.5] - resolution multiplier for crisp output
 * @returns {Promise<void>}
 */
export function exportSvgToPng(svgEl, filename, scale = 2.5) {
    return new Promise((resolve, reject) => {
        if (!svgEl) {
            window.showAlert?.("No figure to export.", "warning", 3000);
            resolve();
            return;
        }

        // Determine intrinsic dimensions from the viewBox (falls back to bbox).
        let width;
        let height;
        const vb = svgEl.getAttribute("viewBox");
        if (vb) {
            const parts = vb.split(/[\s,]+/).map(Number);
            width = parts[2];
            height = parts[3];
        }
        if (!width || !height) {
            const rect = svgEl.getBoundingClientRect();
            width = rect.width || 480;
            height = rect.height || 320;
        }

        const clone = svgEl.cloneNode(true);
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
        clone.setAttribute("width", width);
        clone.setAttribute("height", height);
        // Solid white background for the exported raster.
        const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bg.setAttribute("x", "0");
        bg.setAttribute("y", "0");
        bg.setAttribute("width", String(width));
        bg.setAttribute("height", String(height));
        bg.setAttribute("fill", "#ffffff");
        clone.insertBefore(bg, clone.firstChild);

        const svgStr = new XMLSerializer().serializeToString(clone);
        const svgBlob = new Blob([svgStr], {
            type: "image/svg+xml;charset=utf-8",
        });
        const url = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(width * scale);
                canvas.height = Math.round(height * scale);
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                canvas.toBlob((blob) => {
                    if (blob) {
                        triggerDownload(blob, `${filename}_${timestamp()}.png`);
                        window.showAlert?.("Figure exported as PNG.", "success", 2000);
                    } else {
                        window.showAlert?.("Failed to create PNG.", "error");
                    }
                    resolve();
                }, "image/png");
            } catch (e) {
                URL.revokeObjectURL(url);
                console.error("[globalAnalysis] PNG export failed:", e);
                window.showAlert?.("Failed to export PNG: " + (e?.message || e), "error");
                reject(e);
            }
        };
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            console.error("[globalAnalysis] SVG image load failed:", e);
            window.showAlert?.("Failed to rasterize figure.", "error");
            reject(e);
        };
        img.src = url;
    });
}

/** Show/hide the circle-plot PNG export button (only meaningful once drawn). */
function toggleCirclePngBtn(show) {
    const btn = document.getElementById("ga-circle-png-btn");
    if (btn) btn.classList.toggle("d-none", !show);
}

/**
 * Find the <svg> inside a chart card body by container id and export it to PNG.
 * @param {string} containerId
 * @param {string} filenameBase
 */
export function exportChartPng(containerId, filenameBase) {
    const container = document.getElementById(containerId);
    const svg = container ? container.querySelector("svg") : null;
    if (!svg) {
        window.showAlert?.("This figure has not been rendered yet.", "warning", 3000);
        return;
    }
    exportSvgToPng(svg, filenameBase);
}

// Build a subtle top-to-bottom gradient (lighter top -> base -> slightly
// darker bottom) for a given base color, returning a url(#id) fill reference.
// Gives flat bars a clean, publication-grade sense of depth.
function makeBarGradient(defs, id, baseColor) {
    const d3 = window.d3;
    const c = d3.color(baseColor);
    const top = c.brighter(0.45).formatHex();
    const bottom = c.darker(0.35).formatHex();
    const grad = defs
        .append("linearGradient")
        .attr("id", id)
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "0%").attr("y2", "100%");
    grad.append("stop").attr("offset", "0%").attr("stop-color", top);
    grad.append("stop").attr("offset", "45%").attr("stop-color", baseColor);
    grad.append("stop").attr("offset", "100%").attr("stop-color", bottom);
    return `url(#${id})`;
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

    const { W, H } = measureChartBox(container, 480, 320);
    const margin = { top: 18, right: 18, bottom: 50, left: 52 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const svg = d3
        .select(container)
        .append("svg")
        .attr("width", W)
        .attr("height", H)
        .attr("viewBox", `0 0 ${W} ${H}`)
        .style("display", "block");

    const defs = svg.append("defs");
    const uid = `gasv-${Math.random().toString(36).slice(2, 8)}`;

    const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
        .scaleBand()
        .domain(data.map((d) => d.svType))
        .range([0, innerW])
        .padding(0.28);

    const y = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.count)])
        .nice()
        .range([innerH, 0]);

    // Light horizontal gridlines for readability (publication style).
    g.append("g")
        .attr("class", "ga-grid")
        .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(""))
        .call((sel) => sel.select(".domain").remove())
        .call((sel) =>
            sel.selectAll("line").attr("stroke", "rgba(0,0,0,0.06)")
        );

    // Pre-build a gradient per SV type.
    data.forEach((d, i) => {
        d._fill = makeBarGradient(defs, `${uid}-${i}`, colorFor(d.svType));
    });

    g.selectAll(".ga-bar")
        .data(data)
        .join("rect")
        .attr("class", "ga-bar ga-svbar")
        .attr("data-svtype", (d) => d.svType)
        .attr("x", (d) => x(d.svType))
        .attr("y", (d) => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", (d) => innerH - y(d.count))
        .attr("rx", 3)
        .attr("fill", (d) => d._fill)
        .attr("stroke", (d) => d3.color(colorFor(d.svType)).darker(0.6).formatHex())
        .attr("stroke-width", 0.75)
        .append("title")
        .text((d) => `${d.svType}: ${d.count} edge(s)`);

    g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-35)")
        .style("text-anchor", "end")
        .style("font-size", "11px")
        .style("font-weight", "600");

    g.append("g")
        .call(d3.axisLeft(y).ticks(5))
        .style("font-size", "10.5px");

    g.selectAll(".ga-bar-label")
        .data(data)
        .join("text")
        .attr("class", "ga-bar-label")
        .attr("x", (d) => x(d.svType) + x.bandwidth() / 2)
        .attr("y", (d) => y(d.count) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("font-weight", "600")
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

    const { W, H } = measureChartBox(container, 480, 320);
    const margin = { top: 16, right: 16, bottom: 40, left: 48 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const svg = d3
        .select(container)
        .append("svg")
        .attr("width", W)
        .attr("height", H)
        .attr("viewBox", `0 0 ${W} ${H}`)
        .style("display", "block");

    const defs = svg.append("defs");
    const uid = `gawh-${Math.random().toString(36).slice(2, 8)}`;

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

    const maxCount = d3.max(bins, (b) => b.length) || 1;
    const y = d3
        .scaleLinear()
        .domain([0, maxCount])
        .nice()
        .range([innerH, 0]);

    // Publication-grade sequential color: taller (more frequent) bins are
    // deeper. Uses ColorBrewer "Blues"-style interpolation for print clarity.
    const colorScale = d3
        .scaleSequential(d3.interpolateBlues)
        .domain([0, maxCount * 1.15]);

    // Light horizontal gridlines.
    g.append("g")
        .attr("class", "ga-grid")
        .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(""))
        .call((sel) => sel.select(".domain").remove())
        .call((sel) =>
            sel.selectAll("line").attr("stroke", "rgba(0,0,0,0.06)")
        );

    // Per-bin vertical gradient for depth.
    bins.forEach((b, i) => {
        b._fill = makeBarGradient(defs, `${uid}-${i}`, colorScale(b.length));
    });

    g.selectAll(".ga-hist-bar")
        .data(bins)
        .join("rect")
        .attr("class", "ga-bar ga-hist-bar")
        .attr("x", (b) => x(b.x0) + 1)
        .attr("y", (b) => y(b.length))
        .attr("width", (b) => Math.max(0, x(b.x1) - x(b.x0) - 1))
        .attr("height", (b) => innerH - y(b.length))
        .attr("rx", 2)
        .attr("fill", (b) => b._fill)
        .attr("stroke", (b) => d3.color(colorScale(b.length)).darker(0.5).formatHex())
        .attr("stroke-width", 0.6)
        .append("title")
        .text((b) => `weight ${b.x0}–${b.x1}: ${b.length} edge(s)`);

    g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).ticks(6))
        .style("font-size", "10.5px");

    g.append("g").call(d3.axisLeft(y).ticks(5)).style("font-size", "10.5px");

    // Axis label
    svg.append("text")
        .attr("x", margin.left + innerW / 2)
        .attr("y", H - 4)
        .attr("text-anchor", "middle")
        .style("font-size", "11.5px")
        .style("font-weight", "600")
        .style("fill", "var(--bs-body-color, #333)")
        .text("Edge weight");
}

// --------------------------------------------------------------------------
// Nodes vs Edges per graph (scatter). Click a point to open that graph.
// --------------------------------------------------------------------------
function renderNodesEdgesScatter(container, perGraph) {
    const d3 = window.d3;
    container.innerHTML = "";

    if (!perGraph || !perGraph.length) {
        container.innerHTML = '<div class="ga-empty">No graphs to plot.</div>';
        return;
    }

    // Size the SVG by explicit pixel dimensions measured from the container.
    // Using concrete width/height (not width:100%/height:100%) guarantees the
    // full figure — including the bottom x-axis — is always visible, with no
    // percentage-height resolution issues or aspect-ratio clipping.
    const { W, H } = measureChartBox(container, 480, 340);
    const margin = { top: 16, right: 18, bottom: 60, left: 56 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const svg = d3
        .select(container)
        .append("svg")
        .attr("width", W)
        .attr("height", H)
        .attr("viewBox", `0 0 ${W} ${H}`)
        .style("display", "block")
        .style("max-width", "100%");

    const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const maxNodes = d3.max(perGraph, (d) => d.nodeCount) || 1;
    const maxEdges = d3.max(perGraph, (d) => d.edgeCount) || 1;
    const x = d3.scaleLinear().domain([0, maxNodes]).nice().range([0, innerW]);
    const y = d3.scaleLinear().domain([0, maxEdges]).nice().range([innerH, 0]);

    // Cap the number of drawn circles for very large files. We keep the axis
    // domains from the full dataset (above) and evenly sample the points so the
    // shape of the distribution is preserved without drawing 7000+ nodes.
    let points = perGraph;
    if (perGraph.length > SCATTER_MAX_POINTS) {
        const step = perGraph.length / SCATTER_MAX_POINTS;
        points = [];
        for (let i = 0; i < perGraph.length; i += step) {
            points.push(perGraph[Math.floor(i)]);
        }
    }

    // Gridlines
    g.append("g")
        .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(""))
        .call((sel) => sel.select(".domain").remove())
        .call((sel) => sel.selectAll("line").attr("stroke", "rgba(0,0,0,0.06)"));

    // Faint y=x reference line for context.
    const lim = Math.min(x.domain()[1], y.domain()[1]);
    g.append("line")
        .attr("x1", x(0)).attr("y1", y(0))
        .attr("x2", x(lim)).attr("y2", y(lim))
        .attr("stroke", "rgba(0,0,0,0.18)")
        .attr("stroke-dasharray", "4 4")
        .attr("stroke-width", 1);

    g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x).ticks(6))
        .style("font-size", "10.5px");
    g.append("g").call(d3.axisLeft(y).ticks(5)).style("font-size", "10.5px");

    // Axis labels
    svg.append("text")
        .attr("x", margin.left + innerW / 2)
        .attr("y", H - 4)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("font-weight", "600")
        .style("fill", "var(--bs-body-color, #333)")
        .text("Nodes");
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(margin.top + innerH / 2))
        .attr("y", 14)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("font-weight", "600")
        .style("fill", "var(--bs-body-color, #333)")
        .text("Edges");

    g.selectAll(".ga-scatter-pt")
        .data(points)
        .join("circle")
        .attr("class", "ga-scatter-pt")
        .attr("cx", (d) => x(d.nodeCount))
        .attr("cy", (d) => y(d.edgeCount))
        .attr("r", 6)
        .attr("fill", "var(--aurora-primary, #0d6efd)")
        .attr("fill-opacity", 0.7)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.2)
        .style("cursor", "pointer")
        .on("mouseenter", function() {
            d3.select(this).attr("r", 8).attr("fill-opacity", 1);
        })
        .on("mouseleave", function() {
            d3.select(this).attr("r", 6).attr("fill-opacity", 0.7);
        })
        .on("click", (event, d) => navigateToGraph(d.graphIndex))
        .append("title")
        .text(
            (d) =>
                `${d.graphId || `Graph ${d.graphIndex + 1}`}\nnodes: ${d.nodeCount}, edges: ${d.edgeCount}`
        );
}

// --------------------------------------------------------------------------
// Graph size distribution: side-by-side histograms of nodes/edges per graph.
// --------------------------------------------------------------------------
function renderSizeDistribution(container, perGraph) {
    const d3 = window.d3;
    container.innerHTML = "";

    if (!perGraph || perGraph.length < 2) {
        container.innerHTML =
            '<div class="ga-empty">Graph size distribution needs at least 2 graphs.</div>';
        return;
    }

    const wrap = d3
        .select(container)
        .append("div")
        .attr("class", "ga-sizedist-wrap");

    const mkHist = (title, values, baseColor) => {
        const cell = wrap.append("div").attr("class", "ga-sizedist-cell");
        cell.append("div")
            .attr("class", "ga-sizedist-title")
            .text(title);

        const W = 320;
        const H = 200;
        const margin = { top: 10, right: 12, bottom: 34, left: 38 };
        const innerW = W - margin.left - margin.right;
        const innerH = H - margin.top - margin.bottom;

        const svg = cell
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${W} ${H}`)
            .attr("preserveAspectRatio", "xMidYMid meet");

        const defs = svg.append("defs");
        const uid = `gasz-${Math.random().toString(36).slice(2, 8)}`;
        const g = svg
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const maxV = d3.max(values) || 1;
        const x = d3.scaleLinear().domain([0, maxV]).nice().range([0, innerW]);
        const bins = d3
            .bin()
            .domain(x.domain())
            .thresholds(Math.min(15, Math.max(4, Math.ceil(Math.sqrt(values.length)))))(
                values
            );
        const maxCount = d3.max(bins, (b) => b.length) || 1;
        const y = d3.scaleLinear().domain([0, maxCount]).nice().range([innerH, 0]);

        g.append("g")
            .call(d3.axisLeft(y).ticks(4).tickSize(-innerW).tickFormat(""))
            .call((sel) => sel.select(".domain").remove())
            .call((sel) => sel.selectAll("line").attr("stroke", "rgba(0,0,0,0.06)"));

        bins.forEach((b, i) => {
            b._fill = makeBarGradient(defs, `${uid}-${i}`, baseColor);
        });

        g.selectAll(".ga-bar")
            .data(bins)
            .join("rect")
            .attr("class", "ga-bar")
            .attr("x", (b) => x(b.x0) + 1)
            .attr("y", (b) => y(b.length))
            .attr("width", (b) => Math.max(0, x(b.x1) - x(b.x0) - 1))
            .attr("height", (b) => innerH - y(b.length))
            .attr("rx", 2)
            .attr("fill", (b) => b._fill)
            .attr("stroke", d3.color(baseColor).darker(0.5).formatHex())
            .attr("stroke-width", 0.6)
            .append("title")
            .text((b) => `${b.x0}–${b.x1}: ${b.length} graph(s)`);

        g.append("g")
            .attr("transform", `translate(0,${innerH})`)
            .call(d3.axisBottom(x).ticks(5))
            .style("font-size", "9.5px");
        g.append("g").call(d3.axisLeft(y).ticks(4)).style("font-size", "9.5px");
    };

    mkHist("Nodes per graph", perGraph.map((d) => d.nodeCount), "#4daf4a");
    mkHist("Edges per graph", perGraph.map((d) => d.edgeCount), "#984ea3");
}

// --------------------------------------------------------------------------
// Generic categorical bar chart of integer-value frequencies (used by the
// path-length and paths-per-graph distributions, whose domains are small
// integers). Draws a labelled y-axis, x tick labels, and count labels on bars.
// --------------------------------------------------------------------------
function renderIntFrequencyBars(container, values, opts = {}) {
    const d3 = window.d3;
    container.innerHTML = "";

    const {
        xLabel = "Value",
        yLabel = "Count",
        baseColor = "#377eb8",
        emptyMsg = "No data to plot.",
        // When there are more distinct integers than this, bin them instead of
        // drawing one bar per value (keeps very wide domains readable).
        maxDistinct = 30,
    } = opts;

    if (!values || !values.length) {
        container.innerHTML = `<div class="ga-empty">${emptyMsg}</div>`;
        return;
    }

    // Count frequency per integer value.
    const counts = new Map();
    for (const v of values) {
        const k = Math.round(Number(v));
        if (!Number.isFinite(k)) continue;
        counts.set(k, (counts.get(k) || 0) + 1);
    }
    let data = Array.from(counts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value - b.value);

    if (!data.length) {
        container.innerHTML = `<div class="ga-empty">${emptyMsg}</div>`;
        return;
    }

    // If the integer domain is too wide, collapse into ~maxDistinct bins.
    let bandLabels;
    if (data.length > maxDistinct) {
        const minV = data[0].value;
        const maxV = data[data.length - 1].value;
        const binSize = Math.ceil((maxV - minV + 1) / maxDistinct);
        const binned = new Map();
        for (const d of data) {
            const b0 = minV + Math.floor((d.value - minV) / binSize) * binSize;
            binned.set(b0, (binned.get(b0) || 0) + d.count);
        }
        data = Array.from(binned.entries())
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => a.value - b.value);
        bandLabels = data.map((d) =>
            binSize > 1 ? `${d.value}\u2013${d.value + binSize - 1}` : String(d.value)
        );
    } else {
        bandLabels = data.map((d) => String(d.value));
    }

    const { W, H } = measureChartBox(container, 480, 320);
    const margin = { top: 18, right: 18, bottom: 52, left: 56 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const svg = d3
        .select(container)
        .append("svg")
        .attr("width", W)
        .attr("height", H)
        .attr("viewBox", `0 0 ${W} ${H}`)
        .style("display", "block");

    const defs = svg.append("defs");
    const uid = `gapl-${Math.random().toString(36).slice(2, 8)}`;
    const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
        .scaleBand()
        .domain(bandLabels)
        .range([0, innerW])
        .padding(0.25);

    const y = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.count)])
        .nice()
        .range([innerH, 0]);

    // Gridlines
    g.append("g")
        .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(""))
        .call((sel) => sel.select(".domain").remove())
        .call((sel) => sel.selectAll("line").attr("stroke", "rgba(0,0,0,0.06)"));

    data.forEach((d, i) => {
        d._fill = makeBarGradient(defs, `${uid}-${i}`, baseColor);
        d._label = bandLabels[i];
    });

    // Show at most a reasonable number of x tick labels.
    const labelEvery = Math.ceil(bandLabels.length / 16);

    g.selectAll(".ga-bar")
        .data(data)
        .join("rect")
        .attr("class", "ga-bar")
        .attr("x", (d) => x(d._label))
        .attr("y", (d) => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", (d) => innerH - y(d.count))
        .attr("rx", 3)
        .attr("fill", (d) => d._fill)
        .attr("stroke", d3.color(baseColor).darker(0.5).formatHex())
        .attr("stroke-width", 0.75)
        .append("title")
        .text((d) => `${xLabel} ${d._label}: ${d.count.toLocaleString()}`);

    g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x))
        .call((sel) =>
            sel.selectAll("text").each(function(_, i) {
                if (i % labelEvery !== 0) this.remove();
            })
        )
        .selectAll("text")
        .style("font-size", "10px");

    g.append("g").call(d3.axisLeft(y).ticks(5)).style("font-size", "10px");

    // Count labels above bars (only when bars are wide enough to be readable).
    if (data.length <= 20) {
        g.selectAll(".ga-bar-label")
            .data(data)
            .join("text")
            .attr("class", "ga-bar-label")
            .attr("x", (d) => x(d._label) + x.bandwidth() / 2)
            .attr("y", (d) => y(d.count) - 5)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("font-weight", "600")
            .style("fill", "var(--bs-body-color, #333)")
            .text((d) => d.count.toLocaleString());
    }

    // Axis titles
    svg.append("text")
        .attr("x", margin.left + innerW / 2)
        .attr("y", H - 6)
        .attr("text-anchor", "middle")
        .style("font-size", "11.5px")
        .style("font-weight", "600")
        .style("fill", "var(--bs-body-color, #333)")
        .text(xLabel);
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(margin.top + innerH / 2))
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .style("font-size", "11.5px")
        .style("font-weight", "600")
        .style("fill", "var(--bs-body-color, #333)")
        .text(yLabel);
}

/**
 * Distribution of path lengths (node count) across ALL paths in ALL graphs.
 * @param {HTMLElement} container
 * @param {number[]} allPathLengths
 */
function renderPathLengthDistribution(container, allPathLengths) {
    renderIntFrequencyBars(container, allPathLengths, {
        xLabel: "Path length (nodes)",
        yLabel: "Paths",
        baseColor: "#ff7f0e",
        emptyMsg: "No path data. Upload a TSG/GTA file with path (P) lines.",
    });
}

/**
 * Distribution of the number of paths per graph.
 * @param {HTMLElement} container
 * @param {number[]} pathCounts
 */
function renderPathsPerGraph(container, pathCounts) {
    renderIntFrequencyBars(container, pathCounts, {
        xLabel: "Paths per graph",
        yLabel: "Graphs",
        baseColor: "#17becf",
        emptyMsg: "No path data to plot.",
    });
}

// --------------------------------------------------------------------------
// Edge weight by SV type (box-and-whisker, colored by SV type).
// --------------------------------------------------------------------------
function renderWeightBySvType(container, breakpoints) {
    const d3 = window.d3;
    container.innerHTML = "";

    // Group weights by SV type.
    const groups = new Map();
    for (const bp of breakpoints || []) {
        if (!groups.has(bp.svType)) groups.set(bp.svType, []);
        groups.get(bp.svType).push(bp.weight);
    }

    const data = Array.from(groups.entries())
        .map(([svType, weights]) => {
            const sorted = weights.slice().sort((a, b) => a - b);
            const q1 = d3.quantileSorted(sorted, 0.25);
            const med = d3.quantileSorted(sorted, 0.5);
            const q3 = d3.quantileSorted(sorted, 0.75);
            const iqr = q3 - q1;
            const lo = Math.max(d3.min(sorted), q1 - 1.5 * iqr);
            const hi = Math.min(d3.max(sorted), q3 + 1.5 * iqr);
            return {
                svType,
                values: sorted,
                n: sorted.length,
                q1, med, q3,
                lo, hi,
                min: d3.min(sorted),
                max: d3.max(sorted),
                outliers: sorted.filter((v) => v < lo || v > hi),
            };
        })
        .sort((a, b) => b.med - a.med || b.n - a.n);

    if (!data.length) {
        container.innerHTML = '<div class="ga-empty">No edges to summarize.</div>';
        return;
    }

    // Size the SVG by explicit pixel dimensions measured from the container so
    // rotated SV-type labels and the bottom axis are always fully visible.
    const { W, H } = measureChartBox(container, 480, 340);
    const margin = { top: 18, right: 18, bottom: 64, left: 56 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    const svg = d3
        .select(container)
        .append("svg")
        .attr("width", W)
        .attr("height", H)
        .attr("viewBox", `0 0 ${W} ${H}`)
        .style("display", "block")
        .style("max-width", "100%");

    const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
        .scaleBand()
        .domain(data.map((d) => d.svType))
        .range([0, innerW])
        .padding(0.4);

    const yMax = d3.max(data, (d) => d.max) || 1;
    const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

    g.append("g")
        .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(""))
        .call((sel) => sel.select(".domain").remove())
        .call((sel) => sel.selectAll("line").attr("stroke", "rgba(0,0,0,0.06)"));

    const bw = Math.min(x.bandwidth(), 48);
    const groupSel = g
        .selectAll(".ga-box")
        .data(data)
        .join("g")
        .attr("class", "ga-box")
        .attr("transform", (d) => `translate(${x(d.svType) + x.bandwidth() / 2},0)`);

    // Whisker line
    groupSel
        .append("line")
        .attr("x1", 0).attr("x2", 0)
        .attr("y1", (d) => y(d.lo))
        .attr("y2", (d) => y(d.hi))
        .attr("stroke", (d) => d3.color(colorFor(d.svType)).darker(0.6).formatHex())
        .attr("stroke-width", 1.2);

    // Whisker caps
    groupSel
        .append("line")
        .attr("x1", -bw / 4).attr("x2", bw / 4)
        .attr("y1", (d) => y(d.lo)).attr("y2", (d) => y(d.lo))
        .attr("stroke", (d) => d3.color(colorFor(d.svType)).darker(0.6).formatHex())
        .attr("stroke-width", 1.2);
    groupSel
        .append("line")
        .attr("x1", -bw / 4).attr("x2", bw / 4)
        .attr("y1", (d) => y(d.hi)).attr("y2", (d) => y(d.hi))
        .attr("stroke", (d) => d3.color(colorFor(d.svType)).darker(0.6).formatHex())
        .attr("stroke-width", 1.2);

    // Box (Q1–Q3)
    groupSel
        .append("rect")
        .attr("x", -bw / 2)
        .attr("y", (d) => y(d.q3))
        .attr("width", bw)
        .attr("height", (d) => Math.max(1, y(d.q1) - y(d.q3)))
        .attr("rx", 2)
        .attr("fill", (d) => colorFor(d.svType))
        .attr("fill-opacity", 0.55)
        .attr("stroke", (d) => d3.color(colorFor(d.svType)).darker(0.6).formatHex())
        .attr("stroke-width", 1)
        .append("title")
        .text(
            (d) =>
                `${d.svType}\nn=${d.n}\nmedian=${d.med}\nIQR=[${d.q1}, ${d.q3}]\nrange=[${d.min}, ${d.max}]`
        );

    // Median line
    groupSel
        .append("line")
        .attr("x1", -bw / 2).attr("x2", bw / 2)
        .attr("y1", (d) => y(d.med)).attr("y2", (d) => y(d.med))
        .attr("stroke", (d) => d3.color(colorFor(d.svType)).darker(1.0).formatHex())
        .attr("stroke-width", 2);

    // Outliers
    groupSel
        .selectAll(".ga-box-outlier")
        .data((d) => d.outliers.map((v) => ({ svType: d.svType, v })))
        .join("circle")
        .attr("class", "ga-box-outlier")
        .attr("cx", () => (Math.random() - 0.5) * (bw / 2))
        .attr("cy", (o) => y(o.v))
        .attr("r", 2.4)
        .attr("fill", (o) => d3.color(colorFor(o.svType)).darker(0.4).formatHex())
        .attr("fill-opacity", 0.7);

    // n label above each box
    groupSel
        .append("text")
        .attr("x", 0)
        .attr("y", (d) => y(d.hi) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "9.5px")
        .style("fill", "var(--bs-secondary-color, #6c757d)")
        .text((d) => `n=${d.n}`);

    g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-35)")
        .style("text-anchor", "end")
        .style("font-size", "10.5px")
        .style("font-weight", "600");
    g.append("g").call(d3.axisLeft(y).ticks(5)).style("font-size", "10.5px");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(margin.top + innerH / 2))
        .attr("y", 14)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("font-weight", "600")
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
        toggleCirclePngBtn(false);
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
    // The circle plot now exists — reveal its PNG export button.
    toggleCirclePngBtn(true);

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

    const rowH = 34;
    const margin = { top: 12, right: 72, bottom: 32, left: 170 };
    const W = container.clientWidth || 720;
    const innerW = Math.max(160, W - margin.left - margin.right);
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

    g.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .style("font-size", "13px")
        .call((sel) => sel.selectAll("text").style("font-weight", "500"));

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
        .attr("x", (d) => x(d.count) + 6)
        .attr("y", (d) => y(d.name) + y.bandwidth() / 2)
        .attr("dominant-baseline", "central")
        .style("font-size", "12px")
        .style("font-weight", "600")
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
 * Reset the gene analysis panels to their initial empty state. Called after a
 * new file is uploaded, since gene annotation must be explicitly re-triggered.
 */
export function resetGeneAnalysis() {
    const freqEl = document.getElementById("ga-gene-frequency");
    const shareEl = document.getElementById("ga-gene-sharing");
    const hint =
        '<div class="ga-empty"><i class="bi bi-info-circle me-2"></i>Click "Annotate Genes" to compute gene annotations.</div>';
    if (freqEl) freqEl.innerHTML = hint;
    if (shareEl) {
        shareEl.innerHTML =
            '<div class="ga-empty"><i class="bi bi-info-circle me-2"></i>Click "Annotate Genes" to see how genes are shared across graphs.</div>';
    }
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
export async function renderGlobalAnalysis(opts = {}) {
    const summaryEl = document.getElementById("ga-summary-table");
    const svTypeEl = document.getElementById("ga-svtype-chart");
    const histEl = document.getElementById("ga-weight-hist");
    const circleEl = document.getElementById("ga-circle-plot");
    const scatterEl = document.getElementById("ga-nodes-edges-scatter");
    const sizeDistEl = document.getElementById("ga-size-dist");
    const svBoxEl = document.getElementById("ga-weight-by-svtype");
    const pathLenEl = document.getElementById("ga-path-len-dist");
    const pathsPerGraphEl = document.getElementById("ga-paths-per-graph");
    const kpiEl = document.getElementById("ga-kpi-strip");

    if (!summaryEl || !svTypeEl || !histEl || !circleEl) {
        console.warn("[globalAnalysis] Dashboard containers not found");
        return;
    }

    // Skip a redundant full re-render when the tab is re-shown but nothing has
    // changed (same data + same filters) and the dashboard is still populated.
    // This makes repeated Graph View <-> Global Analysis switches instant.
    if (!opts.force) {
        const sig = `${cacheKey()}|${JSON.stringify(_globalFilters)}|${_summarySort.key}:${_summarySort.dir}`;
        if (
            _lastRenderSignature === sig &&
            STATE.graph_jsons &&
            STATE.graph_jsons.length > 0 &&
            summaryEl.querySelector(".ga-summary-table, .ga-empty")
        ) {
            return; // already rendered with identical inputs
        }
    }

    if (!STATE.graph_jsons || STATE.graph_jsons.length === 0) {
        const empty =
            '<div class="ga-empty"><i class="bi bi-info-circle me-2"></i>Upload a TSG/GTA file to see global analysis.</div>';
        summaryEl.innerHTML = empty;
        svTypeEl.innerHTML = "";
        histEl.innerHTML = "";
        circleEl.innerHTML = "";
        if (scatterEl) scatterEl.innerHTML = "";
        if (sizeDistEl) sizeDistEl.innerHTML = "";
        if (svBoxEl) svBoxEl.innerHTML = "";
        if (pathLenEl) pathLenEl.innerHTML = "";
        if (pathsPerGraphEl) pathsPerGraphEl.innerHTML = "";
        if (kpiEl) kpiEl.innerHTML = "";
        return;
    }

    try {
        await loadD3();
    } catch (e) {
        console.error("[globalAnalysis] Failed to load D3:", e);
        window.showAlert?.("Failed to load D3 for charts", "error");
        return;
    }

    const total = STATE.graph_jsons.length;
    const loadingId = `ga-agg-${Date.now()}`;
    const cacheWarm = _cache && _cacheKey === cacheKey();

    // Show a progress indicator only when we actually have to crunch data
    // (a warm cache returns instantly and needs no spinner).
    if (!cacheWarm) {
        window.loadingIndicator?.show(loadingId, {
            message: `Analyzing ${total} graphs…`,
            type: "bar",
            overlay: false,
        });
    }

    let rawAgg;
    try {
        rawAgg = await collectAllGraphDataAsync((done, tot) => {
            window.loadingIndicator?.updateProgress(
                loadingId,
                Math.round((done / Math.max(1, tot)) * 100)
            );
            window.loadingIndicator?.updateMessage(
                loadingId,
                `Analyzing graphs… ${done} / ${tot}`
            );
        });
    } catch (e) {
        console.error("[globalAnalysis] Aggregation failed:", e);
        window.loadingIndicator?.hide(loadingId);
        window.showAlert?.("Global analysis failed: " + (e?.message || e), "error");
        return;
    } finally {
        if (!cacheWarm) window.loadingIndicator?.hide(loadingId);
    }

    // Apply the "which graphs are included" filters (Phase C).
    const agg = applyGlobalFilters(rawAgg);
    _lastFilteredAgg = agg; // retained for CSV export
    updateFilterStatusUI(agg.filteredCount, agg.totalGraphs);

    renderKpiStrip(agg);
    renderSummaryTable(summaryEl, agg.perGraph, agg);
    renderSvTypeFrequency(svTypeEl, agg.svTypeCounts);
    renderWeightHistogram(histEl, agg.weights);
    if (scatterEl) renderNodesEdgesScatter(scatterEl, agg.perGraph);
    if (svBoxEl) renderWeightBySvType(svBoxEl, agg.breakpoints);
    if (sizeDistEl) renderSizeDistribution(sizeDistEl, agg.perGraph);
    if (pathLenEl) renderPathLengthDistribution(pathLenEl, agg.allPathLengths);
    if (pathsPerGraphEl) renderPathsPerGraph(pathsPerGraphEl, agg.pathCounts);

    // Retain the data the resize-sensitive charts need so a ResizeObserver can
    // re-render them at the correct size once the pane's layout settles (the
    // first measurement during the tab transition can be short and clip axes).
    _resizeChartData = {
        scatter: { el: scatterEl, data: agg.perGraph },
        svbox: { el: svBoxEl, data: agg.breakpoints },
        svtype: { el: svTypeEl, data: agg.svTypeCounts },
        hist: { el: histEl, data: agg.weights },
        pathLen: { el: pathLenEl, data: agg.allPathLengths },
        pathsPerGraph: { el: pathsPerGraphEl, data: agg.pathCounts },
    };
    setupChartResizeObserver();
    // Re-measure once after the current frame in case the pane just became
    // visible (tab transition) and the initial measurement was undersized.
    requestAnimationFrame(() => reRenderResizeCharts());

    // Circle plot is the single heaviest render (all edges from all graphs), so
    // it is ALWAYS deferred behind an explicit "Render circle plot" button. This
    // keeps the initial dashboard instant regardless of file size; the user
    // draws the circle plot on demand. (Tiny files draw instantly on click.)
    renderCirclePlotDeferred(circleEl, agg.breakpoints);

    // Record the signature of this render so an unchanged tab re-show can skip.
    _lastRenderSignature = `${cacheKey()}|${JSON.stringify(_globalFilters)}|${_summarySort.key}:${_summarySort.dir}`;
}

/**
 * Render a placeholder with a button that renders the (expensive) global circle
 * plot on demand. Used when there are too many breakpoints to draw eagerly.
 * @param {HTMLElement} container
 * @param {Array<object>} breakpoints
 */
function renderCirclePlotDeferred(container, breakpoints) {
    // Hide the PNG export button until the plot is actually rendered.
    toggleCirclePngBtn(false);

    if (!breakpoints || !breakpoints.length) {
        container.innerHTML =
            '<div class="ga-empty">No breakpoints across graphs to plot.</div>';
        return;
    }

    container.innerHTML = `
      <div class="ga-empty ga-circle-deferred">
        <i class="bi bi-circle-half me-2"></i>
        ${breakpoints.length.toLocaleString()} edges across all graphs.
        The breakpoint circle plot is the heaviest chart, so it is drawn on
        demand to keep the dashboard responsive.
        <div class="mt-2">
          <button type="button" class="btn btn-sm btn-primary" id="ga-render-circle-btn">
            <i class="bi bi-play-fill me-1"></i> Render circle plot
          </button>
        </div>
      </div>`;
    const btn = container.querySelector("#ga-render-circle-btn");
    if (btn) {
        btn.addEventListener("click", async() => {
            const loadingId = `ga-circle-${Date.now()}`;
            window.loadingIndicator?.show(loadingId, {
                message: "Rendering circle plot…",
                type: "spinner",
                overlay: false,
            });
            try {
                await renderGlobalCirclePlot(container, breakpoints);
            } catch (e) {
                console.error("[globalAnalysis] Circle plot render failed:", e);
                window.showAlert?.("Failed to render circle plot", "error");
            } finally {
                window.loadingIndicator?.hide(loadingId);
            }
        });
    }
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
