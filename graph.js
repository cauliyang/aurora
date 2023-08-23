document.addEventListener("DOMContentLoaded", function () {
	let cy;
	const walks = [];

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
						selector: "node",
						style: {
							label: "data(name)",
							"background-color": "#666",
						},
					},
					{
						selector: "node[source-node]",
						style: {
							"background-color": "#FF5733",
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
		})
		.catch((error) => console.error("Failed to fetch graph data:", error));

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

	function displayWalks() {
		let walksContainer = document.getElementById("walks");
		walks.forEach((walk, index) => {
			let walkDiv = document.createElement("div");
			walkDiv.textContent = `Walk ${index + 1}: ${walk
				.map((node) => node.id())
				.join(" -> ")}`;
			walksContainer.appendChild(walkDiv);
		});
	}

	function setupClickEvent() {
		cy.on("tap", "node, edge", function (evt) {
			let element = evt.target;

			let info = "";
			if (element.isNode()) {
				info = `Node Information:\n\nID: ${element.id()}\nData: ${JSON.stringify(
					element.data(),
				)}`;
			} else if (element.isEdge()) {
				info = `Edge Information:\n\nSource: ${element
					.source()
					.id()}\nTarget: ${element.target().id()}\nData: ${JSON.stringify(
					element.data(),
				)}`;
			}

			alert(info);
		});
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
});
