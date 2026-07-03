# Contributing to FieldKit

Thanks for helping build FieldKit. Entries live in **`library-data.js`** (a plain
JavaScript file that sets `window.FIELDKIT_LIBRARY`). The app (`FieldKit.html`) is a
single self-contained file with **no external/CDN dependencies** and must keep working
offline from `file://`. Please don't add build steps, frameworks, or network calls.

## Add an entry

1. Open `library-data.js` and add your object to the array, near others in its category.
2. Give it a unique, `lowercase-hyphenated` `id` prefixed by area (`recon-…`, `ir-…`, `tool-…`).
3. Run the validator: **`node validate.js`** — it must print `OK`.
4. Open `FieldKit.html` in a browser and confirm your entry renders and copies correctly.
5. Commit one category/topic per commit (e.g. `Add Detection Engineering category (34 entries)`).

## Command entry schema

```js
{ id:"cat-slug", cat:"Category", title:"Short title", desc:"one line",
  danger:"OPTIONAL — only if it writes/deletes/kills or needs admin/root",
  team:"blue"|"red"|"purple"|null,          // omit or null if neutral
  tags:["network","recon"],                 // from the vocabulary in validate.js
  attack:["T1059.001"],                     // MITRE ATT&CK technique ids
  detect:"OPTIONAL — how a defender sees it",
  mitigate:"OPTIONAL — how to reduce it",
  code:{ ps:"…", cmd:"…", mac:"…", linux:"…", py:"…", dork:"…", sql:"…" } }
```

Include **only** the code targets that genuinely apply. `dork` (Google search) and
`sql` render as single-tab query types.

## Tool entry schema (Tools category)

```js
{ id:"tool-x", cat:"Tools", title:"Name", desc:"one line",
  url:"OFFICIAL project url", license:"…",
  platforms:["windows","macos","linux"],
  tags:["…"], attack:["…"],
  install:{ cmd:"winget install …", mac:"brew install …", linux:"sudo apt install …" } }
```

Tool entries have `install`/`url` instead of `code`.

## Placeholders

Editable values use `{{NAME}}` or `{{NAME:default}}` — e.g. `nmap {{TARGET:10.0.0.0/24}}`.
The app renders an input per placeholder and substitutes it into Copy/Download.

## Rules

- **Accuracy over volume.** Only commands that run as written on a default install.
- **Native tools first.** If a non-default tool is required, name it in `desc`.
- **macOS (BSD) is not Linux (GNU).** Never relabel a Linux command as macOS. Get the
  divergences right: `shasum -a 256` vs `sha256sum`; `ifconfig`/`lsof` vs `ip`/`ss`;
  `launchctl` vs `systemctl`; `dscl`/`sysadminctl` vs `getent`/`useradd`; `stat -f` vs
  `stat -c`; `diskutil` vs `lsblk`; `pbcopy` vs `xclip`; `brew` vs `apt`. GNU
  `find -printf` and `readlink -f` have no BSD equivalent — write a native BSD version.
- **Flag risk.** Anything destructive or privilege-requiring gets a `danger` line.
- **Original text only** — never paste vendor docs or man pages verbatim.
- **Official urls / current package ids** for tools. If unsure an id is current, say so in the PR.

## Purple-team content policy

Offensive and defensive content are both welcome. The gate:

- **Every red/purple entry must carry an `attack` id and a `detect` line** (and a
  `mitigate` line where one exists). `validate.js` enforces this.
- **You may author:** reconnaissance/enumeration, password-auditing invocation
  (authorized-use flagged), web-app testing tool usage, AD enumeration, privilege-
  escalation *enumeration*, exploitation-framework *basics* (search/use/set/run), and
  the full defensive/detection side.
- **You may not author:** working exploit code for specific vulns, malware/ransomware/
  rootkits, C2 implants, weaponized payloads (including ready-to-run payload one-liners),
  or AV/EDR-evasion code. For those, catalog the tool in **Tools** with purpose + ATT&CK
  + detection and link to the official docs or a practice lab. When in doubt, catalog and
  detect rather than weaponize.

See [DISCLAIMER.md](DISCLAIMER.md). Everything is framed for authorized testing and education.
