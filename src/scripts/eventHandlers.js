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

// Add the clear highlights button event handler
document.getElementById('clearHighlights').addEventListener('click', () => {
    clearNodeHighlights(STATE.cy);
});

// Gene annotation direct action (if modal doesn't work for some reason)
document.getElementById('geneAnnotationBtn').addEventListener('click', async(e) => {
    // Direct annotation without modal
    if (e.ctrlKey || !window.bootstrap) {
        e.preventDefault();
        await handleGeneAnnotation();
    } else {
        // Bootstrap modal approach
        try {
            const modal = new bootstrap.Modal(document.getElementById('geneAnnotationModal'));
            modal.show();
        } catch (error) {
            console.error("Error showing modal, falling back to direct annotation:", error);
            await handleGeneAnnotation();
        }
    }
});

/**
 * Display an alert message to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of alert: 'info', 'success', 'warning', or 'error'
 * @param {number} timeout - Time in milliseconds before the alert disappears (0 for no auto-dismiss)
 */
function showAlert(message, type = 'info', timeout = 0) {
    // Map alert types to Bootstrap classes and icons
    const typeMap = {
        'info': { class: 'alert-info', icon: 'bi-info-circle' },
        'success': { class: 'alert-success', icon: 'bi-check-circle' },
        'warning': { class: 'alert-warning', icon: 'bi-exclamation-triangle' },
        'error': { class: 'alert-danger', icon: 'bi-exclamation-circle' }
    };

    // Get the appropriate class and icon
    const alertClass = typeMap[type] ? .class || 'alert-info';
    const alertIcon = typeMap[type] ? .icon || 'bi-info-circle';

    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
    alertDiv.style.bottom = '20px';
    alertDiv.style.left = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.maxWidth = '400px';

    // Add content with icon
    alertDiv.innerHTML = `
        <i class="bi ${alertIcon} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // Add to document
    document.body.appendChild(alertDiv);

    // Auto-dismiss if timeout is provided
    if (timeout > 0) {
        setTimeout(() => {
            alertDiv.classList.remove('show');
            setTimeout(() => alertDiv.remove(), 300); // Remove after fade animation
        }, timeout);
    }

    return alertDiv;
}

/**
 * Handle direct gene annotation when modal is unavailable
 */
async function handleGeneAnnotation() {
    try {
        console.log("Starting gene annotation process directly...");

        // Show loading alert
        showAlert("Loading gene annotations...", "info");

        // Try loading the gene data 
        const loaded = await loadGeneData();

        if (loaded && STATE.cy) {
            console.log("Gene data loaded successfully, annotating nodes...");
            // Annotate all nodes in the graph
            const annotatedCount = await annotateAllNodes(STATE.cy);

            // Show success alert with auto-dismiss after 3 seconds
            showAlert(`Annotated ${annotatedCount} nodes with gene information!`, "success", 3000);
        } else {
            console.error("Could not load gene data or graph not initialized");
            showAlert("Failed to load gene annotations.", "error");
        }
    } catch (error) {
        console.error("Error in gene annotation:", error);
        showAlert("Error in gene annotation process.", "error");
    }
}