let isMaximized = false; // A flag to keep track of the current view state
let originalZoom;
let originalPan;

function destroySplit(splitInstance) {
	if (splitInstance?.gutters) {
		splitInstance.gutters.forEach((gutter) => gutter.remove());
	}
}

function toggleView() {
	if (isMaximized) {
		// Restore the original view
		document.getElementById("cy").style.width = "70%";
		document.getElementById("cy").style.height = "75%";
		document.getElementById("walks").style.width = "30%";
		document.getElementById("walks").style.display = "block";
		document.getElementById("info").style.display = "block";
		document.getElementById("toggleMaximize").textContent = "Maximize Graph";

		// Destroy existing Split.js instances
		destroySplit(Split.instances[0]);
		destroySplit(Split.instances[1]);

		// We reinitialize the Split.js with the original configuration
		Split(["#cy", "#walks"], {
			sizes: [70, 30],
			minSize: [100, 100],
			gutterSize: 5,
			direction: "horizontal",
		});

		Split(["#top-container", "#info"], {
			sizes: [75, 25],
			minSize: [100, 100],
			gutterSize: 5,
			direction: "vertical",
		});

		// Restore original graph zoom and pan
		cy.zoom(originalZoom);
		cy.pan(originalPan);
		cy.resize(); // Make sure Cytoscape adjusts to the new size
	} else {
		// Maximize the graph view and hide other panels
		document.getElementById("cy").style.width = "100vw";
		document.getElementById("cy").style.height = "100vh";
		document.getElementById("walks").style.display = "none";
		document.getElementById("info").style.display = "none";
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
