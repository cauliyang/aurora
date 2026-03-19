# Aurora

<p align="center">
  <img src="src/assets/aurora_logo_cropped.png" alt="Aurora Logo" width="200" />
</p>

<p align="center">
  Interactive web application for visualizing <strong>Transcript Segment Graphs (TSG)</strong> in bioinformatics research.
</p>

<p align="center">
  <a href="https://github.com/cauliyang/aurora/blob/main/examples/tutorial_of_aurora.pdf">Documentation</a> &middot;
  <a href="https://github.com/cauliyang/aurora/blob/main/CHANGELOG.md">Changelog</a> &middot;
  <a href="https://github.com/cauliyang/aurora/issues">Issues</a>
</p>

---

## Features

- **Graph Visualization** — Upload JSON or TSG files and render interactive graphs with Cytoscape.js
- **Multiple Layouts** — Choose from dagre, klay, tidytree, euler, spread, breadthfirst, COSE, and more
- **Gene Annotation** — Annotate nodes with GENCODE gene data and visualize exon-intron structure with D3.js
- **Walk Discovery** — DFS-based path finding with edge weight and depth filters
- **Aurora ID Search** — Search walks individually or batch-filter by uploading an Aurora IDs file
- **JSON Editor** — Inspect and edit graph data in tree, code, or form view
- **Node Ranking** — Rank nodes by degree, centrality, or custom properties
- **Image Export** — Save the current graph view as a PNG image
- **Interactive Help Guide** — Step-by-step tour with keyboard navigation (arrow keys, Esc)
- **Modern UI** — Glassmorphism theme with Aurora CSS variable design system

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- npm (comes with Node.js)

### Installation

```bash
git clone https://github.com/cauliyang/Aurora.git
cd Aurora
npm install
```

### Development

```bash
npm start
```

Open [http://localhost:1234](http://localhost:1234) in your browser.

### Production Build

```bash
npm run build
```

Outputs to `dist/` with public URL `/aurora/`.

## Usage

1. **Upload** — Click the upload button in the toolbar and select a `.json` or `.tsg` file
2. **Explore** — Zoom, pan, and click nodes or edges to view their properties in the details panel
3. **Layout** — Switch layout algorithms from the toolbar dropdown to rearrange the graph
4. **Filter** — Adjust minimum edge weight and path depth to focus on relevant walks
5. **Annotate** — Open Gene Annotations to overlay GENCODE gene data on nodes
6. **Export** — Capture the graph as a PNG or edit the raw JSON in the built-in editor

> Tip: Click **Help** in the navbar to start an interactive tour of the interface.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Graph rendering | [Cytoscape.js](https://js.cytoscape.org/) |
| Bundler | [Parcel](https://parceljs.org/) |
| UI framework | [Bootstrap 5](https://getbootstrap.com/) + Bootstrap Icons |
| Exon visualization | [D3.js](https://d3js.org/) |
| TSG parsing | WASM ([tsg_core](src/assets/pkg/)) |
| Styling | SCSS + Aurora CSS variable design system |

## Sample Data

Example graph files are available in the [`examples/`](examples/) directory:

- `simple.json` — A minimal graph for testing
- `complex.json` — A larger graph with multiple connected components
- `tutorial_of_aurora.pdf` — Walkthrough guide with screenshots

## Contributing

Contributions are welcome! If you find a bug or have an enhancement in mind, please create an issue or submit a pull request.

### Pull Request Previews

All pull requests automatically get a preview deployment:

- A preview site is built and deployed when you open a PR
- The preview URL is posted as a comment on your PR
- Previews update automatically when you push new commits

See [PR Preview Setup Guide](docs/PR_PREVIEW_SETUP.md) for details.

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).

## Acknowledgments

Aurora is named after the Roman goddess of dawn. The project uses Cytoscape.js for graph visualization and is inspired by the beauty of the dawn sky.
