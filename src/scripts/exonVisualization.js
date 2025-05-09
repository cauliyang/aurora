// exonVisualization.js
// D3.js-based visualization of exon-intron structures

// Function to create and display an exon-intron structure visualization
export function createExonVisualization(exonsStr, containerElement, chromosomeInfo = null) {
    if (!exonsStr || typeof exonsStr !== 'string') {
        containerElement.innerHTML = '<div class="alert alert-warning">No exon information available</div>';
        return;
    }

    try {
        // Parse the exons string which is in format like "[start-end,start-end]"
        const exonList = exonsStr.replace(/^\[|\]$/g, "").split(",");

        if (exonList.length === 0) {
            containerElement.innerHTML = '<div class="alert alert-warning">No exons found</div>';
            return;
        }

        // Get exon coordinates
        const exons = exonList.map(exon => {
            const [start, end] = exon.split("-").map(Number);
            return { start, end, length: end - start + 1 };
        });

        // Sort exons by start position
        exons.sort((a, b) => a.start - b.start);

        // Clear container first
        containerElement.innerHTML = '';

        // Create a simple container div for the visualization
        const visualizationContainer = document.createElement('div');
        visualizationContainer.className = 'exon-visualization-container';
        visualizationContainer.style.width = '100%';
        visualizationContainer.style.height = '300px';
        visualizationContainer.style.position = 'relative';
        containerElement.appendChild(visualizationContainer);

        // Now that we have the proper structure, load D3
        if (!window.d3) {
            loadD3().then(() => renderExonVisualization(exons, visualizationContainer, containerElement, chromosomeInfo));
        } else {
            renderExonVisualization(exons, visualizationContainer, containerElement, chromosomeInfo);
        }
    } catch (e) {
        console.error("Error parsing exons:", e);
        containerElement.innerHTML = `<div class="alert alert-warning">Could not parse exon information: ${exonsStr}</div>`;
    }
}

// Function to dynamically load D3.js
function loadD3() {
    return new Promise((resolve, reject) => {
        if (window.d3) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://d3js.org/d3.v7.min.js';
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
    });
}

