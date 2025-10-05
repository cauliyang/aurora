import { dfs } from "./graphUtilities";
import { STATE } from "./graph";

import cytoscape from "cytoscape";
import cytoscapeSvg from "cytoscape-svg";
import chroma from "chroma-js";

// Register the SVG extension
cytoscape.use(cytoscapeSvg);

function getColorForWeight(weight, minWeight, maxWeight, colorScale) {
  if (weight <= minWeight) {
    return colorScale[0];
  }

  if (weight >= maxWeight) {
    return colorScale[colorScale.length - 1];
  }

  const index = Math.floor(
    ((colorScale.length - 1) * (weight - minWeight)) / (maxWeight - minWeight)
  );

  return colorScale[index];
}

// Export a getter and setter for labelsVisible
let labelsVisible = false;
export function getLabelsVisible() {
  return labelsVisible;
}
export function setLabelsVisible(value) {
  labelsVisible = value;
}

export function initializeGraph(graphData) {
  const maxWeight = Math.max(
    ...graphData.edges.map((edge) => edge.data.weight)
  );

  // Assume minWeight and maxWeight are known (you can calculate these based on your data)
  const minWeight = 1;
  const colorScale = chroma
    .scale(["gray", "black"])
    .mode("lch")
    .colors(maxWeight);

  let node_label = function (ele) {
    if (!getLabelsVisible()) return "";
    return ele.data("gene_name") ? ele.data("gene_name") : "";
  };

  let edge_label = function (ele) {
    if (!getLabelsVisible()) return "";
    return ele.data("weight") ? ele.data("weight") : "";
  };

  STATE.cy = cytoscape({
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
        selector: "node",
        style: {
          label: node_label, // Initially, no labels are shown
          "background-color": STATE.nodeColor,
          "border-color": "#000",
          "border-width": 2,
          shape: "ellipse", // Shape of the nodes
        },
      },
      {
        selector: "node[source-node]",
        style: {
          "background-color": STATE.sourceNodeColor,
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
          label: edge_label, // Initially, no labels are shown
          "text-rotation": "autorotate",
          "target-arrow-shape": "triangle", // Arrow shape
          "curve-style": "bezier", // Edge style (curved or straight)
          "text-margin-y": -10,
        },
      },
      // Add these style definitions for highlighted and faded elements
      {
        selector: ".highlighted",
        style: {
          "border-width": 4,
          "border-color": "#ff0000",
          "background-color": "#ffcccc",
          color: "#000000",
          "font-weight": "bold",
          "z-index": 999,
          "transition-property":
            "border-width, border-color, background-color, color, font-weight, opacity",
          "transition-duration": "0.3s",
        },
      },
      {
        selector: ".faded",
        style: {
          opacity: 0.25,
          "transition-property": "opacity",
          "transition-duration": "0.3s",
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

  STATE.cy.nodes().forEach((node) => {
    if (
      node.outgoers().edges().length > 0 &&
      node.incomers().edges().length === 0
    ) {
      node.data("source-node", true);
    }
  });

  // set style highlight
  STATE.cy.style().selector("node.highlightWalk").style({
    "background-color": STATE.highlightWalkColor,
  });

  const sourceNodes = STATE.cy.nodes().filter((node) => node.indegree() === 0);
  const sinkNodes = STATE.cy.nodes().filter((node) => node.outdegree() === 0);

  STATE.walks.length = 0;
  sourceNodes.forEach((sourceNode) => {
    dfs(sourceNode, [], sinkNodes);
  });

  // Make sure displayWalks is available to the event handlers
  if (
    typeof window !== "undefined" &&
    typeof window.displayWalks === "undefined" &&
    typeof displayWalks === "function"
  ) {
    window.displayWalks = displayWalks;
  }

  // Make sure handleAuroraIdsFileUpload is available to the event handlers
  if (
    typeof window !== "undefined" &&
    typeof window.handleAuroraIdsFileUpload === "undefined" &&
    typeof handleAuroraIdsFileUpload === "function"
  ) {
    window.handleAuroraIdsFileUpload = handleAuroraIdsFileUpload;
  }
}
