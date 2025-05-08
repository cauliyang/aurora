import interact from "interactjs";
import { STATE } from "./graph";
import { renderGeneAnnotations } from "./geneAnnotation";

import "jsoneditor/dist/jsoneditor.min.css";

export function dfs(node, currentPath, sinkNodes, isPathValid = true) {
    if (!isPathValid) return;

    currentPath.push(node);

    if (sinkNodes.includes(node) && currentPath.length >= STATE.minPathLength) {
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

// Update or add this function to improve the info display
export function setupClickEvent() {
    const { cy, previousClickedElement } = STATE;
    const infoContent = document.getElementById("infoContent");

    cy.on("tap", "node, edge", function(evt) {
        const element = evt.target;

        // Reset previous styles
        if (previousClickedElement) {
            previousClickedElement.removeClass("selected");
        }

        // Add selected class to current element
        element.addClass("selected");

        // Store as previous element for next click
        STATE.previousClickedElement = element;

        // Show element information in the info panel
        displayElementInfo(element, infoContent);
    });
}

/**
 * Display detailed information about a node or edge in a formatted way
 * @param {Object} element - The Cytoscape node or edge element
 * @param {HTMLElement} container - The HTML container to show the information
 */
export function displayElementInfo(element, container) {
    const type = element.isNode() ? "Node" : "Edge";
    const data = element.data();

    let html = `
    <div class="info-header">
      <h4 class="mb-3 ${type.toLowerCase()}-title">
        <i class="bi ${
          type === "Node" ? "bi-circle-fill" : "bi-arrow-right"
        }"></i>
        ${type} Information
      </h4>
    </div>
    <div class="info-body">
  `;

    // ID and basic info section
    html += `
    <div class="card mb-3">
      <div class="card-header bg-light">
        <strong>Basic Information</strong>
      </div>
      <div class="card-body">
        <p class="mb-1"><strong>ID:</strong> ${data.id || "Not available"}</p>
  `;

    if (type === "Node") {
        html += `
        <p class="mb-1"><strong>Name:</strong> ${
          data.name || data.id || "Not available"
        }</p>
        <p class="mb-1"><strong>Connections:</strong> ${
          element.connectedEdges().length
        } edges</p>
        <p class="mb-1"><strong>Degree:</strong> In: ${element.indegree()} / Out: ${element.outdegree()}</p>
      </div>
    </div>
    `;

        // Genomic information section (if available)
        if (data.chrom || data.ref_start || data.ref_end) {
            html += `
        <div class="card mb-3">
          <div class="card-header bg-light">
            <strong>Genomic Location</strong>
          </div>
          <div class="card-body">
            <p class="mb-1"><strong>Chromosome:</strong> ${
              data.chrom || "Not available"
            }</p>
            <p class="mb-1"><strong>Start:</strong> ${
              data.ref_start?.toLocaleString() || "Not available"
            }</p>
            <p class="mb-1"><strong>End:</strong> ${
              data.ref_end?.toLocaleString() || "Not available"
            }</p>
            <p class="mb-1"><strong>Strand:</strong> ${
              data.strand || "Not available"
            }</p>
          </div>
        </div>
      `;
        }

        // PTC/PTF information section (if available)
        if (data.ptc !== undefined || data.ptf !== undefined) {
            html += `
        <div class="card mb-3">
          <div class="card-header bg-light">
            <strong>Metrics</strong>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-6">
                <div class="metric-card text-center p-2 border rounded">
                  <h5>PTC</h5>
                  <span class="badge bg-primary">${
                    data.ptc?.toFixed(4) || "0"
                  }</span>
                </div>
              </div>
              <div class="col-6">
                <div class="metric-card text-center p-2 border rounded">
                  <h5>PTF</h5>
                  <span class="badge bg-secondary">${
                    data.ptf?.toFixed(4) || "0"
                  }</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
        }

        // Exons information if available
        if (data.exons) {
            // Create the visualization button
            const visualizeBtn = `
              <button class="btn btn-sm btn-primary ms-2 exon-visualize-btn" data-exons="${data.exons.replace(/"/g, '&quot;')}">
                <i class="bi bi-bar-chart-line-fill me-1"></i> Visualize
              </button>
            `;

            html += `
        <div class="card mb-3">
          <div class="card-header bg-light d-flex justify-content-between align-items-center">
            <strong>Exons</strong>
            ${visualizeBtn}
          </div>
          <div class="card-body p-0">
            <div class="exon-list">
              ${formatExons(data.exons)}
            </div>
          </div>
        </div>
      `;

            // Add event listener for the button after a small delay (to ensure DOM is ready)
            setTimeout(() => {
                const buttons = document.querySelectorAll('.exon-visualize-btn');
                buttons.forEach(btn => {
                    if (!btn.hasAttribute('data-listener-added')) {
                        btn.setAttribute('data-listener-added', 'true');
                        btn.addEventListener('click', function() {
                            const exonsData = this.getAttribute('data-exons');
                            import ('./exonVisualization.js').then(module => {
                                module.showExonVisualizationModal(exonsData);
                            });
                        });
                    }
                });
            }, 100);
        }
    } else {
        // Edge specific information
        html += `
        <p class="mb-1"><strong>Source:</strong> ${
          data.source || "Not available"
        }</p>
        <p class="mb-1"><strong>Target:</strong> ${
          data.target || "Not available"
        }</p>
        <p class="mb-1"><strong>Weight:</strong> <span class="badge bg-info">${
          data.weight || "Not available"
        }</span></p>
      </div>
    </div>
    `;
    }

    // Additional properties section for any other data
    const standardProps =
        type === "Node" ? [
            "id",
            "name",
            "chrom",
            "ref_start",
            "ref_end",
            "strand",
            "exons",
            "ptc",
            "ptf",
            "node_id",
            "is_head",
            "value",
            "source-node",
            "geneAnnotations",
        ] : ["id", "source", "target", "weight"];
    const additionalProps = Object.keys(data).filter(
        (key) => !standardProps.includes(key)
    );

    if (additionalProps.length > 0) {
        html += `
      <div class="card mb-3">
        <div class="card-header bg-light">
          <strong>Additional Properties</strong>
        </div>
        <div class="card-body">
          <dl class="row">
    `;

        additionalProps.forEach((key) => {
            html += `
        <dt class="col-sm-4">${key}:</dt>
        <dd class="col-sm-8">${formatValue(data[key])}</dd>
      `;
        });

        html += `
          </dl>
        </div>
      </div>
    `;
    }

    html += `</div>`;
    container.innerHTML = html;

    // If this is a node, render gene annotations
    if (type === "Node") {
        renderGeneAnnotations(element, container);
    }

    // Add custom styles for the info panel
    addInfoPanelStyles();
}

/**
 * Format exons string into a readable format
 * @param {string} exonsStr - String representing exons
 * @returns {string} HTML representation of exons
 */
function formatExons(exonsStr) {
    if (!exonsStr) return "No exon information available";

    // Try to parse the exons string which might be in format like "[start-end,start-end]"
    try {
        // Remove brackets and split by comma
        const exonList = exonsStr.replace(/^\[|\]$/g, "").split(",");

        if (exonList.length === 0) return "No exons found";

        let html = '<ul class="list-group list-group-flush">';

        exonList.forEach((exon, index) => {
            const [start, end] = exon.split("-").map(Number);
            const length = end - start + 1;

            html += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              Exon ${index + 1}
              <div>
                <span class="badge bg-secondary">${start.toLocaleString()}-${end.toLocaleString()}</span>
                <span class="badge bg-info">${length.toLocaleString()} bp</span>
              </div>
            </li>
            `;
        });
        html += `</ul>`;

        return html;
    } catch (e) {
        console.error("Error parsing exons:", e);
        return `<div class="alert alert-warning">Could not parse exon information: ${exonsStr}</div>`;
    }
}

