import cytoscape from "cytoscape";
import klay from "cytoscape-klay";
import dagre from "cytoscape-dagre";
import tidytree from "cytoscape-tidytree";
import euler from "cytoscape-euler";
import spread from "cytoscape-spread";

import { hideSingletonNodes, setupClickEvent } from "./graphUtilities";
import { initializeGraph } from "./graphSetup";
import { createTooltip } from "./tooltip";
import { dfs } from "./graphUtilities";
import { displayElementInfo } from "./graphUtilities";
import { initGeneAnnotation } from "./geneAnnotation";

cytoscape.use(dagre);
cytoscape.use(klay);
cytoscape.use(tidytree);
cytoscape.use(euler);
cytoscape.use(spread);

export const STATE = {
    cy: null,
    walks: [],

    possibleWalks: [],

    graph_jsons: [],
    minEdgeWeight: 1,
    minPathLength: 1,
    maxPathLength: 900,
    previousClickedElement: null,
    previousClickedElementStyle: null,
    originalGraphData: null,
    selectedNodeColor: "#8dd3c7",
    nodeColor: "#1f77b4",
    highlightWalkColor: "#ff5733",
    sourceNodeColor: "#31a354",
    hideUninvolvedElements: false,
    hideSingletonNodes: false,
};

window.STATE = STATE;

// Get the "Change Layout" button element
layoutSelect.addEventListener("change", () => {
    // Get the selected layout from the select element
    const selectedLayout = document.getElementById("layoutSelect").value;

    if (STATE.cy === null) return;

    // Apply the chosen layout
    STATE.cy
        .layout({
            name: selectedLayout,
            animate: true, // You can adjust animation settings if needed
            fit: true,
            padding: 10,
            avoidOverlap: true,
            rankDir: "LR",
        })
        .run();
});


// Filter walks by possiblePaths
// walks: array of walks (each walk is array of cytoscape node objects)
// possiblePaths: object { auroraId: [elementId1, elementId2, ...] }
function filterWalksByPossiblePaths(walks, possiblePaths) {
    // Build a set of stringified element ID sequences for fast lookup
    const possibleSequences = new Set(
        Object.values(possiblePaths).map(seq => JSON.stringify(seq))
    );


    // Helper to get the sequence of element IDs for a walk
    function getWalkElementIdSequence(walk) {
        const ids = [];
        for (let i = 0; i < walk.length; i++) {
            ids.push(walk[i].id());
            // If not last node, add edge ID to next node
            if (i < walk.length - 1) {
                const edge = walk[i].edgesTo(walk[i + 1]);
                if (edge && edge.length > 0) {
                    ids.push(edge[0].id());
                }
            }
        }
        return ids;
    }

    // Filter walks
    return walks.filter(walk => {
        const seq = getWalkElementIdSequence(walk);
        return possibleSequences.has(JSON.stringify(seq));
    });
}


// Function to update graph based on edge weight
function updateGraph() {
    // Reset graph to original data
    console.log("updateGraph", STATE);
    STATE.walks.length = 0;
    STATE.cy.elements().remove();
    STATE.cy.add(STATE.originalGraphData);

    const sourceNodes = STATE.cy.nodes().filter((node) => node.indegree() === 0);
    const sinkNodes = STATE.cy.nodes().filter((node) => node.outdegree() === 0);

    // update walks
    sourceNodes.forEach((sourceNode) => {
        dfs(sourceNode, [], sinkNodes);
    });

    if (STATE.hideUninvolvedElements) {
        hideUninvolvedElements();
    }

    if (STATE.hideSingletonNodes) {
        hideSingletonNodes();
    }

    // Optionally, you can re-run layout here
    // // change layout to dagre
    // document.getElementById("layoutSelect").value = "dagre";

    let currentLayout = document.getElementById("layoutSelect").value;

    if (currentLayout === "euler") {
        document.getElementById("layoutSelect").value = "dagre";
        currentLayout = "dagre";
    }

    STATE.cy
        .layout({
            name: currentLayout,
            animate: false,
            fit: true,
            padding: 10,
            avoidOverlap: true,
            rankDir: "LR",
        })
        .run();

    setupGraphInteractions();
}

