import cytoscape from "cytoscape";
import klay from "cytoscape-klay";
import dagre from "cytoscape-dagre";
import tidytree from "cytoscape-tidytree";
import euler from "cytoscape-euler";
import spread from "cytoscape-spread";

cytoscape.use(dagre);
cytoscape.use(klay);
cytoscape.use(tidytree);
cytoscape.use(euler);
cytoscape.use(spread);

import chroma from "chroma-js";
import interact from "interactjs";

let walks = [];
let minEdgeWeight = 1;

let cy;
let previousClickedElement = null;
let previousClickedElementStyle = null;
let originalGraphData = null;

const nodeColor = "#1f77b4";
const hightColor = "#2ca02c";
const sourceNodeColor = "#31a354";
const selectedNodeColor = "#8dd3c7";

document.getElementById("redirectToIgv").addEventListener("click", () => {
    window.open("igv.html", "_blank");
});

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

function hideSingletonNodes() {
    cy.nodes().forEach((node) => {
        // Check if all connected edges of the node are hidden
        if (node.connectedEdges(":visible").length === 0) {
            node.hide();
        }
    });
}

// Function to update graph based on edge weight
function updateGraph() {
    // Reset graph to original data
    walks.length = 0;
    cy.elements().remove();
    cy.add(originalGraphData);

    sourceNodes = cy.nodes().filter((node) => node.indegree() === 0);
    sinkNodes = cy.nodes().filter((node) => node.outdegree() === 0);

    // update walks
    sourceNodes.forEach((sourceNode) => {
        dfs(sourceNode, [], sinkNodes);
    });

    hideUninvolvedElements();
    hideSingletonNodes();

    // Optionally, you can re-run layout here
    cy.layout({
        name: "dagre",
        fit: true,
        padding: 10,
        avoidOverlap: true,
        rankDir: "LR",
    }).run();

    setupGraphInteractions();
}

