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

                            // Get chromosome info from the node data
                            const chromosomeInfo = {
                                chrom: data.chrom || null,
                                strand: data.strand || null,
                                start: data.ref_start || null,
                                end: data.ref_end || null
                            };

                            import ('./exonVisualization.js').then(module => {
                                module.showExonVisualizationModal(exonsData, "Node Structure", chromosomeInfo);
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

    // Check if value is an array (must come before generic object check)
    if (Array.isArray(value)) {
        return formatArrayTable(value);
    }

    if (typeof value === "object") {
        try {
            return `<pre class="code-block">${JSON.stringify(value, null, 2)}</pre>`;
        } catch (e) {
            return String(value);
        }
    }
    
    // Check if value is a string representation of an array (e.g., ["a", "b"] or ['a', 'b'])
    if (typeof value === "string" && isArrayString(value)) {
        try {
            const parsedArray = parseArrayString(value);
            return formatArrayTable(parsedArray);
        } catch (e) {
            console.warn("Failed to parse array string:", value, e);
            return String(value);
        }
    }
    
    // Check if value is a comma-separated string (fallback for non-array format)
    if (typeof value === "string" && value.includes(",") && value.split(",").length > 1) {
        const items = value.split(",").map(item => item.trim()).filter(item => item.length > 0);
        if (items.length > 1) {
            return formatArrayTable(items);
        }
    }

    return String(value);
}

/**
 * Check if a string represents an array (e.g., ["a"], ["a", "b"] or ['a', 'b'])
 * @param {string} str - String to check
 * @returns {boolean} True if string appears to be an array representation
 */
function isArrayString(str) {
    const trimmed = str.trim();
    return (trimmed.startsWith('[') && trimmed.endsWith(']'));
}

/**
 * Parse array string into actual array
 * @param {string} str - String representation of array
 * @returns {Array} Parsed array
 */
function parseArrayString(str) {
    const trimmed = str.trim();
    
    try {
        // Try JSON.parse first for proper JSON arrays
        return JSON.parse(trimmed);
    } catch (e) {
        // Fallback: manual parsing for less strict formats
        const content = trimmed.slice(1, -1); // Remove brackets
        if (content.trim() === '') return [];
        
        // Split by comma and clean up each item
        return content.split(',').map(item => {
            item = item.trim();
            // Remove quotes if present
            if ((item.startsWith('"') && item.endsWith('"')) || 
                (item.startsWith("'") && item.endsWith("'"))) {
                item = item.slice(1, -1);
            }
            return item;
        }).filter(item => item.length > 0);
    }
}

/**
 * Format array as a table with copy buttons
 * @param {Array} array - Array to format
 * @returns {string} HTML table representation
 */
function formatArrayTable(array) {
    if (!Array.isArray(array) || array.length === 0) return "No items found";

    let tableId = `table-${Math.random().toString(36).substr(2, 9)}`;
    
    let html = `
        <div class="comma-separated-table">
            <table class="table table-sm table-striped" id="${tableId}">
                <thead>
                    <tr>
                        <th scope="col">#</th>
                        <th scope="col">Value</th>
                        <th scope="col">Action</th>
                    </tr>
                </thead>
                <tbody>
    `;

    array.forEach((item, index) => {
        const itemId = `item-${tableId}-${index}`;
        const displayValue = typeof item === 'object' ? JSON.stringify(item) : String(item);
        const copyValue = displayValue;
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td class="item-value" id="${itemId}">${displayValue}</td>
                <td>
                    <button class="btn btn-sm btn-outline-secondary copy-btn" 
                            data-copy-text="${copyValue.replace(/"/g, '&quot;')}" 
                            title="Copy to clipboard">
                        <i class="bi bi-clipboard"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    // Add event listeners for copy buttons after a delay
    setTimeout(() => {
        addCopyButtonListeners();
    }, 100);

    return html;
}

/**
 * Add event listeners for copy buttons
 */
function addCopyButtonListeners() {
    const copyButtons = document.querySelectorAll('.copy-btn:not([data-listener-added])');
    
    copyButtons.forEach(button => {
        button.setAttribute('data-listener-added', 'true');
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const textToCopy = this.getAttribute('data-copy-text');
            const icon = this.querySelector('i');
            const originalClass = icon.className;
            
            try {
                // Use modern clipboard API if available
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(textToCopy);
                } else {
                    // Fallback for older browsers
                    const textarea = document.createElement('textarea');
                    textarea.value = textToCopy;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                }
                
                // Visual feedback
                icon.className = 'bi bi-check-lg';
                this.classList.remove('btn-outline-secondary');
                this.classList.add('btn-success');
                
                // Reset after 2 seconds
                setTimeout(() => {
                    icon.className = originalClass;
                    this.classList.remove('btn-success');
                    this.classList.add('btn-outline-secondary');
                }, 2000);
                
            } catch (err) {
                console.error('Failed to copy text: ', err);
                
                // Error feedback
                icon.className = 'bi bi-x-lg';
                this.classList.remove('btn-outline-secondary');
                this.classList.add('btn-danger');
                
                // Reset after 2 seconds
                setTimeout(() => {
                    icon.className = originalClass;
                    this.classList.remove('btn-danger');
                    this.classList.add('btn-outline-secondary');
                }, 2000);
            }
        });
    });
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
      #infoContent .comma-separated-table {
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid #dee2e6;
        border-radius: 0.375rem;
      }
      #infoContent .comma-separated-table .table {
        margin-bottom: 0;
        font-size: 0.875rem;
      }
      #infoContent .comma-separated-table .table th {
        background-color: #f8f9fa;
        border-top: none;
        padding: 0.5rem;
        font-weight: 600;
      }
      #infoContent .comma-separated-table .table td {
        padding: 0.5rem;
        vertical-align: middle;
      }
      #infoContent .copy-btn {
        transition: all 0.2s ease;
        border-radius: 0.25rem;
      }
      #infoContent .copy-btn:hover {
        transform: scale(1.05);
      }
      #infoContent .item-value {
        word-break: break-all;
        font-family: 'Courier New', monospace;
        background-color: #f8f9fa;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
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
