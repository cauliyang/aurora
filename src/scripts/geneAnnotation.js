import pako from 'pako';
import { displayElementInfo } from "./graphUtilities";
import { STATE } from './graph';

// In-memory gene database
let geneDatabase = [];
let isGeneDataLoaded = false;
let isLoading = false;
let assetLoadingAttempted = false;

/**
 * Gene class to represent a gene annotation
 */
class Gene {
    constructor(geneId, chromosome, start, end, strand, geneName) {
        this.geneId = geneId;
        this.chromosome = chromosome;
        this.start = parseInt(start);
        this.end = parseInt(end);
        this.strand = strand;
        this.geneName = geneName;
    }

    /**
     * Check if this gene overlaps with given genomic coordinates
     */
    overlaps(chrom, start, end) {
        return this.chromosome === chrom &&
            this.start <= end &&
            this.end >= start;
    }

    /**
     * Calculate the overlap percentage with given genomic coordinates
     * @returns {number} Overlap percentage (0-100)
     */
    calculateOverlapPercentage(start, end) {
        const overlapStart = Math.max(this.start, start);
        const overlapEnd = Math.min(this.end, end);
        const overlapLength = Math.max(0, overlapEnd - overlapStart + 1);
        const regionLength = end - start + 1;
        return (overlapLength / regionLength) * 100;
    }

    /**
     * Return a human-readable representation of this gene
     */
    toString() {
        return `${this.geneName} (${this.geneId}): ${this.chromosome}:${this.start}-${this.end} ${this.strand}`;
    }
}

/**
 * Parse gene data from text format
 * @param {string} text - Tab-delimited gene data
 * @returns {Array<Gene>} - Array of parsed genes
 */
function parseGeneData(text) {
    console.log(`Parsing gene data... ${text}`);
    const genes = [];

    try {
        // Clean up potential HTML content or comments
        // Remove HTML tags that might be present in the data
        text = text.replace(/<[^>]*>/g, '');

        // Split by newlines and process each line
        const lines = text.split(/\r?\n/);
        console.log(`Processing ${lines.length} lines from gene data`);

        // Find first line that looks like valid data or header
        let headerFound = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip empty lines or comment lines
            if (!line || line.startsWith('//') || line.startsWith('#')) continue;

            // Split by tabs or multiple spaces
            const fields = line.split(/\t+|\s{2,}/g).filter(field => field.trim().length > 0);

            if (fields.length < 5) continue; // Need at least 5 fields for minimal gene info

            // Check if this is a header line
            if (!headerFound && fields.some(f => f.toLowerCase().includes('gene') ||
                    f.toLowerCase() === 'chrom' ||
                    f.toLowerCase().includes('chromosome'))) {
                console.log('Found header line:', fields);
                headerFound = true;
                continue;
            }

            // If we're here, we have a data line
            // Determine field positions
            let geneId, chromosome, start, end, strand, geneName;

            if (fields.length >= 6) {
                // Standard format: gene_id chromosome start end strand gene_name
                [geneId, chromosome, start, end, strand, geneName] = fields;
            } else if (fields.length === 5) {
                // Alternative format: gene_name chromosome start end strand
                [geneName, chromosome, start, end, strand] = fields;
                geneId = geneName; // Use gene name as ID
            } else {
                console.warn(`Skipping line with invalid field count: ${fields.length}`, fields);
                continue;
            }

            // Clean up all fields
            geneId = geneId.trim();
            chromosome = chromosome.trim();
            start = start.trim();
            end = end.trim();
            strand = strand.trim();
            geneName = (geneName || geneId).trim();

            // Convert start/end to integers and validate
            const startNum = parseInt(start);
            const endNum = parseInt(end);

            if (isNaN(startNum) || isNaN(endNum)) {
                console.warn(`Skipping gene with invalid coordinates: ${start}, ${end}`);
                continue;
            }

            // Create and add gene
            genes.push(new Gene(geneId, chromosome, startNum, endNum, strand, geneName));

            if (genes.length % 1000 === 0) {
                console.log(`Parsed ${genes.length} genes so far...`);
            }
        }

        console.log(`Successfully parsed ${genes.length} genes`);
    } catch (error) {
        console.error('Error parsing gene data:', error);
    }

    return genes;
}

