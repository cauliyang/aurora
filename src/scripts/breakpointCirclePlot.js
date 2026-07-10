// breakpointCirclePlot.js
// Circos-style breakpoint visualization for TSG edges, anchored to the
// full hg38 human karyotype (chr1..22, chrX, chrY, chrM).
//
// Every (filtered) edge in STATE.cy renders as a directional chord/ribbon
// between its two genomic breakpoints (chr, pos). Identical directional
// chords are deduped into a single ribbon by default; users can toggle
// "Expand all" to fan them out individually.
//
// Per-edge breakpoint source (hybrid):
//   1. edge.data('breakpoints') string of form "chr1,chr2,pos1,pos2,SVTYPE"
//   2. fallback: source.chrom + source.ref_end  ->  target.chrom + target.ref_start
//      SVTYPE inferred as INTRA / INTER.
//
// Honors STATE.minEdgeWeight filter.

import { STATE } from "./graph";

// Monotonic counter used to namespace SVG def IDs uniquely across all circle
// plot renders (see uid in renderCirclePlot). Prevents url(#id) cross-plot bleed.
let _plotSeq = 0;

// Pending hide timer for the shared, selectable breakpoint tooltip.
let _tipHideTimer = null;

// Immediately hide the tooltip and clear any pending delayed-hide timer.
function hideTipNow(tip) {
    if (_tipHideTimer) {
        clearTimeout(_tipHideTimer);
        _tipHideTimer = null;
    }
    if (tip) {
        tip.style.opacity = "0";
        tip.style.transform = "translateY(2px)";
    }
}

// --------------------------------------------------------------------------
// hg38 chromosome sizes (GRCh38.p14 primary assembly)
// --------------------------------------------------------------------------
export const HG38_CHROM_SIZES = {
    chr1: 248956422,
    chr2: 242193529,
    chr3: 198295559,
    chr4: 190214555,
    chr5: 181538259,
    chr6: 170805979,
    chr7: 159345973,
    chr8: 145138636,
    chr9: 138394717,
    chr10: 133797422,
    chr11: 135086622,
    chr12: 133275309,
    chr13: 114364328,
    chr14: 107043718,
    chr15: 101991189,
    chr16: 90338345,
    chr17: 83257441,
    chr18: 80373285,
    chr19: 58617616,
    chr20: 64444167,
    chr21: 46709983,
    chr22: 50818468,
    chrX: 156040895,
    chrY: 57227415,
    chrM: 16569,
};

export const HG38_ORDER = [
    "chr1", "chr2", "chr3", "chr4", "chr5", "chr6", "chr7", "chr8",
    "chr9", "chr10", "chr11", "chr12", "chr13", "chr14", "chr15", "chr16",
    "chr17", "chr18", "chr19", "chr20", "chr21", "chr22", "chrX", "chrY", "chrM",
];

// Accept input chromosomes with or without 'chr' prefix; normalise to hg38 key
export function normaliseChrom(raw) {
    if (raw == null) return null;
    let c = String(raw).trim();
    if (!c) return null;
    if (!/^chr/i.test(c)) c = "chr" + c;
    // Title-case the suffix so 'chrx' -> 'chrX', 'chrmt' -> 'chrM'
    const suffix = c.slice(3).toUpperCase();
    if (suffix === "MT") return "chrM";
    if (/^\d+$/.test(suffix)) return "chr" + suffix;
    if (suffix === "X" || suffix === "Y" || suffix === "M") return "chr" + suffix;
    return c; // unknown / alt contig
}

// --------------------------------------------------------------------------
// SV type color palette
// --------------------------------------------------------------------------
// Distinct, color-blind-friendly palette: every SV type gets its own hue.
// Inter-chromosomal translocations (IT**) sit in the warm/purple band,
// intra-chromosomal rearrangements (IC**) sit in the orange/yellow band,
// and the canonical SV types (INV/DEL/DUP/TRA) keep classic ColorBrewer hues.
export const SV_COLORS = {
    INV: "#e41a1c", // red
    DEL: "#377eb8", // blue
    DUP: "#4daf4a", // green
    TRA: "#984ea3", // purple
    ITTL: "#c51b7d", // magenta/pink
    ITPL: "#6a3d9a", // deep violet
    ICTL: "#ff7f00", // orange
    ICRL: "#b15928", // brown/burnt
    INTRA: "#999999", // mid grey (intra-chr, derived)
    INTER: "#1b9e77", // teal (inter-chr, derived)
    DEFAULT: "#bbbbbb",
};

export function colorFor(svType) {
    return SV_COLORS[svType] || SV_COLORS.DEFAULT;
}

// --------------------------------------------------------------------------
// D3 lazy loader (CDN), shared with exonVisualization.js pattern
// --------------------------------------------------------------------------
export function loadD3() {
    return new Promise((resolve, reject) => {
        if (window.d3) {
            resolve();
            return;
        }
        const script = document.createElement("script");
        script.src = "https://d3js.org/d3.v7.min.js";
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
    });
}

// --------------------------------------------------------------------------
// Edge -> breakpoint extractor
// --------------------------------------------------------------------------
function resolveEdgeLabel(data) {
    if (data.label && String(data.label).trim()) return String(data.label).trim();
    if (data.name && String(data.name).trim()) return String(data.name).trim();
    if (data.id) return String(data.id);
    return `${data.source || "?"} -> ${data.target || "?"}`;
}

// Resolve a gene label for a node from its annotation data. Returns the gene
// name(s) when gene annotations exist, otherwise "NEO" (novel/neo — no known
// overlapping gene). Accepts a Cytoscape node OR a raw node-data object.
export function geneLabelForNode(nodeOrData) {
    if (!nodeOrData) return "NEO";
    const data =
        typeof nodeOrData.data === "function" ? nodeOrData.data() : nodeOrData;
    if (!data) return "NEO";

    const annotations = data.geneAnnotations;
    if (Array.isArray(annotations) && annotations.length > 0) {
        const names = annotations
            .map((g) => g && g.geneName)
            .filter(Boolean);
        if (names.length) {
            // De-duplicate while preserving order.
            return Array.from(new Set(names)).join(", ");
        }
    }

    // Fall back to a meaningful gene_name if present (and not just the node id).
    const gn = data.gene_name;
    if (gn && gn !== data.id && gn !== data.name) return String(gn);

    return "NEO";
}

function parseEdgeBreakpoint(edge) {
    const data = edge.data();
    const bpStr = data.breakpoints;
    const src = edge.source();
    const tgt = edge.target();

    let chr1, chr2, pos1, pos2, svType;

    if (typeof bpStr === "string" && bpStr.length > 0) {
        const parts = bpStr.split(",").map((s) => s.trim());
        if (parts.length >= 5) {
            [chr1, chr2, pos1, pos2, svType] = parts;
            pos1 = Number(pos1);
            pos2 = Number(pos2);
        }
    }

    // Fallback: reconstruct from connected nodes
    if (!chr1 || !chr2 || !Number.isFinite(pos1) || !Number.isFinite(pos2)) {
        if (!src || !tgt) return null;
        chr1 = src.data("chrom");
        chr2 = tgt.data("chrom");
        pos1 = Number(src.data("ref_end"));
        pos2 = Number(tgt.data("ref_start"));
        if (!chr1 || !chr2 || !Number.isFinite(pos1) || !Number.isFinite(pos2)) {
            return null;
        }
        if (!svType) svType = chr1 === chr2 ? "INTRA" : "INTER";
    }

    chr1 = normaliseChrom(chr1);
    chr2 = normaliseChrom(chr2);

    return {
        edgeId: data.id,
        displayLabel: resolveEdgeLabel(data),
        sourceId: data.source,
        targetId: data.target,
        weight: Number(data.weight) || 1,
        chr1,
        chr2,
        pos1,
        pos2,
        svType: (svType || "").toUpperCase() || "DEFAULT",
        sourceGene: src && !src.empty() ? geneLabelForNode(src) : "NEO",
        targetGene: tgt && !tgt.empty() ? geneLabelForNode(tgt) : "NEO",
    };
}

