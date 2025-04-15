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
        return ele.data("name") ? ele.data("name") : "";
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
    // Get the base64 representation of the graph
    const base64Image = STATE.cy.png();

    // Create a new anchor element to enable downloading
    const downloadLink = document.createElement("a");
    downloadLink.href = base64Image;
    downloadLink.download = "graph_capture.png";

    // Trigger the download
    downloadLink.click();
  });
} else {
  console.warn("Element with ID 'captureGraph' not found in the DOM");
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

  const reader = new FileReader();

  reader.onload = async (e) => {
    const content = e.target.result;
    const fileExtension = file.name.split(".").pop().toLowerCase();

    try {
      if (fileExtension === "json") {
        // Handle JSON file
        const jsonData = JSON.parse(content);
        console.log("Loaded JSON data:", jsonData);
        loadGraphDataFromServer(jsonData);

        // Hide graph selector for single JSON files
        document.getElementById("graphSelectorContainer").style.display =
          "none";
      } else if (fileExtension === "tsg") {
        // Handle TSG file
        console.log("Loaded TSG data");
        // wait for the result from promise
        STATE.graph_jsons = await window.parse_tsgFile(content);
        console.log(`Number of graph JSONs: ${STATE.graph_jsons.length}`);

        // Show graph selector if multiple graphs are available
        const graphCount = STATE.graph_jsons.length;
        if (graphCount > 1) {
          setupGraphSelector(graphCount);
        } else {
          document.getElementById("graphSelectorContainer").style.display =
            "none";
        }

        // Load the first graph by default
        const jsonData = JSON.parse(STATE.graph_jsons[0]);
        loadGraphDataFromServer(jsonData);
      }
    } catch (error) {
      console.error("Error processing file:", error);
      window.showAlert?.("Error processing file: " + error.message, "error") ||
        alert("Error processing file: " + error.message);
    }
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
  try {
    console.log("Starting gene annotation process directly...");

    // Show loading alert - use the global function instead of imported one
    window.showAlert("Loading gene annotations...", "info");

    // Try loading the gene data
    const loaded = await loadGeneData();

    if (loaded && STATE.cy) {
      console.log("Gene data loaded successfully, annotating nodes...");
      // Annotate all nodes in the graph
      const annotatedCount = await annotateAllNodes(STATE.cy);

      // Show success alert with auto-dismiss after 3 seconds - use global function
      window.showAlert(
        `Annotated ${annotatedCount} nodes with gene information!`,
        "success",
        3000
      );
    } else {
      console.error("Could not load gene data or graph not initialized");
      window.showAlert("Failed to load gene annotations.", "error");
    }
  } catch (error) {
    console.error("Error in gene annotation:", error);
    window.showAlert("Error in gene annotation process.", "error");
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