/**
 * Try to load gene data from different sources in a priority order
 */
export async function loadGeneData() {
    if (isLoading) {
        console.log("Gene data loading already in progress...");
        return false;
    }

    if (isGeneDataLoaded && geneDatabase.length > 0) {
        console.log("Gene data already loaded with", geneDatabase.length, "genes");
        return true;
    }

    isLoading = true;
    console.log("Starting gene data loading process...");

    try {
        // Show loading indicator
        updateAnnotationStatus("Loading gene annotations...");

        // Priority 1: Try to load genes.txt from assets directory
        if (!assetLoadingAttempted) {
            assetLoadingAttempted = true;
            try {
                console.log("Attempting to load gene data from assets/gene.txt");
                const assetResponse = await fetch('../assets/gene.txt');

                if (assetResponse.ok) {
                    const geneText = await assetResponse.text();
                    if (geneText && geneText.length > 0) {
                        const genes = parseGeneData(geneText);
                        if (genes && genes.length > 0) {
                            console.log(`Loaded ${genes.length} genes from asset file`);
                            geneDatabase = genes;
                            isGeneDataLoaded = true;
                            updateAnnotationStatus(`Loaded ${genes.length} genes from asset file`, 3000);
                            return true;
                        }
                    }
                } else {
                    console.warn("Could not load gene.txt from assets:", assetResponse.statusText);
                }
            } catch (assetError) {
                console.warn("Error loading gene data from asset:", assetError);
            }
        }

        // Priority 3: Use fallback data
        if (geneDatabase.length === 0) {
            console.log("Using fallback gene data");
            geneDatabase = getFallbackGeneData();
            isGeneDataLoaded = true;
            updateAnnotationStatus(`Using ${geneDatabase.length} fallback gene annotations`, 3000);
        }

        return isGeneDataLoaded && geneDatabase.length > 0;
    } catch (error) {
        console.error('Error in gene data loading process:', error);
        updateAnnotationStatus(`Error loading gene annotations: ${error.message}`, 0, true);

        // Make sure we have fallback data
        if (geneDatabase.length === 0) {
            geneDatabase = getFallbackGeneData();
            isGeneDataLoaded = geneDatabase.length > 0;
            if (isGeneDataLoaded) {
                updateAnnotationStatus(`Using ${geneDatabase.length} fallback gene annotations`, 3000);
            }
        }

        return isGeneDataLoaded && geneDatabase.length > 0;
    } finally {
        isLoading = false;
    }
}

// Fallback data in case loading from file fails
function getFallbackGeneData() {
    const fallbackData = [
        // Format: geneId, chromosome, start, end, strand, geneName
        ['ENSG00000223972', 'chr1', 11869, 14409, '+', 'DDX11L1'],
        ['ENSG00000227232', 'chr1', 14404, 29570, '-', 'WASH7P'],
        ['ENSG00000243485', 'chr1', 29554, 31109, '+', 'MIR1302-2HG'],
        ['ENSG00000237613', 'chr1', 34554, 36081, '-', 'FAM138A'],
        ['ENSG00000188157', 'chr8', 62278276, 62282882, '+', 'NKX3-1'],
        ['ENSG00000214093', 'chr8', 62286313, 62296461, '+', 'JRK'],
        ['ENSG00000188648', 'chr8', 62296421, 62344273, '+', 'PSCA']
    ];

    return fallbackData.map(([geneId, chromosome, start, end, strand, geneName]) =>
        new Gene(geneId, chromosome, start, end, strand, geneName));
}

/**
 * Find genes that overlap with given genomic coordinates
 * @param {string} chrom - Chromosome (e.g., "chr1")
 * @param {number} start - Start position
 * @param {number} end - End position
 * @returns {Array<Gene>} - Array of overlapping genes
 */