// Function to render the exon-intron structure visualization using D3
function renderExonVisualization(exons, containerElement, parentContainer, chromosomeInfo = null) {
    // Calculate genomic range for scaling
    const minPos = Math.min(...exons.map(e => e.start));
    const maxPos = Math.max(...exons.map(e => e.end));
    const totalLength = maxPos - minPos + 1;

    // Set up dimensions - use the full width of the container
    const margin = { top: 45, right: 30, bottom: 50, left: 60 }; // Increased top margin for chromosome info
    const width = containerElement.clientWidth - margin.left - margin.right;
    const height = 180; // Increased height for better visualization

    // Create SVG container
    const svg = d3.select(containerElement)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .attr('class', 'exon-svg')
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add the combined header text in one line
    if (chromosomeInfo) {
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -5)
            .attr('text-anchor', 'middle')
            .attr('class', 'chromosome-info text-header')
            .text(`Total Exons: ${exons.length} | Chromosome ${chromosomeInfo.chrom}${chromosomeInfo.strand ? `, Strand: ${chromosomeInfo.strand}` : ''}`);
    } else {
        // If no chromosome info, just show exon count
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -5)
            .attr('text-anchor', 'middle')
            .attr('class', 'text-header')
            .style('font-size', '14px')
            .style('fill', '#666')
            .text(`Total Exons: ${exons.length}`);
    }

    const defs = svg.append('defs');

    // Create a scale for genomic positions
    const xScale = d3.scaleLinear()
        .domain([minPos, maxPos])
        .range([0, width]);

    // Create axis
    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d => d.toLocaleString())
        .ticks(Math.min(10, width / 100)); // Responsive number of ticks

    // Add genomic position axis with grid lines
    const xAxisGroup = svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height - 10})`)
        .call(xAxis);

    // Style the axis
    xAxisGroup.selectAll('text')
        .style('font-size', '10px')
        .style('font-weight', 'bold');

    xAxisGroup.selectAll('line')
        .style('stroke', '#ccc');

    xAxisGroup.selectAll('path')
        .style('stroke', '#ccc')
        .style('stroke-width', '2px');

    // Add axis label
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text('Genomic Position');

    // Add vertical grid lines
    svg.append('g')
        .attr('class', 'grid-lines')
        .selectAll('line')
        .data(xScale.ticks(10))
        .enter()
        .append('line')
        .attr('x1', d => xScale(d))
        .attr('y1', 0)
        .attr('x2', d => xScale(d))
        .attr('y2', height - 10)
        .attr('stroke', '#eee')
        .attr('stroke-width', 1);

    // Calculate total exon and intron length
    const totalExonLength = exons.reduce((sum, e) => sum + e.length, 0);
    const totalIntronLength = totalLength - totalExonLength;

    // Calculate introns between consecutive exons
    const introns = [];
    for (let i = 0; i < exons.length - 1; i++) {
        if (exons[i].end < exons[i + 1].start) {
            introns.push({
                start: exons[i].end + 1,
                end: exons[i + 1].start - 1,
                length: exons[i + 1].start - exons[i].end - 1,
                index: i
            });
        }
    }

    // Draw connecting line through the entire transcript
    svg.append('line')
        .attr('x1', xScale(minPos))
        .attr('y1', height / 2)
        .attr('x2', xScale(maxPos))
        .attr('y2', height / 2)
        .attr('stroke', '#ccc')
        .attr('stroke-width', 3);

    // Create pattern for introns
    const pattern = defs.append('pattern')
        .attr('id', 'intron-pattern')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 6)
        .attr('height', 6);

    pattern.append('path')
        .attr('d', 'M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2')
        .attr('stroke', '#999')
        .attr('stroke-width', 1);

    // Draw introns with animation
    const intronLines = svg.selectAll('.intron')
        .data(introns)
        .enter()
        .append('line')
        .attr('class', 'intron')
        .attr('x1', d => xScale(d.start))
        .attr('y1', height / 2)
        .attr('x2', d => xScale(d.start)) // Start from the same point for animation
        .attr('y2', height / 2)
        .attr('stroke', '#999')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '5,5');

    // Animate introns drawing
    intronLines.transition()
        .duration(1000)
        .delay((d, i) => i * 100)
        .attr('x2', d => xScale(d.end));

    // Define color schemes for exons
    const colorSchemes = [
        d3.interpolateBlues,
        d3.interpolateGreens,
        d3.interpolateOranges,
        d3.interpolatePurples
    ];

    // Use a consistent color scheme based on exon count
    const colorScheme = colorSchemes[exons.length % colorSchemes.length];
    const colorScale = d3.scaleSequential()
        .domain([0, exons.length - 1])
        .interpolator(colorScheme);

    // Create a group for each exon to hold both rectangle and label
    const exonGroups = svg.selectAll('.exon-group')
        .data(exons)
        .enter()
        .append('g')
        .attr('class', 'exon-group')
        .attr('transform', d => `translate(${xScale(d.start)}, ${height/2 - 20})`);

    // Draw exons (thick rectangles) with animation
    const exonHeight = 40; // Taller for better visibility
    const exonRects = exonGroups.append('rect')
        .attr('class', 'exon')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 0) // Start with 0 width for animation
        .attr('height', 0) // Start with 0 height for animation
        .attr('fill', (d, i) => colorScale(i))
        .attr('stroke', '#333')
        .attr('stroke-width', 2)
        .attr('rx', 6) // Rounded corners
        .attr('ry', 6);

    // Animation for exons growing
    exonRects.transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .attr('height', exonHeight)
        .transition()
        .duration(400)
        .attr('width', d => Math.max(6, xScale(d.end) - xScale(d.start))); // Ensure minimum width

    // Add exon number labels
    const exonLabels = exonGroups.append('text')
        .attr('class', 'exon-label')
        .attr('x', d => Math.max(3, (xScale(d.end) - xScale(d.start)) / 2)) // Center in the exon
        .attr('y', exonHeight / 2 + 5) // Center vertically
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-weight', 'bold')
        .attr('font-size', '12px')
        .attr('pointer-events', 'none') // Prevent label from interfering with mouse events
        .style('opacity', 0) // Hidden by default
        .text((d, i) => i + 1);

    // Remove animation for labels appearing since they'll be hidden by default

    // Add mouse interactions for exons
    exonGroups
        .on('mouseover', function(event, d) {
            const index = exons.indexOf(d);

            // Highlight exon on hover
            d3.select(this).select('rect')
                .transition()
                .duration(150)
                .attr('stroke-width', 2)
                .attr('stroke', '#ff7f0e');

            // Show the exon label
            d3.select(this).select('.exon-label')
                .transition()
                .duration(150)
                .style('opacity', 1);

            // Show tooltip with exon information
            const tooltip = d3.select('#tooltip');
            if (tooltip.empty()) {
                console.warn('Tooltip element not found');
                return;
            }

            tooltip.transition()
                .duration(200)
                .style('opacity', 1);

            tooltip.html(`
                <div class="exon-tooltip">
                    <h6 class="mb-1">Exon ${index + 1}</h6>
                    <p class="mb-1"><strong>Position:</strong> ${d.start.toLocaleString()}-${d.end.toLocaleString()}</p>
                    <p class="mb-1"><strong>Length:</strong> ${d.length.toLocaleString()} bp</p>
                    <p class="mb-0"><strong>% of Transcript:</strong> ${(d.length / totalLength * 100).toFixed(2)}%</p>
                </div>
            `)
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY - 10}px`);
        })
        .on('mouseout', function() {
            // Reset on mouseout
            d3.select(this).select('rect')
                .transition()
                .duration(150)
                .attr('stroke-width', 1)
                .attr('stroke', '#333');

            // Hide the exon label
            d3.select(this).select('.exon-label')
                .transition()
                .duration(150)
                .style('opacity', 0);

            // Hide tooltip
            const tooltip = d3.select('#tooltip');
            if (!tooltip.empty()) {
                tooltip.transition()
                    .duration(200)
                    .style('opacity', 0);
            }
        });

    // Make responsive
    function resizeVisualization() {
        // Only adjust width if the container width changes significantly
        if (Math.abs(parentContainer.clientWidth - width) > 20) {
            // Recalculate width
            const newWidth = containerElement.clientWidth - margin.left - margin.right;

            // Update SVG width
            d3.select(containerElement).select('svg')
                .attr('width', newWidth + margin.left + margin.right);

            // Update scales
            xScale.range([0, newWidth]);

            // Update all elements
            svg.select('.x-axis').call(xAxis.ticks(Math.min(10, newWidth / 100)));

            // Update exon groups and their contents
            exonGroups.attr('transform', d => `translate(${xScale(d.start)}, ${height/2 - 20})`);
            exonGroups.select('rect')
                .attr('width', d => Math.max(6, xScale(d.end) - xScale(d.start)));
            exonGroups.select('text')
                .attr('x', d => Math.max(3, (xScale(d.end) - xScale(d.start)) / 2));

            // Update intron lines
            svg.selectAll('.intron')
                .attr('x1', d => xScale(d.start))
                .attr('x2', d => xScale(d.end));

            // Update text elements
            svg.selectAll('.text-header')
                .attr('x', newWidth / 2);
        }
    }

    // Add resize listener
    const resizeObserver = new ResizeObserver(() => {
        resizeVisualization();
    });

    resizeObserver.observe(parentContainer);

    // Return info about the visualization
    return {
        exonCount: exons.length,
        intronCount: introns.length,
        totalLength: totalLength,
        exonLength: totalExonLength,
        intronLength: totalIntronLength
    };
}

