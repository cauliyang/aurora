import { STATE, clearNodeHighlights } from "./graph";
import { resizePanels } from "./graphUtilities";
import { loadGraphDataFromServer } from "./graph";
import { getLabelsVisible, setLabelsVisible } from "./graphSetup";
import { loadGeneData, annotateAllNodes } from "./geneAnnotation";
import { showBreakpointCirclePlotModal } from "./breakpointCirclePlot";
// NOTE: globalAnalysis is intentionally NOT statically imported here.
// eventHandlers <-> globalAnalysis would form a circular dependency (the
// dashboard navigates back into graph loading), which under Parcel's CommonJS
// interop leaves the exports object partially initialized and yields
// "renderGlobalAnalysis is not a function". We load it lazily instead.
let _globalAnalysisMod = null;
async function getGlobalAnalysis() {
    if (!_globalAnalysisMod) {
        _globalAnalysisMod = await import("./globalAnalysis.js");
    }
    return _globalAnalysisMod;
}

/**
 * Refresh the Global Analysis dashboard after a new file is uploaded.
 * Always invalidates the cached aggregation so the next render uses fresh data.
 * If the Global Analysis tab is currently visible, re-renders it immediately;
 * otherwise the (cleared) dashboard re-renders lazily when the tab is shown.
 */
async function refreshGlobalAnalysisAfterUpload() {
    try {
        const m = await getGlobalAnalysis();
        m.invalidateGlobalAnalysisCache?.();

        // Reset the gene panels — gene annotation must be re-triggered for the
        // new file (it's an explicit, potentially slow action).
        m.resetGeneAnalysis?.();

        const pane = document.getElementById("globalAnalysisPane");
        const isVisible = pane && pane.classList.contains("active");
        if (isVisible) {
            await m.renderGlobalAnalysis();
        }
    } catch (err) {
        console.error("Failed to refresh global analysis after upload:", err);
    }
}

// Get references to the cy, info, and walks elements
const cyContainer = document.getElementById("cy");
const infoPanel = document.getElementById("info");
const walksPanel = document.getElementById("walks");

// Get references to the maximize button and set initial state
const maximizeButton = document.getElementById("toggleMaximize");
let isMaximized = false;

// Add click event listener to the maximize button only if it exists
if (maximizeButton) {
    maximizeButton.addEventListener("click", () => {
        if (isMaximized) {
            // Restore previous layout
            cyContainer.style.width = "";
            cyContainer.style.height = "";
            infoPanel.style.display = "";
            walksPanel.style.display = "";
            isMaximized = false;
        } else {
            // Maximize cy panel
            cyContainer.style.width = "100%";
            cyContainer.style.height = "100vh";
            infoPanel.style.display = "none";
            walksPanel.style.display = "none";
            isMaximized = true;
        }
    });
} else {
    console.warn("Element with ID 'toggleMaximize' not found in the DOM");
}

function toggleLabels() {
    // Update labelsVisible state
    const nodelabelStyle = !getLabelsVisible() ?

        function(ele) {
            return ele.data("gene_name") ? ele.data("gene_name") : "";
        } :
        "";
    const edgeLabelStyle = !getLabelsVisible() ?

        function(ele) {
            return ele.data("weight") ? ele.data("weight") : "";
        } :
        "";

    STATE.cy
        .style()
        .selector("node") // Select nodes
        .style({
            label: nodelabelStyle,
        })
        .selector("edge") // Select edges
        .style({
            label: edgeLabelStyle, // Toggles edge labels based on weight
        })
        .update(); // Important to update the style
    setLabelsVisible(!getLabelsVisible());
}

// Add a null check before attaching the event listener
const hiddenLabelBtn = document.getElementById("hiddenLabel");
if (hiddenLabelBtn) {
    hiddenLabelBtn.addEventListener("click", toggleLabels);
} else {
    console.warn("Element with ID 'hiddenLabel' not found in the DOM");
}

const captureGraphBtn = document.getElementById("captureGraph");
if (captureGraphBtn) {
    captureGraphBtn.addEventListener("click", () => {
        showExportDialog();
    });
} else {
    console.warn("Element with ID 'captureGraph' not found in the DOM");
}

/**
 * Show a modern export dialog with format options
 */
function showExportDialog() {
    if (!STATE.cy) {
        window.showAlert?.("No graph loaded to export", "error");
        return;
    }

    // Create modal if it doesn't exist
    let modal = document.getElementById("exportModal");
    if (!modal) {
        modal = createExportModal();
        document.body.appendChild(modal);
    }

    // Show the modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    // Set up export handlers
    setupExportHandlers(modal, bsModal);
}

/**
 * Create the export modal HTML
 */