export function findOverlappingGenes(chrom, start, end) {
    if (!isGeneDataLoaded) {
        console.warn("Gene data not loaded yet. Call loadGeneData first.");
        return [];
    }

    // Try with and without "chr" prefix to handle different formats
    const chromWithoutPrefix = chrom.replace(/^chr/, '');
    const chromWithPrefix = chrom.startsWith('chr') ? chrom : `chr${chrom}`;

    console.log(`geneDatabase length: ${geneDatabase.length}`);

    return geneDatabase.filter(gene =>
        gene.overlaps(chrom, start, end) ||
        gene.overlaps(chromWithoutPrefix, start, end) ||
        gene.overlaps(chromWithPrefix, start, end)
    );
}

/**
 * Annotate a node with gene information
 * @param {Object} node - Cytoscape node
 * @returns {Object} - The node with annotations added
 */
export function annotateNode(node) {
    if (!node || !isGeneDataLoaded) return node;

    const nodeData = node.data();
    const chrom = nodeData.chrom;
    const start = parseInt(nodeData.ref_start);
    const end = parseInt(nodeData.ref_end);

    if (!chrom || isNaN(start) || isNaN(end)) {
        // Node doesn't have genomic coordinates
        return node;
    }

    console.log(`Annotating node ${nodeData.id} with coordinates ${chrom}:${start}-${end}`);

    // Find overlapping genes
    const overlappingGenes = findOverlappingGenes(chrom, start, end);

    if (overlappingGenes.length > 0) {
        // Add the gene annotations to the node data
        node.data('geneAnnotations', overlappingGenes.map(gene => ({
            geneId: gene.geneId,
            geneName: gene.geneName,
            strand: gene.strand,
            start: gene.start,
            end: gene.end,
            overlapPercentage: gene.calculateOverlapPercentage(start, end).toFixed(1)
        })));

        // Add the first gene name as a node label if not set or if it's the same as the ID
        if (!nodeData.name || nodeData.name === nodeData.id) {
            const primaryGene = overlappingGenes[0];
            node.data('name', primaryGene.geneName);
        }
    }

    console.log(`Node ${nodeData.id} annotated with ${overlappingGenes.length} genes GeneAnnotations:`, node.data('geneAnnotations'));

    return node;
}

/**
 * Annotate all nodes in a graph with gene information
 * @param {Object} cy - Cytoscape instance
 * @returns {Promise<number>} - Number of nodes annotated
 */
export async function annotateAllNodes(cy) {
    if (!cy) {
        console.error("No cytosscape instance provided");
        return 0;
    }

    if (!isGeneDataLoaded) {
        const loaded = await loadGeneData();
        if (!loaded) {
            updateAnnotationStatus("Failed to load gene data", 3000, true);
            return 0;
        }
    }

    let annotatedCount = 0;
    let nodesWithCoords = 0;

    cy.nodes().forEach(node => {
        const nodeData = node.data();
        if (nodeData.chrom && nodeData.ref_start && nodeData.ref_end) {
            nodesWithCoords++;

            const beforeAnnotation = node.data('geneAnnotations') ?
                node.data('geneAnnotations').length : 0;

            annotateNode(node);

            const afterAnnotation = node.data('geneAnnotations') ?
                node.data('geneAnnotations').length : 0;

            if (afterAnnotation > beforeAnnotation) {
                annotatedCount++;
            }
        }
    });

    // Update node styles to show gene names if they've been annotated
    if (annotatedCount > 0) {
        console.log(`Annotated ${annotatedCount} nodes out of ${nodesWithCoords} with genomic coordinates`);
        updateAnnotationStatus(`Annotated ${annotatedCount} nodes with gene names`, 3000);

        // If any node was updated, refresh the current view
        if (STATE.cy) {
            STATE.cy.style().update();
        }
    } else {
        updateAnnotationStatus(`No nodes could be annotated (${nodesWithCoords} nodes had coordinates)`, 3000);
    }

    return annotatedCount;
}