// Function to display exon/intron visualization in a modal
export function showExonVisualizationModal(exonsStr, title = "Node Structure", chromosomeInfo = null) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('exonVisualizationModal');

    // Create tooltip container if it doesn't exist
    if (!document.getElementById('tooltip')) {
        const tooltip = document.createElement('div');
        tooltip.id = 'tooltip';
        tooltip.className = 'exon-tooltip-container';
        tooltip.style.position = 'absolute';
        tooltip.style.opacity = '0';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.zIndex = '1000';
        document.body.appendChild(tooltip);
    }

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'exonVisualizationModal';
        modal.className = 'modal fade';
        modal.tabIndex = '-1';

        modal.innerHTML = `
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="exonVisualizationModalLabel">${title}</h5>
            <div class="ms-auto">
              <button type="button" id="exportExonSvgBtn" class="btn btn-sm btn-outline-success me-2" title="Export as SVG">
                <i class="bi bi-download me-1"></i> Export SVG
              </button>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
          </div>
          <div class="modal-body p-0">
            <div id="exonVisualizationContainer" class="exon-container"></div>
            <div id="exonStatsContainer" class="mt-3 px-3 pb-3"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    `;

        document.body.appendChild(modal);

        // Add styles for the modal and visualization
        if (!document.getElementById('exon-visualization-styles')) {
            const style = document.createElement('style');
            style.id = 'exon-visualization-styles';
            style.textContent = `
                .modal-xl {
                    max-width: 90%;
                    width: 1200px;
                }
                .modal-body {
                    overflow: hidden;
                }
                .exon-container {
                    position: relative;
                    height: 350px;
                    width: 100%;
                    background: #f9f9f9;
                }
                .exon-visualization-container {
                    height: 100%;
                    width: 100%;
                    background: linear-gradient(to bottom, #ffffff, #f9f9f9);
                }
                .exon-tooltip {
                    background-color: rgba(255, 255, 255, 0.95);
                    border-radius: 5px;
                    padding: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    font-size: 14px;
                    z-index: 1000;
                }
                .exon-tooltip h6 {
                    border-bottom: 1px solid #eee;
                    padding-bottom: 5px;
                    margin-bottom: 5px;
                    color: #333;
                    font-size: 16px;
                }
                .exon-svg {
                    background: linear-gradient(to bottom, #ffffff, #f9f9f9);
                }
                .stat-card {
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .stat-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
                .stat-value {
                    font-size: 1.5rem;
                    font-weight: bold;
                }
                .chromosome-info {
                    font-size: 14px;
                    color: #555;
                    font-style: italic;
                }
                .text-header {
                    font-size: 14px;
                    margin-bottom: 5px;
                }
                .exon-label {
                    dominant-baseline: middle;
                    user-select: none;
                    text-shadow: 0px 1px 2px rgba(0,0,0,0.7);
                    font-size: 13px;
                    letter-spacing: 0.5px;
                }
                .exon-group {
                    cursor: pointer;
                }
                .exon-group:hover .exon {
                    filter: brightness(110%);
                }
                .exon-group:hover .exon-label {
                    font-weight: bolder;
                    text-shadow: 0px 1px 3px rgba(0,0,0,0.9);
                }
            `;
            document.head.appendChild(style);
        }
    } else {
        // Update the modal title
        document.getElementById('exonVisualizationModalLabel').textContent = title;
    }

    // Create Bootstrap modal instance
    const modalInstance = new bootstrap.Modal(modal);

    // When modal is shown, render the visualization
    modal.addEventListener('shown.bs.modal', () => {
        const container = document.getElementById('exonVisualizationContainer');
        const statsContainer = document.getElementById('exonStatsContainer');

        // Create the visualization
        const result = createExonVisualization(exonsStr, container, chromosomeInfo);

        // Setup SVG export button
        const exportSvgBtn = document.getElementById('exportExonSvgBtn');
        if (exportSvgBtn) {
            exportSvgBtn.addEventListener('click', () => {
                const filenameBase = chromosomeInfo ?
                    `exon_structure_chr${chromosomeInfo.chrom}_${new Date().toISOString().slice(0, 10)}` :
                    `exon_structure_${new Date().toISOString().slice(0, 10)}`;
                exportVisualizationToSvg(container, filenameBase);
            });
        }

        // If visualization was successful, show enhanced stats
        if (result) {
            const exonPercent = (result.exonLength / result.totalLength * 100).toFixed(1);
            const intronPercent = (result.intronLength / result.totalLength * 100).toFixed(1);

            statsContainer.innerHTML = `
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-light">
            <h6 class="mb-0 fw-bold">Transcript Structure Statistics</h6>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-4">
                <div class="stat-card p-3 border bg-primary bg-opacity-10 text-center h-100">
                  <div class="d-flex flex-column h-100">
                    <div class="mb-2">
                      <i class="bi bi-box me-1"></i>
                      <h6 class="mb-0">Exons</h6>
                    </div>
                    <div class="flex-grow-1 d-flex flex-column justify-content-center">
                      <div class="stat-value">${result.exonCount}</div>
                      <div class="text-muted small">
                        ${result.exonLength.toLocaleString()} bp (${exonPercent}%)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="stat-card p-3 border bg-secondary bg-opacity-10 text-center h-100">
                  <div class="d-flex flex-column h-100">
                    <div class="mb-2">
                      <i class="bi bi-dash-lg me-1"></i>
                      <h6 class="mb-0">Introns</h6>
                    </div>
                    <div class="flex-grow-1 d-flex flex-column justify-content-center">
                      <div class="stat-value">${result.intronCount}</div>
                      <div class="text-muted small">
                        ${result.intronLength.toLocaleString()} bp (${intronPercent}%)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="stat-card p-3 border bg-info bg-opacity-10 text-center h-100">
                  <div class="d-flex flex-column h-100">
                    <div class="mb-2">
                      <i class="bi bi-rulers me-1"></i>
                      <h6 class="mb-0">Total Length</h6>
                    </div>
                    <div class="flex-grow-1 d-flex flex-column justify-content-center">
                      <div class="stat-value">${result.totalLength.toLocaleString()}</div>
                      <div class="text-muted small">
                        base pairs
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              ${chromosomeInfo ? `
              <div class="col-12 mt-3">
                <div class="alert alert-info mb-0">
                  <i class="bi bi-info-circle me-2"></i>
                  <strong>Chromosome Location:</strong>
                  Chr${chromosomeInfo.chrom}${chromosomeInfo.strand ? `, Strand: ${chromosomeInfo.strand}` : ''}
                  (${chromosomeInfo.start?.toLocaleString() || ''}-${chromosomeInfo.end?.toLocaleString() || ''})
                </div>
              </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
        }
    });

    // Show the modal
    modalInstance.show();
}

