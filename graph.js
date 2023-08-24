const walks = [];
let cy;

document.addEventListener("DOMContentLoaded", function () {
	// Fetching the data from the JSON file
	fetch("graphData.json")
		.then((response) => response.json())
		.then((graphData) => {
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
							"border-width": "2px",
							"border-color": "#FF5733",
						},
					},
					{
						selector: "edge.highlighted",
						style: {
							width: "4px",
							"line-color": "#FF5733",
							"target-arrow-color": "#FF5733",
						},
					},
					{
						selector: "node",
						style: {
							label: "data(name)",
							"background-color": "#666",
						},
					},
					{
						selector: "node[source-node]",
						style: {
							"background-color": "#00FF00",
						},
					},
					{
						selector: "edge",
						style: {
							width: "data(weight)",
							label: "data(weight)",
							"text-rotation": "autorotate",
							"curve-style": "bezier",
							"target-arrow-shape": "triangle",
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
				boxSelectionEnabled: false,
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

			let sourceNodes = cy.nodes().filter((node) => node.indegree() === 0);
			let sinkNodes = cy.nodes().filter((node) => node.outdegree() === 0);

			sourceNodes.forEach((sourceNode) => {
				dfs(sourceNode, [], sinkNodes);
			});

			displayWalks();
			setupClickEvent();

			cy.on("tap", function (evt) {
				if (evt.target === cy) {
					cy.elements().removeClass("highlighted");
				}
			});
			// Split between #cy and #walks
			Split(["#cy", "#walks"], {
				sizes: [70, 30],
				minSize: [100, 100],
				gutterSize: 5,
				direction: "horizontal", // this will make them side-by-side
			});

			// Split between #top-container and #info
			Split(["#top-container", "#info"], {
				sizes: [75, 25],
				minSize: [100, 100],
				gutterSize: 5,
				direction: "vertical", // this will make #info below #top-container
			});
		})
		.catch((error) => console.error("Failed to fetch graph data:", error));
});

function highlightWalk(walk) {
	// Reset any previously highlighted nodes or edges
	cy.elements().removeClass("highlighted");
	for (let i = 0; i < walk.length; i++) {
		// Highlight every node in the walk
		walk[i].addClass("highlighted");

		// If it's not the last node in the walk, highlight the edge to the next node
		if (i < walk.length - 1) {
			let currentNode = walk[i];
			let nextNode = walk[i + 1];
			let connectingEdge = currentNode.edgesTo(nextNode);
			connectingEdge.addClass("highlighted");
		}
	}
}
function dfs(node, currentPath, sinkNodes) {
	currentPath.push(node);

	if (sinkNodes.includes(node)) {
		walks.push([...currentPath]); // Found a path
	} else {
		let neighbors = node.outgoers().nodes();
		neighbors.forEach((neighbor) => {
			dfs(neighbor, currentPath, sinkNodes);
		});
	}

	currentPath.pop(); // backtrack
}

function setupClickEvent() {
	cy.on("tap", "node, edge", function (evt) {
		let element = evt.target;

		let infoContainer = document.getElementById("info");
		let infoHtml = "";

		if (element.isNode()) {
			infoHtml = `
                    <h4>Node Information:</h4>
                    <p><strong>ID:</strong> ${element.id()}</p>
                    <p><strong>Data:</strong> ${JSON.stringify(element.data())}</p>
                `;
		} else if (element.isEdge()) {
			infoHtml = `
                    <h4>Edge Information:</h4>
                    <p><strong>Source:</strong> ${element.source().id()}</p>
                    <p><strong>Target:</strong> ${element.target().id()}</p>
                    <p><strong>Data:</strong> ${JSON.stringify(element.data())}</p>
                `;
		}

		infoContainer.innerHTML = infoHtml;
	});
}

function displayWalks() {
	let walksContainer = document.getElementById("walks");
	walks.forEach((walk, index) => {
		let walkDiv = document.createElement("div");
		walkDiv.textContent = `Walk ${index + 1}: ${walk
			.map((node) => node.id())
			.join(" -> ")}`;

		walkDiv.title = "Click to highlight this walk in the graph"; // Tooltip

		// Add a click event to each walk element
		walkDiv.addEventListener("click", function () {
			highlightWalk(walk);
		});

		walksContainer.appendChild(walkDiv);
	});
}