/**
 * Render gene annotations in the node info panel
 * @param {Object} node - Cytoscape node
 * @param {HTMLElement} container - HTML element to render annotations into
 */
export function renderGeneAnnotations(node, container) {
    if (!node || !container) return;

    const geneAnnotations = node.data('geneAnnotations');

    if (!geneAnnotations || geneAnnotations.length === 0) {
        // If no annotations but node has genomic coordinates, show option to annotate
        const nodeData = node.data();
        if (nodeData.chrom && nodeData.ref_start && nodeData.ref_end) {
            const noAnnotationsDiv = document.createElement('div');
            noAnnotationsDiv.className = 'card mb-3';
            noAnnotationsDiv.innerHTML = `
        <div class="card-header bg-light">
          <strong>Gene Annotations</strong>
        </div>
        <div class="card-body text-center p-4">
          <p class="mb-2">No gene annotations available for this node.</p>
          <button id="annotateNodeBtn" class="btn btn-sm btn-primary">
            <i class="fas fa-dna me-1"></i> Annotate Node
          </button>
        </div>
      `;

            container.appendChild(noAnnotationsDiv);

            // Add event listener to annotate button
            setTimeout(() => {
                const annotateBtn = document.getElementById('annotateNodeBtn');
                if (annotateBtn) {
                    annotateBtn.addEventListener('click', async() => {
                        if (!isGeneDataLoaded) {
                            await loadGeneData();
                        }

                        if (isGeneDataLoaded) {
                            annotateNode(node);
                            // Re-render the node info to show the annotations
                            const infoContent = document.getElementById("infoContent");
                            if (infoContent) {
                                infoContent.innerHTML = '';
                                displayElementInfo(node, infoContent);
                            }
                        }
                    });
                }
            }, 0);

            return;
        }

        return;
    }

    const geneSection = document.createElement('div');
    geneSection.className = 'card mb-3';

    geneSection.innerHTML = `
    <div class="card-header bg-light d-flex justify-content-between align-items-center">
      <strong>Gene Annotations</strong>
      <span class="badge bg-primary">${geneAnnotations.length}</span>
    </div>
    <div class="card-body p-0">
      <div class="table-responsive">
        <table class="table table-hover table-striped mb-0">
          <thead>
            <tr>
              <th>Gene</th>
              <th>Location</th>
              <th>Strand</th>
              <th>Overlap</th>
            </tr>
          </thead>
          <tbody>
            ${geneAnnotations.map(gene => `
              <tr>
                <td>
                  <a href="https://www.ncbi.nlm.nih.gov/gene/?term=${gene.geneName}" 
                     target="_blank" class="text-decoration-none">
                    ${gene.geneName}
                    <i class="bi bi-box-arrow-up-right text-muted small ms-1"></i>
                  </a>
                  <div class="small text-muted">${gene.geneId}</div>
                </td>
                <td class="small">
                  ${gene.start?.toLocaleString()}-${gene.end?.toLocaleString()}
                </td>
                <td>${gene.strand}</td>
                <td>
                  <div class="progress" style="height: 5px;">
                    <div class="progress-bar" role="progressbar" 
                         style="width: ${gene.overlapPercentage}%;" 
                         aria-valuenow="${gene.overlapPercentage}" 
                         aria-valuemin="0" aria-valuemax="100">
                    </div>
                  </div>
                  <small>${gene.overlapPercentage}%</small>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

    container.appendChild(geneSection);
}

/**
 * Update annotation status display using the alert utility
 * @param {string} message - Message to display
 * @param {number} timeout - Time in ms before fading out (0 for no fade)
 * @param {boolean} isError - Whether this is an error message
 */