// --------------------------------------------------------------------------
// Collect filtered breakpoints from current cy
// --------------------------------------------------------------------------
function collectBreakpoints() {
    if (!STATE.cy) return { items: [], skipped: [] };
    const minW = Number(STATE.minEdgeWeight) || 1;

    const items = [];
    const skipped = []; // { edgeId, reason }
    const unknownChrs = new Set();

    STATE.cy.edges().forEach((e) => {
        const w = Number(e.data("weight")) || 1;
        if (w < minW) return;

        const bp = parseEdgeBreakpoint(e);
        if (!bp) {
            skipped.push({ edgeId: e.data("id"), reason: "no chr/pos available" });
            return;
        }
        if (!HG38_CHROM_SIZES[bp.chr1] || !HG38_CHROM_SIZES[bp.chr2]) {
            const bad = !HG38_CHROM_SIZES[bp.chr1] ? bp.chr1 : bp.chr2;
            if (!unknownChrs.has(bad)) {
                console.warn(`[breakpointCirclePlot] Unknown chromosome "${bad}" (not in hg38) — skipping affected edges`);
                unknownChrs.add(bad);
            }
            skipped.push({ edgeId: e.data("id"), reason: `unknown chr: ${bad}` });
            return;
        }
        items.push(bp);
    });
    return { items, skipped };
}

// --------------------------------------------------------------------------
// Directional dedup: group by (chr1, pos1, chr2, pos2, svType)
// Source -> target direction is preserved (A->B distinct from B->A).
// SVTYPE is part of the key, so edges with identical endpoints but different
// SV types (e.g. INV vs DEL) stay in separate ribbons, each rendered in its
// own SVTYPE color.
// --------------------------------------------------------------------------
function groupBreakpoints(items) {
    const groups = new Map();
    for (const bp of items) {
        const key = `${bp.chr1}|${bp.pos1}|${bp.chr2}|${bp.pos2}|${bp.svType}`;
        let g = groups.get(key);
        if (!g) {
            g = {
                key,
                coordKey: `${bp.chr1}|${bp.pos1}|${bp.chr2}|${bp.pos2}`,
                chr1: bp.chr1,
                pos1: bp.pos1,
                chr2: bp.chr2,
                pos2: bp.pos2,
                svType: bp.svType,
                members: [],
                sumWeight: 0,
                maxWeight: 0,
            };
            groups.set(key, g);
        }
        g.members.push(bp);
        g.sumWeight += bp.weight;
        if (bp.weight > g.maxWeight) g.maxWeight = bp.weight;
    }

    // Detect groups that share endpoint coords but differ in SVTYPE:
    // assign each a deterministic perpendicular offset rank so their
    // ribbons fan apart slightly instead of stacking on top of each other.
    const coordBuckets = new Map(); // coordKey -> [groupRef, ...]
    for (const g of groups.values()) {
        if (!coordBuckets.has(g.coordKey)) coordBuckets.set(g.coordKey, []);
        coordBuckets.get(g.coordKey).push(g);
    }
    for (const bucket of coordBuckets.values()) {
        if (bucket.length <= 1) {
            bucket[0].offsetRank = 0;
            bucket[0].offsetTotal = 1;
            continue;
        }
        // Sort by svType for stable ordering across re-renders
        bucket.sort((a, b) => a.svType.localeCompare(b.svType));
        const n = bucket.length;
        bucket.forEach((g, i) => {
            // Spread offsets symmetrically around 0: e.g. n=3 -> [-1, 0, 1]
            g.offsetRank = i - (n - 1) / 2;
            g.offsetTotal = n;
        });
    }

    return Array.from(groups.values());
}

// --------------------------------------------------------------------------
// Hit-frequency binning for the radial histogram track.
//
// Counts how many breakpoint ENDPOINTS fall into each genomic bin. Both ends
// (chr1/pos1 and chr2/pos2) of every breakpoint are counted, so the track
// reflects total endpoint density along the genome. Bins are distributed per
// chromosome proportionally to each chromosome's arc so bins map cleanly to
// angles; the total across the genome is ~binCountTarget.
//
// @param {Array} items - breakpoints ({chr1,pos1,chr2,pos2,...})
// @param {Array} karyotype - arcs from buildHumanKaryotype (chr, length, angles)
// @param {number} [binCountTarget=200]
// @returns {{ bins: Array, maxCount: number }}
//   each bin: { chr, binIndex, startPos, endPos, startAngle, endAngle, count }
// --------------------------------------------------------------------------
function computeHitBins(items, karyotype, binCountTarget = 200) {
    const totalLen = karyotype.reduce((s, a) => s + a.length, 0) || 1;

    // Per-chromosome bin descriptors, keyed by chr for fast endpoint lookup.
    const byChr = new Map();
    const bins = [];
    for (const arc of karyotype) {
        // Allocate bins proportional to chromosome length (min 1 per chr).
        const nBins = Math.max(
            1,
            Math.round((arc.length / totalLen) * binCountTarget)
        );
        const binLenBp = arc.length / nBins;
        const angleSpan = arc.endAngle - arc.startAngle;
        const chrBins = [];
        for (let i = 0; i < nBins; i++) {
            const bin = {
                chr: arc.chr,
                binIndex: i,
                startPos: Math.round(i * binLenBp),
                endPos: Math.round((i + 1) * binLenBp),
                startAngle: arc.startAngle + (i / nBins) * angleSpan,
                endAngle: arc.startAngle + ((i + 1) / nBins) * angleSpan,
                count: 0,
            };
            chrBins.push(bin);
            bins.push(bin);
        }
        byChr.set(arc.chr, { arc, nBins, binLenBp, chrBins });
    }

    const hit = (chr, pos) => {
        const entry = byChr.get(chr);
        if (!entry) return;
        let idx = Math.floor(pos / entry.binLenBp);
        if (idx < 0) idx = 0;
        if (idx >= entry.nBins) idx = entry.nBins - 1;
        entry.chrBins[idx].count += 1;
    };

    for (const bp of items) {
        hit(bp.chr1, bp.pos1);
        hit(bp.chr2, bp.pos2);
    }

    let maxCount = 0;
    for (const b of bins) if (b.count > maxCount) maxCount = b.count;

    return { bins, maxCount };
}

