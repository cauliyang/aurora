import { STATE } from "./graph";
import { resizePanels } from "./graphUtilities";
import { loadGraphDataFromServer } from "./graph";
import { getLabelsVisible, setLabelsVisible } from "./graphSetup";

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

function toggleLabels() {
    // Update labelsVisible state
    const nodelabelStyle = !getLabelsVisible() ? "data(name)" : ""; // Toggles between showing the name and showing nothing
    const edgeLabelStyle = !getLabelsVisible() ? "data(weight)" : ""; // Toggles between showing the weight and showing nothing

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

document.getElementById("hiddenLabel").addEventListener("click", toggleLabels);

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

document.getElementById("redirectToIgv").addEventListener("click", () => {
    window.open("igv.html", "_blank");
});

document.addEventListener("DOMContentLoaded", () => {
    resizePanels();
});

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