function updateAnnotationStatus(message, timeout = 0, isError = false) {
    // Use the global showAlert function instead of imported one
    const alertType = isError ? 'error' : 'info';
    
    // Check if showAlert is available globally and use it
    if (typeof window.showAlert === 'function') {
        window.showAlert(message, alertType, timeout);
    } else {
        // Fallback if showAlert is not available
        console.log(`[${alertType}] ${message}`);
        
        let statusDiv = document.getElementById("annotationStatus");
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'annotationStatus';
            document.body.appendChild(statusDiv);
        }
        
        statusDiv.textContent = message;
        statusDiv.className = isError ? 'error' : '';
        statusDiv.classList.remove('d-none', 'fade-out');
        
        if (timeout > 0) {
            setTimeout(() => {
                statusDiv.classList.add('fade-out');
                setTimeout(() => {
                    statusDiv.classList.add('d-none');
                    statusDiv.classList.remove('fade-out');
                }, 1000);
            }, timeout);
        }
    }
}

/**
 * Add CSS styles for gene annotations
 */
function addGeneAnnotationStyles() {
    // Only add styles if our dedicated CSS file is not loaded
    if (document.getElementById('gene-annotation-styles') || 
        document.querySelector('link[href*="gene-annotations.css"]')) {
        return;
    }

    // Fallback styles if external css is not loaded
    const style = document.createElement('style');
    style.id = 'gene-annotation-styles';
    style.textContent = `
    #annotationStatus {
      position: fixed;
      bottom: 20px;
      left: 20px;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 1000;
      transition: opacity 1s ease;
    }
    
    #annotationStatus.fade-out {
      opacity: 0;
    }
    
    #annotationStatus.error {
      background-color: rgba(220, 53, 69, 0.9);
    }
    
    .gene-file-input {
      display: none;
    }
    
    #uploadGeneLabel {
      cursor: pointer;
    }
  `;

    document.head.appendChild(style);
    console.log("Added fallback gene annotation styles");
}

/**
 * Read file contents as text
 * @param {File} file - File object to read
 * @returns {Promise<string>} - File contents as string
 */
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const content = event.target.result;

                // Check if it's gzipped (starts with magic numbers)
                if (file.name.endsWith('.gz') || isGzipped(content)) {
                    // Decompress gzipped content
                    const inflated = pako.inflate(new Uint8Array(content), { to: 'string' });
                    resolve(inflated);
                } else {
                    // Plain text
                    resolve(new TextDecoder().decode(content));
                }
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * Check if data is gzipped based on magic number
 * @param {ArrayBuffer} data - Data to check
 * @returns {boolean} - True if data is gzipped
 */
function isGzipped(data) {
    const header = new Uint8Array(data.slice(0, 2));
    return header[0] === 0x1F && header[1] === 0x8B;
}

/**
 * Initialize the gene annotation feature by setting up event listeners
 */
export function initGeneAnnotation() {
    // Add styles
    addGeneAnnotationStyles();
    
    // Initialize event listeners once DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupGeneAnnotationListeners);
    } else {
        // DOM already ready, set up listeners now
        setupGeneAnnotationListeners();
    }
    
    // Pre-load gene data in the background for faster annotation later
    setTimeout(() => {
        console.log("Pre-loading gene data...");
        loadGeneData().then(success => {
            if (success) {
                console.log("Gene data pre-loaded successfully");
            }
        }).catch(err => {
            console.warn("Gene pre-loading failed:", err);
        });
    }, 1000); // Wait 1 second after initialization to avoid competing with graph loading
}

/**
 * Set up event listeners for the annotation buttons in the modal
 */
