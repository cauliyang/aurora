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
    highlightColor: "#ff5733",
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
    STATE.cy.elements().removeClass("highlight");
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
            // resetPreviousElementStyle();
            // STATE.previousClickedElement = null;
            // STATE.previousClickedElementStyle = null;
            STATE.cy.elements().removeClass("highlight");
        }
    });

    displayWalks();
    setupClickEvent();
    createTooltip();
}

function displayWalks() {
    const walksContainer = document.getElementById("walks");

    // Clear previous walks display
    walksContainer.innerHTML = "<h3>Graph Walks:</h3>";

    STATE.walks.forEach((walk, index) => {
        const walkDiv = document.createElement("div");
        walkDiv.textContent = `Walk ${index + 1}: ${walk
            .map((node) => node.id())
            .join(" -> ")}`;

        walkDiv.title = "Click to highlight this walk in the graph"; // Tooltip

        // Add a click event to each walk element
        walkDiv.addEventListener("click", () => {
            highlightWalk(walk);
        });

        walksContainer.appendChild(walkDiv);
    });
}

function highlightWalk(walk) {
    // Reset any previously highlight nodes or edges
    STATE.cy.elements().removeClass("highlight");

    walk.forEach((node, index) => {
        node.addClass("highlight");
    });
    STATE.cy.style().update();
}