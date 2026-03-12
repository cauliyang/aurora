import pako from "pako";
import { displayElementInfo } from "./graphUtilities";
import { STATE } from "./graph";

// Hard-code the path to the asset for development purposes
// Define the path to the gene data file
const geneDataUrl = new URL("../assets/genes.txt", import.meta.url).href;

// In-memory gene database
let geneDatabase = [];
let isGeneDataLoaded = false;
let isLoading = false;
let assetLoadingAttempted = false;

// Chromosome-indexed gene lookup for efficient queries.
// Map<string, Gene[]> where each Gene[] is sorted by gene.start ascending.
let geneIndex = new Map();

// Prefix-max-end arrays for each chromosome, enabling O(log N) lower-bound
// search in findOverlappingGenes(). prefixMaxEnd[i] = max(genes[0].end, ..., genes[i].end).
// Since genes are sorted by start, prefixMaxEnd is monotonically non-decreasing.
let genePrefixMaxEnd = new Map();

/**
 * Normalize chromosome name to always have "chr" prefix.
 * @param {string} chrom - Chromosome name (e.g., "1", "chr1")
 * @returns {string} - Normalized chromosome name (e.g., "chr1")
 */
function normalizeChrom(chrom) {
  return chrom.startsWith("chr") ? chrom : `chr${chrom}`;
}

/**
 * Build the chromosome-indexed gene lookup from the gene database.
 * Groups genes by normalized chromosome, sorts each group by start position,
 * and precomputes a prefixMaxEnd array for efficient lower-bound queries.
 *
 * prefixMaxEnd[i] = max(genes[0].end, ..., genes[i].end)
 * This is monotonically non-decreasing and allows binary search to find
 * the first gene index where any gene at or before that index could overlap
 * a query region [start, end].
 *
 * @param {Array<Gene>} genes - Array of Gene objects
 */
function buildGeneIndex(genes) {
  geneIndex.clear();
  genePrefixMaxEnd.clear();
  for (const gene of genes) {
    const chrom = normalizeChrom(gene.chromosome);
    if (!geneIndex.has(chrom)) {
      geneIndex.set(chrom, []);
    }
    geneIndex.get(chrom).push(gene);
  }
  // Sort each chromosome's genes by start position, then build prefixMaxEnd
  for (const [chrom, chromGenes] of geneIndex.entries()) {
    chromGenes.sort((a, b) => a.start - b.start);

    // Build prefix-max-end array: prefixMaxEnd[i] = max(genes[0..i].end)
    const pme = new Array(chromGenes.length);
    let maxEnd = 0;
    for (let i = 0; i < chromGenes.length; i++) {
      maxEnd = Math.max(maxEnd, chromGenes[i].end);
      pme[i] = maxEnd;
    }
    genePrefixMaxEnd.set(chrom, pme);
  }
}

/**
 * Parse an exon string into a sorted array of {start, end} intervals.
 * Handles formats: "[start-end,start-end,...]" or "start-end,start-end,..."
 * @param {string} exonsStr - Exon intervals string
 * @returns {Array<{start: number, end: number}>} - Sorted array of exon intervals
 */
function parseExonString(exonsStr) {
  if (!exonsStr || typeof exonsStr !== "string") return [];
  const cleaned = exonsStr.replace(/^\[|\]$/g, "").trim();
  if (!cleaned) return [];
  const parts = cleaned.split(",");
  const exons = [];
  for (const part of parts) {
    const [startStr, endStr] = part.split("-");
    const start = parseInt(startStr);
    const end = parseInt(endStr);
    if (!isNaN(start) && !isNaN(end)) {
      exons.push({ start, end });
    }
  }
  exons.sort((a, b) => a.start - b.start);
  return exons;
}

/**
 * Gene class to represent a gene annotation
 */
