/**
 * Local preview server for the PRODUCTION build.
 *
 * `npm run build` compiles with `--public-url /aurora/`, which hardcodes every
 * asset path to `/aurora/...`. That only renders correctly when the build is
 * served UNDER the `/aurora/` path (as it is when deployed). Opening dist/ at
 * the root (or via file://) makes every CSS/JS request 404, so the page shows
 * as unstyled text.
 *
 * This tiny static server serves the dist/ folder under `/aurora/` and
 * redirects `/` -> `/aurora/`, so the production build previews exactly like
 * the deployed site.
 *
 * Usage: npm run build && npm run preview   (then open the printed URL)
 * For day-to-day development use `npm run dev` (Parcel dev server) instead.
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST = path.join(__dirname, "..", "dist");
const BASE = "/aurora/";
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".txt": "text/plain; charset=utf-8",
    ".wasm": "application/wasm",
};

if (!fs.existsSync(DIST)) {
    console.error(
        `dist/ not found at ${DIST}. Run "npm run build" first, then "npm run preview".`
    );
    process.exit(1);
}

function serveFile(res, urlPath) {
    // Default document for directory requests.
    if (urlPath === "/" || urlPath.endsWith("/")) {
        urlPath += "index.html";
    }
    const filePath = path.join(DIST, path.normalize(urlPath));
    if (!filePath.startsWith(DIST)) {
        res.writeHead(403).end("Forbidden");
        return;
    }
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not found: " + urlPath);
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        res.end(data);
    });
}

const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);

    // Accept BOTH layouts so preview works regardless of how dist/ was built:
    //   - a root-relative build  (assets at /app.*.css)
    //   - a /aurora/ base build   (assets at /aurora/app.*.css)
    // Strip an optional /aurora/ prefix, then serve from dist/ root.
    if (urlPath === BASE.slice(0, -1)) {
        // "/aurora" -> "/aurora/"
        res.writeHead(302, { Location: BASE });
        res.end();
        return;
    }
    if (urlPath.startsWith(BASE)) {
        urlPath = urlPath.slice(BASE.length - 1); // keep leading slash
    }

    serveFile(res, urlPath);
});

server.listen(PORT, () => {
    console.log(`\nProduction build preview running (serves dist/):`);
    console.log(`  Root:     http://localhost:${PORT}/`);
    console.log(`  App:      http://localhost:${PORT}/app.html`);
    console.log(`  (also works under the deploy base: http://localhost:${PORT}${BASE}app.html)\n`);
    console.log(
        `For day-to-day development use "npm run dev" — it serves the app at http://localhost:3000/ with live reload.`
    );
});
