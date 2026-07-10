import * as wasm from "../assets/pkg/tsg_core_js.js";

async function load_wasm() {
  await wasm.default();
}

async function parse_tsgFile(fileContent) {
  // Parse the TSG file content
  // This is a placeholder function. You need to implement the actual parsing logic.
  await load_wasm();
  let summary = wasm.load_graph(fileContent);
  return summary; // Return parsed data
}

window.parse_tsgFile = parse_tsgFile;