function hideUninvolvedElements() {
    const involvedNodes = new Set();
    const involvedEdges = new Set();

    // Mark all nodes and edges involved in the walks
    STATE.walks.forEach((walk) => {
        walk.forEach((node, index) => {
            involvedNodes.add(node.id());
            if (index < walk.length - 1) {
                const nextNode = walk[index + 1];
                const connectingEdge = node.edgesTo(nextNode);
                involvedEdges.add(connectingEdge.id());
            }
        });
    });

    // Hide nodes and edges not involved in any walk
    STATE.cy.nodes().forEach((node) => {
        if (!involvedNodes.has(node.id())) {
            node.hide();
        }
    });

    STATE.cy.edges().forEach((edge) => {
        if (!involvedEdges.has(edge.id())) {
            edge.hide();
        }
    });
}

document
    .getElementById("minEdgeWeight")
    .addEventListener("change", function() {
        const minEdgeWeight = parseFloat(this.value) || 1;
        if (Number.isNaN(minEdgeWeight)) return;
        STATE.minEdgeWeight = minEdgeWeight;
        updateGraph();
    });

document.getElementById("MaxDepth").addEventListener("change", function() {
    const MaxDepth = parseFloat(this.value) || 900;
    if (Number.isNaN(MaxDepth)) return;
    STATE.maxPathLength = MaxDepth;

    if (STATE.minPathLength > STATE.maxPathLength) {
        // altert user
        alert("Min Depth cannot be greater than Max Depth");
        document.getElementById("MaxDepth").value = STATE.minPathLength;
        return;
    }

    updateGraph();
});

document.getElementById("MinDepth").addEventListener("change", function() {
    const MinDepth = parseFloat(this.value) || 2;
    if (Number.isNaN(MinDepth)) return;
    STATE.minPathLength = MinDepth;

    if (STATE.minPathLength > STATE.maxPathLength) {
        // altert user
        alert("Min Depth cannot be greater than Max Depth");
        document.getElementById("MinDepth").value = STATE.maxPathLength;
        return;
    }

    updateGraph();
});

export function loadGraphDataFromServer(graphData) {
    //check if graphData has elements
    // if has elements, initialize graph using elements
    // if not has elements, initialize graph using graphData
    if (graphData.elements) {
        STATE.originalGraphData = graphData.elements;
        initializeGraph(graphData.elements);
    } else {
        STATE.originalGraphData = graphData;
        initializeGraph(graphData);
    }

    console.log("graphData", graphData.data);

    // --- Filter walks using possible_paths if present in graphData.data ---
    let possiblePaths = null;
    if (Array.isArray(graphData.data)) {
        const dataObj = Object.fromEntries(graphData.data);
        possiblePaths = dataObj.possible_paths;
    }

    if (possiblePaths && typeof possiblePaths === 'object') {
        // Save all possible walks
        STATE.possibleWalks = possiblePaths;
        console.log("possibleWalks", STATE.possibleWalks);
        // Filter walks to only those matching possible_paths
        STATE.walks = filterWalksByPossiblePaths(STATE.walks, possiblePaths);
        console.log("filtered walks", STATE.walks);
    }

    setupGraphInteractions();
}

// Make loadGraphDataFromServer globally available to avoid circular dependencies
window.loadGraphDataFromServer = loadGraphDataFromServer;

document.getElementById("resetGraph").addEventListener("click", () => {
    // Reset layout to default
    STATE.cy.elements().removeClass("highlightWalk");
    layoutSelect.value = "dagre";
    STATE.cy
        .layout({
            name: "dagre",
            animate: true,
            fit: true,
            padding: 10,
            avoidOverlap: true,
            rankDir: "LR",
        })
        .run();

    const cyContainer = document.getElementById("cy");
    const infoPanel = document.getElementById("info");
    const walksPanel = document.getElementById("walks");

    cyContainer.style.width = "";
    cyContainer.style.height = "";
    infoPanel.style.width = "";
    walksPanel.style.width = "";
    infoPanel.style.display = "";
    walksPanel.style.display = "";
});

// Function to get color based on weight
function setupGraphInteractions() {
    STATE.cy.on("tap", (evt) => {
        if (evt.target === STATE.cy) {
            clearNodeHighlights(STATE.cy);
        }
    });

    displayWalks();
    setupClickEvent();
    createTooltip();

    // Initialize gene annotation functionality
    initGeneAnnotation();
}

