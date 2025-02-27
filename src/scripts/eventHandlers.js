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
            window.showAlert(`Annotated ${annotatedCount} nodes with gene information!`, "success", 3000);
        } else {
            console.error("Could not load gene data or graph not initialized");
            window.showAlert("Failed to load gene annotations.", "error");
        }
    } catch (error) {
        console.error("Error in gene annotation:", error);
        window.showAlert("Error in gene annotation process.", "error");
    }
}


document.addEventListener("DOMContentLoaded", function() {
    console.log(
        "DOM fully loaded, initializing modals and gene annotation components"
    );

    // Initialize Bootstrap components
    var tooltipTriggerList = [].slice.call(
        document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Annotate Now button
    const annotateNowBtn = document.getElementById("annotateNowBtn");
    if (annotateNowBtn) {
        annotateNowBtn.addEventListener("click", function() {
            console.log("Annotate Now button clicked");
            // Close the modal
            const modal = bootstrap.Modal.getInstance(
                document.getElementById("geneAnnotationModal")
            );
            if (modal) modal.hide();

            // Trigger the gene annotation process
            const event = new MouseEvent("click", {
                ctrlKey: true, // Add ctrl key to bypass modal reopening
                bubbles: true,
            });
            document.getElementById("geneAnnotationBtn").dispatchEvent(event);
        });
    }

    // Fix gene file upload button
    const geneFileInput = document.getElementById("geneFileInput");
    const uploadGeneBtn = document.getElementById("uploadGeneBtn");

    if (geneFileInput && uploadGeneBtn) {
        console.log("Found gene file input and upload button");

        // Enable/disable upload button based on file selection
        geneFileInput.addEventListener("change", function() {
            console.log(
                "File input changed:",
                this.files.length > 0 ? this.files[0].name : "no file"
            );
            uploadGeneBtn.disabled = this.files.length === 0;
        });

        // Initially disable button
        uploadGeneBtn.disabled = !geneFileInput.files.length;
    } else {
        console.warn("Gene file input or upload button not found");
    }
});