/* FieldKit library validator.
   Run: node validate.js   (also runs in CI on every PR)
   Loads library-data.js and asserts the schema, unique ids, non-empty code,
   a controlled tag vocabulary, and the purple-team rule (red/purple entries
   must carry an ATT&CK id and a detect line). Exits non-zero on any error. */

const path = require("path");

// library-data.js sets window.FIELDKIT_LIBRARY
global.window = {};
require(path.join(__dirname, "library-data.js"));
const LIB = global.window.FIELDKIT_LIBRARY;

const CODE_KEYS    = ["ps", "cmd", "mac", "linux", "py", "dork", "sql"];
const INSTALL_KEYS = ["cmd", "mac", "linux"];
const WIDGETS      = ["cron"];
const TEAMS        = ["blue", "red", "purple"];
const PLATFORMS    = ["windows", "macos", "linux"];
const ID_RE        = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ATTACK_RE    = /^T\d{4}(\.\d{3})?$/;

// Controlled tag vocabulary — extend this list when you introduce a new tag.
const ALLOWED_TAGS = new Set([
  "network","recon","enumeration","osint","password","web","active-directory",
  "wireless","privesc","exploitation","post-ex","incident-response","triage",
  "logs","registry","detection","sigma","yara","suricata","zeek","osquery",
  "sysmon","forensics","backup","recovery","tls","certificates","tools",
  "package-manager","scheduling","automation","file-transfer","remote",
  "containers","cloud","git","regex","quick-win","windows","macos","linux",
  "cross-platform","teaching","reference",
  "dns","smb","snmp","discovery","scanning","subdomain","banner","mail",
  "persistence","memory","containment","timeline","process","account",
  "ldap",
]);

const errors = [];
const warns = [];
const err = (id, msg) => errors.push(`${id}: ${msg}`);
const warn = (id, msg) => warns.push(`${id}: ${msg}`);

if (!Array.isArray(LIB)) { console.error("FATAL: window.FIELDKIT_LIBRARY is not an array"); process.exit(1); }
if (!LIB.length)         { console.error("FATAL: library is empty"); process.exit(1); }

const seen = new Set();
const cats = {};

for (const e of LIB) {
  const id = e && e.id ? e.id : "(missing id)";
  if (!e.id) { err(id, "missing id"); continue; }
  if (!ID_RE.test(e.id)) err(id, "id must be lowercase-hyphenated");
  if (seen.has(e.id)) err(id, "duplicate id");
  seen.add(e.id);

  if (!e.cat || typeof e.cat !== "string") err(id, "missing cat");
  else cats[e.cat] = (cats[e.cat] || 0) + 1;
  if (!e.title) err(id, "missing title");
  if (!e.desc)  err(id, "missing desc");

  const isWidget = !!e.widget;
  const isTool = !isWidget && !e.code && (e.install || e.url);

  if (isWidget) {
    if (!WIDGETS.includes(e.widget)) err(id, `unknown widget "${e.widget}"`);
  } else if (isTool) {
    if (!e.url)     err(id, "tool entry missing url");
    if (!e.install || typeof e.install !== "object") err(id, "tool entry missing install");
    else {
      const keys = Object.keys(e.install);
      if (!keys.length) err(id, "install has no commands");
      keys.forEach(k => {
        if (!INSTALL_KEYS.includes(k)) err(id, `unknown install key "${k}"`);
        if (!String(e.install[k]).trim()) err(id, `empty install command for "${k}"`);
      });
    }
    if (e.platforms) e.platforms.forEach(p => { if (!PLATFORMS.includes(p)) err(id, `unknown platform "${p}"`); });
  } else {
    if (!e.code || typeof e.code !== "object") err(id, "missing code");
    else {
      const keys = Object.keys(e.code);
      if (!keys.length) err(id, "code has no languages");
      keys.forEach(k => {
        if (!CODE_KEYS.includes(k)) err(id, `unknown code key "${k}"`);
        if (!String(e.code[k]).trim()) err(id, `empty code for "${k}"`);
      });
    }
  }

  if (e.team != null && !TEAMS.includes(e.team)) err(id, `invalid team "${e.team}"`);
  if (e.tags) {
    if (!Array.isArray(e.tags)) err(id, "tags must be an array");
    else e.tags.forEach(t => { if (!ALLOWED_TAGS.has(t)) err(id, `tag "${t}" not in vocabulary (add it to validate.js)`); });
  }
  if (e.attack) {
    if (!Array.isArray(e.attack)) err(id, "attack must be an array");
    else e.attack.forEach(t => { if (!ATTACK_RE.test(t)) err(id, `invalid ATT&CK id "${t}"`); });
  }

  // purple-team rule: offensive entries must be paired with detection guidance
  if (e.team === "red" || e.team === "purple") {
    if (!(e.attack && e.attack.length)) err(id, "offensive entry must carry an ATT&CK id");
    if (!e.detect) err(id, "offensive entry must carry a detect line");
    if (!e.danger) warn(id, "offensive entry without a danger note");
  }
}

console.log(`FieldKit validate — ${LIB.length} entries, ${Object.keys(cats).length} categories`);
Object.keys(cats).sort().forEach(c => console.log(`  ${String(cats[c]).padStart(3)}  ${c}`));
if (warns.length) { console.log(`\n${warns.length} warning(s):`); warns.forEach(w => console.log("  ! " + w)); }
if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  errors.forEach(e => console.error("  x " + e));
  process.exit(1);
}
console.log("\nOK — all checks passed.");