function createExportModal() {
    const modal = document.createElement("div");
    modal.id = "exportModal";
    modal.className = "modal fade";
    modal.setAttribute("tabindex", "-1");
    modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-download me-2"></i>Export Graph
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label fw-bold">Select Export Format:</label>
            <div class="export-format-grid">
              <div class="export-format-option" data-format="png">
                <i class="bi bi-file-earmark-image"></i>
                <div class="format-name">PNG</div>
                <div class="format-desc">Raster image, best for presentations</div>
              </div>
              <div class="export-format-option" data-format="jpg">
                <i class="bi bi-file-earmark-image-fill"></i>
                <div class="format-name">JPG</div>
                <div class="format-desc">Compressed image, smaller file size</div>
              </div>
              <div class="export-format-option active" data-format="svg">
                <i class="bi bi-file-earmark-code"></i>
                <div class="format-name">SVG</div>
                <div class="format-desc">Vector image, scalable and editable</div>
              </div>
              <div class="export-format-option" data-format="json">
                <i class="bi bi-filetype-json"></i>
                <div class="format-name">JSON</div>
                <div class="format-desc">Graph data for reloading</div>
              </div>
            </div>
          </div>

          <div class="mb-3" id="exportOptions">
            <label class="form-label fw-bold">Options:</label>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="exportFullGraph" checked>
              <label class="form-check-label" for="exportFullGraph">
                Export full graph (include all elements)
              </label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="exportTransparentBg">
              <label class="form-check-label" for="exportTransparentBg">
                Transparent background
              </label>
            </div>
          </div>

          <div class="mb-3" id="scaleOptions">
            <label for="exportScale" class="form-label fw-bold">Scale:</label>
            <input type="range" class="form-range" id="exportScale" min="1" max="4" step="0.5" value="2">
            <div class="d-flex justify-content-between">
              <small>1x</small>
              <small id="scaleValue">2x</small>
              <small>4x</small>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary" id="confirmExport">
            <i class="bi bi-download me-2"></i>Export
          </button>
        </div>
      </div>
    </div>
  `;

    // Add styles
    if (!document.getElementById("exportModalStyles")) {
        const style = document.createElement("style");
        style.id = "exportModalStyles";
        style.textContent = `
      .export-format-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-top: 12px;
      }

      .export-format-option {
        border: 2px solid #dee2e6;
        border-radius: 8px;
        padding: 16px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        background: var(--bg-primary, #fff);
      }

      .export-format-option:hover {
        border-color: var(--aurora-primary, #6366f1);
        background: var(--bg-secondary, #f8f9fa);
      }

      .export-format-option.active {
        border-color: var(--aurora-primary, #6366f1);
        background: rgba(0, 123, 255, 0.1);
      }

      .export-format-option i {
        font-size: 2rem;
        color: var(--aurora-primary, #6366f1);
        margin-bottom: 8px;
      }

      .format-name {
        font-weight: bold;
        margin-bottom: 4px;
        color: var(--text-primary, #212529);
      }

      .format-desc {
        font-size: 0.75rem;
        color: var(--text-secondary, #475569);
      }

      [data-theme="dark"] .export-format-option {
        background: var(--bg-primary, #1a1a1a);
        border-color: #495057;
      }

      [data-theme="dark"] .export-format-option:hover {
        background: var(--bg-secondary, #2d2d2d);
      }
    `;
        document.head.appendChild(style);
    }

    return modal;
}

/**
 * Set up export event handlers
 */
function setupExportHandlers(modal, bsModal) {
    // Format selection
    const formatOptions = modal.querySelectorAll(".export-format-option");
    formatOptions.forEach((option) => {
        option.addEventListener("click", () => {
            formatOptions.forEach((o) => o.classList.remove("active"));
            option.classList.add("active");
            updateExportOptions(option.dataset.format, modal);
        });
    });

    // Scale slider
    const scaleSlider = modal.querySelector("#exportScale");
    const scaleValue = modal.querySelector("#scaleValue");
    if (scaleSlider && scaleValue) {
        scaleSlider.addEventListener("input", (e) => {
            scaleValue.textContent = `${e.target.value}x`;
        });
    }

    // Export button
    const exportBtn = modal.querySelector("#confirmExport");
    if (exportBtn) {
        exportBtn.replaceWith(exportBtn.cloneNode(true));
        const newExportBtn = modal.querySelector("#confirmExport");
        newExportBtn.addEventListener("click", async() => {
            const activeFormat = modal.querySelector(".export-format-option.active");
            const format = activeFormat?.dataset.format || "svg";
            const scale = parseFloat(scaleSlider?.value || 2);
            const fullGraph = modal.querySelector("#exportFullGraph")?.checked??true;
            const transparentBg = modal.querySelector("#exportTransparentBg")?.checked??false;

            try {
                await exportGraph(format, { scale, fullGraph, transparentBg });
                bsModal.hide();
                window.showAlert?.(`Graph exported as ${format.toUpperCase()}!`, "success", 2000);
            } catch (error) {
                console.error("Export failed:", error);
                window.showAlert?.(`Export failed: ${error.message}`, "error");
            }
        });
    }
}

/**
 * Update export options based on selected format
 */
function updateExportOptions(format, modal) {
    const scaleOptions = modal.querySelector("#scaleOptions");
    const exportOptions = modal.querySelector("#exportOptions");

    if (format === "json") {
        scaleOptions.style.display = "none";
        exportOptions.style.display = "none";
    } else {
        scaleOptions.style.display = format === "svg" ? "none" : "block";
        exportOptions.style.display = "block";
    }
}

/**
 * Export graph in the specified format
 */
async function exportGraph(format, options = {}) {
    if (!STATE.cy) {
        throw new Error("No graph loaded");
    }

    const { scale = 2, fullGraph = true, transparentBg = false } = options;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    let data, filename, mimeType;

    switch (format) {
        case "png":
            data = STATE.cy.png({
                full: fullGraph,
                scale: scale,
                bg: transparentBg ? "transparent" : "#ffffff",
            });
            filename = `graph_${timestamp}.png`;
            break;

        case "jpg":
            data = STATE.cy.jpg({
                full: fullGraph,
                scale: scale,
                bg: "#ffffff", // JPG does not support transparency
                quality: 0.9,
            });
            filename = `graph_${timestamp}.jpg`;
            break;

        case "svg":
            // Cytoscape SVG export
            const svgContent = STATE.cy.svg({
                full: fullGraph,
                bg: transparentBg ? "transparent" : "#ffffff",
            });
            const blob = new Blob([svgContent], { type: "image/svg+xml" });
            data = URL.createObjectURL(blob);
            filename = `graph_${timestamp}.svg`;
            mimeType = "image/svg+xml";
            break;

        case "json":
            const jsonData = STATE.cy.json();
            const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], {
                type: "application/json",
            });
            data = URL.createObjectURL(jsonBlob);
            filename = `graph_${timestamp}.json`;
            mimeType = "application/json";
            break;

        default:
            throw new Error(`Unsupported format: ${format}`);
    }

    // Download the file
    const downloadLink = document.createElement("a");
    downloadLink.href = data;
    downloadLink.download = filename;
    downloadLink.click();

    // Clean up blob URLs
    if (format === "svg" || format === "json") {
        setTimeout(() => URL.revokeObjectURL(data), 100);
    }
}

// IGV button removed - feature not needed

document.addEventListener("DOMContentLoaded", () => {
    resizePanels();
});

const uploadInput = document.getElementById("uploadInput");
const uploadBtn = document.getElementById("uploadBtn");
if (uploadInput) {
    uploadInput.addEventListener("change", handleFileUpload);
} else {
    console.warn("Element with ID 'uploadInput' not found in the DOM");
}
if (uploadBtn && uploadInput) {
    uploadBtn.addEventListener("click", () => uploadInput.click());
} else {
    console.warn("Upload button or input not found in the DOM");
}

/**
 * Parses graph IDs from raw TSG content.
 * The TSG format delimits graphs with a "G <graphId>" line. The WASM parser
 * drops these IDs, so we recover them here to label the graph selector.
 * Returns an array of graph IDs in file order. Falls back to an empty array
 * when no G-lines are present (e.g. single-graph TSG without an explicit ID).
 * @param {string} content - Raw TSG file text
 * @returns {string[]}
 */
function parseGraphIds(content) {
    const ids = [];
    if (typeof content !== "string") return ids;
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
        // G-line: "G\t<graphId>" (tab or whitespace separated)
        if (/^G\s/.test(line)) {
            const parts = line.split(/\s+/);
            if (parts.length >= 2 && parts[1]) {
                ids.push(parts[1].trim());
            }
        }
    }
    return ids;
}

/**
 * Parse the maximum path length (in nodes) per graph from raw TSG/GTA "P" lines.
 *
 * Path lines have the form:
 *   P  <pathId>  <elem1>  <elem2>  ...
 * where each element is a node ("TSN...") or edge ("TSE...") id with an
 * optional orientation suffix ("+"/"-"). "P" lines belong to the most recent
 * "G <graphId>" block, so we accumulate the per-graph maximum node-count as we
 * scan the file in order. The returned array is parallel to the WASM's parsed
 * graph order (same file order).
 *
 * A graph with no "P" lines gets a null entry so Global Analysis can fall back
 * to a computed longest path.
 *
 * @param {string} content - Raw TSG/GTA file text
 * @returns {(number|null)[]} max path node-count per graph, in file order
 */
/**
 * Parse per-graph path statistics from raw TSG/GTA "P" lines.
 *
 * Path lines have the form:
 *   P  <pathId>  <elem1>  <elem2>  ...
 * where each element is a node ("TSN...") or edge ("TSE...") id with an
 * optional orientation suffix ("+"/"-"). "P" lines belong to the most recent
 * "G <graphId>" block. For each graph we collect:
 *   - maxPathLen: the largest node-count across its paths (or null if none)
 *   - pathLengths: the node-count of every path (empty array if none)
 *   - pathCount: number of "P" lines for the graph
 *
 * Arrays are parallel to the WASM's parsed graph order (same file order).
 * Graphs with no "P" lines get maxPathLen=null so Global Analysis can fall back
 * to a computed enumeration.
 *
 * @param {string} content - Raw TSG/GTA file text
 * @returns {{maxPathLen:(number|null)[], pathLengths:number[][], pathCount:number[]}}
 */
function parsePathStats(content) {
    const maxPathLen = [];
    const pathLengths = [];
    const pathCount = [];
    if (typeof content !== "string") {
        return { maxPathLen, pathLengths, pathCount };
    }
    const lines = content.split(/\r?\n/);
    let gi = -1; // current graph index (incremented on each G-line)

    for (const line of lines) {
        if (/^G\s/.test(line)) {
            gi += 1;
            maxPathLen[gi] = null;
            pathLengths[gi] = [];
            pathCount[gi] = 0;
            continue;
        }
        if (gi >= 0 && /^P\s/.test(line)) {
            const parts = line.split(/\s+/);
            // parts[0] = "P", parts[1] = path id, parts[2..] = elements
            let nodeCount = 0;
            for (let k = 2; k < parts.length; k++) {
                // Node elements are prefixed "TSN"; ignore orientation suffix.
                if (parts[k] && parts[k].startsWith("TSN")) nodeCount += 1;
            }
            pathLengths[gi].push(nodeCount);
            pathCount[gi] += 1;
            if (nodeCount > (maxPathLen[gi] || 0)) maxPathLen[gi] = nodeCount;
        }
    }
    return { maxPathLen, pathLengths, pathCount };
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Show loading indicator
    const loadingId = `upload-${Date.now()}`;
    window.loadingIndicator?.show(loadingId, {
        message: `Loading ${file.name}...`,
        type: "spinner",
        overlay: true,
    });

    const reader = new FileReader();

    reader.onload = async(e) => {
        const content = e.target.result;
        const fileExtension = file.name.split(".").pop().toLowerCase();

        try {
            if (fileExtension === "json") {
                window.loadingIndicator?.updateMessage(loadingId, "Parsing JSON data...");
                // Handle JSON file
                const jsonData = JSON.parse(content);

                window.loadingIndicator?.updateMessage(loadingId, "Rendering graph...");
                loadGraphDataFromServer(jsonData);

                // Single JSON file: one graph at index 0, no IDs.
                // Populate graph_jsons so Global Analysis can read this graph
                // (content is already the JSON string in the format expected).
                STATE.graph_jsons = [content];
                STATE.graph_ids = [];
                STATE.graph_max_path_len = []; // computed lazily from possible_paths / DFS
                STATE.graph_path_lengths = []; // computed lazily via enumeration
                STATE.graph_path_count = [];
                STATE.currentGraphIndex = 0;

                // Hide graph selector for single JSON files
                document.getElementById("graphSelectorContainer").classList.add("d-none");

                window.showAlert?.("Graph loaded successfully!", "success", 2000);
            } else if (fileExtension === "tsg" || fileExtension === "gta") {
                // TSG and GTA share the same text format and are parsed by the
                // same WASM entry point.
                const fmt = fileExtension.toUpperCase();
                window.loadingIndicator?.updateMessage(loadingId, `Parsing ${fmt} file...`);
                // wait for the result from promise
                STATE.graph_jsons = await window.parse_tsgFile(content);

                // Recover graph IDs from the raw "G" lines (WASM drops them).
                // Only keep them if the count matches the parsed graph count, so
                // the selector labels stay aligned with the actual graphs.
                const parsedIds = parseGraphIds(content);
                STATE.graph_ids =
                    parsedIds.length === STATE.graph_jsons.length ? parsedIds : [];

                // Recover per-graph path statistics from raw "P" lines (also
                // dropped by the WASM): max path length, every path length, and
                // the path count. Keep only when aligned with the parsed graph
                // count; otherwise leave empty so Global Analysis computes them
                // via enumeration.
                const pathStats = parsePathStats(content);
                const aligned =
                    pathStats.maxPathLen.length === STATE.graph_jsons.length;
                STATE.graph_max_path_len = aligned ? pathStats.maxPathLen : [];
                STATE.graph_path_lengths = aligned ? pathStats.pathLengths : [];
                STATE.graph_path_count = aligned ? pathStats.pathCount : [];

                // Show graph selector if multiple graphs are available
                const graphCount = STATE.graph_jsons.length;
                window.loadingIndicator?.updateMessage(
                    loadingId,
                    `Found ${graphCount} graph${graphCount > 1 ? "s" : ""}...`
                );

                if (graphCount > 1) {
                    setupGraphSelector(graphCount);
                } else {
                    document.getElementById("graphSelectorContainer").classList.add("d-none");
                }

                // Load the first graph by default
                window.loadingIndicator?.updateMessage(loadingId, "Rendering graph...");
                const jsonData = JSON.parse(STATE.graph_jsons[0]);
                loadGraphDataFromServer(jsonData);
                STATE.currentGraphIndex = 0;

                window.showAlert?.(
                    `Loaded ${graphCount} graph${graphCount > 1 ? "s" : ""} successfully!`,
                    "success",
                    2000
                );
            } else {
                throw new Error(
                    `Unsupported file type ".${fileExtension}". Please upload a .json, .tsg, or .gta file.`
                );
            }

            // New file loaded → refresh Global Analysis (invalidate cache and
            // re-render if its tab is currently visible). Done after
            // STATE.graph_jsons is set so the new data is picked up.
            refreshGlobalAnalysisAfterUpload();
        } catch (error) {
            console.error("Error processing file:", error);
            window.showAlert?.("Error processing file: " + error.message, "error");
        } finally {
            // Always hide the loading indicator, regardless of which branch ran
            // (or whether an error/unsupported-extension short-circuited it).
            window.loadingIndicator?.hide(loadingId);
        }
    };

    reader.onerror = () => {
        window.loadingIndicator?.hide(loadingId);
        window.showAlert?.("Failed to read file", "error");
    };

    reader.readAsText(file);

    // Reset the file input so the same file can be re-uploaded
    event.target.value = "";
}

/**
 * Returns a human-readable label for a graph at the given index.
 * Uses the parsed TSG graph ID when available, otherwise falls back to
 * "Graph N". The ID (e.g. "aebca61723b9b758") is shown directly.
 * @param {number} index - Zero-based graph index
 * @returns {string}
 */
export function getGraphLabel(index) {
    const id = STATE.graph_ids && STATE.graph_ids[index];
    return id ? id : `Graph ${index + 1}`;
}

/**
 * Loads the graph at the given index into the Cytoscape view, updates
 * STATE.currentGraphIndex, and keeps the #graphSelect dropdown in sync.
 * Shared by the selector change handler and the Global Analysis click-throughs
 * (cross-graph navigation).
 * @param {number} index - Zero-based graph index
 * @param {boolean} [notify=true] - Whether to show a success alert
 * @returns {boolean} true if the graph was loaded
 */
export function loadGraphByIndex(index, notify = true) {
    if (!STATE.graph_jsons || index < 0 || index >= STATE.graph_jsons.length) {
        console.warn(`loadGraphByIndex: invalid index ${index}`);
        return false;
    }
    if (index === STATE.currentGraphIndex && STATE.cy) {
        // Already loaded — no-op (avoids a costly re-init).
        return true;
    }
    try {
        const jsonData = JSON.parse(STATE.graph_jsons[index]);
        loadGraphDataFromServer(jsonData);
        STATE.currentGraphIndex = index;

        // Keep the toolbar dropdown in sync when navigation is programmatic.
        const graphSelect = document.getElementById("graphSelect");
        if (graphSelect && String(graphSelect.value) !== String(index)) {
            graphSelect.value = String(index);
        }

        if (notify) {
            window.showAlert?.(`Loaded ${getGraphLabel(index)}`, "success", 2000);
        }
        // Refresh the dashboard's active-row highlight if it's rendered.
        return true;
    } catch (error) {
        console.error("Error loading selected graph:", error);
        window.showAlert?.(
            `Error loading ${getGraphLabel(index)}: ${error.message}`,
            "error"
        );
        return false;
    }
}

// Expose for cross-module use without creating static import cycles
// (breakpointCirclePlot.js calls this for cross-graph navigation).
window.loadGraphByIndex = loadGraphByIndex;

/**
 * Sets up the graph selector dropdown with options based on the number of available graphs
 * @param {number} graphCount - The number of available graphs
 */
function setupGraphSelector(graphCount) {
    const graphSelect = document.getElementById("graphSelect");
    const graphSelectorContainer = document.getElementById(
        "graphSelectorContainer"
    );

    // Clear existing options
    graphSelect.innerHTML = "";

    // Add options for each graph, labelled by graph ID when available
    for (let i = 0; i < graphCount; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = getGraphLabel(i);
        // Always expose the index-based name as a tooltip for disambiguation
        option.title = `Graph ${i + 1}${STATE.graph_ids[i] ? ` (${STATE.graph_ids[i]})` : ""}`;
        graphSelect.appendChild(option);
    }

    // Show the selector
    graphSelectorContainer.classList.remove("d-none");

    // Replace element to remove any previous change listeners, then add fresh one
    const freshSelect = graphSelect.cloneNode(true);
    graphSelect.parentNode.replaceChild(freshSelect, graphSelect);
    freshSelect.addEventListener("change", function() {
        const selectedIndex = parseInt(this.value);
        if (Number.isNaN(selectedIndex)) return; // "No matching graph" placeholder
        loadGraphByIndex(selectedIndex);
    });

    // (Re)initialize the fuzzy graph-ID search for this set of graphs.
    setupGraphSearch(graphCount);
}

/**
 * Fuzzy subsequence matcher. Returns a score (higher = better) if every
 * character of `query` appears in `text` in order, otherwise -1.
 * Rewards contiguous runs, start-of-string, and shorter targets.
 * @param {string} query
 * @param {string} text
 * @returns {number}
 */
function fuzzyScore(query, text) {
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    if (!q) return 0;

    // Fast path: exact substring gets a high base score.
    const subIdx = t.indexOf(q);
    if (subIdx !== -1) {
        return 1000 - subIdx * 2 - (t.length - q.length);
    }

    let ti = 0;
    let score = 0;
    let run = 0;
    let prevMatch = -2;
    for (let qi = 0; qi < q.length; qi++) {
        const ch = q[qi];
        let found = -1;
        for (let j = ti; j < t.length; j++) {
            if (t[j] === ch) {
                found = j;
                break;
            }
        }
        if (found === -1) return -1; // not a subsequence
        if (found === prevMatch + 1) {
            run += 1;
            score += 5 + run * 2; // contiguous bonus
        } else {
            run = 0;
            score += 1;
        }
        if (found === 0) score += 4; // start-of-string bonus
        prevMatch = found;
        ti = found + 1;
    }
    // Prefer shorter targets (closer match density).
    score -= Math.max(0, t.length - q.length) * 0.2;
    return score;
}

/**
 * Sets up the fuzzy graph-ID search box next to the graph selector.
 * Typing filters graphs by ID; clicking a result (or pressing Enter on the top
 * match) loads that graph.
 * @param {number} graphCount
 */
function setupGraphSearch(graphCount) {
    const input = document.getElementById("graphSearchInput");
    const results = document.getElementById("graphSearchResults");
    if (!input || !results) return;

    // Clone to drop any previous listeners (re-init per upload).
    const freshInput = input.cloneNode(true);
    input.parentNode.replaceChild(freshInput, input);
    freshInput.value = "";
    results.innerHTML = "";
    results.classList.add("d-none");

    // Build the searchable label list once.
    const items = [];
    for (let i = 0; i < graphCount; i++) {
        items.push({ index: i, label: getGraphLabel(i) });
    }

    let currentMatches = [];

    /**
     * Rebuild the native <select> option list to only include graphs whose
     * label matches the search text (fuzzy). An empty query restores every
     * option. The current selection is preserved when it still matches;
     * otherwise the selected value is left unchanged (no graph is loaded here —
     * loading happens on explicit selection/Enter/result click).
     * @param {string} query
     */
    function filterSelectOptions(query) {
        const sel = document.getElementById("graphSelect");
        if (!sel) return;

        const q = (query || "").trim();
        // Compute the set of matching indices (all when query is empty).
        let matched;
        if (!q) {
            matched = items.map((it) => it.index);
        } else {
            matched = items
                .map((it) => ({ index: it.index, score: fuzzyScore(q, it.label) }))
                .filter((it) => it.score >= 0)
                .sort((a, b) => b.score - a.score)
                .map((it) => it.index);
        }

        const prevValue = sel.value;
        sel.innerHTML = "";

        if (!matched.length) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "No matching graph";
            opt.disabled = true;
            opt.selected = true;
            sel.appendChild(opt);
            return;
        }

        for (const idx of matched) {
            const option = document.createElement("option");
            option.value = idx;
            option.textContent = getGraphLabel(idx);
            option.title = `Graph ${idx + 1}${STATE.graph_ids[idx] ? ` (${STATE.graph_ids[idx]})` : ""}`;
            sel.appendChild(option);
        }

        // Keep the previously selected graph selected if it still matches;
        // otherwise fall back to the currently loaded graph or the top match.
        if (matched.includes(Number(prevValue))) {
            sel.value = prevValue;
        } else if (matched.includes(STATE.currentGraphIndex)) {
            sel.value = String(STATE.currentGraphIndex);
        } else {
            sel.value = String(matched[0]);
        }
    }

    // Position the fixed dropdown directly under the search input so it isn't
    // clipped by the toolbar's overflow:auto.
    function positionResults() {
        const r = freshInput.getBoundingClientRect();
        results.style.top = `${r.bottom + 2}px`;
        results.style.left = `${r.left}px`;
        results.style.minWidth = `${Math.max(r.width, 240)}px`;
    }

    function computeMatches(query) {
        if (!query.trim()) {
            // Empty query → show all graphs (capped).
            return items.slice(0, 20).map((it) => ({ ...it, score: 0 }));
        }
        return items
            .map((it) => ({ ...it, score: fuzzyScore(query, it.label) }))
            .filter((it) => it.score >= 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 12);
    }

    function renderResults(matches) {
        currentMatches = matches;
        positionResults();
        if (!matches.length) {
            results.innerHTML =
                '<div class="graph-search-empty">No matching graph</div>';
            results.classList.remove("d-none");
            return;
        }
        results.innerHTML = matches
            .map(
                (m, i) =>
                    `<button type="button" class="graph-search-item${i === 0 ? " active" : ""}"
                        data-index="${m.index}">
                        <span class="gs-label">${escapeHtmlSafe(m.label)}</span>
                        <span class="gs-idx">#${m.index + 1}</span>
                    </button>`
            )
            .join("");
        results.classList.remove("d-none");

        results.querySelectorAll(".graph-search-item").forEach((btn) => {
            btn.addEventListener("mousedown", (e) => {
                // mousedown (not click) so it fires before input blur hides list
                e.preventDefault();
                const idx = parseInt(btn.getAttribute("data-index"), 10);
                selectMatch(idx);
            });
        });
    }

    function selectMatch(idx) {
        loadGraphByIndex(idx);
        freshInput.value = "";
        results.classList.add("d-none");
        // Restore the full option list now that the search is cleared, then
        // reflect the loaded graph as the current selection.
        filterSelectOptions("");
        const sel = document.getElementById("graphSelect");
        if (sel) sel.value = String(idx);
    }

    freshInput.addEventListener("input", () => {
        // Filter both the fuzzy results dropdown AND the native <select> list.
        renderResults(computeMatches(freshInput.value));
        filterSelectOptions(freshInput.value);
    });

    freshInput.addEventListener("focus", () => {
        renderResults(computeMatches(freshInput.value));
    });

    freshInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (currentMatches.length) selectMatch(currentMatches[0].index);
        } else if (e.key === "Escape") {
            results.classList.add("d-none");
            // Clear the search and restore the full dropdown list.
            freshInput.value = "";
            filterSelectOptions("");
            freshInput.blur();
        }
    });

    freshInput.addEventListener("blur", () => {
        // Delay so a result mousedown can register first.
        setTimeout(() => results.classList.add("d-none"), 120);
    });
}

// Minimal HTML escaping for search result labels.
function escapeHtmlSafe(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// Breakpoint Circle Plot button — opens the circos-style modal.
// Statically imported (see top of file) so we don't depend on a dynamic
// chunk URL that can go stale after a Parcel dev-server restart.
const circlePlotBtn = document.getElementById("circlePlotBtn");
if (circlePlotBtn) {
    circlePlotBtn.addEventListener("click", () => {
        try {
            showBreakpointCirclePlotModal();
        } catch (err) {
            console.error("Failed to open circle plot:", err);
            window.showAlert?.(
                "Failed to open circle plot: " + (err?.message || err),
                "error"
            );
        }
    });
} else {
    console.warn("Element with ID 'circlePlotBtn' not found in the DOM");
}

// Hide the graph-view node/edge tooltip. The Cytoscape "mouseout" event does
// not fire when the canvas is hidden by a tab switch, so the tooltip can stay
// stuck on screen. Call this when leaving the Graph View.
function hideGraphTooltip() {
    const tooltip = document.getElementById("tooltip");
    if (tooltip) {
        tooltip.classList.remove("tooltip-visible");
        tooltip.style.display = "none";
    }
}

// Global Analysis tab — lazily render the dashboard when the tab is shown.
// Deferred until visible so D3 can measure the chart containers correctly.
const globalAnalysisTab = document.getElementById("globalAnalysisTab");
if (globalAnalysisTab) {
    // Hide the Graph View tooltip as soon as we start switching tabs.
    globalAnalysisTab.addEventListener("show.bs.tab", hideGraphTooltip);

    globalAnalysisTab.addEventListener("shown.bs.tab", async() => {
        try {
            const m = await getGlobalAnalysis();
            await m.renderGlobalAnalysis();
        } catch (err) {
            console.error("Failed to render global analysis:", err);
            window.showAlert?.(
                "Failed to render global analysis: " + (err?.message || err),
                "error"
            );
        }
    });
}

// Manual refresh button inside the Global Analysis dashboard
const gaRefreshBtn = document.getElementById("ga-refresh-btn");
if (gaRefreshBtn) {
    gaRefreshBtn.addEventListener("click", async() => {
        try {
            const m = await getGlobalAnalysis();
            m.invalidateGlobalAnalysisCache?.();
            await m.renderGlobalAnalysis();
        } catch (err) {
            console.error("Failed to refresh global analysis:", err);
            window.showAlert?.(
                "Failed to refresh global analysis: " + (err?.message || err),
                "error"
            );
        }
    });
}

// Global Analysis: export the per-graph summary table as CSV.
const gaExportCsvBtn = document.getElementById("ga-export-csv-btn");
if (gaExportCsvBtn) {
    gaExportCsvBtn.addEventListener("click", async() => {
        try {
            const m = await getGlobalAnalysis();
            m.exportSummaryCsv?.();
        } catch (err) {
            console.error("Failed to export CSV:", err);
            window.showAlert?.("Failed to export CSV: " + (err?.message || err), "error");
        }
    });
}

// Global Analysis: per-card PNG export buttons (delegated). Each button carries
// data-export-chart (container id) and data-export-name (filename base).
const gaPane = document.getElementById("globalAnalysisPane");
if (gaPane) {
    gaPane.addEventListener("click", async(event) => {
        const btn = event.target.closest(".ga-png-btn");
        if (!btn) return;
        event.preventDefault();
        const containerId = btn.getAttribute("data-export-chart");
        const name = btn.getAttribute("data-export-name") || "ga_figure";
        if (!containerId) return;
        try {
            const m = await getGlobalAnalysis();
            m.exportChartPng?.(containerId, name);
        } catch (err) {
            console.error("Failed to export figure PNG:", err);
            window.showAlert?.("Failed to export figure: " + (err?.message || err), "error");
        }
    });
}

// Global Analysis: parameters panel — filter WHICH graphs are included.
const gaFilterApplyBtn = document.getElementById("ga-filter-apply-btn");
const gaFilterClearBtn = document.getElementById("ga-filter-clear-btn");

/** Read the filter panel inputs into a plain object. */
function readGaFilterInputs() {
    const num = (id) => {
        const el = document.getElementById(id);
        const v = el ? parseFloat(el.value) : 0;
        return Number.isFinite(v) && v > 0 ? v : 0;
    };
    const str = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : "";
    };
    return {
        minNodes: num("ga-filter-min-nodes"),
        minEdges: num("ga-filter-min-edges"),
        minTotalWeight: num("ga-filter-min-weight"),
        minTotalJsr: num("ga-filter-min-jsr"),
        svType: str("ga-filter-svtype"),
        chrom: str("ga-filter-chrom"),
    };
}

if (gaFilterApplyBtn) {
    gaFilterApplyBtn.addEventListener("click", async() => {
        try {
            const m = await getGlobalAnalysis();
            m.setGlobalFilters?.(readGaFilterInputs());
            // Aggregation cache is preserved; only the filtered view changes.
            await m.renderGlobalAnalysis();
        } catch (err) {
            console.error("Failed to apply global analysis filters:", err);
            window.showAlert?.(
                "Failed to apply filters: " + (err?.message || err),
                "error"
            );
        }
    });
}

if (gaFilterClearBtn) {
    gaFilterClearBtn.addEventListener("click", async() => {
        ["ga-filter-min-nodes", "ga-filter-min-edges", "ga-filter-min-weight",
            "ga-filter-min-jsr"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.value = "0";
        });
        ["ga-filter-svtype", "ga-filter-chrom"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
        try {
            const m = await getGlobalAnalysis();
            m.setGlobalFilters?.({
                minNodes: 0,
                minEdges: 0,
                minTotalWeight: 0,
                minTotalJsr: 0,
                svType: "",
                chrom: "",
            });
            await m.renderGlobalAnalysis();
        } catch (err) {
            console.error("Failed to clear global analysis filters:", err);
        }
    });
}

// Global Analysis: annotate genes across all graphs and render gene panels
const gaAnnotateGenesBtn = document.getElementById("ga-annotate-genes-btn");
if (gaAnnotateGenesBtn) {
    gaAnnotateGenesBtn.addEventListener("click", async() => {
        try {
            const m = await getGlobalAnalysis();
            await m.renderGeneAnalysis();
        } catch (err) {
            console.error("Failed to annotate genes:", err);
            window.showAlert?.(
                "Failed to annotate genes: " + (err?.message || err),
                "error"
            );
        }
    });
}

// Add the clear highlights button event handler
const clearHighlightsBtn = document.getElementById("clearHighlights");
if (clearHighlightsBtn) {
    clearHighlightsBtn.addEventListener("click", () => {
        clearNodeHighlights(STATE.cy);
    });
} else {
    console.warn("Element with ID 'clearHighlights' not found in the DOM");
}

// Gene annotation direct action (if modal doesn't work for some reason)
const geneAnnotationBtn = document.getElementById("geneAnnotationBtn");
if (geneAnnotationBtn) {
    geneAnnotationBtn.addEventListener("click", async(e) => {
        // Direct annotation without modal
        if (e.ctrlKey || !window.bootstrap) {
            e.preventDefault();
            await handleGeneAnnotation();
        } else {
            // Bootstrap modal approach
            try {
                const modal = new bootstrap.Modal(
                    document.getElementById("geneAnnotationModal")
                );
                modal.show();
            } catch (error) {
                console.error(
                    "Error showing modal, falling back to direct annotation:",
                    error
                );
                await handleGeneAnnotation();
            }
        }
    });
} else {
    console.warn("Element with ID 'geneAnnotationBtn' not found in the DOM");
}

/**
 * Handle direct gene annotation when modal is unavailable
 */
async function handleGeneAnnotation() {
    const loadingId = `gene-annotation-${Date.now()}`;

    try {
        // Show modern loading indicator
        window.loadingIndicator?.show(loadingId, {
            message: "Loading gene database...",
            type: "bar",
            overlay: true,
        });

        // Try loading the gene data
        const loaded = await loadGeneData();

        if (loaded && STATE.cy) {
            // Update loading message
            window.loadingIndicator?.updateMessage(loadingId, "Annotating nodes...");

            // Annotate all nodes in the graph
            const nodeCount = STATE.cy.nodes().length;
            const annotatedCount = await annotateAllNodes(STATE.cy);

            // Update progress
            window.loadingIndicator?.updateProgress(loadingId, 100);

            // Hide loading and show success
            setTimeout(() => {
                window.loadingIndicator?.hide(loadingId);
                window.showAlert?.(
                    `Annotated ${annotatedCount} of ${nodeCount} nodes with gene information!`,
                    "success",
                    3000
                );
            }, 500);
        } else {
            console.error("Could not load gene data or graph not initialized");
            window.loadingIndicator?.hide(loadingId);
            window.showAlert?.("Failed to load gene annotations.", "error");
        }
    } catch (error) {
        console.error("Error in gene annotation:", error);
        window.loadingIndicator?.hide(loadingId);
        window.showAlert?.("Error in gene annotation process: " + error.message, "error");
    }
}

// Add event handler for GTAViz IDs file upload
document.addEventListener("click", (event) => {
    if (
        event.target.id === "uploadAuroraIds" ||
        (event.target.parentElement &&
            event.target.parentElement.id === "uploadAuroraIds")
    ) {
        const fileInput = document.getElementById("auroraIdsFile");
        if (fileInput && window.handleAuroraIdsFileUpload) {
            window.handleAuroraIdsFileUpload();
        }
    }
});

// Add event handler for toolbar collapse toggle on mobile devices
document.addEventListener("DOMContentLoaded", function() {
    const collapseToolbarBtn = document.getElementById("collapseToolbarBtn");
    const toolbar = document.querySelector(".toolbar-responsive");

    if (collapseToolbarBtn && toolbar) {
        // Default to collapsed state on small screens
        if (window.innerWidth < 768) {
            toolbar.classList.add("toolbar-collapsed");
            collapseToolbarBtn.innerHTML = '<i class="bi bi-chevron-down"></i>';
        }

        collapseToolbarBtn.addEventListener("click", function() {
            toolbar.classList.toggle("toolbar-collapsed");

            // Update the icon based on collapsed state
            if (toolbar.classList.contains("toolbar-collapsed")) {
                collapseToolbarBtn.innerHTML = '<i class="bi bi-chevron-down"></i>';
            } else {
                collapseToolbarBtn.innerHTML = '<i class="bi bi-chevron-up"></i>';
            }
        });
    }
});

// Also handle window resize events to maintain UI consistency
window.addEventListener("resize", function() {
    const toolbar = document.querySelector(".toolbar-responsive");
    const collapseToolbarBtn = document.getElementById("collapseToolbarBtn");

    if (toolbar && collapseToolbarBtn) {
        if (window.innerWidth >= 768) {
            // On larger screens, always expand toolbar
            toolbar.classList.remove("toolbar-collapsed");
        } else if (!toolbar.classList.contains("toolbar-collapsed")) {
            // On smaller screens, collapse by default if not already collapsed
            toolbar.classList.add("toolbar-collapsed");
            collapseToolbarBtn.innerHTML = '<i class="bi bi-chevron-down"></i>';
        }
    }
});
