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

    let html = '';

    if (type === "Node") {
        // Compact header
        html += `
        <div class="info-header-compact">
          <i class="bi bi-circle-fill"></i>
          <h4>Node: ${data.name || data.id || "Unknown"}</h4>
          <span class="info-id">${data.id || ""}</span>
        </div>`;

        // Basic stats
        html += `
        <div class="info-section">
          <div class="info-stats">
            <div class="info-stat"><i class="bi bi-diagram-3"></i> <strong>${element.connectedEdges().length}</strong> edges</div>
            <div class="info-stat"><i class="bi bi-arrow-down-left"></i> <strong>${element.indegree()}</strong> in</div>
            <div class="info-stat"><i class="bi bi-arrow-up-right"></i> <strong>${element.outdegree()}</strong> out</div>
          </div>
        </div>`;

        // Genomic location (if available)
        if (data.chrom || data.ref_start || data.ref_end) {
            const length = data.ref_start && data.ref_end ? data.ref_end - data.ref_start + 1 : null;
            const strandClass = data.strand === '+' ? 'strand-plus' : data.strand === '-' ? 'strand-minus' : 'strand-na';
            html += `
        <div class="info-section">
          <div class="info-section-title"><i class="bi bi-geo-alt-fill"></i> Genomic Location</div>
          <div class="genomic-bar">
            <span class="genomic-badge chrom">${data.chrom || "N/A"}</span>
            <span class="genomic-badge ${strandClass}">${data.strand === '+' ? '+ Forward' : data.strand === '-' ? '- Reverse' : 'N/A'}</span>
          </div>
          <div class="position-grid">
            <div><div class="pos-val">${data.ref_start?.toLocaleString() || "N/A"}</div><div class="pos-label">Start</div></div>
            <div><div class="pos-val">${data.ref_end?.toLocaleString() || "N/A"}</div><div class="pos-label">End</div></div>
            <div><div class="pos-val">${length ? length.toLocaleString() : "N/A"}</div><div class="pos-label">${length ? 'Length (bp)' : 'Length'}</div></div>
          </div>
        </div>`;
        }

        // PTC/PTF metrics (if available)
        if (data.ptc !== undefined || data.ptf !== undefined) {
            html += `
        <div class="info-section">
          <div class="info-section-title"><i class="bi bi-bar-chart-fill"></i> Expression Metrics</div>
          <div class="metrics-row">
            <div class="metric-chip">
              <div><div class="metric-label">PTC</div><div class="metric-value ptc">${data.ptc !== undefined ? data.ptc.toFixed(4) : "N/A"}</div></div>
            </div>
            <div class="metric-chip">
              <div><div class="metric-label">PTF</div><div class="metric-value ptf">${data.ptf !== undefined ? data.ptf.toFixed(4) : "N/A"}</div></div>
            </div>
          </div>
        </div>`;
        }

        // Exon structure (if available)
        if (data.exons) {
            html += `
        <div class="info-section">
          <div class="card exons-card">
            <div class="card-header card-header-accent d-flex justify-content-between align-items-center">
              <span><i class="bi bi-diagram-2-fill me-1"></i> Exon Structure</span>
              <button class="btn btn-sm exon-visualize-btn" data-exons="${data.exons.replace(/"/g, '&quot;')}">
                <i class="bi bi-bar-chart-line-fill me-1"></i> Visualize
              </button>
            </div>
            <div class="card-body p-0">
              <div class="exon-list-container">${formatExons(data.exons)}</div>
            </div>
          </div>
        </div>`;

            // Wire up exon visualization button
            setTimeout(() => {
                const buttons = document.querySelectorAll('.exon-visualize-btn');
                buttons.forEach(btn => {
                    if (!btn.hasAttribute('data-listener-added')) {
                        btn.setAttribute('data-listener-added', 'true');
                        btn.addEventListener('click', function() {
                            const exonsData = this.getAttribute('data-exons');
                            const chromosomeInfo = {
                                chrom: data.chrom || null,
                                strand: data.strand || null,
                                start: data.ref_start || null,
                                end: data.ref_end || null
                            };
                            import('./exonVisualization.js').then(module => {
                                module.showExonVisualizationModal(exonsData, "Node Structure", chromosomeInfo);
                            });
                        });
                    }
                });
            }, 100);
        }
    } else {
        // Edge — compact header
        html += `
        <div class="info-header-compact">
          <i class="bi bi-arrow-right-circle-fill"></i>
          <h4>Edge</h4>
          <span class="info-id">${data.id || ""}</span>
        </div>`;

        // Edge flow visualization
        html += `
        <div class="info-section">
          <div class="edge-flow">
            <div class="edge-endpoint">
              <div class="ep-label">Source</div>
              <code>${data.source || "N/A"}</code>
            </div>
            <div class="edge-arrow">
              <i class="bi bi-arrow-right"></i>
              ${data.weight ? `<span class="weight-tag">${data.weight}</span>` : ''}
            </div>
            <div class="edge-endpoint">
              <div class="ep-label">Target</div>
              <code>${data.target || "N/A"}</code>
            </div>
          </div>
        </div>`;
    }

    // Additional properties
    const standardProps =
        type === "Node" ? [
            "id", "name", "chrom", "ref_start", "ref_end", "strand",
            "exons", "ptc", "ptf", "node_id", "is_head", "value",
            "source-node", "geneAnnotations", "gene_name",
        ] : ["id", "source", "target", "weight"];
    const additionalProps = Object.keys(data).filter(
        (key) => !standardProps.includes(key)
    );

    if (additionalProps.length > 0) {
        html += `
        <div class="info-section">
          <div class="info-section-title"><i class="bi bi-list-ul"></i> Properties <span class="badge bg-secondary ms-1">${additionalProps.length}</span></div>`;
        additionalProps.forEach(key => {
            html += `
          <div class="prop-row">
            <span class="prop-key">${key}</span>
            <span class="prop-val">${formatValue(data[key], key)}</span>
          </div>`;
        });
        html += `</div>`;
    }

    container.innerHTML = html;

    // Render gene annotations for nodes
    if (type === "Node") {
        renderGeneAnnotations(element, container);
    }
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
/* addInfoPanelStyles() removed — styles now in src/styles/components/info-panel.css */

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