// --------------------------------------------------------------------------
// Karyotype: always full hg38, true-proportional with min-arc clamp
// --------------------------------------------------------------------------
function buildHumanKaryotype(breakpoints) {
    const totalLen = HG38_ORDER.reduce((s, c) => s + HG38_CHROM_SIZES[c], 0);
    const gapRad = (Math.PI / 180) * 1.0; // 1° gap between arcs
    const totalGap = gapRad * HG38_ORDER.length;
    const usable = 2 * Math.PI - totalGap;
    const minArc = (Math.PI / 180) * 0.5; // min 0.5° per chromosome

    // First pass: ideal proportional length per chr
    const ideal = HG38_ORDER.map((c) => (HG38_CHROM_SIZES[c] / totalLen) * usable);
    // Enforce minArc: if any chr gets less than minArc, give it minArc and
    // proportionally shrink the rest until total fits `usable`.
    const deficit = ideal.reduce((s, a) => s + Math.max(0, minArc - a), 0);
    if (deficit > 0) {
        const giveable = ideal.reduce((s, a) => s + Math.max(0, a - minArc), 0);
        for (let i = 0; i < ideal.length; i++) {
            if (ideal[i] < minArc) ideal[i] = minArc;
            else ideal[i] = ideal[i] - (ideal[i] - minArc) * (deficit / giveable);
        }
    }

    // Mark active chromosomes (touched by >=1 ribbon)
    const activeChrs = new Set();
    for (const bp of breakpoints) {
        activeChrs.add(bp.chr1);
        activeChrs.add(bp.chr2);
    }

    let cursor = -Math.PI / 2; // start at 12 o'clock
    const arcs = HG38_ORDER.map((chr, i) => {
        const arcLen = ideal[i];
        const a = {
            chr,
            start: 0,
            end: HG38_CHROM_SIZES[chr],
            length: HG38_CHROM_SIZES[chr],
            startAngle: cursor,
            endAngle: cursor + arcLen,
            active: activeChrs.has(chr),
        };
        cursor += arcLen + gapRad;
        return a;
    });

    return arcs;
}

