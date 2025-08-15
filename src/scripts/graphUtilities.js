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
    <div class="info-header-modern mb-4">
      <div class="info-title-card">
        <div class="info-icon ${type.toLowerCase()}-icon">
          <i class="bi ${
            type === "Node" ? "bi-circle-fill" : "bi-arrow-right-circle-fill"
          }"></i>
        </div>
        <div class="info-title-content">
          <h4 class="info-main-title">${type} Information</h4>
          <p class="info-subtitle">Detailed ${type.toLowerCase()} properties and relationships</p>
        </div>
      </div>
    </div>
    <div class="info-body">
  `;

    // ID and basic info section
    html += `
    <div class="card mb-3">
      <div class="card-header bg-gradient-primary text-white d-flex align-items-center">
        <i class="bi bi-info-circle-fill me-2"></i>
        <strong>Basic Information</strong>
      </div>
      <div class="card-body">
        <div class="info-field mb-3">
          <i class="bi bi-hash text-primary me-2"></i>
          <span class="field-label">ID:</span>
          <code class="field-value text-muted">${data.id || "Not available"}</code>
        </div>
  `;

    if (type === "Node") {
        html += `

        <div class="row g-2 mb-2">
          <div class="col-12">
            <div class="info-field">
              <i class="bi bi-tag-fill text-primary me-2"></i>
              <span class="field-label">Name:</span>
              <span class="field-value badge bg-light text-dark">${
                data.name || data.id || "Not available"
              }</span>
            </div>
          </div>
        </div>
        
        <div class="row g-2">
          <div class="col-6">
            <div class="stat-card text-center p-2 bg-light rounded">
              <i class="bi bi-diagram-3 text-info mb-1"></i>
              <div class="stat-number">${element.connectedEdges().length}</div>
              <div class="stat-label">Connections</div>
            </div>
          </div>
          <div class="col-6">
            <div class="stat-card text-center p-2 bg-light rounded">
              <i class="bi bi-arrows text-success mb-1"></i>
              <div class="stat-number">${element.indegree()}/${element.outdegree()}</div>
              <div class="stat-label">In/Out Degree</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    `;

        // Genomic information section (if available)
        if (data.chrom || data.ref_start || data.ref_end) {
            const length = data.ref_start && data.ref_end ? data.ref_end - data.ref_start + 1 : null;
            html += `
        <div class="card mb-3 genomic-card">
          <div class="card-header bg-gradient-primary text-white d-flex align-items-center">
            <i class="bi bi-geo-alt-fill me-2"></i>
            <strong>Genomic Location</strong>
          </div>
          <div class="card-body p-3">
            <div class="row g-3">
              <div class="col-6">
                <div class="genomic-field">
                  <i class="bi bi-diagram-2 text-primary me-2"></i>
                  <div class="field-content">
                    <div class="field-label">Chromosome</div>
                    <div class="field-value chromosome-badge">${data.chrom || "N/A"}</div>
                  </div>
                </div>
              </div>
              <div class="col-6">
                <div class="genomic-field">
                  <i class="bi bi-arrow-${data.strand === '+' ? 'right' : data.strand === '-' ? 'left' : 'left-right'} text-${data.strand === '+' ? 'success' : data.strand === '-' ? 'warning' : 'secondary'} me-2"></i>
                  <div class="field-content">
                    <div class="field-label">Strand</div>
                    <div class="field-value strand-badge strand-${data.strand || 'unknown'}">${data.strand || "N/A"}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="position-info mt-3 p-3 bg-light rounded">
              <div class="row g-2 text-center">
                <div class="col-4">
                  <div class="position-stat">
                    <div class="position-number">${data.ref_start?.toLocaleString() || "N/A"}</div>
                    <div class="position-label">Start</div>
                  </div>
                </div>
                <div class="col-4">
                  <div class="position-stat">
                    <div class="position-number">${data.ref_end?.toLocaleString() || "N/A"}</div>
                    <div class="position-label">End</div>
                  </div>
                </div>
                <div class="col-4">
                  <div class="position-stat">
                    <div class="position-number ${length ? 'text-info' : ''}">${length ? length.toLocaleString() : "N/A"}</div>
                    <div class="position-label">Length${length ? ' (bp)' : ''}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
        }

        // PTC/PTF information section (if available)
        if (data.ptc !== undefined || data.ptf !== undefined) {
            html += `
        <div class="card mb-3 metrics-card">
          <div class="card-header bg-gradient-info text-white d-flex align-items-center">
            <i class="bi bi-bar-chart-fill me-2"></i>
            <strong>Expression Metrics</strong>
          </div>
          <div class="card-body p-3">
            <div class="row g-3">
              <div class="col-6">
                <div class="metric-stat-card">
                  <div class="metric-icon mb-2">
                    <i class="bi bi-pie-chart-fill text-primary"></i>
                  </div>
                  <div class="metric-content">
                    <div class="metric-label">PTC</div>
                    <div class="metric-value ptc-value">${
                      data.ptc !== undefined ? data.ptc.toFixed(4) : "N/A"
                    }</div>
                    <div class="metric-description">Path Traversal Count</div>
                  </div>
                </div>
              </div>
              <div class="col-6">
                <div class="metric-stat-card">
                  <div class="metric-icon mb-2">
                    <i class="bi bi-graph-up text-success"></i>
                  </div>
                  <div class="metric-content">
                    <div class="metric-label">PTF</div>
                    <div class="metric-value ptf-value">${
                      data.ptf !== undefined ? data.ptf.toFixed(4) : "N/A"
                    }</div>
                    <div class="metric-description">Path Traversal Fraction</div>
                  </div>
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
              <button class="btn btn-sm btn-light border exon-visualize-btn" data-exons="${data.exons.replace(/"/g, '&quot;')}">
                <i class="bi bi-bar-chart-line-fill me-1"></i> Visualize
              </button>
            `;

            html += `
        <div class="card mb-3 exons-card">
          <div class="card-header bg-gradient-success text-white d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
              <i class="bi bi-diagram-2-fill me-2"></i>
              <strong>Exon Structure</strong>
            </div>
            ${visualizeBtn}
          </div>
          <div class="card-body p-0">
            <div class="exon-list-container">
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
        <div class="edge-connection mb-3">
          <div class="connection-flow d-flex align-items-center justify-content-center">
            <div class="node-endpoint">
              <i class="bi bi-circle-fill text-success"></i>
              <div class="endpoint-label">Source</div>
              <code class="endpoint-id">${data.source || "N/A"}</code>
            </div>
            
            <div class="flow-arrow mx-3">
              <i class="bi bi-arrow-right text-primary" style="font-size: 1.5rem;"></i>
              ${data.weight ? `<div class="weight-badge badge bg-primary mt-1 fw-bold">${data.weight}</div>` : ''}
              ${data.weight ? `<div class="weight-label">Weight</div>` : ''}
            </div>
            
            <div class="node-endpoint">
              <i class="bi bi-circle-fill text-danger"></i>
              <div class="endpoint-label">Target</div>
              <code class="endpoint-id">${data.target || "N/A"}</code>
            </div>
          </div>
        </div>
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
      <div class="card mb-3 additional-props-card">
        <div class="card-header bg-gradient-secondary text-white d-flex align-items-center">
          <i class="bi bi-list-ul me-2"></i>
          <strong>Additional Properties</strong>
          <span class="badge bg-light text-dark ms-2">${additionalProps.length}</span>
        </div>
        <div class="card-body p-3">
    `;

        additionalProps.forEach((key, index) => {
            const isLast = index === additionalProps.length - 1;
            html += `
          <div class="property-row ${!isLast ? 'border-bottom' : ''} pb-3 ${!isLast ? 'mb-3' : ''}">
            <div class="property-header mb-2">
              <i class="bi bi-chevron-right text-primary me-1"></i>
              <span class="property-name">${key}</span>
            </div>
            <div class="property-content">
              ${formatValue(data[key], key)}
            </div>
          </div>
      `;
        });

        html += `
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
 * List of property names that should be formatted as tables when they contain arrays or lists
 */
const TABLE_APPROVED_PROPERTIES = [
    "read_ids",
    "reads"
];

/**
 * Format a data value for display
 * @param {any} value - The value to format
 * @param {string} propertyName - Name of the property being formatted (optional)
 * @returns {string} Formatted value as string
 */
function formatValue(value, propertyName = null) {
    if (value === undefined || value === null) return "N/A";

    if (typeof value === "boolean") {
        return value ? "Yes" : "No";
    }

    // Only format as tables if this property is approved for table formatting
    const isApprovedForTable = !propertyName || TABLE_APPROVED_PROPERTIES.includes(propertyName);
    
    if (isApprovedForTable) {
        // Check if value is an array (must come before generic object check)
        if (Array.isArray(value)) {
            return formatArrayTable(value, propertyName);
        }
        
        // Check if value is a string representation of an array (e.g., ["a", "b"] or ['a', 'b'])
        if (typeof value === "string" && isArrayString(value)) {
            try {
                const parsedArray = parseArrayString(value);
                return formatArrayTable(parsedArray, propertyName);
            } catch (e) {
                console.warn("Failed to parse array string:", value, e);
                return String(value);
            }
        }
        
        // Check if value is a comma-separated string (fallback for non-array format)
        if (typeof value === "string" && value.includes(",") && value.split(",").length > 1) {
            const items = value.split(",").map(item => item.trim()).filter(item => item.length > 0);
            if (items.length > 1) {
                return formatArrayTable(items, propertyName);
            }
        }
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
 * @param {string} propertyName - Name of the property for export purposes
 * @returns {string} HTML table representation
 */
function formatArrayTable(array, propertyName = null) {
    if (!Array.isArray(array) || array.length === 0) return "No items found";

    let tableId = `table-${Math.random().toString(36).substr(2, 9)}`;
    const isExportable = propertyName && TABLE_APPROVED_PROPERTIES.includes(propertyName);
    
    let html = `
        <div class="comma-separated-table">
            <div class="table-header d-flex justify-content-between align-items-center mb-2">
                <span class="table-title text-muted">${array.length} items</span>
                ${isExportable ? `
                <button class="btn btn-sm btn-outline-primary export-btn" 
                        data-export-data="${JSON.stringify(array).replace(/"/g, '&quot;')}"
                        data-export-name="${propertyName}"
                        title="Export all items to text file">
                    <i class="bi bi-download me-1"></i>Export TXT
                </button>
                ` : ''}
            </div>
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

    // Add event listeners for copy and export buttons after a delay
    setTimeout(() => {
        addCopyButtonListeners();
        addExportButtonListeners();
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
 * Add event listeners for export buttons
 */
function addExportButtonListeners() {
    const exportButtons = document.querySelectorAll('.export-btn:not([data-listener-added])');
    
    exportButtons.forEach(button => {
        button.setAttribute('data-listener-added', 'true');
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            const exportDataStr = this.getAttribute('data-export-data');
            const exportName = this.getAttribute('data-export-name');
            const icon = this.querySelector('i');
            const originalClass = icon.className;
            const buttonText = this.innerHTML;
            
            try {
                const exportData = JSON.parse(exportDataStr);
                
                // Create text content with each item on a new line
                const textContent = exportData.join('\n');
                
                // Create blob and download
                const blob = new Blob([textContent], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                
                // Create temporary download link
                const downloadLink = document.createElement('a');
                downloadLink.href = url;
                downloadLink.download = `${exportName}_export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
                
                // Trigger download
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                
                // Clean up the URL
                URL.revokeObjectURL(url);
                
                // Visual feedback
                icon.className = 'bi bi-check-lg';
                this.innerHTML = `<i class="bi bi-check-lg me-1"></i>Exported!`;
                this.classList.remove('btn-outline-primary');
                this.classList.add('btn-success');
                
                // Reset after 3 seconds
                setTimeout(() => {
                    this.innerHTML = buttonText;
                    this.classList.remove('btn-success');
                    this.classList.add('btn-outline-primary');
                }, 3000);
                
            } catch (err) {
                console.error('Failed to export data: ', err);
                
                // Error feedback
                icon.className = 'bi bi-x-lg';
                this.innerHTML = `<i class="bi bi-x-lg me-1"></i>Failed`;
                this.classList.remove('btn-outline-primary');
                this.classList.add('btn-danger');
                
                // Reset after 3 seconds
                setTimeout(() => {
                    this.innerHTML = buttonText;
                    this.classList.remove('btn-danger');
                    this.classList.add('btn-outline-primary');
                }, 3000);
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
      
      /* Modern header styling */
      #infoContent .info-header-modern {
        background: linear-gradient(135deg, #f8f9fa, #e9ecef);
        border-radius: 0.75rem;
        padding: 1.5rem;
        border: 1px solid #dee2e6;
        position: relative;
        overflow: hidden;
      }
      #infoContent .info-header-modern::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #007bff, #28a745, #17a2b8);
      }
      #infoContent .info-title-card {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      #infoContent .info-icon {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        color: white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      #infoContent .node-icon {
        background: linear-gradient(135deg, #007bff, #0056b3);
      }
      #infoContent .edge-icon {
        background: linear-gradient(135deg, #28a745, #1e7e34);
      }
      #infoContent .info-title-content {
        flex: 1;
      }
      #infoContent .info-main-title {
        font-size: 1.75rem;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 0.25rem;
        line-height: 1.2;
      }
      #infoContent .info-subtitle {
        font-size: 0.95rem;
        color: #6c757d;
        margin-bottom: 0;
        font-style: italic;
      }
      
      /* Modern info field styling */
      #infoContent .info-field {
        display: flex;
        align-items: center;
        margin-bottom: 0.5rem;
      }
      #infoContent .field-label {
        font-weight: 600;
        color: #495057;
        margin-right: 0.5rem;
      }
      #infoContent .field-value {
        font-weight: 500;
      }
      
      /* Stat cards */
      #infoContent .stat-card {
        transition: all 0.3s ease;
        border: 1px solid #e9ecef;
      }
      #infoContent .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        border-color: #007bff;
      }
      #infoContent .stat-number {
        font-size: 1.25rem;
        font-weight: 700;
        color: #2c3e50;
      }
      #infoContent .stat-label {
        font-size: 0.875rem;
        color: #6c757d;
        font-weight: 500;
      }
      
      /* Genomic card styling */
      #infoContent .genomic-card .card-header {
        background: linear-gradient(135deg, #007bff, #0056b3) !important;
        border: none;
      }
      #infoContent .genomic-field {
        display: flex;
        align-items: flex-start;
        padding: 0.5rem;
        border-radius: 0.375rem;
        transition: background-color 0.2s ease;
      }
      #infoContent .genomic-field:hover {
        background-color: rgba(0,123,255,0.05);
      }
      #infoContent .field-content {
        flex: 1;
      }
      #infoContent .field-content .field-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #6c757d;
        margin-bottom: 0.25rem;
      }
      #infoContent .chromosome-badge {
        background: linear-gradient(45deg, #28a745, #20c997);
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 1rem;
        font-weight: 600;
        font-size: 0.875rem;
      }
      #infoContent .strand-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 0.375rem;
        font-weight: 600;
        font-size: 0.875rem;
      }
      #infoContent .strand-+ {
        background-color: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
      }
      #infoContent .strand-- {
        background-color: #fff3cd;
        color: #856404;
        border: 1px solid #ffeaa7;
      }
      #infoContent .strand-unknown {
        background-color: #e2e3e5;
        color: #383d41;
        border: 1px solid #ced4da;
      }
      #infoContent .position-info {
        border-left: 4px solid #007bff;
      }
      #infoContent .position-stat {
        padding: 0.5rem;
      }
      #infoContent .position-number {
        font-size: 1.1rem;
        font-weight: 700;
        color: #2c3e50;
        font-family: 'Courier New', monospace;
      }
      #infoContent .position-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #6c757d;
        margin-top: 0.25rem;
      }
      
      /* Edge connection styling */
      #infoContent .edge-connection {
        background: linear-gradient(135deg, #f8f9fa, #e9ecef);
        border-radius: 0.5rem;
        padding: 1.5rem;
        border: 1px solid #dee2e6;
      }
      #infoContent .node-endpoint {
        text-align: center;
        padding: 0.75rem;
        background: white;
        border-radius: 0.5rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        min-width: 120px;
      }
      #infoContent .endpoint-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #6c757d;
        margin: 0.5rem 0 0.25rem 0;
        font-weight: 600;
      }
      #infoContent .endpoint-id {
        background-color: #f8f9fa;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.875rem;
        color: #495057;
      }
      #infoContent .flow-arrow {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      #infoContent .weight-badge {
        font-size: 0.875rem;
        font-weight: 700;
        padding: 0.375rem 0.75rem;
        border-radius: 0.5rem;
      }
      #infoContent .weight-label {
        font-size: 0.625rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #6c757d;
        margin-top: 0.25rem;
        font-weight: 600;
      }
      #infoContent .edge-stats {
        border-left: 4px solid #17a2b8;
        background: linear-gradient(135deg, #e7f3ff, #f0f8ff);
      }
      #infoContent .stat-icon {
        opacity: 0.8;
      }
      
      /* Table header and export button styling */
      #infoContent .table-header {
        padding: 0.5rem 0;
        border-bottom: 1px solid #e9ecef;
        margin-bottom: 0.75rem !important;
      }
      #infoContent .table-title {
        font-size: 0.875rem;
        font-weight: 500;
      }
      #infoContent .export-btn {
        transition: all 0.3s ease;
        font-size: 0.8rem;
        font-weight: 500;
        border-radius: 0.375rem;
        padding: 0.375rem 0.75rem;
      }
      #infoContent .export-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0,123,255,0.2);
      }
      #infoContent .export-btn i {
        font-size: 0.875rem;
      }
      
      /* Consistent card header styling */
      #infoContent .card-header.bg-gradient-primary {
        background: linear-gradient(135deg, #007bff, #0056b3) !important;
        border: none;
      }
      #infoContent .metrics-card .card-header {
        background: linear-gradient(135deg, #17a2b8, #138496) !important;
        border: none;
      }
      #infoContent .exons-card .card-header {
        background: linear-gradient(135deg, #28a745, #1e7e34) !important;
        border: none;
      }
      #infoContent .additional-props-card .card-header {
        background: linear-gradient(135deg, #6c757d, #545b62) !important;
        border: none;
      }
      
      /* PTC/PTF metrics styling */
      #infoContent .metric-stat-card {
        text-align: center;
        padding: 1rem;
        background: white;
        border-radius: 0.5rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        transition: all 0.3s ease;
        border: 1px solid #e9ecef;
      }
      #infoContent .metric-stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        border-color: #007bff;
      }
      #infoContent .metric-icon {
        font-size: 1.25rem;
      }
      #infoContent .metric-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #6c757d;
        font-weight: 600;
        margin-bottom: 0.5rem;
      }
      #infoContent .metric-value {
        font-size: 1.5rem;
        font-weight: 700;
        font-family: 'Courier New', monospace;
        margin-bottom: 0.25rem;
      }
      #infoContent .ptc-value {
        color: #007bff;
      }
      #infoContent .ptf-value {
        color: #28a745;
      }
      #infoContent .metric-description {
        font-size: 0.625rem;
        color: #868e96;
        font-style: italic;
      }
      
      /* Exons section styling */
      #infoContent .exon-list-container {
        max-height: 250px;
        overflow-y: auto;
      }
      #infoContent .exons-card .exon-visualize-btn {
        background-color: rgba(255, 255, 255, 0.9);
        border-color: rgba(255, 255, 255, 0.5);
        color: #28a745;
        font-weight: 600;
        transition: all 0.3s ease;
      }
      #infoContent .exons-card .exon-visualize-btn:hover {
        background-color: white;
        border-color: white;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }
      
      /* Additional properties styling */
      #infoContent .property-row {
        border-color: #e9ecef !important;
      }
      #infoContent .property-header {
        display: flex;
        align-items: center;
      }
      #infoContent .property-name {
        font-weight: 600;
        color: #495057;
        text-transform: capitalize;
        font-size: 0.95rem;
      }
      #infoContent .property-content {
        margin-left: 1rem;
      }
      
      /* Consistent spacing for all cards */
      #infoContent .card {
        border: none;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        border-radius: 0.5rem;
        overflow: hidden;
      }
      #infoContent .card-header {
        font-weight: 600;
        font-size: 0.95rem;
        padding: 0.75rem 1rem;
        border-bottom: none;
      }
      #infoContent .card-body {
        padding: 1rem;
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
