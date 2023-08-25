function split(cy) {
	// Split the right-hand side panels vertically
	Split(["#info", "#walks"], {
		direction: "vertical",
		sizes: [50, 50], // This means both panels will start with equal height
		minSize: [100, 100],
		gutterSize: 5,
	});

	// Split between #cy and the right-container
	Split(["#cy", "#right-container"], {
		sizes: [70, 30], // 70% width for #cy and 30% for the right-container initially.
		minSize: [100, 100],
		gutterSize: 5,
		direction: "horizontal",
		onDragEnd: function () {
			cy.resize(); // Ensure Cytoscape adjusts whenever the panels are resized
		},
	});
}

export { split };
