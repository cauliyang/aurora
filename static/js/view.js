import { split } from "./split.js";

let isMaximized = false; // A flag to keep track of the current view state
let originalZoom;
let originalPan;

function toggleView() {
	if (isMaximized) {
		// Restore the original view
		document.getElementById("cy").style.width = "";
		document.getElementById("cy").style.height = "";
		document.getElementById("right-container").style.display = "block";
		document.getElementById("toggleMaximize").textContent = "Maximize Graph";
		split(cy);

		// Restore original graph zoom and pan
		cy.zoom(originalZoom);
		cy.pan(originalPan);
		cy.resize(); // Make sure Cytoscape adjusts to the new size
	} else {
		// Maximize the graph view and hide other panels
		document.getElementById("cy").style.width = "100vw";
		document.getElementById("cy").style.height = "100vh";
		document.getElementById("right-container").style.display = "none";
		document.getElementById("toggleMaximize").textContent = "Restore View";
		// Store the current graph zoom and pan
		originalZoom = cy.zoom();
		originalPan = cy.pan();
		// Fit the graph to the viewport
		cy.fit();
	}

	// cy.resize(); // Make sure Cytoscape adjusts to the new size
	isMaximized = !isMaximized; // Toggle the flag
}

document.getElementById("toggleMaximize").addEventListener("click", toggleView);
