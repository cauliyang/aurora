import { dfs } from "./graphUtilities";
import { STATE } from "./graph";

import cytoscape from "cytoscape";
import chroma from "chroma-js";

function getColorForWeight(weight, minWeight, maxWeight, colorScale) {
    if (weight <= minWeight) {
        return colorScale[0];
    }
    if (weight >= maxWeight) {
        return colorScale[colorScale.length - 1];
    }

    const index = Math.floor(
        ((colorScale.length - 1) * (weight - minWeight)) / (maxWeight - minWeight),
    );
    return colorScale[index];
}

export function initializeGraph(graphData) {
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
                selector: "node.walkcolor",
                style: {
                    "background-color": "#ff5733", // Change to your preferred highlight color
                },
            },
            {
                selector: "edge.walkcolor",
                style: {
                    "line-color": "#ff5733", // Change to your preferred highlight color
                    "target-arrow-color": "#ff5733",
                },
            },
            {
                selector: "node",
                style: {
                    label: "data(name)",
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

    STATE.cy.nodes().forEach((node) => {
        if (
            node.outgoers().edges().length > 0 &&
            node.incomers().edges().length === 0
        ) {
            node.data("source-node", true);
        }
    });

    // clear walks
    sourceNodes = STATE.cy.nodes().filter((node) => node.indegree() === 0);
    sinkNodes = STATE.cy.nodes().filter((node) => node.outdegree() === 0);

    STATE.walks.length = 0;
    sourceNodes.forEach((sourceNode) => {
        dfs(sourceNode, [], sinkNodes);
    });
}