function setupGeneAnnotationListeners() {
    console.log("Setting up gene annotation event listeners");
    
    // Annotate all nodes button
    const annotateAllBtn = document.getElementById('annotateAllNodesBtn');
    if (annotateAllBtn) {
        console.log("Found annotateAllNodesBtn, adding event listener");
        
        // Remove any existing listener to avoid duplicates
        annotateAllBtn.replaceWith(annotateAllBtn.cloneNode(true));
        const newAnnotateAllBtn = document.getElementById('annotateAllNodesBtn');
        
        // Add fresh event listener
        newAnnotateAllBtn.addEventListener('click', async() => {
            console.log("Annotate all nodes button clicked");
            newAnnotateAllBtn.disabled = true;
            newAnnotateAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Annotating...';
            
            try {
                if (!isGeneDataLoaded) {
                    // Try to load default gene data first
                    await loadGeneData();
                }
                
                if (isGeneDataLoaded) {
                    const cy = window.STATE?.cy;
                    if (cy) {
                        const count = await annotateAllNodes(cy);
                        
                        // Show success message
                        if (count > 0) {
                            window.showAlert(`Successfully annotated ${count} nodes with gene information.`, 'success', 3000);
                        } else {
                            window.showAlert('No nodes could be annotated. Make sure nodes have genomic coordinates.', 'info', 3000);
                        }
                        
                        // Close modal
                        const modal = bootstrap.Modal.getInstance(document.getElementById('geneAnnotationModal'));
                        if (modal) modal.hide();
                    } else {
                        window.showAlert("No graph loaded", 'warning', 3000);
                    }
                }
            } catch (err) {
                console.error("Error annotating nodes:", err);
                window.showAlert(`Error: ${err.message}`, 'error', 4000);
            } finally {
                newAnnotateAllBtn.disabled = false;
                newAnnotateAllBtn.innerHTML = 'Annotate All Nodes';
            }
        });
    }
    
    // Fixed gene file upload event handling
    const fileInput = document.getElementById('geneFileInput');
    const uploadBtn = document.getElementById('uploadGeneBtn');

    if (fileInput && uploadBtn) {
        console.log("Setting up gene file upload listeners");
        
        // Handle file selection
        fileInput.addEventListener('change', function() {
            console.log("File selected:", this.files.length > 0 ? this.files[0].name : "none");
            uploadBtn.disabled = this.files.length === 0;
        });

        // Handle upload button click
        uploadBtn.addEventListener('click', async() => {
            if (!fileInput || fileInput.files.length === 0) {
                console.warn("No file selected for upload");
                return;
            }

            console.log("Processing gene file upload");
            const file = fileInput.files[0];
            const progressBar = document.getElementById('geneUploadProgress');
            const progressIndicator = progressBar?.querySelector('.progress-bar');

            if (progressBar) progressBar.classList.remove('d-none');
            if (progressIndicator) {
                progressIndicator.style.width = '0%';
                progressIndicator.setAttribute('aria-valuenow', '0');
            }

            try {
                window.showAlert(`Reading gene file: ${file.name}`, 'info');
                
                // Read file content
                const fileContent = await readFileContent(file);

                // Show 50% progress
                if (progressIndicator) {
                    progressIndicator.style.width = '50%';
                    progressIndicator.setAttribute('aria-valuenow', '50');
                }

                window.showAlert(`Parsing gene data from file...`, 'info');
                
                // Parse the data
                const genes = parseGeneData(fileContent);

                if (genes && genes.length > 0) {
                    // Success - set gene database
                    geneDatabase = genes;
                    isGeneDataLoaded = true;

                    // Show 100% progress
                    if (progressIndicator) {
                        progressIndicator.style.width = '100%';
                        progressIndicator.setAttribute('aria-valuenow', '100');
                    }

                    window.showAlert(`Loaded ${genes.length} gene annotations from file`, 'success', 3000);

                    // Close modal after short delay
                    setTimeout(() => {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('geneAnnotationModal'));
                        if (modal) modal.hide();
                    }, 1500);
                } else {
                    throw new Error('No genes found in file or invalid format');
                }
            } catch (error) {
                console.error('Error processing gene file:', error);
                if (progressBar) progressBar.classList.add('d-none');
                window.showAlert(`Error processing gene file: ${error.message}`, 'error', 5000);
            }
        });
    } else {
        console.warn("Gene file input or upload button not found in the DOM");
    }

    // Regular button in toolbar (annotation button)
    const geneAnnotationBtn = document.getElementById('geneAnnotationBtn');
    if (geneAnnotationBtn) {
        console.log("Found gene annotation button");
    }
}