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

cytoscape.use(dagre);
cytoscape.use(klay);
cytoscape.use(tidytree);
cytoscape.use(euler);
cytoscape.use(spread);

export const STATE = {
    cy: null,
    walks: [],
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
};

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

    hideUninvolvedElements();
    hideSingletonNodes();

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
    setupGraphInteractions();
}

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
    if (typeof inputString !== 'string') {
        throw new TypeError("Input must be a string");
    }

    if (length !== null && (!Number.isInteger(length) || typeof length !== 'number')) {
        throw new TypeError("Length must be an integer or null");
    }

    if (length !== null && length <= 0) {
        throw new Error("Length must be positive");
    }

    // Create SHA-256 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(inputString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert buffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Take specified length of hash if provided
    let result = length ? hashHex.slice(0, length) : hashHex;

    // Ensure the identifier starts with a letter (prefix with 'a' if it starts with a number)
    if (/^[0-9]/.test(result)) {
        result = 'a' + result.slice(1);
    }

    return result;
}

/**
 * Generates a unique Aurora ID for a given walk through the graph.
 * @param {Array} walk - Array of graph nodes representing a walk
 * @returns {Promise<string>} A unique identifier for the walk generated using toHashIdentifier
 *
 * @example
 * const walk = [node1, node2, node3];
 * const auroraId = await getWalkAuroraId(walk);
 * console.log(auroraId); // Outputs something like 'a591a6d40bf420'
 */
async function getWalkAuroraId(walk) {
    // Create the walk info string by joining node information
    const walkInfo = walk.map(node => {
        const chrom = node.data('chrom') || '';
        const refStart = node.data('ref_start') || '';
        const refEnd = node.data('ref_end') || '';
        const nodeId = node.data("node_id");
        return `${chrom}_${refStart}_${refEnd}_${nodeId}`;
    }).join('-');

    // Generate hash identifier for the walk info
    return await toHashIdentifier(walkInfo);
}

async function displayWalks(searchText = "") {
    const walksContainer = document.getElementById("walks");
    if (!walksContainer) {
        console.error("Walks container not found");
        return;
    }

    // Clear previous walks display and add search box
    walksContainer.innerHTML = `
        <div class="input-group mb-3">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input
                type="text"
                class="form-control"
                id="walkSearch"
                placeholder="Search walks or Aurora ID... (Press Enter to search)"
                aria-label="Search walks"
            >
        </div>
        <h3>Graph Walks:</h3>
    `;

    // Add search event listener
    const searchInput = document.getElementById('walkSearch');
    if (searchInput) {
        searchInput.value = searchText; // Preserve search text when redisplaying
        // Remove old event listeners before adding new one
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);
        newSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                displayWalks(e.target.value);
            }
        });
    }
    try {
        // Sort walks by length (number of nodes) in descending order
        const sortedWalks = [...STATE.walks].sort((a, b) => b.length - a.length);

        // Process all walks in parallel
        const walkPromises = sortedWalks.map(async(walk, index) => {
            try {
                const walkText = walk.map((node) => node.id()).join(" -> ");
                const auroraId = await getWalkAuroraId(walk);

                // Convert search text and comparison text for case-sensitive search
                const searchLower = searchText.trim();
                const walkLower = walkText;
                const auroraLower = auroraId;

                // Skip if there's a search term and neither walk text nor Aurora ID matches
                if (searchLower && !walkLower.includes(searchLower) && !auroraLower.includes(searchLower)) {
                    return null;
                }

                const walkDiv = document.createElement("div");
                walkDiv.innerHTML = `Walk ${index + 1}: ${walkText}<br><small>Aurora ID: ${auroraId}</small>`;
                walkDiv.title = "Click to highlight this walk in the graph";
                walkDiv.style.cursor = "pointer";
                walkDiv.style.marginBottom = "10px";

                walkDiv.addEventListener("click", () => {
                    highlightWalk(walk);
                });

                return walkDiv;
            } catch (error) {
                console.error(`Error processing walk ${index}:`, error);
                return null;
            }
        });

        // Wait for all walks to be processed
        const walkDivs = await Promise.all(walkPromises);

        // Append only the non-null walk divs
        walkDivs
            .filter(div => div !== null)
            .forEach(div => walksContainer.appendChild(div));

    } catch (error) {
        console.error("Error displaying walks:", error);
        walksContainer.innerHTML += `<div class="alert alert-danger">Error displaying walks</div>`;
    }
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
    // Check if graph has nodes before getting the array
    const nodes = cy.nodes().length > 0 ? cy.nodes().toArray() : [];

    const ranking = nodes
        .map(node => {
            return {
                id: node.id(),
                name: node.data('name') || node.id(),
                ptc: node.data('ptc') || 0,
                class: node.data('class') || 'unknown'
            };
        })
        .filter(node => node.ptc > 0)
        .sort((a, b) => b.ptc - a.ptc);

    return ranking;
}

