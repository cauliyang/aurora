import * as wasm from "../assets/pkg/tsg_core_js.js";

async function run() {
  const wasmModule = await wasm.default();
  console.log("WASM module loaded");
  let result = wasmModule.add(1, 2);
  console.log(result);
}

run();
