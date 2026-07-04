/* FieldKit single-file build.
   Inlines library-data.js into FieldKit.html and writes dist/FieldKit.html
   (and dist/index.html for GitHub Pages) — one self-contained file with no
   external references, so nothing can be left behind on copy.
   Run: node build.js   (or: npm run build).  No dependencies. */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const TAG = '<script src="library-data.js"></script>';

const html = fs.readFileSync(path.join(ROOT, "FieldKit.html"), "utf8");
const data = fs.readFileSync(path.join(ROOT, "library-data.js"), "utf8");

if (!html.includes(TAG)) {
  console.error(`build: could not find \`${TAG}\` in FieldKit.html`);
  process.exit(1);
}

// Guard the app shell (not the inert inlined data) against external resources.
const shellExternal = /<(script|link|img|iframe|source|audio|video)\b[^>]*\b(src|href)\s*=\s*["']https?:/i;
if (shellExternal.test(html)) {
  console.error("build: refusing to build — FieldKit.html references an external http(s) resource");
  process.exit(1);
}

// The data file contains literal </script> inside command strings; escape them
// so the HTML parser doesn't end the inlined <script> early. `<\/script>` is an
// identical string value at runtime.
const safe = data.replace(/<\/script>/gi, "<\\/script>");
// Use a function replacement: the data contains `$` sequences ($', $`, $&, ...
// from shell/PowerShell snippets) that String.replace would otherwise treat as
// special patterns and mangle the output.
const inlined = html.replace(TAG, () => "<script>\n" + safe + "\n</script>");

// the external <script src> tag must be gone (i.e. the data is now inlined)
if (inlined.includes(TAG)) {
  console.error("build: inlining failed — the library <script src> tag is still present");
  process.exit(1);
}

const distDir = path.join(ROOT, "dist");
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, "FieldKit.html"), inlined);
fs.writeFileSync(path.join(distDir, "index.html"), inlined); // GitHub Pages entry point

const kb = (Buffer.byteLength(inlined) / 1024).toFixed(0);
console.log(`build: wrote dist/FieldKit.html and dist/index.html (${kb} KB, single self-contained file)`);