class Gene {
  /**
   * @param {string} geneId - Gene identifier (e.g., "ENSG00000186092")
   * @param {string} chromosome - Chromosome (e.g., "chr1")
   * @param {number|string} start - Gene start position
   * @param {number|string} end - Gene end position
   * @param {string} strand - Strand ("+" or "-")
   * @param {string} geneName - Gene symbol (e.g., "OR4F5")
   * @param {Array<{start: number, end: number}>|null} exons - Merged exon intervals,
   *   sorted by start. If null, defaults to the gene span as a single interval.
   */
  constructor(geneId, chromosome, start, end, strand, geneName, exons = null) {
    this.geneId = geneId;
    this.chromosome = chromosome;
    this.start = parseInt(start);
    this.end = parseInt(end);
    this.strand = strand;
    this.geneName = geneName;
    // If exon data provided, use it; otherwise fall back to gene span as single interval
    this.exons = exons && exons.length > 0
      ? exons
      : [{ start: this.start, end: this.end }];
  }

  /**
   * Check if this gene's span overlaps with given genomic coordinates.
   * Used as a fast pre-filter before exon-level checks.
   */
  overlaps(chrom, start, end) {
    return this.chromosome === chrom && this.start <= end && this.end >= start;
  }

  /**
   * Check if any of this gene's exons overlap with any of the given node exon intervals.
   * Uses a two-pointer merge scan — O(E_g + E_n) where both arrays are sorted by start.
   * @param {Array<{start: number, end: number}>} nodeExons - Sorted node exon intervals
   * @returns {boolean} - True if at least one gene exon overlaps a node exon
   */
  overlapsExons(nodeExons) {
    if (!nodeExons || nodeExons.length === 0) return false;
    let gi = 0;
    let ni = 0;
    while (gi < this.exons.length && ni < nodeExons.length) {
      const ge = this.exons[gi];
      const ne = nodeExons[ni];
      if (ge.start <= ne.end && ge.end >= ne.start) {
        return true; // Found overlap, early exit
      }
      // Advance the pointer with the smaller end position
      if (ge.end < ne.end) {
        gi++;
      } else {
        ni++;
      }
    }
    return false;
  }

  /**
   * Calculate the exon-level overlap percentage: total bases of node exons
   * overlapping gene exons, divided by total node exon bases.
   * Uses a two-pointer merge scan — O(E_g + E_n).
   * @param {Array<{start: number, end: number}>} nodeExons - Sorted node exon intervals
   * @returns {number} - Overlap percentage (0-100)
   */
  calculateExonOverlapPercentage(nodeExons) {
    if (!nodeExons || nodeExons.length === 0) return 0;

    let totalNodeBases = 0;
    for (const ne of nodeExons) {
      totalNodeBases += ne.end - ne.start + 1;
    }
    if (totalNodeBases === 0) return 0;

    let overlapBases = 0;
    let gi = 0;
    let ni = 0;
    while (gi < this.exons.length && ni < nodeExons.length) {
      const ge = this.exons[gi];
      const ne = nodeExons[ni];
      if (ge.start <= ne.end && ge.end >= ne.start) {
        overlapBases +=
          Math.min(ge.end, ne.end) - Math.max(ge.start, ne.start) + 1;
      }
      // Advance the pointer with the smaller end position
      if (ge.end < ne.end) {
        gi++;
      } else {
        ni++;
      }
    }
    return (overlapBases / totalNodeBases) * 100;
  }