// --------------------------------------------------------------------------
// Render the circle plot
// --------------------------------------------------------------------------
export function renderCirclePlot(container, items, opts = {}) {
    const d3 = window.d3;
    container.innerHTML = "";

    if (!items.length) {
        container.innerHTML = `
      <div class="alert alert-warning m-3">
        <i class="bi bi-exclamation-triangle me-2"></i>
        No breakpoints to plot. Make sure a TSG graph is loaded and the
        <code>MinEdge</code> filter is not too strict.
      </div>`;
        return null;
    }

    const groupsAll = groupBreakpoints(items);
    const expand = !!opts.expand;
    const activeTypes = opts.activeTypes || new Set(items.map((b) => b.svType));

    const karyotype = buildHumanKaryotype(items);
    const chrArcs = new Map(karyotype.map((a) => [a.chr, a]));

    function posToAngle(chr, pos) {
        const a = chrArcs.get(chr);
        if (!a) return null;
        const clamped = Math.max(0, Math.min(pos, a.length));
        const t = clamped / a.length;
        return a.startAngle + t * (a.endAngle - a.startAngle);
    }

    const W = container.clientWidth || 800;
    const H = container.clientHeight || 640;
    const size = Math.min(W, H);
    const outerRadius = size / 2 - 80;
    const innerRadius = outerRadius - 18;
    const accentRadius = innerRadius - 4;     // thin secondary inner ring
    const tickRadius = outerRadius + 6;
    const labelRadius = outerRadius + 22;

    // Radial hit-frequency histogram track sits just inside the chromosome ring
    // and grows INWARD. Reserve a band, then push the ribbons further inward so
    // they don't collide with the track. Scaled to the plot size.
    const showHitTrack = opts.showHitTrack !== false; // default on
    const hitTrackHeight = showHitTrack ? Math.max(16, size * 0.05) : 0;
    const hitTrackBase = accentRadius - 3;                 // outer edge of bars
    const hitTrackMin = hitTrackBase - hitTrackHeight;     // fully-grown bar tip
    const ribbonRadius = (showHitTrack ? hitTrackMin : accentRadius) - 6;

    const svg = d3
        .select(container)
        .append("svg")
        .attr("class", "circle-plot-svg")
        .attr("width", W)
        .attr("height", H)
        .attr("viewBox", `${-W / 2} ${-H / 2} ${W} ${H}`);

    // ----- Defs: radial background, drop shadow, chord gradients (built lazily) -----
    const defs = svg.append("defs");

    // Unique per-render namespace for all SVG def IDs. Multiple circle plots can
    // coexist in the DOM (e.g. the Graph View modal and the Global Analysis
    // dashboard). SVG url(#id) references resolve to the FIRST matching element
    // in document order, so non-unique IDs caused cross-plot bleed — most
    // visibly, chords referencing the wrong gradient and rendering invisible.
    const uid = `cp-${(_plotSeq++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

    // Radial background gradient
    const bgGrad = defs.append("radialGradient").attr("id", `${uid}-bg-grad`)
        .attr("cx", "50%").attr("cy", "50%").attr("r", "75%");
    bgGrad.append("stop").attr("offset", "0%").attr("stop-color", "rgba(120,130,160,0.07)");
    bgGrad.append("stop").attr("offset", "70%").attr("stop-color", "rgba(120,130,160,0.0)");
    bgGrad.append("stop").attr("offset", "100%").attr("stop-color", "rgba(0,0,0,0.0)");

    svg.append("rect")
        .attr("x", -W / 2).attr("y", -H / 2)
        .attr("width", W).attr("height", H)
        .attr("fill", `url(#${uid}-bg-grad)`);

    // Subtle glow halo behind the ring
    const haloGrad = defs.append("radialGradient").attr("id", `${uid}-halo`)
        .attr("cx", "50%").attr("cy", "50%").attr("r", "50%");
    haloGrad.append("stop").attr("offset", "70%").attr("stop-color", "rgba(99,102,241,0.0)");
    haloGrad.append("stop").attr("offset", "92%").attr("stop-color", "rgba(99,102,241,0.10)");
    haloGrad.append("stop").attr("offset", "100%").attr("stop-color", "rgba(99,102,241,0.0)");
    svg.append("circle")
        .attr("r", outerRadius + 28)
        .attr("fill", `url(#${uid}-halo)`);

    // Soft drop shadow filter for ribbons
    const filter = defs.append("filter")
        .attr("id", `${uid}-ribbon-shadow`)
        .attr("x", "-20%").attr("y", "-20%")
        .attr("width", "140%").attr("height", "140%");
    filter.append("feGaussianBlur").attr("in", "SourceAlpha").attr("stdDeviation", 1.2);
    filter.append("feOffset").attr("dx", 0).attr("dy", 0.6).attr("result", "off");
    const merge = filter.append("feMerge");
    merge.append("feMergeNode").attr("in", "off");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    // Drop shadow for chr labels (improves legibility against varied bg)
    const labelFilter = defs.append("filter").attr("id", `${uid}-label-shadow`)
        .attr("x", "-40%").attr("y", "-40%").attr("width", "180%").attr("height", "180%");
    labelFilter.append("feGaussianBlur").attr("in", "SourceAlpha").attr("stdDeviation", 0.6);
    labelFilter.append("feOffset").attr("dx", 0).attr("dy", 0.4).attr("result", "lo");
    const lm = labelFilter.append("feMerge");
    lm.append("feMergeNode").attr("in", "lo");
    lm.append("feMergeNode").attr("in", "SourceGraphic");

    // ----- Chromosome palette: rich, publication-grade.
    // Use d3.interpolateRainbow / Spectral around the genome with per-chr darken.
    const chrColorScale = d3.scaleSequential()
        .domain([0, HG38_ORDER.length - 1])
        .interpolator(d3.interpolateRainbow);
    const chrColor = (chr) => {
        const i = HG38_ORDER.indexOf(chr);
        const base = chrColorScale(i);
        // Slight saturation boost via HCL
        const c = d3.hcl(base);
        c.c = Math.min(c.c * 1.05, 100);
        c.l = Math.max(Math.min(c.l, 70), 50);
        return c.formatHex();
    };

    // Per-chr gradient (inner -> outer subtle shading) for depth
    karyotype.forEach((k) => {
        const c = chrColor(k.chr);
        const base = d3.color(c);
        const dark = base.darker(0.65).formatHex();
        const grad = defs.append("linearGradient")
            .attr("id", `${uid}-chr-${cssSafeAttr(k.chr)}`)
            .attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
        grad.append("stop").attr("offset", "0%").attr("stop-color", c);
        grad.append("stop").attr("offset", "100%").attr("stop-color", dark);
    });

    // ----- Chromosome arcs -----
    const arcGen = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius)
        .cornerRadius(2);
    const accentArcGen = d3.arc()
        .innerRadius(accentRadius - 2)
        .outerRadius(accentRadius)
        .cornerRadius(1);

    const chrG = svg.append("g").attr("class", "chr-ring");

    // Main chr arc (uniform appearance for all chromosomes)
    chrG
        .selectAll("path.chr-arc")
        .data(karyotype)
        .join("path")
        .attr("class", "chr-arc")
        .attr("d", (d) => arcGen({ startAngle: d.startAngle, endAngle: d.endAngle }))
        .attr("fill", (d) => `url(#${uid}-chr-${cssSafeAttr(d.chr)})`)
        .attr("fill-opacity", 1)
        .attr("stroke", "rgba(255,255,255,0.85)")
        .attr("stroke-width", 0.8)
        .style("filter", "drop-shadow(0 1px 1px rgba(0,0,0,0.10))")
        .append("title")
        .text((d) => `${d.chr}\nlength: ${d.length.toLocaleString()} bp${d.active ? " (has breakpoints)" : ""}`);

    // Inner accent ring (thin, uniform)
    chrG
        .selectAll("path.chr-accent")
        .data(karyotype)
        .join("path")
        .attr("class", "chr-accent")
        .attr("d", (d) => accentArcGen({ startAngle: d.startAngle, endAngle: d.endAngle }))
        .attr("fill", (d) => chrColor(d.chr))
        .attr("fill-opacity", 0.55);

    // ----- Chromosome labels -----
    chrG
        .selectAll("text.chr-label")
        .data(karyotype)
        .join("text")
        .attr("class", "chr-label")
        .attr("transform", (d) => {
            const mid = (d.startAngle + d.endAngle) / 2;
            const x = Math.cos(mid - Math.PI / 2) * labelRadius;
            const y = Math.sin(mid - Math.PI / 2) * labelRadius;
            const deg = ((mid - Math.PI / 2) * 180) / Math.PI;
            const flip = deg > 90 && deg < 270 ? 180 : 0;
            return `translate(${x},${y}) rotate(${deg + flip})`;
        })
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-family", "'Inter','Helvetica Neue',Arial,sans-serif")
        .style("font-size", "12px")
        .style("font-weight", "700")
        .style("fill", "#1a1a2e")
        .style("letter-spacing", "0.5px")
        .style("filter", `url(#${uid}-label-shadow)`)
        .text((d) => d.chr.replace(/^chr/, ""));

    // ----- Tooltip (solid card, no blur) -----
    // Interactive + selectable: the user can move the pointer into the tooltip
    // and select/copy its text. A short hide delay bridges the gap between the
    // ribbon and the tooltip; hovering the tooltip cancels the pending hide.
    let tip = document.getElementById("circle-plot-tooltip");
    if (!tip) {
        tip = document.createElement("div");
        tip.id = "circle-plot-tooltip";
        tip.style.cssText = `
      position: fixed; pointer-events: auto; opacity: 0;
      user-select: text; -webkit-user-select: text; cursor: text;
      background: #15171f;
      color: #f5f6fa;
      padding: 10px 12px; border-radius: 10px; font-size: 12px;
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 10px 30px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.25);
      z-index: 2000; max-width: 340px; line-height: 1.5;
      font-family: 'Inter','Helvetica Neue',Arial,sans-serif;
      transition: opacity 140ms ease, transform 140ms ease;
      transform: translateY(2px);
    `;
        document.body.appendChild(tip);
        // Keep the tooltip open while the pointer is over it (so text can be
        // selected), hide it once the pointer truly leaves.
        tip.addEventListener("mouseenter", () => {
            if (_tipHideTimer) {
                clearTimeout(_tipHideTimer);
                _tipHideTimer = null;
            }
        });
        tip.addEventListener("mouseleave", () => hideTipNow(tip));
    }
    function showTip(html, evt) {
        if (_tipHideTimer) {
            clearTimeout(_tipHideTimer);
            _tipHideTimer = null;
        }
        tip.innerHTML = html;
        tip.style.opacity = "1";
        tip.style.transform = "translateY(0)";
        positionTip(evt);
    }
    function positionTip(evt) {
        const pad = 16;
        tip.style.left = `${evt.clientX + pad}px`;
        tip.style.top = `${evt.clientY + pad}px`;
    }
    // Schedule a delayed hide so the pointer can travel into the tooltip.
    function hideTip() {
        if (_tipHideTimer) clearTimeout(_tipHideTimer);
        _tipHideTimer = setTimeout(() => hideTipNow(tip), 260);
    }

    // ----- Hit-frequency histogram track (radial, inward bars) -----
    // Counts breakpoint endpoints per genomic bin and draws a density track
    // just inside the chromosome ring. Reflects total endpoint frequency across
    // whatever items are shown (single graph or all graphs in Global Analysis).
    if (showHitTrack) {
        const { bins: hitBins, maxCount: maxHit } = computeHitBins(
            items,
            karyotype
        );

        if (maxHit > 0) {
            const hitG = svg.append("g").attr("class", "hit-track");

            // Faint baseline ring at the track's outer edge for a "track" feel.
            hitG.append("circle")
                .attr("class", "hit-track-baseline")
                .attr("r", hitTrackBase)
                .attr("fill", "none")
                .attr("stroke", "rgba(0,0,0,0.10)")
                .attr("stroke-width", 0.75);

            const heightScale = d3
                .scaleLinear()
                .domain([0, maxHit])
                .range([0, hitTrackHeight])
                .clamp(true);

            const hitArc = d3.arc()
                .startAngle((d) => d.startAngle)
                .endAngle((d) => d.endAngle)
                .innerRadius((d) => hitTrackBase - heightScale(d.count))
                .outerRadius(hitTrackBase)
                .padAngle(0)
                .cornerRadius(0.5);

            hitG.selectAll("path.hit-bar")
                .data(hitBins.filter((b) => b.count > 0))
                .join("path")
                .attr("class", "hit-bar")
                .attr("d", hitArc)
                .attr("fill", (d) => chrColor(d.chr))
                .attr("fill-opacity", 0.85)
                .attr("stroke", "none")
                .on("mousemove", (event, d) => {
                    showTip(
                        `<div style="font-weight:700;margin-bottom:2px;">${d.chr}:${d.startPos.toLocaleString()}\u2013${d.endPos.toLocaleString()}</div>` +
                        `<div><strong>${d.count.toLocaleString()}</strong> breakpoint endpoint${d.count === 1 ? "" : "s"}</div>`,
                        event
                    );
                })
                .on("mouseleave", hideTip);
        }
    }

    // ----- Weight scales -----
    const weights = items.map((b) => b.weight);
    const maxW = Math.max(...weights, 1);
    const minWv = Math.min(...weights, 1);
    const widthScale = d3.scaleLinear().domain([minWv, maxW]).range([1.2, 4.5]).clamp(true);
    const opacityScale = d3.scaleLinear().domain([minWv, maxW]).range([0.55, 0.92]).clamp(true);

    // ----- Ribbons -----
    const ribbonsG = svg.append("g")
        .attr("class", "ribbons")
        .style("filter", `url(#${uid}-ribbon-shadow)`);

    // Cubic Bezier "pulled to origin" — produces smooth chord curves akin to d3.chord
    function ribbonPath(p1, p2, offsetFrac = 0) {
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        const len = Math.hypot(mx, my) || 1;
        const px = -my / len;
        const py = mx / len;
        const chordLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const offset = offsetFrac * chordLen * 0.16;
        // Two control points pulled ~75% toward origin from each endpoint, offset perpendicular
        const c1x = p1.x * 0.18 + px * offset;
        const c1y = p1.y * 0.18 + py * offset;
        const c2x = p2.x * 0.18 + px * offset;
        const c2y = p2.y * 0.18 + py * offset;
        return `M ${p1.x},${p1.y} C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
    }

    function pointForAngle(angle, r) {
        return {
            x: Math.cos(angle - Math.PI / 2) * r,
            y: Math.sin(angle - Math.PI / 2) * r,
        };
    }

    // Build per-ribbon directional gradients in defs (source -> darker target)
    let gradSeq = 0;
    function makeChordGradient(p1, p2, color) {
        const id = `${uid}-chord-grad-${gradSeq++}`;
        const dark = d3.color(color).darker(0.7).formatHex();
        const light = d3.color(color).brighter(0.15).formatHex();
        defs.append("linearGradient")
            .attr("id", id)
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", p1.x).attr("y1", p1.y)
            .attr("x2", p2.x).attr("y2", p2.y)
            .call((g) => {
                g.append("stop").attr("offset", "0%").attr("stop-color", light).attr("stop-opacity", 1);
                g.append("stop").attr("offset", "55%").attr("stop-color", color).attr("stop-opacity", 1);
                g.append("stop").attr("offset", "100%").attr("stop-color", dark).attr("stop-opacity", 1);
            });
        return `url(#${id})`;
    }

    // Helper: animate a ribbon's stroke-dash for an "entry" reveal effect.
    function animateEntry(pathSel, idx) {
        const node = pathSel.node();
        if (!node || !node.getTotalLength) return;
        const total = node.getTotalLength();
        pathSel
            .attr("stroke-dasharray", `${total} ${total}`)
            .attr("stroke-dashoffset", total)
            .transition()
            .delay(60 + idx * 8)
            .duration(650)
            .ease(d3.easeCubicOut)
            .attr("stroke-dashoffset", 0)
            .on("end", function() {
                d3.select(this).attr("stroke-dasharray", null);
            });
    }

    if (expand) {
        // Fan-out: one path per member, jittered offset
        items.forEach((bp, idx) => {
            const a1 = posToAngle(bp.chr1, bp.pos1);
            const a2 = posToAngle(bp.chr2, bp.pos2);
            if (a1 == null || a2 == null) return;
            const p1 = pointForAngle(a1, ribbonRadius);
            const p2 = pointForAngle(a2, ribbonRadius);

            // Deterministic offset based on edgeId hash for stability
            const offsetFrac = (hashCode(bp.edgeId || "") % 11) / 5 - 1; // [-1, 1]
            const color = colorFor(bp.svType);
            const grad = makeChordGradient(p1, p2, color);
            const baseWidth = widthScale(bp.weight);
            const baseOpacity = opacityScale(bp.weight);

            const path = ribbonsG
                .append("path")
                .attr("d", ribbonPath(p1, p2, offsetFrac))
                .attr("fill", "none")
                .attr("stroke", grad)
                .attr("stroke-linecap", "round")
                .attr("stroke-width", baseWidth)
                .attr("stroke-opacity", baseOpacity)
                .attr("data-edge-id", bp.edgeId)
                .attr("data-sv-type", bp.svType)
                .style("display", activeTypes.has(bp.svType) ? null : "none")
                .style("cursor", "pointer")
                .on("mouseenter", function(evt) {
                    d3.select(this)
                        .interrupt()
                        .transition().duration(140).ease(d3.easeCubicOut)
                        .attr("stroke-opacity", 1)
                        .attr("stroke-width", baseWidth + 2);
                    showTip(singleEdgeTooltip(bp, color), evt);
                })
                .on("mousemove", positionTip)
                .on("mouseleave", function() {
                    d3.select(this)
                        .interrupt()
                        .transition().duration(220).ease(d3.easeCubicOut)
                        .attr("stroke-opacity", baseOpacity)
                        .attr("stroke-width", baseWidth);
                    hideTip();
                })
                .on("click", () => focusEdgeOnGraph(bp.edgeId, bp.graphIndex ?? null));

            animateEntry(path, idx);
        });
    } else {
        // Pre-pass: pixel-bin endpoints to detect near-collision groups whose
        // chord endpoints land on (almost) the same pixel even though their
        // genomic coords differ. Without this, multiple distinct ribbons stack
        // into one visible line on long chromosomes (e.g. four chr8 breakpoints
        // within a 1 kb window collapse to one pixel on a ~5° arc).
        const PIXEL_BIN = 4; // px — endpoints within this distance are "near-collision"
        const enriched = groupsAll
            .map((g) => {
                const a1 = posToAngle(g.chr1, g.pos1);
                const a2 = posToAngle(g.chr2, g.pos2);
                if (a1 == null || a2 == null) return null;
                const p1 = pointForAngle(a1, ribbonRadius);
                const p2 = pointForAngle(a2, ribbonRadius);
                return { g, a1, a2, p1, p2 };
            })
            .filter(Boolean);

        // Build pixel-bucket key: round each endpoint to PIXEL_BIN grid.
        // Direction-preserving (source bucket then target bucket).
        const pixelBuckets = new Map();
        enriched.forEach((e) => {
            const k = [
                Math.round(e.p1.x / PIXEL_BIN),
                Math.round(e.p1.y / PIXEL_BIN),
                Math.round(e.p2.x / PIXEL_BIN),
                Math.round(e.p2.y / PIXEL_BIN),
            ].join(":");
            if (!pixelBuckets.has(k)) pixelBuckets.set(k, []);
            pixelBuckets.get(k).push(e);
        });

        // Assign a pixel-collision offset rank within each bucket so ribbons
        // landing on the same pixel fan apart deterministically.
        pixelBuckets.forEach((bucket) => {
            if (bucket.length <= 1) {
                bucket[0].pixelOffsetFrac = 0;
                return;
            }
            // Stable ordering across re-renders: by group key
            bucket.sort((a, b) => a.g.key.localeCompare(b.g.key));
            const n = bucket.length;
            bucket.forEach((e, i) => {
                // Spread symmetrically: e.g. n=4 -> [-1.5, -0.5, 0.5, 1.5]/n
                e.pixelOffsetFrac = ((i - (n - 1) / 2) / n) * 2.5;
            });
        });

        // Dedup mode: one path per directional (chr1,pos1,chr2,pos2,svType) group.
        enriched.forEach(({ g, p1, p2, pixelOffsetFrac }, idx) => {
            const color = colorFor(g.svType);
            const count = g.members.length;

            // Combine SVTYPE-collision offset (existing) with pixel-collision offset.
            const svTypeOffset =
                g.offsetTotal && g.offsetTotal > 1
                    ? (g.offsetRank / g.offsetTotal) * 1.5
                    : 0;
            const offsetFrac = svTypeOffset + pixelOffsetFrac;

            const grad = makeChordGradient(p1, p2, color);
            const baseWidth = widthScale(g.sumWeight);
            const baseOpacity = opacityScale(g.maxWeight);

            const path = ribbonsG
                .append("path")
                .attr("d", ribbonPath(p1, p2, offsetFrac))
                .attr("fill", "none")
                .attr("stroke", grad)
                .attr("stroke-linecap", "round")
                .attr("stroke-width", baseWidth)
                .attr("stroke-opacity", baseOpacity)
                .attr("data-group-key", g.key)
                .attr("data-sv-type", g.svType)
                .style("display", activeTypes.has(g.svType) ? null : "none")
                .style("cursor", "pointer")
                .on("mouseenter", function(evt) {
                    d3.select(this)
                        .interrupt()
                        .transition().duration(140).ease(d3.easeCubicOut)
                        .attr("stroke-opacity", 1)
                        .attr("stroke-width", baseWidth + 2);
                    showTip(groupTooltip(g, color), evt);
                })
                .on("mousemove", positionTip)
                .on("mouseleave", function() {
                    d3.select(this)
                        .interrupt()
                        .transition().duration(220).ease(d3.easeCubicOut)
                        .attr("stroke-opacity", baseOpacity)
                        .attr("stroke-width", baseWidth);
                    hideTip();
                })
                .on("click", () => {
                    focusEdgeOnGraph(
                        g.members[0].edgeId,
                        g.members[0].graphIndex ?? null
                    );
                });

            animateEntry(path, idx);

            // Count badge for groups with >1 member
            if (count > 1) {
                const mx = (p1.x + p2.x) / 2;
                const my = (p1.y + p2.y) / 2;
                const len = Math.hypot(mx, my) || 1;
                const px = -my / len;
                const py = mx / len;
                const chordLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                const off = offsetFrac * chordLen * 0.16;
                const bx = mx * 0.45 + px * off * 0.45;
                const by = my * 0.45 + py * off * 0.45;
                const badgeG = svg
                    .append("g")
                    .attr("class", "ribbon-count-badge")
                    .attr("data-sv-type", g.svType)
                    .attr("transform", `translate(${bx},${by})`)
                    .style("pointer-events", "none")
                    .style("display", activeTypes.has(g.svType) ? null : "none")
                    .style("opacity", 0);

                // Build a soft halo + badge
                const badgeColor = d3.color(color);
                const badgeGrad = defs.append("radialGradient")
                    .attr("id", `${uid}-badge-${gradSeq++}`)
                    .attr("cx", "50%").attr("cy", "40%").attr("r", "60%");
                badgeGrad.append("stop").attr("offset", "0%")
                    .attr("stop-color", badgeColor.brighter(0.6).formatHex());
                badgeGrad.append("stop").attr("offset", "100%")
                    .attr("stop-color", badgeColor.darker(0.3).formatHex());
                const gradId = badgeGrad.attr("id");

                badgeG.append("circle")
                    .attr("r", 10.5)
                    .attr("fill", `url(#${gradId})`)
                    .attr("stroke", "rgba(255,255,255,0.92)")
                    .attr("stroke-width", 1.4)
                    .style("filter", "drop-shadow(0 1.5px 3px rgba(0,0,0,0.25))");
                badgeG.append("text")
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "central")
                    .style("font-family", "'Inter','Helvetica Neue',Arial,sans-serif")
                    .style("font-size", "10px")
                    .style("font-weight", "800")
                    .style("fill", "#ffffff")
                    .style("letter-spacing", "0.3px")
                    .text(`×${count}`);

                badgeG.transition()
                    .delay(60 + idx * 8 + 400)
                    .duration(260)
                    .ease(d3.easeBackOut)
                    .style("opacity", 1);
            }
        });
    }

    return { svg, karyotype, groupsAll, expand, activeTypes };
}

