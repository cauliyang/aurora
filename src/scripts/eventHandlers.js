import { STATE, clearNodeHighlights } from "./graph";
import { resizePanels } from "./graphUtilities";
import { loadGraphDataFromServer } from "./graph";
import { getLabelsVisible, setLabelsVisible } from "./graphSetup";
import { loadGeneData, annotateAllNodes } from "./geneAnnotation";

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
  const nodelabelStyle = !getLabelsVisible()
    ? function (ele) {
        return ele.data("gene_name") ? ele.data("gene_name") : "";
      }
    : "";
  const edgeLabelStyle = !getLabelsVisible()
    ? function (ele) {
        return ele.data("weight") ? ele.data("weight") : "";
      }
    : "";

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
        border-color: #007bff;
        background: var(--bg-secondary, #f8f9fa);
      }

      .export-format-option.active {
        border-color: #007bff;
        background: rgba(0, 123, 255, 0.1);
      }

      .export-format-option i {
        font-size: 2rem;
        color: #007bff;
        margin-bottom: 8px;
      }

      .format-name {
        font-weight: bold;
        margin-bottom: 4px;
        color: var(--text-primary, #212529);
      }

      .format-desc {
        font-size: 0.75rem;
        color: #6c757d;
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
    newExportBtn.addEventListener("click", async () => {
      const activeFormat = modal.querySelector(".export-format-option.active");
      const format = activeFormat?.dataset.format || "svg";
      const scale = parseFloat(scaleSlider?.value || 2);
      const fullGraph = modal.querySelector("#exportFullGraph")?.checked ?? true;
      const transparentBg = modal.querySelector("#exportTransparentBg")?.checked ?? false;

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
        bg: transparentBg ? "#ffffff" : "#ffffff",
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

const redirectToIgvBtn = document.getElementById("redirectToIgv");
if (redirectToIgvBtn) {
  redirectToIgvBtn.addEventListener("click", () => {
    window.open("igv.html", "_blank");
  });
} else {
  console.warn("Element with ID 'redirectToIgv' not found in the DOM");
}

document.addEventListener("DOMContentLoaded", () => {
  resizePanels();
});

const uploadInput = document.getElementById("uploadInput");
if (uploadInput) {
  uploadInput.addEventListener("change", handleFileUpload);
} else {
  console.warn("Element with ID 'uploadInput' not found in the DOM");
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  console.log(file);
  if (!file) return;

  // Show loading indicator
  const loadingId = `upload-${Date.now()}`;
  window.loadingIndicator?.show(loadingId, {
    message: `Loading ${file.name}...`,
    type: "spinner",
    overlay: true,
  });

  const reader = new FileReader();

  reader.onload = async (e) => {
    const content = e.target.result;
    const fileExtension = file.name.split(".").pop().toLowerCase();

    try {
      if (fileExtension === "json") {
        window.loadingIndicator?.updateMessage(loadingId, "Parsing JSON data...");
        // Handle JSON file
        const jsonData = JSON.parse(content);
        console.log("Loaded JSON data:", jsonData);

        window.loadingIndicator?.updateMessage(loadingId, "Rendering graph...");
        loadGraphDataFromServer(jsonData);

        // Hide graph selector for single JSON files
        document.getElementById("graphSelectorContainer").style.display =
          "none";

        window.loadingIndicator?.hide(loadingId);
        window.showAlert?.("Graph loaded successfully!", "success", 2000);
      } else if (fileExtension === "tsg") {
        window.loadingIndicator?.updateMessage(loadingId, "Parsing TSG file...");
        // Handle TSG file
        console.log("Loaded TSG data");
        // wait for the result from promise
        STATE.graph_jsons = await window.parse_tsgFile(content);
        console.log(`Number of graph JSONs: ${STATE.graph_jsons.length}`);

        // Show graph selector if multiple graphs are available
        const graphCount = STATE.graph_jsons.length;
        window.loadingIndicator?.updateMessage(
          loadingId,
          `Found ${graphCount} graph${graphCount > 1 ? "s" : ""}...`
        );

        if (graphCount > 1) {
          setupGraphSelector(graphCount);
        } else {
          document.getElementById("graphSelectorContainer").style.display =
            "none";
        }

        // Load the first graph by default
        window.loadingIndicator?.updateMessage(loadingId, "Rendering graph...");
        const jsonData = JSON.parse(STATE.graph_jsons[0]);
        loadGraphDataFromServer(jsonData);

        window.loadingIndicator?.hide(loadingId);
        window.showAlert?.(
          `Loaded ${graphCount} graph${graphCount > 1 ? "s" : ""} successfully!`,
          "success",
          2000
        );
      }
    } catch (error) {
      console.error("Error processing file:", error);
      window.loadingIndicator?.hide(loadingId);
      window.showAlert?.("Error processing file: " + error.message, "error");
    }
  };

  reader.onerror = () => {
    window.loadingIndicator?.hide(loadingId);
    window.showAlert?.("Failed to read file", "error");
  };

  reader.readAsText(file);
}

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

  // Add options for each graph
  for (let i = 0; i < graphCount; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `Graph ${i + 1}`;
    graphSelect.appendChild(option);
  }

  // Show the selector
  graphSelectorContainer.style.display = "block";

  // Add event listener for graph selection
  graphSelect.addEventListener("change", function () {
    const selectedIndex = parseInt(this.value);
    if (STATE.graph_jsons && STATE.graph_jsons.length > selectedIndex) {
      try {
        // Parse and load the selected graph
        const jsonData = JSON.parse(STATE.graph_jsons[selectedIndex]);
        loadGraphDataFromServer(jsonData);
        window.showAlert(`Loaded graph ${selectedIndex + 1}`, "success", 2000);
      } catch (error) {
        console.error("Error loading selected graph:", error);
        window.showAlert(
          `Error loading graph ${selectedIndex + 1}: ${error.message}`,
          "error"
        );
      }
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
  geneAnnotationBtn.addEventListener("click", async (e) => {
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
    console.log("Starting gene annotation process directly...");

    // Show modern loading indicator
    window.loadingIndicator?.show(loadingId, {
      message: "Loading gene database...",
      type: "bar",
      overlay: true,
    });

    // Try loading the gene data
    const loaded = await loadGeneData();

    if (loaded && STATE.cy) {
      console.log("Gene data loaded successfully, annotating nodes...");

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

// Add event handler for Aurora IDs file upload
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

// Make the Aurora ID file upload handler globally available
if (
  typeof window !== "undefined" &&
  typeof window.handleAuroraIdsFileUpload === "undefined" &&
  typeof handleAuroraIdsFileUpload === "function"
) {
  window.handleAuroraIdsFileUpload = handleAuroraIdsFileUpload;
}

// Add event handler for toolbar collapse toggle on mobile devices
document.addEventListener("DOMContentLoaded", function () {
  const collapseToolbarBtn = document.getElementById("collapseToolbarBtn");
  const toolbar = document.querySelector(".toolbar-responsive");

  if (collapseToolbarBtn && toolbar) {
    // Default to collapsed state on small screens
    if (window.innerWidth < 768) {
      toolbar.classList.add("toolbar-collapsed");
      collapseToolbarBtn.innerHTML = '<i class="bi bi-chevron-down"></i>';
    }

    collapseToolbarBtn.addEventListener("click", function () {
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
window.addEventListener("resize", function () {
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
