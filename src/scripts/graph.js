import cytoscape from "cytoscape";
import klay from "cytoscape-klay";
import dagre from "cytoscape-dagre";
import tidytree from "cytoscape-tidytree";
import euler from "cytoscape-euler";
import spread from "cytoscape-spread";

import { hideSingletonNodes } from "./graphUtilities";
import { resizePanels } from "./graphUtilities";
import { initializeGraph } from "./graphSetup";
import { createTooltip } from "./tooltip";
import { dfs } from "./graphUtilities";

cytoscape.use(dagre);
cytoscape.use(klay);
cytoscape.use(tidytree);
cytoscape.use(euler);
cytoscape.use(spread);

export const STATE = {
    walks: [],
    minEdgeWeight: 1,
    maxPathLength: 900, // infinite
    cy: null,
    previousClickedElement: null,
    previousClickedElementStyle: null,
    originalGraphData: null,
    selectedNodeColor: "#8dd3c7",
    nodeColor: "#1f77b4",
    highlightColor: "red", //red
    sourceNodeColor: "#31a354",
};

// Get the "Change Layout" button element
const layoutSelect = document.getElementById("layoutSelect");

layoutSelect.addEventListener("change", () => {
    // Get the selected layout from the select element
    const selectedLayout = layoutSelect.value;

    if (cy === undefined) return;

    // Apply the chosen layout
    cy.layout({
        name: selectedLayout,
        animate: true, // You can adjust animation settings if needed
        fit: true,
        padding: 10,
        avoidOverlap: true,
        rankDir: "LR",
    }).run();
});

// Function to update graph based on edge weight
function updateGraph() {
    // Reset graph to original data
    console.log("updateGraph", STATE);

    STATE.walks.length = 0;
    STATE.cy.elements().remove();
    STATE.cy.add(STATE.originalGraphData);

    sourceNodes = STATE.cy.nodes().filter((node) => node.indegree() === 0);
    sinkNodes = STATE.cy.nodes().filter((node) => node.outdegree() === 0);

    // update walks
    sourceNodes.forEach((sourceNode) => {
        dfs(sourceNode, [], sinkNodes);
    });

    hideUninvolvedElements();
    hideSingletonNodes();

    // Optionally, you can re-run layout here
    STATE.cy
        .layout({
            name: "dagre",
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
        let minEdgeWeight = parseFloat(this.value) || 1;
        if (Number.isNaN(minEdgeWeight)) return;
        STATE.minEdgeWeight = minEdgeWeight;
        updateGraph();
    });

document.getElementById("MaxDepth").addEventListener("change", function() {
    let MaxDepth = parseFloat(this.value) || 900;
    if (Number.isNaN(MaxDepth)) return;
    STATE.maxPathLength = MaxDepth;
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

document
    .getElementById("uploadInput")
    .addEventListener("change", handleFileUpload);

function handleFileUpload(event) {
    const file = event.target.files[0];
    console.log(file);
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            try {
                const jsonData = JSON.parse(content);
                console.log(jsonData);
                // Process and visualize the JSON data
                // For example: visualizeGraph(jsonData);
                loadGraphDataFromServer(jsonData);
            } catch (error) {
                console.error("Error parsing JSON:", error);
            }
        };
        reader.readAsText(file);
    }
}

document.getElementById("resetGraph").addEventListener("click", () => {
    // Reset layout to default
    resetPreviousElementStyle();
    STATE.previousClickedElement = null;
    STATE.previousClickedElementStyle = null;
    STATE.cy.elements().removeClass("highlighted");

    // Clear info panel
    document.getElementById("info").innerHTML = "<h3>Node/Edge Info:</h3>";

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

document.getElementById("captureGraph").addEventListener("click", () => {
    // Get the base64 representation of the graph
    const base64Image = STATE.cy.png();

    // Create a new anchor element to enable downloading
    const downloadLink = document.createElement("a");
    downloadLink.href = base64Image;
    downloadLink.download = "graph_capture.png";

    // Trigger the download
    downloadLink.click();
});

document.addEventListener("DOMContentLoaded", () => {
    resizePanels();
});

// Function to get color based on weight

function setupGraphInteractions() {
    STATE.cy.on("tap", (evt) => {
        if (evt.target === STATE.cy) {
            resetPreviousElementStyle();
            STATE.previousClickedElement = null;
            STATE.previousClickedElementStyle = null;
            STATE.cy.elements().removeClass("highlighted");
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
    // Reset any previously highlighted nodes or edges
    STATE.cy.elements().removeClass("highlighted");
    for (let i = 0; i < walk.length; i++) {
        // Highlight every node in the walk
        walk[i].addClass("highlighted");

        // If it's not the last node in the walk, highlight the edge to the next node
        if (i < walk.length - 1) {
            const currentNode = walk[i];
            const nextNode = walk[i + 1];
            const connectingEdge = currentNode.edgesTo(nextNode);
            connectingEdge.addClass("highlighted");
        }
    }
}

export function resetPreviousElementStyle() {
    if (STATE.previousClickedElement) {
        if (STATE.previousClickedElement.isNode()) {
            STATE.previousClickedElement.style(STATE.previousClickedElementStyle);
        } else if (STATE.previousClickedElement.isEdge()) {
        }
    }
}

function generateInfoHtml(title, details) {
    let html = `<h3>${title} Information:</h3>`;
    for (const [key, value] of Object.entries(details)) {
        html += `<strong>${key}:</strong> ${value}<br>`;
    }
    return html;
}

function setupClickEvent() {
    STATE.cy.on("tap", "node, edge", (evt) => {
        resetPreviousElementStyle();
        const element = evt.target;

        const infoContainer = document.getElementById("info");
        let infoHtml = "";
        const uniqueID = Date.now(); // Generate a uni
        if (element.isNode()) {
            const indegree = element.indegree();
            const outdegree = element.outdegree();
            infoHtml += `<strong>Node ID:</strong> ${element.id()}<br>`;
            infoHtml += `<strong>In-degree:</strong> ${indegree}<br>`;
            infoHtml += `<strong>Out-degree:</strong> ${outdegree}<br>`;

            // Interactive checking of JSON data attributes
            infoHtml += `
                <button class="btn btn-link" type="button" data-bs-toggle="collapse" data-bs-target="#attributesNode-${uniqueID}" aria-expanded="fals">
                    Attributes
                </button>
                <div class="collapse show" id="attributesNode-${uniqueID}">
                    <pre>${JSON.stringify(element.data(), null, 2)}</pre>
                </div>
            `;
            STATE.previousClickedElementStyle = element.style();
            // Highlight the clicked node
            element.style({
                "background-color": STATE.selectedNodeColor,
                "border-color": "#000",
                "border-width": 2,
            });

            element.addClass("highlighted");
        } else if (element.isEdge()) {
            infoHtml += `
                <strong>Source:</strong> ${element.source().id()}<br>
                <strong>Target:</strong> ${element.target().id()}<br>

                <button class="btn btn-link" type="button" data-bs-toggle="collapse" data-bs-target="#dataEdge-${uniqueID}" aria-expanded="false">
                    Data
                </button>
                <div class="collapse show" id="dataEdge-${uniqueID}">
                    <pre>${JSON.stringify(element.data(), null, 2)}</pre>
                </div>
            `;
        }

        // Update the previously clicked item
        STATE.previousClickedElement = element;
        infoContainer.innerHTML = infoHtml;
    });
}
