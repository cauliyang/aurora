#!/usr/bin/env python3
"""
Extract protein-coding gene exons from a GENCODE GTF file.

Reads a GENCODE GTF (optionally gzipped), extracts all exon records for
protein-coding genes, merges overlapping/adjacent exon intervals across
all transcripts of each gene (union), and outputs a tab-delimited file
compatible with Aurora's gene annotation system.

Output format (7 columns, tab-delimited):
    gene_id  chromosome  start  end  strand  gene_name  exons

Where `exons` is a comma-separated list of merged, sorted intervals:
    start1-end1,start2-end2,...

Usage:
    python extract_gene_exons.py <input.gtf[.gz]> <output.txt>

Example:
    python extract_gene_exons.py data/gencode.v49.basic.annotation.gtf.gz src/assets/genes.txt
"""

import gzip
import re
import sys
import os


def parse_gtf_attributes(attr_string):
    """Parse GTF attribute column into a dict.

    GTF attributes look like:
        gene_id "ENSG00000186092.7"; gene_type "protein_coding"; ...

    Returns a dict of key -> value (without quotes).
    """
    attrs = {}
    for match in re.finditer(r'(\w+)\s+"([^"]*)"', attr_string):
        key, value = match.group(1), match.group(2)
        attrs[key] = value
    return attrs


def merge_intervals(intervals):
    """Merge a list of (start, end) intervals into non-overlapping, sorted intervals.

    Adjacent intervals (end_i + 1 == start_{i+1}) are also merged.

    Returns a list of (start, end) tuples sorted by start.
    """
    if not intervals:
        return []
    sorted_ivs = sorted(intervals, key=lambda x: x[0])
    merged = [sorted_ivs[0]]
    for start, end in sorted_ivs[1:]:
        prev_start, prev_end = merged[-1]
        if start <= prev_end + 1:
            # Overlapping or adjacent — extend
            merged[-1] = (prev_start, max(prev_end, end))
        else:
            merged.append((start, end))
    return merged


def strip_version(gene_id):
    """Strip Ensembl version suffix from gene ID.

    'ENSG00000186092.7' -> 'ENSG00000186092'
    """
    return gene_id.split(".")[0]


def extract_protein_coding_exons(gtf_path):
    """Parse a GENCODE GTF file and extract exon intervals for protein-coding genes.

    Returns a dict:
        gene_key -> {
            'gene_id': str,
            'chromosome': str,
            'strand': str,
            'gene_name': str,
            'exons': [(start, end), ...]  # raw, un-merged
        }

    gene_key is (stripped_gene_id, chromosome, strand) to handle edge cases.
    """
    opener = gzip.open if gtf_path.endswith(".gz") else open

    genes = {}
    exon_count = 0

    with opener(gtf_path, "rt") as f:
        for line in f:
            if line.startswith("#"):
                continue

            fields = line.rstrip("\n").split("\t")
            if len(fields) < 9:
                continue

            feature_type = fields[2]
            if feature_type != "exon":
                continue

            attrs = parse_gtf_attributes(fields[8])
            gene_type = attrs.get("gene_type", "")
            if gene_type != "protein_coding":
                continue

            chrom = fields[0]
            start = int(fields[3])
            end = int(fields[4])
            strand = fields[6]
            gene_id = strip_version(attrs.get("gene_id", ""))
            gene_name = attrs.get("gene_name", gene_id)

            key = (gene_id, chrom, strand)
            if key not in genes:
                genes[key] = {
                    "gene_id": gene_id,
                    "chromosome": chrom,
                    "strand": strand,
                    "gene_name": gene_name,
                    "exons": [],
                }
            genes[key]["exons"].append((start, end))
            exon_count += 1

            if exon_count % 500000 == 0:
                print(f"  Processed {exon_count} exon records...")

    print(f"  Total exon records parsed: {exon_count}")
    print(f"  Unique protein-coding genes: {len(genes)}")
    return genes


def build_gene_table(genes):
    """Merge exon intervals per gene and build the output table.

    Returns a list of dicts sorted by (chromosome, start):
        [{gene_id, chromosome, start, end, strand, gene_name, exons_str}, ...]
    """
    rows = []
    for key, info in genes.items():
        merged = merge_intervals(info["exons"])
        gene_start = merged[0][0]
        gene_end = merged[-1][1]
        exons_str = ",".join(f"{s}-{e}" for s, e in merged)

        rows.append(
            {
                "gene_id": info["gene_id"],
                "chromosome": info["chromosome"],
                "start": gene_start,
                "end": gene_end,
                "strand": info["strand"],
                "gene_name": info["gene_name"],
                "exons": exons_str,
            }
        )

    # Sort by chromosome (natural sort), then start position
    def chrom_sort_key(row):
        chrom = row["chromosome"].replace("chr", "")
        if chrom.isdigit():
            return (0, int(chrom), row["start"])
        else:
            return (1, chrom, row["start"])

    rows.sort(key=chrom_sort_key)
    return rows


def write_output(rows, output_path):
    """Write the gene table to a tab-delimited file."""
    with open(output_path, "w") as f:
        # Header
        f.write("gene_id\tchromosome\tstart\tend\tstrand\tgene_name\texons\n")
        for row in rows:
            f.write(
                f"{row['gene_id']}\t{row['chromosome']}\t{row['start']}\t"
                f"{row['end']}\t{row['strand']}\t{row['gene_name']}\t"
                f"{row['exons']}\n"
            )


def main():
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <input.gtf[.gz]> <output.txt>")
        print(
            f"Example: {sys.argv[0]} data/gencode.v49.basic.annotation.gtf.gz"
            " src/assets/genes.txt"
        )
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if not os.path.exists(input_path):
        print(f"Error: Input file '{input_path}' not found.")
        sys.exit(1)

    print(f"Extracting protein-coding gene exons from: {input_path}")
    genes = extract_protein_coding_exons(input_path)

    print("Merging exon intervals per gene...")
    rows = build_gene_table(genes)

    print(f"Writing {len(rows)} genes to: {output_path}")
    write_output(rows, output_path)

    # Print summary statistics
    total_exon_intervals = sum(row["exons"].count(",") + 1 for row in rows)
    avg_exons = total_exon_intervals / len(rows) if rows else 0
    file_size = os.path.getsize(output_path)

    print(f"\nSummary:")
    print(f"  Genes: {len(rows)}")
    print(f"  Total merged exon intervals: {total_exon_intervals}")
    print(f"  Average exons per gene: {avg_exons:.1f}")
    print(f"  Output file size: {file_size / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
