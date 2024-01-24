import interact from "interactjs";
import { STATE } from "./graph";
import $ from "jquery";

export function dfs(node, currentPath, sinkNodes, isPathValid = true) {
    if (!isPathValid) return;

    currentPath.push(node);

    if (sinkNodes.includes(node)) {
        STATE.walks.push([...currentPath]); // Found a path
    } else {
        // Correctly use outgoers as a method call
        node.outgoers("node").forEach((neighbor) => {
            const connectingEdge = node.edgesTo(neighbor);
            if (connectingEdge.data("weight") >= STATE.minEdgeWeight) {
                // if current path's leght is greater than maxdepth, don't continue
                if (currentPath.length < STATE.maxPathLength) {
                    dfs(neighbor, currentPath, sinkNodes, true);
                }
            } else {
                dfs(neighbor, currentPath, sinkNodes, false);
            }
        });
    }

    currentPath.pop(); // backtrack
}

export function resetPreviousElementStyle() {
    if (STATE.previousClickedElement) {
        if (STATE.previousClickedElement.isNode()) {
            STATE.previousClickedElement.style(STATE.previousClickedElementStyle);
        } else if (STATE.previousClickedElement.isEdge()) {
        }
    }
}

function generateInfoHtml(title, details) {
    let html = `<h3>${title} Information:</h3>`;
    for (const [key, value] of Object.entries(details)) {
        html += `<strong>${key}:</strong> ${value}<br>`;
    }
    return html;
}

export function setupClickEvent() {
    STATE.cy.on("tap", "node, edge", (evt) => {
        // resetPreviousElementStyle();
        const element = evt.target;

        let content = "";

        const uniqueID = Date.now(); // Generate a uni
        if (element.isNode()) {
            const indegree = element.indegree();
            const outdegree = element.outdegree();

            content += `<h5>Node ID: ${element.id()}</h5>`;
            content += `<p>In-degree: ${indegree}<br>Out-degree: ${outdegree}</p>`;
            // content += `<p></p>`;

            // JSON data
            content += `
            <button class="btn btn-primary" type="button" data-bs-toggle="collapse" data-bs-target="#attributesNode-${uniqueID}">
                Data
            </button>
            <div class="collapse" id="attributesNode-${uniqueID}">
                <pre>${JSON.stringify(element.data(), null, 2)}</pre>
            </div>
        `;
        } else if (element.isEdge()) {
            content += `
            <h5>Edge</h5>
            <p>Source: ${element.source().id()}<br>Target: ${element
                    .target()
                    .id()}</p>

            <button class="btn btn-primary" type="button" data-bs-toggle="collapse" data-bs-target="#dataEdge-${uniqueID}">
                Data
            </button>
            <div class="collapse" id="dataEdge-${uniqueID}">
                <pre>${JSON.stringify(element.data(), null, 2)}</pre>
            </div>
        `;
        }

        $("#infoContent").html(content);
    });
}
export function hideSingletonNodes() {
    STATE.cy.nodes().forEach((node) => {
        // Check if all connected edges of the node are hidden
        if (node.connectedEdges(":visible").length === 0) {
            node.hide();
        }
    });
}

export function resizePanels() {
    // Enable drag and resize interactions on the cy container
    interact("#cy")
        .resizable({
            // Enable resize from right edge
            edges: { right: true, bottom: true },

            // Set minimum size
            restrictSize: {
                min: { width: 100, height: 100 },
            },
        })
        .on("resizemove", (event) => {
            const target = event.target;
            let x = parseFloat(target.getAttribute("data-x")) || 0;
            let y = parseFloat(target.getAttribute("data-y")) || 0;

            // Update the element's style
            target.style.width = `${event.rect.width}px`;
            target.style.height = `${event.rect.height}px`;

            // Translate when resizing from top or left edges
            x += event.deltaRect.left;
            y += event.deltaRect.top;

            target.style.webkitTransform =
                target.style.transform = `translate(${x}px,${y}px)`;

            target.setAttribute("data-x", x);
            target.setAttribute("data-y", y);
        });

    interact("#rightContainer")
        .resizable({
            // Enable resize from left edge
            edges: { left: true, right: true },

            // Set minimum size
            restrictSize: {
                min: { width: 100 },
            },
        })
        .on("resizemove", (event) => {
            const target = event.target;
            let x = parseFloat(target.getAttribute("data-x")) || 0;

            // Update the element's style
            target.style.width = `${event.rect.width}px`;

            // Translate when resizing from left edge
            x += event.deltaRect.left;

            target.style.webkitTransform =
                target.style.transform = `translate(${x}px)`;

            target.setAttribute("data-x", x);
        });

    interact("#info, #walks")
        .resizable({
            edges: { right: true }, // Enable resize from the right edge
            restrictSize: {
                min: { width: 100 }, // Set minimum width
            },
        })
        .on("resizemove", (event) => {
            const target = event.target;
            const newWidth = event.rect.width;

            // Update the width of the element
            target.style.width = `${newWidth}px`;

            // Update the right position to fill the right side of the screen
            target.style.right = "0";
        });
}
