# JSR (Junction Support Reads) — WASM integration (deferred)

Aurora's `MinJSR` edge filter and the Global Analysis "min ΣJSR" filter are
already wired on the JS side. They read the junction-support-read count from the
edge data with this fallback chain:

```
edge.data("jsr")  →  edge.data("sr")  →  edge.data("weight")
```

Until the WASM emits a real `jsr`/`sr` field, the filter falls back to
`weight`, so it currently behaves like `MinEdge`. This document records the
exact Rust + build changes needed to surface the genuine JSR value so the two
filters become independent.

## Background: what JSR is vs `weight`

In the GTA/TSG format, edges carry a SAM-style attribute line:

```
A	E	<edge_id>	sr:i:<N>
```

`sr` = supporting reads for that junction (the JSR). This lives in
`EdgeData.attributes` in `tsg-core` (`crates/tsg-core/src/graph/edge.rs`).

The `weight` currently emitted in the edge JSON is a **different, derived**
value: it is computed in `TSGraph::to_json` as the size of the *intersection of
reads* between the edge's source and target nodes
(`crates/tsg-core/src/graph.rs`, `to_json`, ~line 712). So `weight` and `sr` are
genuinely distinct, and `sr` is currently dropped from the JSON.

## Change 1 — emit edge attributes (incl. `sr`) + a `jsr` alias

**File:** `tsg/crates/tsg-core/src/graph.rs`, function `to_json` (~line 718).

Where the edge `data` object is currently built as:

```rust
let edge_data = json!({
    "data": {
        "id": edge.id.to_str()?,
        "source": source_id.to_str()?,
        "target": target_id.to_str()?,
        "weight": edge_weight,
        "breakpoints": format!("{}", edge.sv)
    }
});
```

Replace with a mutable object, then splat every edge attribute (mirroring the
node serializer at `crates/tsg-core/src/graph/node.rs:408-414`) and add a
canonical numeric `jsr` alias derived from the `sr` attribute:

```rust
let mut data = json!({
    "id": edge.id.to_str()?,
    "source": source_id.to_str()?,
    "target": target_id.to_str()?,
    "weight": edge_weight,
    "breakpoints": format!("{}", edge.sv)
});

// Emit all edge attributes by their tag (sr, microhomology, novel_insertion…)
for attr in edge.attributes.values() {
    data[attr.tag.to_str()?] = match attr.attribute_type {
        'f' => attr.as_float()?.into(),
        'i' => (attr.as_int()? as i64).into(),
        _   => attr.value.to_str()?.into(),
    };
}

// Canonical JSR alias: prefer the `sr` attribute if present.
if let Some(sr) = edge.attributes.get(&bstr::BString::from("sr")) {
    if let Ok(v) = sr.as_int() {
        data["jsr"] = (v as i64).into();
    }
}

let edge_data = json!({ "data": data });
```

After this, edges in the JSON carry `sr`, `microhomology`, `novel_insertion`
(when present) plus a numeric `jsr`. Aurora reads `edge.data("jsr")`
automatically — no Aurora changes required.

## Change 2 — point tsg-js at the local tsg-core

**File:** `tsg-js/Cargo.toml`.

`tsg-js` currently depends on the published crate:

```toml
tsg-core = { version = "0.1.7" }
```

The local `tsg` workspace is at `tsg-core` 0.2.0. To build with the change
above, use a path dependency (adjust the relative path as needed):

```toml
tsg-core = { path = "../tsg/crates/tsg-core" }
```

(If you prefer to keep the crates.io dep, publish a new `tsg-core` version with
Change 1 and bump the version here instead.)

## Change 3 — build the WASM and vendor it into Aurora

`wasm-pack` and the `wasm32-unknown-unknown` target are not installed by
default. One-time setup:

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack        # or: cargo install wasm-bindgen-cli
```

Build (from the `tsg-js` repo root — see its `Makefile`):

```bash
cd /home/yangli/Projects/coding_project/tsg-js
make wasm                      # runs: wasm-pack build --target web --out-dir pkg
```

Copy the generated package into Aurora:

```bash
cp -r /home/yangli/Projects/coding_project/tsg-js/pkg/* \
      /home/yangli/Projects/coding_project/aurora/src/assets/pkg/
```

## Change 4 — verify

Quick Node check that edges now carry `jsr`/`sr`:

```bash
cd /home/yangli/Projects/coding_project/aurora
node -e '
const fs = require("fs");
(async () => {
  const m = await import("./src/assets/pkg/tsg_core_js.js");
  m.initSync({ module: fs.readFileSync("./src/assets/pkg/tsg_core_js_bg.wasm") });
  const out = m.load_graph(fs.readFileSync("./tests/data/scannls.tsg","utf8"));
  const els = JSON.parse(out[0]).elements;
  console.log(JSON.stringify(els.edges[0], null, 2));
})();
'
```

Expect the edge `data` to include a numeric `jsr` (and `sr`). Then in the app,
`MinJSR` and the Global Analysis "min ΣJSR" filter will act on the real JSR
value independently of `MinEdge`/`weight`.