// Function to update the node ranking modal
function updateNodeRankingModal(cy) {
    const ranking = calculateNodeRanking(cy);
    const nodeRankingList = document.getElementById('nodeRankingList');

    // Clear the current list
    nodeRankingList.innerHTML = '';

    if (ranking.length === 0) {
        nodeRankingList.innerHTML = '<li class="list-group-item">No nodes with PTC values found</li>';
        return;
    }

    // Add clear highlights button at the top
    const clearButtonItem = document.createElement('li');
    clearButtonItem.className = 'list-group-item d-flex justify-content-end';
    clearButtonItem.innerHTML = `
    <button class="btn btn-outline-secondary btn-sm" id="clearHighlights">
      <i class="bi bi-eraser"></i> Clear Highlights
    </button>
  `;
    nodeRankingList.appendChild(clearButtonItem);

    // Create header row
    const headerItem = document.createElement('li');
    headerItem.className = 'list-group-item active';
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
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        listItem.innerHTML = `
      <div class="row">
        <div class="col-1">${index + 1}</div>
        <div class="col-4">${node.name}</div>
        <div class="col-3">${node.ptc.toFixed(4)}</div>
        <div class="col-2">${node.class}</div>
        <div class="col-2">
          <button class="btn btn-sm btn-primary highlight-node" data-node-id="${node.id}">
            Highlight
          </button>
        </div>
      </div>
    `;
        nodeRankingList.appendChild(listItem);
    });

    // Add event listeners to highlight buttons
    document.querySelectorAll('.highlight-node').forEach(button => {
        button.addEventListener('click', event => {
            const nodeId = event.currentTarget.getAttribute('data-node-id');
            highlightNode(STATE.cy, nodeId);
        });
    });

    // Add event listener for the clear highlights button
    document.getElementById('clearHighlights').addEventListener('click', () => {
        clearNodeHighlights(cy);
    });
}

// Function to highlight a specific node
function highlightNode(cy, nodeId) {
    // Find the node by ID
    const node = cy.getElementById(nodeId);

    if (node.length > 0) {
        // Check if the node is already highlighted
        const isAlreadyHighlighted = node.hasClass('highlighted');

        if (isAlreadyHighlighted) {
            console.log("Node is already highlighted, clearing highlights");
            // If the node is already highlighted, clear all highlights
            clearNodeHighlights(cy);
        } else {
            console.log("Highlighting node:", nodeId);
            // Clear any existing highlights first
            clearNodeHighlights(cy);

            // Add highlighted class to the node
            node.addClass('highlighted');

            // Fade all other nodes and edges
            cy.elements().difference(node).addClass('faded');

            // Center the view on the highlighted node
            cy.animate({
                fit: {
                    eles: node,
                    padding: 50
                },
                duration: 500
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

    // Remove highlighting classes from all elements
    cy.elements().removeClass('highlighted');
    cy.elements().removeClass('faded');
    cy.elements().removeClass("highlightWalk"); // Also clear walk highlights
    // Reset the view to fit all elements
    cy.fit(cy.elements().filter(':visible'), 50);
}

// Add a global event listener for the escape key to clear highlights
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        clearNodeHighlights(STATE.cy);
    }
});

// Event listener for the node ranking button
document.getElementById('showNodeRanking').addEventListener('click', () => {
    updateNodeRankingModal(STATE.cy); // Use STATE.cy instead of just cy
});