const TIP_COORD_STYLE =
    "font-family:'JetBrains Mono','SF Mono',Menlo,monospace;font-size:11.5px;letter-spacing:.2px;";

function svBadge(color, type) {
    return `<span style="display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:999px;background:${color}33;color:${color};font-weight:700;font-size:10.5px;letter-spacing:.3px;text-transform:uppercase">
      <span style="width:7px;height:7px;border-radius:50%;background:${color};box-shadow:0 0 6px ${color}"></span>${escapeHtml(type)}
    </span>`;
}

// Gene info row: source node gene -> target node gene (or NEO when absent).
function geneTooltipRow(sourceGene, targetGene) {
    const fmt = (g) => {
        const val = g && String(g).trim() ? String(g) : "NEO";
        const isNeo = val === "NEO";
        return `<span style="color:${isNeo ? "#f59e0b" : "#7dd3fc"};font-weight:600">${escapeHtml(val)}</span>`;
    };
    return `
    <div style="margin-top:6px;font-size:11px;opacity:.9;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
      <span style="opacity:.6">gene</span>
      ${fmt(sourceGene)}
      <span style="opacity:.6">&rarr;</span>
      ${fmt(targetGene)}
    </div>`;
}

function singleEdgeTooltip(bp, color) {
    return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      ${svBadge(color, bp.svType)}
      <strong style="font-size:13px">${escapeHtml(bp.displayLabel)}</strong>
    </div>
    <div style="${TIP_COORD_STYLE}opacity:.95">
      ${bp.chr1}:${bp.pos1.toLocaleString()} &rarr; ${bp.chr2}:${bp.pos2.toLocaleString()}
    </div>
    ${geneTooltipRow(bp.sourceGene, bp.targetGene)}
    <div style="display:flex;gap:14px;margin-top:6px;font-size:11px;opacity:.85">
      <div><span style="opacity:.6">weight</span> <strong>${bp.weight}</strong></div>
      <div style="${TIP_COORD_STYLE}opacity:.6">id ${escapeHtml(bp.edgeId || "—")}</div>
    </div>
    <div style="opacity:.55;margin-top:6px;font-size:10.5px;font-style:italic">click to focus on graph</div>`;
}

function groupTooltip(g, color) {
    const geneInline = (m) => {
        const s = m.sourceGene && String(m.sourceGene).trim() ? m.sourceGene : "NEO";
        const t = m.targetGene && String(m.targetGene).trim() ? m.targetGene : "NEO";
        const fmt = (v) =>
            `<span style="color:${v === "NEO" ? "#f59e0b" : "#7dd3fc"}">${escapeHtml(v)}</span>`;
        return `<div style="opacity:.7;font-size:10.5px;margin-left:12px">${fmt(s)} &rarr; ${fmt(t)}</div>`;
    };
    const memberRows = g.members
        .slice(0, 6)
        .map(
            (m) =>
                `<div style="opacity:.92;font-size:11.5px">
          <div style="display:flex;justify-content:space-between;gap:10px">
            <span><span style="color:${color}">&bull;</span> ${escapeHtml(m.displayLabel)}</span>
            <span style="opacity:.55;font-family:'JetBrains Mono','SF Mono',Menlo,monospace">w=${m.weight}</span>
          </div>
          ${geneInline(m)}
         </div>`
        )
        .join("");
    const more = g.members.length > 6
        ? `<div style="opacity:.55;font-size:11px;margin-top:2px">... and ${g.members.length - 6} more</div>`
        : "";
    return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      ${svBadge(color, g.svType)}
      <strong style="font-size:13px">${g.members.length} edge${g.members.length === 1 ? "" : "s"}</strong>
      <span style="opacity:.55;font-size:11px">&middot; &Sigma;w=${g.sumWeight}</span>
    </div>
    <div style="${TIP_COORD_STYLE}opacity:.95">
      ${g.chr1}:${g.pos1.toLocaleString()} &rarr; ${g.chr2}:${g.pos2.toLocaleString()}
    </div>
    <div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.12)">
      ${memberRows}${more}
    </div>
    <div style="opacity:.55;margin-top:6px;font-size:10.5px;font-style:italic">click to focus first edge &middot; toggle Expand to see each</div>`;
}

// --------------------------------------------------------------------------
// Click-through: select the matching edge on the cytoscape graph
// --------------------------------------------------------------------------
export function focusEdgeOnGraph(edgeId, graphIndex = null) {
    if (!edgeId) return;

    // Cross-graph navigation: if the edge lives in a different graph than the
    // one currently loaded, switch to that graph first, then focus the edge.
    if (
        graphIndex != null &&
        graphIndex !== STATE.currentGraphIndex &&
        STATE.graph_jsons &&
        graphIndex >= 0 &&
        graphIndex < STATE.graph_jsons.length
    ) {
        if (window.loadGraphByIndex && window.loadGraphByIndex(graphIndex, false)) {
            // Defer focus until the new graph is rendered into cy.
            requestAnimationFrame(() => focusEdgeOnGraph(edgeId, null));
        }
        return;
    }

    if (!STATE.cy) return;
    const ele = STATE.cy.getElementById(edgeId);
    if (!ele || ele.empty()) return;

    STATE.cy.elements().unselect();
    ele.select();

    import("./graphUtilities.js").then((m) => {
        const infoContent = document.getElementById("infoContent");
        if (infoContent && m.displayElementInfo) m.displayElementInfo(ele, infoContent);
    });

    STATE.cy.animate(
        { center: { eles: ele.connectedNodes().add(ele) }, zoom: 1.4 },
        { duration: 350 }
    );
    window.showAlert?.(`Focused edge ${edgeId}`, "info", 1500);
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
function escapeHtml(s) {
    if (s == null) return "";
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function hashCode(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

// --------------------------------------------------------------------------
// Modal lifecycle (Bootstrap)
// --------------------------------------------------------------------------
export function ensureStyles() {
    if (document.getElementById("circle-plot-styles")) return;
    const style = document.createElement("style");
    style.id = "circle-plot-styles";
    style.textContent = `
    #breakpointCirclePlotModal .modal-dialog { max-width: 96%; width: 1180px; }
    #breakpointCirclePlotModal .modal-content {
      border: none; border-radius: 16px; overflow: hidden;
      box-shadow: 0 20px 60px rgba(20,20,40,0.25);
    }
    #breakpointCirclePlotModal .modal-header {
      background: linear-gradient(135deg, #ffffff 0%, #f7f8fb 100%);
      border-bottom: 1px solid rgba(0,0,0,0.06);
      padding: 14px 22px;
    }
    [data-theme="dark"] #breakpointCirclePlotModal .modal-header {
      background: linear-gradient(135deg, #1a1c25 0%, #14161e 100%);
      border-bottom-color: rgba(255,255,255,0.06);
    }
    #breakpointCirclePlotModal .modal-title {
      font-family: 'Inter','Helvetica Neue',Arial,sans-serif;
      font-weight: 700; letter-spacing: -0.01em;
      display: inline-flex; align-items: center; gap: 6px;
      /* Override the global .modal-header { color: white } so the title is
         readable against this modal's light header background. */
      color: #1a1a2e;
    }
    [data-theme="dark"] #breakpointCirclePlotModal .modal-title {
      color: #f1f5f9;
    }
    #breakpointCirclePlotModal .modal-title i {
      background: linear-gradient(135deg,#6366f1,#a855f7);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
      font-size: 1.1em;
    }
    #breakpointCirclePlotModal .modal-body { padding: 0; }
    #circlePlotContainer {
      width: 100%; height: 700px;
      background:
        radial-gradient(ellipse at center, rgba(99,102,241,0.04) 0%, rgba(255,255,255,0) 65%),
        linear-gradient(180deg, #fafbfd 0%, #f1f3f8 100%);
      position: relative;
    }
    [data-theme="dark"] #circlePlotContainer {
      background:
        radial-gradient(ellipse at center, rgba(99,102,241,0.08) 0%, rgba(0,0,0,0) 65%),
        linear-gradient(180deg, #0f1117 0%, #15181f 100%);
    }
    .circle-plot-svg {
      display: block; margin: 0 auto;
      shape-rendering: geometricPrecision;
      text-rendering: optimizeLegibility;
    }
    #circlePlotLegend {
      display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
      padding: 12px 18px;
      border-top: 1px solid rgba(0,0,0,0.06);
      background: linear-gradient(180deg, #fbfcfe 0%, #f3f5fa 100%);
      font-size: 12px;
    }
    [data-theme="dark"] #circlePlotLegend {
      border-top-color: rgba(255,255,255,0.06);
      background: linear-gradient(180deg, #14161e 0%, #1a1c25 100%);
    }
    .cp-legend-chip {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 5px 11px; border-radius: 999px;
      border: 1px solid rgba(0,0,0,0.08);
      cursor: pointer; user-select: none;
      background: #ffffff;
      transition: all 160ms cubic-bezier(.4,0,.2,1);
      font-family: 'Inter','Helvetica Neue',Arial,sans-serif;
      font-weight: 600; font-size: 11.5px;
      letter-spacing: 0.2px;
      color: #1a1a2e;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    [data-theme="dark"] .cp-legend-chip {
      background: #1f2230;
      color: #e5e7eb; border-color: rgba(255,255,255,0.08);
    }
    .cp-legend-chip:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(0,0,0,0.10);
    }
    .cp-legend-chip.disabled {
      opacity: 0.32;
      filter: grayscale(0.5);
    }
    .cp-legend-chip.disabled:hover { transform: none; }
    .cp-legend-swatch {
      width: 11px; height: 11px; border-radius: 50%; display: inline-block;
      box-shadow: 0 0 0 1.5px rgba(255,255,255,0.7), 0 1px 3px rgba(0,0,0,0.2);
    }
    #circlePlotStats {
      font-size: 11.5px; color: #475569;
      padding: 10px 18px;
      border-top: 1px solid rgba(0,0,0,0.06);
      background: rgba(255,255,255,0.5);
      font-family: 'Inter','Helvetica Neue',Arial,sans-serif;
      letter-spacing: 0.15px;
    }
    [data-theme="dark"] #circlePlotStats {
      color: #94a3b8;
      border-top-color: rgba(255,255,255,0.06);
      background: rgba(0,0,0,0.2);
    }
    #circlePlotStats strong { color: #1a1a2e; font-weight: 700; }
    [data-theme="dark"] #circlePlotStats strong { color: #f1f5f9; }
    #circlePlotExpandBtn, #circlePlotExportBtn {
      border-radius: 8px; font-weight: 600;
      transition: all 160ms cubic-bezier(.4,0,.2,1);
    }
    #circlePlotExportBtn {
      background: linear-gradient(135deg,#6366f1,#a855f7);
      border: none; color: #fff;
      box-shadow: 0 2px 8px rgba(99,102,241,0.35);
    }
    #circlePlotExportBtn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(99,102,241,0.5);
    }
    .chr-label { pointer-events: none; }
    .ribbon-count-badge text { user-select: none; }
    .ribbons path { transition: stroke-width 160ms cubic-bezier(.4,0,.2,1); }
    .hit-track .hit-bar { cursor: crosshair; transition: fill-opacity 140ms ease; }
    .hit-track .hit-bar:hover { fill-opacity: 1; }
  `;
    document.head.appendChild(style);
}

function ensureModal() {
    let modal = document.getElementById("breakpointCirclePlotModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "breakpointCirclePlotModal";
    modal.className = "modal fade";
    modal.tabIndex = -1;
    modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-circle-half me-2"></i> Breakpoint Circle Plot
            <small class="text-muted ms-2" style="font-size:.7em;font-weight:400">hg38</small>
          </h5>
          <div class="ms-auto d-flex align-items-center gap-2">
            <button id="circlePlotExpandBtn" type="button" class="btn btn-sm btn-outline-secondary" title="Toggle dedup / expand">
              <i class="bi bi-arrows-collapse me-1"></i> Grouped
            </button>
            <button id="circlePlotExportBtn" type="button" class="btn btn-sm btn-primary" title="Export SVG">
              <i class="bi bi-download me-1"></i> SVG
            </button>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
        </div>
        <div class="modal-body">
          <div id="circlePlotContainer"></div>
          <div id="circlePlotLegend"></div>
          <div id="circlePlotStats"></div>
        </div>
      </div>
    </div>
  `;
    document.body.appendChild(modal);
    return modal;
}