  /**
   * Calculate the span-level overlap percentage with given genomic coordinates.
   * Kept for backward compatibility with files lacking exon data.
   * @param {number} start - Region start
   * @param {number} end - Region end
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
    return `${this.geneName} (${this.geneId}): ${this.chromosome}:${this.start}-${this.end} ${this.strand} [${this.exons.length} exons]`;
  }
}

/**
 * Parse gene data from text format
 * @param {string} text - Tab-delimited gene data
 * @returns {Array<Gene>} - Array of parsed genes
 */
function parseGeneData(text) {
  const genes = [];

  try {
    // Split by newlines and process each line
    const lines = text.split(/\r?\n/);

    // Find first line that looks like valid data or header
    let headerFound = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines or comment lines
      if (!line || line.startsWith("//") || line.startsWith("#")) continue;

      // Split by tabs or multiple spaces
      const fields = line
        .split(/\t+|\s{2,}/g)
        .filter((field) => field.trim().length > 0);

      if (fields.length < 5) continue; // Need at least 5 fields for minimal gene info

      // Check if this is a header line
      if (
        !headerFound &&
        fields.some(
          (f) =>
            f.toLowerCase().includes("gene") ||
            f.toLowerCase() === "chrom" ||
            f.toLowerCase().includes("chromosome")
        )
      ) {
        headerFound = true;
        continue;
      }

      // If we're here, we have a data line
      // Determine field positions
      let geneId, chromosome, start, end, strand, geneName, exonsField;

      if (fields.length >= 7) {
        // New format with exons: gene_id chromosome start end strand gene_name exons
        [geneId, chromosome, start, end, strand, geneName, exonsField] = fields;
      } else if (fields.length >= 6) {
        // Standard format: gene_id chromosome start end strand gene_name
        [geneId, chromosome, start, end, strand, geneName] = fields;
      } else if (fields.length === 5) {
        // Alternative format: gene_name chromosome start end strand
        [geneName, chromosome, start, end, strand] = fields;
        geneId = geneName; // Use gene name as ID
      } else {
        console.warn(
          `Skipping line with invalid field count: ${fields.length}`,
          fields
        );
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
        console.warn(
          `Skipping gene with invalid coordinates: ${start}, ${end}`
        );
        continue;
      }

      // Parse exon intervals if present (7th column)
      const exons = exonsField ? parseExonString(exonsField) : null;

      // Create and add gene
      genes.push(
        new Gene(geneId, chromosome, startNum, endNum, strand, geneName, exons)
      );


    }

    // Build the chromosome index for efficient lookups
    if (genes.length > 0) {
      buildGeneIndex(genes);
    }
  } catch (error) {
    console.error("Error parsing gene data:", error);
  }

  return genes;
}

/**
 * Try to load gene data from different sources in a priority order
 */
export async function loadGeneData() {
  if (isLoading) {
    return false;
  }

  if (isGeneDataLoaded && geneDatabase.length > 0) {
    return true;
  }

  isLoading = true;

  try {
    // Show loading indicator
    updateAnnotationStatus("Loading gene annotations...");

    // Priority 1: Try to load genes.txt from assets directory
    if (!assetLoadingAttempted) {
      assetLoadingAttempted = true;
      try {
        const assetResponse = await fetch(geneDataUrl);

        if (assetResponse.ok) {
          const geneText = await assetResponse.text();
          if (geneText && geneText.length > 0) {
            const genes = parseGeneData(geneText);
            if (genes && genes.length > 0) {
              geneDatabase = genes;
              isGeneDataLoaded = true;
              updateAnnotationStatus(
                `Loaded ${genes.length} genes from asset file`,
                3000
              );
              return true;
            }
          }
        } else {
          console.warn(
            "Could not load gene.txt from assets:",
            assetResponse.statusText
          );
        }
      } catch (assetError) {
        console.warn("Error loading gene data from asset:", assetError);
      }
    }

    // Priority 3: Use fallback data
    if (geneDatabase.length === 0) {
      geneDatabase = getFallbackGeneData();
      isGeneDataLoaded = true;
      updateAnnotationStatus(
        `Using ${geneDatabase.length} fallback gene annotations`,
        3000
      );
    }

    return isGeneDataLoaded && geneDatabase.length > 0;
  } catch (error) {
    console.error("Error in gene data loading process:", error);
    updateAnnotationStatus(
      `Error loading gene annotations: ${error.message}`,
      0,
      true
    );

    // Make sure we have fallback data
    if (geneDatabase.length === 0) {
      geneDatabase = getFallbackGeneData();
      isGeneDataLoaded = geneDatabase.length > 0;
      if (isGeneDataLoaded) {
        updateAnnotationStatus(
          `Using ${geneDatabase.length} fallback gene annotations`,
          3000
        );
      }
    }

    return isGeneDataLoaded && geneDatabase.length > 0;
  } finally {
    isLoading = false;
  }
}