/**
 * Format a data value for display
 * @param {any} value - The value to format
 * @returns {string} Formatted value as string
 */
function formatValue(value) {
    if (value === undefined || value === null) return "N/A";

    if (typeof value === "boolean") {
        return value ? "Yes" : "No";
    }

    if (typeof value === "object") {
        try {
            return `<pre class="code-block">${JSON.stringify(value, null, 2)}</pre>`;
        } catch (e) {
            return String(value);
        }
    }

    return String(value);
}

/**
 * Add custom styles to enhance the info panel
 */
function addInfoPanelStyles() {
    // Check if our styles are already added
    if (!document.getElementById("info-panel-styles")) {
        const style = document.createElement("style");
        style.id = "info-panel-styles";
        style.textContent = `
      #infoContent .info-header {
        border-bottom: 1px solid #e5e5e5;
        margin-bottom: 15px;
      }
      #infoContent .node-title {
        color: #007bff;
      }
      #infoContent .edge-title {
        color: #28a745;
      }
      #infoContent .card {
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      #infoContent .card-header {
        padding: 0.5rem 1rem;
      }
      #infoContent .metric-card {
        transition: all 0.3s ease;
      }
      #infoContent .metric-card:hover {
        background-color: #f8f9fa;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      }
      #infoContent .code-block {
        background: #f5f5f5;
        border-radius: 3px;
        padding: 5px;
        font-size: 0.875rem;
        max-height: 100px;
        overflow-y: auto;
        margin-bottom: 0;
      }
      #infoContent .exon-list {
        max-height: 200px;
        overflow-y: auto;
      }
    `;
        document.head.appendChild(style);
    }
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