export function renderLegend(legendEl, types, activeTypes, onToggle) {
    legendEl.innerHTML = "";
    types.forEach((t) => {
        const chip = document.createElement("span");
        chip.className = "cp-legend-chip";
        if (!activeTypes.has(t)) chip.classList.add("disabled");
        chip.innerHTML = `
      <span class="cp-legend-swatch" style="background:${colorFor(t)}"></span>
      <span>${t}</span>`;
        chip.addEventListener("click", () => {
            if (activeTypes.has(t)) activeTypes.delete(t);
            else activeTypes.add(t);
            chip.classList.toggle("disabled");
            onToggle();
        });
        legendEl.appendChild(chip);
    });
}

function exportSvg(svgEl) {
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], {
        type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `breakpoint_circle_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.svg`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
    }, 100);
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------
export async function showBreakpointCirclePlotModal(focusEdgeId = null) {
    if (!STATE.cy) {
        window.showAlert?.("Load a graph first to view breakpoints.", "warning", 2500);
        return;
    }

    ensureStyles();
    const modal = ensureModal();

    try {
        await loadD3();
    } catch (err) {
        console.error("Failed to load D3", err);
        window.showAlert?.("Failed to load D3.js from CDN.", "error");
        return;
    }

    const bpInstance = new bootstrap.Modal(modal);

    const state = {
        items: [],
        skipped: [],
        activeTypes: new Set(),
        expand: false,
    };

    function rerender() {
        const container = document.getElementById("circlePlotContainer");
        renderCirclePlot(container, state.items, {
            expand: state.expand,
            activeTypes: state.activeTypes,
        });

        // After rerender, re-apply focus pulse if requested
        if (focusEdgeId) {
            const sel = state.expand
                ? `path[data-edge-id="${cssSafeAttr(focusEdgeId)}"]`
                : null;
            if (sel) {
                const p = container.querySelector(sel);
                if (p) {
                    p.setAttribute("stroke-width", "5");
                    p.setAttribute("stroke-opacity", "1");
                }
            }
        }
    }

    const onShown = () => {
        const legendEl = document.getElementById("circlePlotLegend");
        const statsEl = document.getElementById("circlePlotStats");
        const expandBtn = document.getElementById("circlePlotExpandBtn");

        const { items, skipped } = collectBreakpoints();
        state.items = items;
        state.skipped = skipped;
        const types = Array.from(new Set(items.map((b) => b.svType))).sort();
        state.activeTypes = new Set(types);
        state.expand = false;

        rerender();

        renderLegend(legendEl, types, state.activeTypes, () => {
            // Toggle display via re-applying filter on existing paths AND count badges
            const container = document.getElementById("circlePlotContainer");
            const svg = container.querySelector("svg");
            if (!svg) return;
            const filterFn = function() {
                const t = this.getAttribute("data-sv-type");
                return state.activeTypes.has(t) ? null : "none";
            };
            const d3sel = window.d3.select(svg);
            d3sel.selectAll(".ribbons path").style("display", filterFn);
            d3sel.selectAll(".ribbon-count-badge").style("display", filterFn);
        });

        // Group/Expand toggle
        if (expandBtn) {
            const clone = expandBtn.cloneNode(true);
            expandBtn.parentNode.replaceChild(clone, expandBtn);
            clone.addEventListener("click", () => {
                state.expand = !state.expand;
                clone.innerHTML = state.expand
                    ? '<i class="bi bi-arrows-expand me-1"></i> Expanded'
                    : '<i class="bi bi-arrows-collapse me-1"></i> Grouped';
                clone.classList.toggle("btn-outline-secondary", !state.expand);
                clone.classList.toggle("btn-secondary", state.expand);
                rerender();
                updateStats(statsEl, state);
            });
        }

        updateStats(statsEl, state);

        // SVG export
        const exportBtn = document.getElementById("circlePlotExportBtn");
        if (exportBtn) {
            const clone = exportBtn.cloneNode(true);
            exportBtn.parentNode.replaceChild(clone, exportBtn);
            clone.addEventListener("click", () => {
                const container = document.getElementById("circlePlotContainer");
                const svg = container.querySelector("svg");
                exportSvg(svg);
            });
        }
    };

    modal.addEventListener("shown.bs.modal", onShown, { once: true });
    modal.addEventListener(
        "hidden.bs.modal",
        () => {
            const container = document.getElementById("circlePlotContainer");
            if (container) container.innerHTML = "";
            const tip = document.getElementById("circle-plot-tooltip");
            if (tip) tip.style.opacity = "0";
        },
        { once: true }
    );

    bpInstance.show();
}