// Fallback data in case loading from file fails (protein-coding genes with exons)
function getFallbackGeneData() {
  const fallbackData = [
    // Format: [geneId, chromosome, start, end, strand, geneName, exonsString]
    ["ENSG00000186092", "chr1", 65419, 71585, "+", "OR4F5", "65419-65433,65520-65573,69037-71585"],
    ["ENSG00000187634", "chr1", 923923, 944574, "+", "SAMD11", "923923-924948,925731-925800,925922-926013,930155-930336,931039-931089,935772-935896,939040-939129,939272-939460,941144-941306,942136-942251,942410-942488,942559-943058,943253-943377,943698-943808,943893-944574"],
    ["ENSG00000188976", "chr1", 943527, 960714, "-", "NOC2L", "943527-944800,945042-945146,945518-945653,946173-946286,946402-946545,946757-946972,948059-948232,948490-948603,951127-951238,952000-952139,952412-952600,952877-952945,953169-953288,953782-953934,954004-954184,954464-954523,955412-955477,955638-955706,955923-956028,956095-956215,956894-957043,957099-957273,958929-959081,959215-960714"],
    ["ENSG00000187961", "chr1", 960576, 965719, "+", "KLHL17", "960576-960800,961293-961552,961629-961750,961826-962047,962286-962471,962704-962917,963032-963253,963337-963504,963857-964008,964107-964180,964349-964530,964963-965719"],
    ["ENSG00000167034", "chr8", 23678697, 23682938, "-", "NKX3-1", "23678697-23681639,23682604-23682938"],
    ["ENSG00000167653", "chr8", 142674358, 142682725, "+", "PSCA", "142674358-142676236,142680395-142680563,142681327-142681770,142681921-142682725"],
  ];

  const genes = fallbackData.map(
    ([geneId, chromosome, start, end, strand, geneName, exonsStr]) =>
      new Gene(geneId, chromosome, start, end, strand, geneName, parseExonString(exonsStr))
  );

  // Build the index for the fallback data too
  buildGeneIndex(genes);

  return genes;
}

/**
 * Find genes whose span overlaps the given genomic coordinates.
 * Uses two binary searches on the chromosome-indexed gene array:
 *   1. Upper bound: first gene where gene.start > end (genes sorted by start)
 *   2. Lower bound: first gene where prefixMaxEnd[i] >= start
 *      (prefixMaxEnd is monotonically non-decreasing, so binary search works)
 *
 * This narrows the scan to only the genes in [lower, upper), which is
 * typically a very small range (the actual overlapping genes plus a few
 * neighbors), even for queries near the chromosome end.
 *
 * Complexity: O(log G_chr + k) where k is the size of [lower, upper).
 *
 * @param {string} chrom - Chromosome (e.g., "chr1")
 * @param {number} start - Start position
 * @param {number} end - End position
 * @param {string} strand - Strand ("+" or "-"), optional
 * @returns {Array<Gene>} - Array of genes whose span overlaps [start, end]
 */
export function findOverlappingGenes(chrom, start, end, strand = null) {
  if (!isGeneDataLoaded) {
    console.warn("Gene data not loaded yet. Call loadGeneData first.");
    return [];
  }

  const chromNorm = normalizeChrom(chrom);
  const genes = geneIndex.get(chromNorm);
  if (!genes || genes.length === 0) return [];

  const pme = genePrefixMaxEnd.get(chromNorm);

  // Binary search upper bound: first index where gene.start > end.
  // All genes at index >= upper start after the query end — can't overlap.
  let lo = 0;
  let hi = genes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (genes[mid].start > end) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  const upper = lo;

  // Binary search lower bound using prefixMaxEnd: first index where
  // prefixMaxEnd[i] >= start. All genes before this index have end < start
  // (and so do all genes before them), so they can't overlap.
  let lower = 0;
  if (pme) {
    lo = 0;
    hi = upper; // only search within [0, upper)
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (pme[mid] < start) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    lower = lo;
  }

  // Scan only genes[lower..upper-1] and collect those where gene.end >= start
  const results = [];
  for (let i = lower; i < upper; i++) {
    const gene = genes[i];
    if (gene.end >= start) {
      if (!strand || gene.strand === strand) {
        results.push(gene);
      }
    }
  }
  return results;
}