/**
 * Convert a string to a numeric identifier using SHA-256.
 * @param {string} inputString - The string to convert
 * @param {number|null} [length=10] - The desired length of the output identifier. If null, returns the full numeric representation
 * @returns {Promise<string>} A string of decimal numbers derived from the SHA-256 hash
 * @throws {TypeError} If inputString is not a string or length is not a number/null
 * @throws {Error} If length is not positive
 *
 * @example
 * const numericId = await toNumericIdentifier("Hello World!", 10);
 * console.log(numericId); // Outputs a string of 10 decimal numbers
 */
async function toNumericIdentifier(inputString, length = 10) {
    // Type checking
    if (typeof inputString !== "string") {
        throw new TypeError("Input must be a string");
    }

    if (
        length !== null &&
        (!Number.isInteger(length) || typeof length !== "number")
    ) {
        throw new TypeError("Length must be an integer or null");
    }

    if (length !== null && length <= 0) {
        throw new Error("Length must be positive");
    }

    // Create SHA-256 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(inputString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    // Convert buffer to decimal string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    let numericString = hashArray.map((b) => b.toString().padStart(3, "0")).join("");

    // Take specified length of the numeric string if provided
    let result = length ? numericString.slice(0, length) : numericString;

    return result;
}


/**
 * Convert a string to a hash-based identifier using SHA-256.
 * @param {string} inputString - The string to convert
 * @param {number|null} [length=16] - The desired length of the output identifier. If null, returns the full hash
 * @returns {Promise<string>} A valid identifier string derived from the SHA-256 hash
 * @throws {TypeError} If inputString is not a string or length is not a number/null
 * @throws {ValueError} If length is not positive
 *
 * @example
 * const identifier = await toHashIdentifier("Hello World!");
 * console.log(identifier); // Outputs something like 'a591a6d40bf420'
 */
async function toHashIdentifier(inputString, length = 16) {
    // Type checking
    if (typeof inputString !== "string") {
        throw new TypeError("Input must be a string");
    }

    if (
        length !== null &&
        (!Number.isInteger(length) || typeof length !== "number")
    ) {
        throw new TypeError("Length must be an integer or null");
    }

    if (length !== null && length <= 0) {
        throw new Error("Length must be positive");
    }

    // Create SHA-256 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(inputString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    // Convert buffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    // Take specified length of hash if provided
    let result = length ? hashHex.slice(0, length) : hashHex;

    // Ensure the identifier starts with a letter (prefix with 'a' if it starts with a number)
    if (/^[0-9]/.test(result)) {
        result = "a" + result.slice(1);
    }

    return result;
}

/**
 * Generates a unique Aurora ID for a given walk through the graph.
 * @param {Array} walk - Array of graph nodes representing a walk
 * @returns {Promise<string>} A unique identifier for the walk generated using toNumericIdentifier
 *
 * @example
 * const walk = [node1, node2, node3];
 * const auroraId = await getWalkAuroraId(walk);
 * console.log(auroraId); // Outputs something like 'a591a6d40bf420'
 */
async function getWalkAuroraId(walk) {
    // Create the walk info string by joining node information
    const walkInfo = walk
        .map((node) => {
            const nodeId = node.data("id");
            return nodeId;
        })
        .join("-");

    // Generate numeric identifier for the walk info
    console.log(`Generating Aurora ID for walk: ${walkInfo}`);
    const auroraId = await toNumericIdentifier(walkInfo);
    return `TSP${auroraId}`;
}