function updateStats(statsEl, state) {
    if (!statsEl) return;
    const groups = groupBreakpoints(state.items);
    const chrSet = new Set();
    state.items.forEach((b) => {
        chrSet.add(b.chr1);
        chrSet.add(b.chr2);
    });
    const skipped = state.skipped.length;
    statsEl.innerHTML = `
    <i class="bi bi-info-circle me-1"></i>
    <strong>${state.items.length}</strong> edge${state.items.length === 1 ? "" : "s"}
    -> <strong>${groups.length}</strong> unique directional chord${groups.length === 1 ? "" : "s"}
    across <strong>${chrSet.size}</strong>/${HG38_ORDER.length} chromosome${chrSet.size === 1 ? "" : "s"}
    (${Array.from(chrSet).sort((a, b) => HG38_ORDER.indexOf(a) - HG38_ORDER.indexOf(b)).join(", ") || "none"})
    &middot; mode: <strong>${state.expand ? "Expanded" : "Grouped"}</strong>
    &middot; MinEdge >= ${STATE.minEdgeWeight || 1}
    ${skipped ? `&middot; <span class="text-danger">${skipped} skipped</span> (unknown chr or missing coords)` : ""}
  `;
}

function cssSafeAttr(s) {
    // CSS.escape is widely available but fall back to a safe replace
    if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(s);
    return String(s).replace(/(["'\\\]\[])/g, "\\$1");
}
