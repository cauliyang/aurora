import * as wasm from "../assets/pkg/tsg_core_js.js";

async function run() {
  const wasmModule = await wasm.default();
  console.log("WASM module loaded");
  let result = wasmModule.add(1, 2);
  console.log(result);
}

function parse_tsgFile(fileContent) {
  // Parse the TSG file content
  // This is a placeholder function. You need to implement the actual parsing logic.
  console.log("Parsing TSG file content:", fileContent);
  return {}; // Return parsed data
}

window.parse_tsgFile = parse_tsgFile;

run();