/**
 * Annotate a node with gene information using exon-level overlap matching.
 *
 * Algorithm:
 *   1. Parse node's exon intervals from the "exons" data field
 *   2. Find span-level candidate genes via chromosome-indexed binary search (fast pre-filter)
 *   3. Filter candidates to those with actual exon-to-exon overlap (two-pointer scan)
 *   4. Sort by exon overlap percentage and attach annotations to the node
 *
 * For nodes without exon data, falls back to span-level matching.
 *
 * @param {Object} node - Cytoscape node
 * @returns {Object} - The node with annotations added
 */
export function annotateNode(node) {
  if (!node || !isGeneDataLoaded) return node;

  const nodeData = node.data();
  const chrom = nodeData.chrom;
  const start = parseInt(nodeData.ref_start);
  const end = parseInt(nodeData.ref_end);
  const strand = nodeData.strand || "+";

  if (!chrom || isNaN(start) || isNaN(end)) {
    // Node doesn't have genomic coordinates
    return node;
  }

  // Parse node's exon intervals (if available)
  const nodeExons = parseExonString(nodeData.exons);
  const hasExonData = nodeExons.length > 0;

  // Step 1: Find span-level candidate genes (fast, uses chromosome index + binary search)
  const candidateGenes = findOverlappingGenes(chrom, start, end, strand);

  // Step 2: Filter to genes with actual exon-level overlap
  let overlappingGenes;
  if (hasExonData) {
    overlappingGenes = candidateGenes.filter((gene) =>
      gene.overlapsExons(nodeExons)
    );
  } else {
    // No node exon data — use all span-level candidates (backward compat)
    overlappingGenes = candidateGenes;
  }

  // Step 3: Sort by exon overlap percentage (or span overlap as fallback)
  if (hasExonData) {
    overlappingGenes.sort(
      (a, b) =>
        b.calculateExonOverlapPercentage(nodeExons) -
        a.calculateExonOverlapPercentage(nodeExons)
    );
  } else {
    overlappingGenes.sort(
      (a, b) =>
        b.calculateOverlapPercentage(start, end) -
        a.calculateOverlapPercentage(start, end)
    );
  }

  if (overlappingGenes.length > 0) {
    // Add the gene annotations to the node data
    node.data(
      "geneAnnotations",
      overlappingGenes.map((gene) => {
        const overlapPct = hasExonData
          ? gene.calculateExonOverlapPercentage(nodeExons)
          : gene.calculateOverlapPercentage(start, end);
        return {
          geneId: gene.geneId,
          geneName: gene.geneName,
          strand: gene.strand,
          start: gene.start,
          end: gene.end,
          exonCount: gene.exons.length,
          overlapPercentage: overlapPct.toFixed(1),
        };
      })
    );

    // Add the first gene name as a node label, but avoid overwriting an existing label
    const primaryGene = overlappingGenes[0];
    const existingGeneName = nodeData.gene_name;
    if (existingGeneName == null || existingGeneName === node.id()) {
      node.data("gene_name", primaryGene.geneName);
    }
  }

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

  cy.nodes().forEach((node) => {
    const nodeData = node.data();
    if (nodeData.chrom && nodeData.ref_start && nodeData.ref_end) {
      nodesWithCoords++;

      const beforeAnnotation = node.data("geneAnnotations")
        ? node.data("geneAnnotations").length
        : 0;

      annotateNode(node);

      const afterAnnotation = node.data("geneAnnotations")
        ? node.data("geneAnnotations").length
        : 0;

      if (afterAnnotation > beforeAnnotation) {
        annotatedCount++;
      }
    }
  });

  // Update node styles to show gene names if they've been annotated
  if (annotatedCount > 0) {
    updateAnnotationStatus(
      `Annotated ${annotatedCount} nodes with gene names`,
      3000
    );

    // If any node was updated, refresh the current view
    if (STATE.cy) {
      STATE.cy.style().update();
    }
  } else {
    updateAnnotationStatus(
      `No nodes could be annotated (${nodesWithCoords} nodes had coordinates)`,
      3000
    );
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

  const geneAnnotations = node.data("geneAnnotations") || [];

  if (!geneAnnotations || geneAnnotations.length === 0) {
    // If no annotations but node has genomic coordinates, show option to annotate
    const nodeData = node.data();

    if (nodeData && nodeData.chrom && nodeData.ref_start && nodeData.ref_end) {
      const noAnnotationsDiv = document.createElement("div");
      noAnnotationsDiv.className = "card mb-3";
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
        const annotateBtn = document.getElementById("annotateNodeBtn");
        if (annotateBtn) {
          annotateBtn.addEventListener("click", async () => {
            if (!isGeneDataLoaded) {
              await loadGeneData();
            }

            if (isGeneDataLoaded) {
              annotateNode(node);
              // Re-render the node info to show the annotations
              const infoContent = document.getElementById("infoContent");
              if (infoContent) {
                infoContent.innerHTML = "";
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

  const geneSection = document.createElement("div");
  geneSection.className = "card mb-3";

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
              <th>Exons</th>
              <th>Overlap</th>
            </tr>
          </thead>
          <tbody>
            ${geneAnnotations
              .map(
                (gene) => `
              <tr>
                <td>
                  <a href="https://www.ncbi.nlm.nih.gov/gene/?term=${
                    gene.geneName
                  }"
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
                <td class="text-center">${gene.exonCount || "-"}</td>
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
            `
              )
              .join("")}
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
  const alertType = isError ? "error" : "info";

  // Check if showAlert is available globally and use it
  if (typeof window.showAlert === "function") {
    window.showAlert(message, alertType, timeout);
  } else {
    // Fallback if showAlert is not available
    let statusDiv = document.getElementById("annotationStatus");
    if (!statusDiv) {
      statusDiv = document.createElement("div");
      statusDiv.id = "annotationStatus";
      document.body.appendChild(statusDiv);
    }

    statusDiv.textContent = message;
    statusDiv.className = isError ? "error" : "";
    statusDiv.classList.remove("d-none", "fade-out");

    if (timeout > 0) {
      setTimeout(() => {
        statusDiv.classList.add("fade-out");
        setTimeout(() => {
          statusDiv.classList.add("d-none");
          statusDiv.classList.remove("fade-out");
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
  if (
    document.getElementById("gene-annotation-styles") ||
    document.querySelector('link[href*="gene-annotations.css"]')
  ) {
    return;
  }

  // Fallback styles if external css is not loaded
  const style = document.createElement("style");
  style.id = "gene-annotation-styles";
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
        if (file.name.endsWith(".gz") || isGzipped(content)) {
          // Decompress gzipped content
          const inflated = pako.inflate(new Uint8Array(content), {
            to: "string",
          });
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
      reject(new Error("Failed to read file"));
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
  return header[0] === 0x1f && header[1] === 0x8b;
}

/**
 * Initialize the gene annotation feature by setting up event listeners
 */
export function initGeneAnnotation() {
  // Add styles
  addGeneAnnotationStyles();

  // Initialize event listeners once DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupGeneAnnotationListeners);
  } else {
    // DOM already ready, set up listeners now
    setupGeneAnnotationListeners();
  }

  // Pre-load gene data in the background for faster annotation later
  setTimeout(() => {
    loadGeneData()
      .catch((err) => {
        console.warn("Gene pre-loading failed:", err);
      });
  }, 1000); // Wait 1 second after initialization to avoid competing with graph loading
}

/**
 * Set up event listeners for the annotation buttons in the modal
 */
function setupGeneAnnotationListeners() {
  // Annotate all nodes button
  const annotateAllBtn = document.getElementById("annotateAllNodesBtn");
  if (annotateAllBtn) {
    // Remove any existing listener to avoid duplicates
    annotateAllBtn.replaceWith(annotateAllBtn.cloneNode(true));
    const newAnnotateAllBtn = document.getElementById("annotateAllNodesBtn");

    // Add fresh event listener
    newAnnotateAllBtn.addEventListener("click", async () => {
      newAnnotateAllBtn.disabled = true;
      newAnnotateAllBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin me-1"></i> Annotating...';

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
              window.showAlert(
                `Successfully annotated ${count} nodes with gene information.`,
                "success",
                3000
              );
            } else {
              window.showAlert(
                "No nodes could be annotated. Make sure nodes have genomic coordinates.",
                "info",
                3000
              );
            }

            // Close modal
            const modal = bootstrap.Modal.getInstance(
              document.getElementById("geneAnnotationModal")
            );
            if (modal) modal.hide();
          } else {
            window.showAlert("No graph loaded", "warning", 3000);
          }
        }
      } catch (err) {
        console.error("Error annotating nodes:", err);
        window.showAlert(`Error: ${err.message}`, "error", 4000);
      } finally {
        newAnnotateAllBtn.disabled = false;
        newAnnotateAllBtn.innerHTML = "Annotate All Nodes";
      }
    });
  }

  // Fixed gene file upload event handling
  const fileInput = document.getElementById("geneFileInput");
  const uploadBtn = document.getElementById("uploadGeneBtn");

  if (fileInput && uploadBtn) {
    // Handle file selection
    fileInput.addEventListener("change", function () {
      uploadBtn.disabled = this.files.length === 0;
    });

    // Handle upload button click
    uploadBtn.addEventListener("click", async () => {
      if (!fileInput || fileInput.files.length === 0) {
        console.warn("No file selected for upload");
        return;
      }

      const file = fileInput.files[0];
      const progressBar = document.getElementById("geneUploadProgress");
      const progressIndicator = progressBar?.querySelector(".progress-bar");

      if (progressBar) progressBar.classList.remove("d-none");
      if (progressIndicator) {
        progressIndicator.style.width = "0%";
        progressIndicator.setAttribute("aria-valuenow", "0");
      }

      try {
        window.showAlert(`Reading gene file: ${file.name}`, "info");

        // Read file content
        const fileContent = await readFileContent(file);

        // Show 50% progress
        if (progressIndicator) {
          progressIndicator.style.width = "50%";
          progressIndicator.setAttribute("aria-valuenow", "50");
        }

        window.showAlert(`Parsing gene data from file...`, "info");

        // Parse the data
        const genes = parseGeneData(fileContent);

        if (genes && genes.length > 0) {
          // Success - set gene database
          geneDatabase = genes;
          isGeneDataLoaded = true;

          // Show 100% progress
          if (progressIndicator) {
            progressIndicator.style.width = "100%";
            progressIndicator.setAttribute("aria-valuenow", "100");
          }

          window.showAlert(
            `Loaded ${genes.length} gene annotations from file`,
            "success",
            3000
          );

          // Close modal after short delay
          setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(
              document.getElementById("geneAnnotationModal")
            );
            if (modal) modal.hide();
          }, 1500);
        } else {
          throw new Error("No genes found in file or invalid format");
        }
      } catch (error) {
        console.error("Error processing gene file:", error);
        if (progressBar) progressBar.classList.add("d-none");
        window.showAlert(
          `Error processing gene file: ${error.message}`,
          "error",
          5000
        );
      }
    });
  } else {
    console.warn("Gene file input or upload button not found in the DOM");
  }

  // Regular button in toolbar (annotation button)
  const geneAnnotationBtn = document.getElementById("geneAnnotationBtn");
  if (geneAnnotationBtn) {
    // Gene annotation button found
  }
}
