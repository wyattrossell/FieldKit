# FieldKit

**FieldKit** is a single-file, offline command reference for field IT, diagnostics, and
digital-forensics work — plus a growing library of runnable Python teaching examples.

Everything lives in [`FieldKit.html`](FieldKit.html): open it in any browser, no install,
no build, no network. It renders a three-pane app (categories → task list → detail) with
per-platform code tabs, one-click **copy**, and **download-as-script**.

## Features

- **253 entries** across 10 categories: System Info, Network, Users & Access, Disk & Files,
  Processes & Services, Forensics, Security, Maintenance, Active Directory, and Python Examples.
- **Five code targets** per entry where they apply: PowerShell (`ps`), Windows CMD (`cmd`),
  macOS (`mac`, BSD userland), Linux (`linux`, GNU/systemd), and Python (`py`). Only the
  platforms that genuinely apply to a task are included.
- **Copy / download** — copy a snippet to the clipboard (works from `file://`) or download it
  as a ready-to-run script with the correct extension (`.ps1`, `.bat`, `.command`, `.sh`, `.py`).
- **Search & filter** by keyword, category, or language.
- **Add / Import / Export** — add snippets in-session and export the whole library as JSON
  (`fieldkit-library.json`) to save or share.

## Usage

Open `FieldKit.html` in a browser. Pick a task, choose a language tab, then copy or download.

Snippets prefer native built-in tools; any non-default dependency (e.g. `openssl`, `dig`,
`smartctl`) is named in the entry description. Commands that write, delete, kill, or need
elevation carry an explicit warning.

## Disclaimer

For diagnostics, administration, and forensics on systems you are authorized to service.
Review any command flagged with a warning before running it.