// Function to export the visualization as an SVG file
function exportVisualizationToSvg(container, filename) {
    // Get the SVG element from the container
    const svgElement = container.querySelector('svg');

    if (!svgElement) {
        console.error('No SVG element found in container');
        // Show error notification
        showExportNotification('error', 'Failed to export SVG: No visualization found');
        return;
    }

    try {
        // Get SVG data with inline styles
        const svgData = getSVGData(svgElement);

        // Create a blob from the SVG string
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });

        // Create a download link
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.svg`;
        link.style.display = 'none';

        // Add to body, click to trigger download, then remove
        document.body.appendChild(link);
        link.click();

        // Cleanup
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            // Show success notification
            showExportNotification('success', 'SVG exported successfully!');
        }, 100);
    } catch (error) {
        console.error('Error exporting SVG:', error);
        showExportNotification('error', `Failed to export SVG: ${error.message}`);
    }
}

// Helper function to get SVG data with inline styles
function getSVGData(svgElement) {
    // Clone the SVG to avoid modifying the original
    const svgClone = svgElement.cloneNode(true);

    // Set the background color for the exported SVG
    svgClone.style.background = 'white';

    // Add required namespaces
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    // Create a style element to hold all the CSS rules
    const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleElement.textContent = getRelevantStyles();
    svgClone.insertBefore(styleElement, svgClone.firstChild);

    // Convert SVG to string
    return new XMLSerializer().serializeToString(svgClone);
}

// Helper function to extract relevant CSS styles for the SVG
function getRelevantStyles() {
    // Get all style sheets on the page
    const styleSheets = document.styleSheets;
    let cssText = '';

    // List of selectors relevant to the SVG
    const relevantSelectors = [
        '.exon', '.intron', '.exon-svg', 'svg', 'rect', 'path', 'line',
        'text', 'g', 'circle', 'polyline', 'polygon'
    ];

    try {
        // Loop through all style sheets
        for (let i = 0; i < styleSheets.length; i++) {
            const styleSheet = styleSheets[i];

            try {
                // Access the CSS rules
                const rules = styleSheet.cssRules || styleSheet.rules;
                if (!rules) continue;

                // Loop through all CSS rules
                for (let j = 0; j < rules.length; j++) {
                    const rule = rules[j];

                    // Check if the selector is relevant for our SVG
                    if (rule.selectorText && relevantSelectors.some(selector =>
                            rule.selectorText.includes(selector))) {
                        cssText += rule.cssText + '\n';
                    }
                }
            } catch (e) {
                // Some style sheets may not be accessible due to CORS restrictions
                console.warn('Could not access stylesheet:', e);
            }
        }
    } catch (e) {
        console.warn('Error extracting styles:', e);
    }

    // Add some default styles to ensure proper rendering
    cssText += `
        .exon { fill-opacity: 1; stroke-width: 2px; }
        .intron { stroke-dasharray: 5,5; }
        text { font-family: Arial, sans-serif; }
        .exon:hover { stroke: #ff7f0e; stroke-width: 2px; }
    `;

    return cssText;
}

// Function to show a notification for export result
function showExportNotification(type, message) {
    // Remove any existing notification
    const existingNotification = document.getElementById('exportNotification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'exportNotification';
    notification.className = `export-notification ${type}`;
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="bi ${type === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2"></i>
            <span>${message}</span>
        </div>
    `;

    // Add styles if they don't exist
    if (!document.getElementById('export-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'export-notification-styles';
        style.textContent = `
            .export-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 10px 20px;
                border-radius: 4px;
                color: white;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                z-index: 9999;
                animation: fadeInOut 3s forwards;
            }
            .export-notification.success {
                background-color: #28a745;
            }
            .export-notification.error {
                background-color: #dc3545;
            }
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateY(20px); }
                10% { opacity: 1; transform: translateY(0); }
                80% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-20px); }
            }
        `;
        document.head.appendChild(style);
    }

    // Add to document and remove after animation
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}