function hideUninvolvedElements() {
    const involvedNodes = new Set();
    const involvedEdges = new Set();

    // Mark all nodes and edges involved in the walks
    walks.forEach((walk) => {
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
    cy.nodes().forEach((node) => {
        if (!involvedNodes.has(node.id())) {
            node.hide();
        }
    });

    cy.edges().forEach((edge) => {
        if (!involvedEdges.has(edge.id())) {
            edge.hide();
        }
    });
}

document
    .getElementById("minEdgeWeight")
    .addEventListener("change", function() {
        minEdgeWeight = parseFloat(this.value) || 1;
        if (Number.isNaN(minEdgeWeight)) return;
        updateGraph(minEdgeWeight);
    });

function loadGraphDataFromServer(graphData) {
    //check if graphData has elements
    // if has elements, initialize graph using elements
    // if not has elements, initialize graph using graphData
    if (graphData.elements) {
        originalGraphData = graphData.elements;
        initializeGraph(graphData.elements);
    } else {
        originalGraphData = graphData;
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
    previousClickedElement = null;
    previousClickedElementStyle = null;
    cy.elements().removeClass("highlighted");

    // Clear info panel
    document.getElementById("info").innerHTML = "<h3>Node/Edge Info:</h3>";

    layoutSelect.value = "dagre";
    cy.layout({
        name: "dagre",
        animate: true,
        fit: true,
        padding: 10,
        avoidOverlap: true,
        rankDir: "LR",
    }).run();

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
    const base64Image = cy.png();

    // Create a new anchor element to enable downloading
    const downloadLink = document.createElement("a");
    downloadLink.href = base64Image;
    downloadLink.download = "graph_capture.png";

    // Trigger the download
    downloadLink.click();
});

function resizePanels() {
    // Enable drag and resize interactions on the cy container
    interact("#cy")
        .resizable({
            // Enable resize from right edge
            edges: { right: true, bottom: true },

            // Set minimum size
            restrictSize: {
                min: { width: 100, height: 100 },
            },
        })
        .on("resizemove", (event) => {
            const target = event.target;
            let x = parseFloat(target.getAttribute("data-x")) || 0;
            let y = parseFloat(target.getAttribute("data-y")) || 0;

            // Update the element's style
            target.style.width = `${event.rect.width}px`;
            target.style.height = `${event.rect.height}px`;

            // Translate when resizing from top or left edges
            x += event.deltaRect.left;
            y += event.deltaRect.top;

            target.style.webkitTransform =
                target.style.transform = `translate(${x}px,${y}px)`;

            target.setAttribute("data-x", x);
            target.setAttribute("data-y", y);
        });

    interact("#rightContainer")
        .resizable({
            // Enable resize from left edge
            edges: { left: true, right: true },

            // Set minimum size
            restrictSize: {
                min: { width: 100 },
            },
        })
        .on("resizemove", (event) => {
            const target = event.target;
            let x = parseFloat(target.getAttribute("data-x")) || 0;

            // Update the element's style
            target.style.width = `${event.rect.width}px`;

            // Translate when resizing from left edge
            x += event.deltaRect.left;

            target.style.webkitTransform =
                target.style.transform = `translate(${x}px)`;

            target.setAttribute("data-x", x);
        });

    interact("#info, #walks")
        .resizable({
            edges: { right: true }, // Enable resize from the right edge
            restrictSize: {
                min: { width: 100 }, // Set minimum width
            },
        })
        .on("resizemove", (event) => {
            const target = event.target;
            const newWidth = event.rect.width;

            // Update the width of the element
            target.style.width = `${newWidth}px`;

            // Update the right position to fill the right side of the screen
            target.style.right = "0";
        });
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM Loaded");
    resizePanels();
});

// Function to get color based on weight
function getColorForWeight(weight, minWeight, maxWeight, colorScale) {
    if (weight <= minWeight) {
        return colorScale[0];
    }
    if (weight >= maxWeight) {
        return colorScale[colorScale.length - 1];
    }

    let index = Math.floor(
        ((colorScale.length - 1) * (weight - minWeight)) / (maxWeight - minWeight),
    );
    return colorScale[index];
}

function initializeGraph(graphData) {
    const maxWeight = Math.max(
        ...graphData.edges.map((edge) => edge.data.weight),
    );

    // Assume minWeight and maxWeight are known (you can calculate these based on your data)
    const minWeight = 1; // e.g., 1
    // gray to black
    const colorScale = chroma
        .scale(["gray", "black"])
        .mode("lch")
        .colors(maxWeight);

    cy = cytoscape({
        container: document.getElementById("cy"),
        layout: {
            name: "dagre",
            fit: true,
            padding: 10,
            avoidOverlap: true,
            rankDir: "LR",
        },
        style: [
            {
                selector: ".highlighted",
                style: {
                    "border-width": "0px",
                    "border-color": hightColor,
                },
            },
            {
                selector: "edge.highlighted",
                style: {
                    "line-color": hightColor,
                    "target-arrow-color": hightColor,
                },
            },
            {
                selector: "node",
                style: {
                    label: "data(name)",
                    "background-color": nodeColor,
                    "border-color": "#000",
                    "border-width": 2,
                    shape: "ellipse", // Shape of the nodes
                },
            },
            {
                selector: "node[source-node]",
                style: {
                    "background-color": sourceNodeColor,
                },
            },
            {
                selector: "edge",
                style: {
                    width: 4,
                    "line-color": (ele) => {
                        const weight = ele.data("weight");
                        return getColorForWeight(weight, minWeight, maxWeight, colorScale);
                    },
                    "target-arrow-color": (ele) => {
                        const weight = ele.data("weight");
                        return getColorForWeight(weight, minWeight, maxWeight, colorScale);
                    },
                    label: "data(weight)",
                    "text-rotation": "autorotate",
                    "target-arrow-shape": "triangle", // Arrow shape
                    "curve-style": "bezier", // Edge style (curved or straight)
                    "text-margin-y": -10,
                },
            },
        ],

        // initial viewport state:
        zoom: 1,
        pan: { x: 0, y: 0 },

        // interaction options:
        minZoom: 0.1,
        maxZoom: 3,
        zoomingEnabled: true,
        userZoomingEnabled: true,
        panningEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: true,
        selectionType: "single",
        touchTapThreshold: 8,
        desktopTapThreshold: 4,
        autolock: false,
        autoungrabify: false,
        elements: graphData,
    });

    cy.nodes().forEach((node) => {
        if (
            node.outgoers().edges().length > 0 &&
            node.incomers().edges().length === 0
        ) {
            node.data("source-node", true);
        }
    });

    // clear walks
    sourceNodes = cy.nodes().filter((node) => node.indegree() === 0);
    sinkNodes = cy.nodes().filter((node) => node.outdegree() === 0);

    walks.length = 0;
    sourceNodes.forEach((sourceNode) => {
        dfs(sourceNode, [], sinkNodes);
    });
}

function setupGraphInteractions() {
    cy.on("tap", (evt) => {
        if (evt.target === cy) {
            resetPreviousElementStyle();
            previousClickedElement = null;
            previousClickedElementStyle = null;
            cy.elements().removeClass("highlighted");
        }
    });

    displayWalks();
    setupClickEvent(cy);
    createTooltip(cy);
}

function displayWalks() {
    const walksContainer = document.getElementById("walks");

    // Clear previous walks display
    walksContainer.innerHTML = "<h3>Graph Walks:</h3>";

    walks.forEach((walk, index) => {
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
    cy.elements().removeClass("highlighted");
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

function dfs(node, currentPath, sinkNodes, isPathValid = true) {
    if (!isPathValid) return;

    currentPath.push(node);

    if (sinkNodes.includes(node)) {
        walks.push([...currentPath]); // Found a path
    } else {
        // Correctly use outgoers as a method call
        node.outgoers("node").forEach((neighbor) => {
            const connectingEdge = node.edgesTo(neighbor);
            if (connectingEdge.data("weight") >= minEdgeWeight) {
                dfs(neighbor, currentPath, sinkNodes, true);
            } else {
                dfs(neighbor, currentPath, sinkNodes, false);
            }
        });
    }

    currentPath.pop(); // backtrack
}

function resetPreviousElementStyle() {
    if (previousClickedElement) {
        if (previousClickedElement.isNode()) {
            previousClickedElement.style(previousClickedElementStyle);
        } else if (previousClickedElement.isEdge()) {
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

function setupClickEvent(cy) {
    cy.on("tap", "node, edge", (evt) => {
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
            previousClickedElementStyle = element.style();
            // Highlight the clicked node
            element.style({
                "background-color": selectedNodeColor,
                "border-width": "0px",
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
        previousClickedElement = element;
        infoContainer.innerHTML = infoHtml;
    });
}

// Get references to the cy, info, and walks elements
const cyContainer = document.getElementById("cy");
const infoPanel = document.getElementById("info");
const walksPanel = document.getElementById("walks");

// Get references to the maximize button and set initial state
const maximizeButton = document.getElementById("toggleMaximize");
let isMaximized = false;

// Add click event listener to the maximize button
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

export { loadGraphDataFromServer };