// Update the displayWalks function for a more beautiful presentation
async function displayWalks(searchText = "", auroraIds = []) {
    const walksContainer = document.getElementById("walks");
    if (!walksContainer) {
        console.error("Walks container not found");
        return;
    }

    // Clear previous walks display and add search box with improved styling
    walksContainer.innerHTML = `
        <div class="walks-header">
            <h3>
                <i class="bi bi-diagram-3"></i> Graph Walks
                <span class="badge bg-primary walks-count">0</span>
            </h3>
            <div class="input-group mb-3">
                <span class="input-group-text"><i class="bi bi-search"></i></span>
                <input
                    type="text"
                    class="form-control"
                    id="walkSearch"
                    placeholder="Search walks or Aurora ID..."
                    aria-label="Search walks"
                >
                <button class="btn btn-outline-secondary" type="button" id="clearWalkSearch">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
            <div class="input-group mb-3">
                <input
                    type="file"
                    class="form-control"
                    id="auroraIdsFile"
                    accept=".txt"
                    aria-label="Upload Aurora IDs file"
                />
                <button class="btn btn-outline-primary" type="button" id="uploadAuroraIds">
                    <i class="bi bi-upload"></i> Batch Search
                </button>
            </div>
            ${
              auroraIds.length > 0
                ? `<div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i> Searching for ${auroraIds.length} Aurora IDs
                <button class="btn btn-sm btn-outline-secondary float-end" id="clearAuroraIds">Clear</button>
            </div>`
                : ""
            }
        </div>
        <div class="walk-list-container">
            <!-- Walks will be loaded here -->
            <div class="loading-walks">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p>Loading walks...</p>
            </div>
        </div>
    `;

  // Add search event listener with improved functionality
  const searchInput = document.getElementById("walkSearch");
  const clearSearchBtn = document.getElementById("clearWalkSearch");
  const auroraIdsFileInput = document.getElementById("auroraIdsFile");
  const uploadAuroraIdsBtn = document.getElementById("uploadAuroraIds");
  const clearAuroraIdsBtn = document.getElementById("clearAuroraIds");

  if (searchInput) {
    searchInput.value = searchText; // Preserve search text when redisplaying

    // Remove old event listeners before adding new one
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);

    newSearchInput.addEventListener("input", (e) => {
      // Real-time filtering as user types
      const searchValue = e.target.value.trim().toLowerCase();
      filterWalkCards(searchValue, auroraIds);
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
        // Only filter by Aurora IDs if they exist
        filterWalkCards("", auroraIds);
        searchInput.focus();
      }
    });
  }

  if (uploadAuroraIdsBtn && auroraIdsFileInput) {
    uploadAuroraIdsBtn.addEventListener("click", () => {
      handleAuroraIdsFileUpload();
    });
  }

  if (clearAuroraIdsBtn) {
    clearAuroraIdsBtn.addEventListener("click", () => {
      // Redisplay walks without Aurora ID filtering
      displayWalks(searchText);
    });
  }

  try {
    // Sort walks by length (number of nodes) in descending order
    const sortedWalks = [...STATE.walks].sort((a, b) => b.length - a.length);
    const walkListContainer = walksContainer.querySelector(
      ".walk-list-container"
    );

    if (sortedWalks.length === 0) {
      walkListContainer.innerHTML = `
                <div class="alert alert-info text-center">
                    <i class="bi bi-exclamation-circle me-2"></i>
                    No walks found in this graph
                </div>
            `;
      return;
    }

    // Update walks count badge
    const walksCountBadge = walksContainer.querySelector(".walks-count");
    if (walksCountBadge) {
      walksCountBadge.textContent = sortedWalks.length;
    }

    // Create container for walkCards
    walkListContainer.innerHTML =
      '<div class="walks-accordion" id="walksAccordion"></div>';
    const walksAccordion = document.getElementById("walksAccordion");

    // Create a mapping between display order index and original STATE.walks index
    const walkIndexMap = sortedWalks.map((walk, displayIndex) => {
      // Find the original index in STATE.walks
      const originalIndex = STATE.walks.findIndex((w) => w === walk);
      return { displayIndex, originalIndex };
    });

    // Store this mapping in a window variable for reference
    window.walkIndexMap = walkIndexMap;

    // Process all walks in parallel
    const walkPromises = sortedWalks.map(async (walk, displayIndex) => {
      try {
        // Get original walk index from STATE.walks array
        const originalIndex = walkIndexMap[displayIndex].originalIndex;

        const walkText = walk.map((node) => node.id()).join(" → ");
        const auroraId = await getWalkAuroraId(walk);

        // Create a more appealing card for each walk
        const walkCard = document.createElement("div");
        walkCard.className = "walk-card";
        walkCard.setAttribute("data-walk-text", walkText);
        walkCard.setAttribute("data-aurora-id", auroraId);
        walkCard.setAttribute("data-walk-index", originalIndex); // Store the ORIGINAL index, not display index
        walkCard.setAttribute("data-display-index", displayIndex);

        // Check if the walk should be visible based on search text and aurora IDs
        const searchLower = searchText.trim().toLowerCase();
        const walkLower = walkText.toLowerCase();
        const auroraLower = auroraId.toLowerCase();

        let shouldHide = false;

        // Hide based on text search
        if (
          searchLower &&
          !walkLower.includes(searchLower) &&
          !auroraLower.includes(searchLower)
        ) {
          shouldHide = true;
        }

        // Hide based on Aurora IDs, unless it's in the list
        if (auroraIds.length > 0 && !auroraIds.includes(auroraId)) {
          shouldHide = true;
        }

        if (shouldHide) {
          walkCard.style.display = "none";
        }

        // Simplified display of the walk with copy feature, accordion for details
        walkCard.innerHTML = `
                    <div class="card mb-2">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <button class="btn btn-link btn-sm walk-toggle-btn" type="button" data-bs-toggle="collapse"
                                    data-bs-target="#walk-${displayIndex}" aria-expanded="false" aria-controls="walk-${displayIndex}">
                                <i class="bi bi-chevron-down chevron-icon"></i>
                                Walk ${
                                  displayIndex + 1
                                } <span class="badge bg-info ms-2">${
          walk.length
        } nodes</span>
                            </button>
                            <div class="btn-group btn-group-sm" role="group">
                                <button class="btn btn-outline-primary highlight-walk-btn" title="Highlight this walk">
                                    <i class="bi bi-lightbulb"></i>
                                </button>
                                <button class="btn btn-outline-secondary copy-aurora-btn" title="Copy Aurora ID">
                                    <i class="bi bi-clipboard"></i>
                                </button>
                            </div>
                        </div>
                        <div id="walk-${displayIndex}" class="collapse">
                            <div class="card-body">
                                <div class="aurora-id-container">
                                    <small class="text-muted d-flex align-items-center">
                                        <span class="me-2">Aurora ID:</span>
                                        <code class="aurora-id">${auroraId}</code>
                                    </small>
                                </div>
                                <div class="walk-path mt-2">
                                    <div class="path-visualization">
                                        ${generatePathVisualization(walk)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

        return walkCard;
      } catch (error) {
        console.error(`Error processing walk ${displayIndex}:`, error);
        return null;
      }
    });

    // Wait for all walks to be processed
    const walkCards = await Promise.all(walkPromises);

    // Clear loading indicator
    walkListContainer.querySelector(".loading-walks")?.remove();

    // Append only the non-null walk cards
    if (walksAccordion) {
      walkCards
        .filter((card) => card !== null)
        .forEach((card) => walksAccordion.appendChild(card));

      // Add event listeners to buttons after all cards are added
      addWalkCardEventListeners();

      // Update count of visible walks based on search
      updateVisibleWalksCount();
    }
  } catch (error) {
    console.error("Error displaying walks:", error);
    walksContainer.innerHTML += `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Error displaying walks: ${error.message}
            </div>
        `;
  }

  // Add styles for the walks section
  addWalksStyles();
}

// Function to handle Aurora IDs file upload
async function handleAuroraIdsFileUpload() {
  const fileInput = document.getElementById("auroraIdsFile");

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    window.showAlert(
      "Please select a text file containing Aurora IDs.",
      "warning"
    );
    return;
  }

  const file = fileInput.files[0];

  try {
    // Show a loading indicator
    window.showAlert("Processing Aurora IDs file...", "info");

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

    if (lines.length === 0) {
      window.showAlert("No Aurora IDs found in the file.", "warning");
      return;
    }

    // Get the current search text
    const searchInput = document.getElementById("walkSearch");
    const searchText = searchInput ? searchInput.value : "";

    // Redisplay walks with the specified Aurora IDs
    displayWalks(searchText, lines);

    window.showAlert(
      `Found ${lines.length} Aurora IDs in the file.`,
      "success"
    );
  } catch (error) {
    console.error("Error reading Aurora IDs file:", error);
    window.showAlert(
      "Error reading the file. Please make sure it's a valid text file.",
      "danger"
    );
  }
}

// Function to filter walk cards based on search text and Aurora IDs
function filterWalkCards(searchValue, auroraIds = []) {
  // Keep track of the visible cards and their corresponding walk indices
  let visibleCardCount = 0;

  document.querySelectorAll(".walk-card").forEach((card) => {
    const walkText = card.getAttribute("data-walk-text").toLowerCase();
    const auroraId = card.getAttribute("data-aurora-id").toLowerCase();
    const walkIndex = card.getAttribute("data-walk-index");

    let shouldShow = true;

    // Filter by search text if provided
    if (
      searchValue &&
      !walkText.includes(searchValue) &&
      !auroraId.includes(searchValue)
    ) {
      shouldShow = false;
    }

    // Filter by Aurora IDs if provided
    if (
      auroraIds.length > 0 &&
      !auroraIds.includes(card.getAttribute("data-aurora-id"))
    ) {
      shouldShow = false;
    }

    // Debug information
    if (shouldShow && searchValue) {
      console.log(
        `Match found: "${searchValue}" in walk ${walkIndex} (${walkText.substring(
          0,
          50
        )}...)`
      );
    }

    card.style.display = shouldShow ? "" : "none";

    if (shouldShow) {
      visibleCardCount++;
    }
  });

  console.log(`Filter results: ${visibleCardCount} walks match the criteria`);

  // Update the count of visible walks
  updateVisibleWalksCount();
}

// Helper function to generate a visual representation of the path
function generatePathVisualization(walk) {
  let visualization = '<div class="path-nodes">';

  walk.forEach((node, index) => {
    const nodeData = node.data();
    const displayName =
      nodeData.name && nodeData.name !== nodeData.id
        ? nodeData.name
        : shortenNodeId(nodeData.id);

    visualization += `
            <div class="path-node${
              index === 0
                ? " start-node"
                : index === walk.length - 1
                ? " end-node"
                : ""
            }">
                <div class="node-dot"></div>
                <button class="node-label clickable-node-id" title="${
                  nodeData.id
                }" data-node-id="${nodeData.id}">${displayName}</button>
                ${
                  index < walk.length - 1
                    ? '<div class="node-arrow"><i class="bi bi-arrow-right"></i></div>'
                    : ""
                }
            </div>
        `;
  });

  visualization += "</div>";
  return visualization;
}

// Helper function to shorten node IDs for better display
function shortenNodeId(id) {
  if (id.length > 20) {
    return id.substring(0, 8) + "..." + id.substring(id.length - 8);
  }
  return id;
}

// Helper function to add event listeners to walk cards
function addWalkCardEventListeners() {
  // Highlight walk buttons
  document.querySelectorAll(".highlight-walk-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const walkCard = btn.closest(".walk-card");
      const walkIndex = parseInt(walkCard.getAttribute("data-walk-index"), 10);

      console.log(`Highlighting walk at index: ${walkIndex}`);
      if (walkIndex >= 0 && walkIndex < STATE.walks.length) {
        highlightWalk(STATE.walks[walkIndex]);
        // Add visual feedback
        btn.classList.add("active");
        setTimeout(() => btn.classList.remove("active"), 1000);
      } else {
        console.error(
          `Invalid walk index: ${walkIndex}, max index: ${
            STATE.walks.length - 1
          }`
        );
      }
    });
  });

  // Copy Aurora ID buttons
  document.querySelectorAll(".copy-aurora-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const auroraId = btn.closest(".walk-card").getAttribute("data-aurora-id");
      navigator.clipboard.writeText(auroraId).then(() => {
        // Add visual feedback
        const originalIcon = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check"></i>';
        btn.classList.add("btn-success");
        setTimeout(() => {
          btn.innerHTML = originalIcon;
          btn.classList.remove("btn-success");
        }, 1500);
      });
    });
  });

  // Toggle buttons to animate chevron
  document.querySelectorAll(".walk-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const chevron = btn.querySelector(".chevron-icon");
      chevron.classList.toggle("rotated");
    });
  });

  // Add click event listeners to node ids in path visualization
  document.querySelectorAll(".clickable-node-id").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent accordion toggle
      const nodeId = btn.getAttribute("data-node-id");
      if (window.highlightNode && typeof window.highlightNode === "function") {
        window.highlightNode(STATE.cy, nodeId);
      } else if (typeof highlightNode === "function") {
        highlightNode(STATE.cy, nodeId);
      } else {
        console.error("highlightNode function not found");
      }
    });
  });
}

// Helper function to update the count of visible walks
function updateVisibleWalksCount() {
  const visibleWalks = document.querySelectorAll(
    '.walk-card[style="display: none;"]'
  );
  const totalWalks = document.querySelectorAll(".walk-card").length;
  const visibleCount = totalWalks - visibleWalks.length;

  const walksCountBadge = document.querySelector(".walks-count");
  if (walksCountBadge) {
    walksCountBadge.textContent = `${visibleCount}/${totalWalks}`;
  }
}

// Helper function to add styles for the walks section
function addWalksStyles() {
  // Check if styles are already added
  if (document.getElementById("walks-styles")) return;

  const style = document.createElement("style");
  style.id = "walks-styles";
  style.textContent = `
        
        .walks-count {
            margin-left: 10px;
            font-size: 0.8em;
        }

        .walk-list-container {
            overflow-y: auto;
            max-height: calc(100vh - 250px);
        }

        .loading-walks {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 30px 0;
            color: #6c757d;
        }

        .walk-card {
            transition: all 0.2s ease-in-out;
        }

        .walk-card:hover {
            transform: translateY(-2px);
        }

        .walk-toggle-btn {
            color: #212529;
            text-decoration: none;
            width: 100%;
            text-align: left;
            padding: 0;
            display: flex;
            align-items: center;
        }

        .walk-toggle-btn:hover {
            color: #0d6efd;
        }

        .chevron-icon {
            transition: transform 0.3s ease;
            margin-right: 8px;
        }

        .chevron-icon.rotated {
            transform: rotate(180deg);
        }

        .aurora-id-container {
            background: #f8f9fa;
            padding: 8px;
            border-radius: 4px;
            margin-bottom: 10px;
        }

        .aurora-id {
            background: transparent;
            font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            color: #6610f2;
        }

        .path-visualization {
            margin-top: 10px;
            overflow-x: auto;
        }

        .path-nodes {
            display: flex;
            align-items: center;
            min-width: 100%;
            padding: 10px 0;
        }

        .path-node {
            display: flex;
            align-items: center;
            flex-shrink: 0;
        }

        .node-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: #6c757d;
            margin: 0 5px;
        }

        .start-node .node-dot {
            background-color: #28a745;
        }

        .end-node .node-dot {
            background-color: #dc3545;
        }

        .node-label {
            font-size: 0.8rem;
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            border: 1px solid #d1d5db;
            border-radius: 999px;
            background: #fff;
            color: #222;
            padding: 4px 14px;
            margin: 0 2px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            cursor: pointer;
            transition: border 0.15s, box-shadow 0.15s, color 0.15s, background 0.15s, transform 0.1s;
            outline: none;
            font-weight: 500;
            position: relative;
        }
        .node-label:focus, .node-label:hover {
            background: #f3f4f6;
            border-color: #a5b4fc;
            color: #1d4ed8;
            box-shadow: 0 2px 8px rgba(30, 64, 175, 0.08);
            transform: scale(1.04);
            z-index: 2;
        }
        .node-label:active {
            background: #e0e7ff;
            border-color: #6366f1;
            color: #3730a3;
            transform: scale(0.98);
        }
        .node-arrow {
            margin: 0 5px;
            color: #adb5bd;
        }

        .highlight-walk-btn.active {
            background-color: #ffc107;
            border-color: #ffc107;
        }
    `;

  document.head.appendChild(style);
}

function highlightWalk(walk) {
  // Reset any previously highlight nodes or edges
  STATE.cy.elements().removeClass("highlightWalk");

  walk.forEach((node, index) => {
    node.addClass("highlightWalk");
  });
  STATE.cy.style().update();
}

// node data
// {
//   "id": "chr8_62251376_62302403_T_349",
//   "indegree": 1,
//   "outdegree": 0,
//   "data": {
//     "chrom": "chr8",
//     "ref_start": 62251376,
//     "ref_end": 62302403,
//     "strand": "-",
//     "is_head": false,
//     "node_id": 349,
//     "exons": "[62251376-62252614,62284023-62284107,62284267-62284408,62284826-62284911,62302311-62302403]",
//     "ptc": 1,
//     "ptf": 0,
//     "id": "chr8_62251376_62302403_T_349",
//     "value": "chr8_62251376_62302403_T_349",
//     "name": "chr8_62251376_62302403_T_349"
//   }
// }
// Function to calculate node ranking by PTC
function calculateNodeRanking(cy) {
  if (!cy) {
    console.warn("No graph provided to calculateNodeRanking");
    return [];
  }

  // Check if graph has nodes before getting the array
  const nodes = cy.nodes().length > 0 ? cy.nodes().toArray() : [];

  // If there are no nodes, return an empty array
  if (nodes.length === 0) {
    return [];
  }

  const ranking = nodes
    .map((node) => {
      return {
        id: node.id(),
        name: node.data("name") || node.id(),
        ptc: node.data("ptc") || 0,
        class: node.data("class") || "unknown",
      };
    })
    .filter((node) => node.ptc > 0)
    .sort((a, b) => b.ptc - a.ptc);

  return ranking;
}

// Function to update the node ranking modal
function updateNodeRankingModal(cy) {
  const ranking = calculateNodeRanking(cy);
  const nodeRankingList = document.getElementById("nodeRankingList");

  // Clear the current list
  nodeRankingList.innerHTML = "";

  if (ranking.length === 0) {
    nodeRankingList.innerHTML =
      '<li class="list-group-item">No nodes with PTC values found</li>';
    return;
  }

  // Add clear highlights button at the top
  const clearButtonItem = document.createElement("li");
  clearButtonItem.className = "list-group-item d-flex justify-content-end";
  clearButtonItem.innerHTML = `
    <button class="btn btn-outline-secondary btn-sm" id="clearHighlights">
      <i class="bi bi-eraser"></i> Clear Highlights
    </button>
  `;
  nodeRankingList.appendChild(clearButtonItem);

  // Create header row
  const headerItem = document.createElement("li");
  headerItem.className = "list-group-item active";
  headerItem.innerHTML = `
    <div class="row">
      <div class="col-1"><strong>Rank</strong></div>
      <div class="col-4"><strong>Name</strong></div>
      <div class="col-3"><strong>PTC Value</strong></div>
      <div class="col-2"><strong>Class</strong></div>
      <div class="col-2"><strong>Action</strong></div>
    </div>
  `;
  nodeRankingList.appendChild(headerItem);

  // Add each node to the list
  ranking.forEach((node, index) => {
    const listItem = document.createElement("li");
    listItem.className = "list-group-item";
    listItem.innerHTML = `
      <div class="row">
        <div class="col-1">${index + 1}</div>
        <div class="col-4">${node.name}</div>
        <div class="col-3">${node.ptc.toFixed(4)}</div>
        <div class="col-2">${node.class}</div>
        <div class="col-2">
          <button class="btn btn-sm btn-primary highlight-node" data-node-id="${
            node.id
          }">
            Highlight
          </button>
        </div>
      </div>
    `;
    nodeRankingList.appendChild(listItem);
  });

  // Add event listeners to highlight buttons
  document.querySelectorAll(".highlight-node").forEach((button) => {
    button.addEventListener("click", (event) => {
      const nodeId = event.currentTarget.getAttribute("data-node-id");
      highlightNode(STATE.cy, nodeId);
    });
  });

  // Add event listener for the clear highlights button
  document.getElementById("clearHighlights").addEventListener("click", () => {
    clearNodeHighlights(cy);
  });
}

// Function to highlight a specific node
function highlightNode(cy, nodeId) {
  // Find the node by ID
  const node = cy.getElementById(nodeId);

  if (node.length > 0) {
    // Check if the node is already highlighted
    const isAlreadyHighlighted = node.hasClass("highlighted");

    if (isAlreadyHighlighted) {
      console.log("Node is already highlighted, clearing highlights");
      // If the node is already highlighted, clear all highlights
      clearNodeHighlights(cy);
    } else {
      console.log("Highlighting node:", nodeId);
      // Clear any existing highlights first
      clearNodeHighlights(cy);

      // Add highlighted class to the node
      node.addClass("highlighted");

      // Fade all other nodes and edges
      cy.elements().difference(node).addClass("faded");

      // Center the view on the highlighted node
      cy.animate({
        fit: {
          eles: node,
          padding: 50,
        },
        duration: 500,
      });

      // Update the info panel with node information
      const infoContent = document.getElementById("infoContent");
      if (infoContent) {
        displayElementInfo(node, infoContent);
      }
    }
  } else {
    console.error("Node not found:", nodeId);
  }
}

// Function to clear all highlighting
export function clearNodeHighlights(cy) {
  console.log("Clearing all highlights");

  // Check if cy exists before accessing its elements
  if (!cy) {
    console.warn("Cannot clear highlights: graph object is null");
    return;
  }

  // Remove highlighting classes from all elements
  cy.elements().removeClass("highlighted");
  cy.elements().removeClass("faded");
  cy.elements().removeClass("highlightWalk"); // Also clear walk highlights
  // Reset the view to fit all elements
  cy.fit(cy.elements().filter(":visible"), 50);
}

// Add a global event listener for the escape key to clear highlights
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    clearNodeHighlights(STATE.cy);
  }
});

// Event listener for the node ranking button
document.getElementById("showNodeRanking").addEventListener("click", () => {
  updateNodeRankingModal(STATE.cy); // Use STATE.cy instead of just cy
});