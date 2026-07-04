# FieldKit

### ▶ [Live demo](https://wyattrossell.github.io/FieldKit/) · [Download single file](https://github.com/wyattrossell/FieldKit/releases)

**An offline, single-file command reference and purple-team learning tool** for blue teams,
red teams, educators, and IT / forensics practitioners. Runs straight from a USB drive — open
`FieldKit.html` in any browser (`file://`), no install, no build, no network.

> **Trust:** a single, auditable HTML file — **zero network calls, no telemetry, no external
> dependencies**, works fully air-gapped from `file://`. The hosted demo is the same file.

> **Authorized use & education only. You are responsible for legal compliance.**
> See [DISCLAIMER.md](DISCLAIMER.md).

## What it looks like

![FieldKit — search, category rail, and a command entry with placeholders, ATT&CK/Detect/Mitigate, and related next-steps](docs/screenshot.png)

*Left: category rail grouped into domains. Middle: live-filtered results. Right: the selected
command with fill-in placeholders, team + MITRE ATT&CK badges, Detect/Mitigate, and related
next-steps. (Shown in the High-Contrast theme; try the [live demo](https://wyattrossell.github.io/FieldKit/).)*

## What it does

- Searchable library of copy-paste-ready commands across **PowerShell, Windows CMD, macOS
  (BSD), Linux (GNU)**, plus **Python**, **Google dorks**, and **SQL**.
- **Command essentials for beginners** — dedicated **Linux Essentials** and **Windows
  Essentials** sections cover the fundamental commands (ls, chmod, usermod, ps, tar; dir,
  tasklist, sc, net user, …) with plain-language descriptions and common examples. Search a
  command name and it ranks to the top.
- **Purple-team format:** offensive entries are paired with a MITRE **ATT&CK** id, a
  **Detect** line, and a **Mitigate** line — so defenders can recognize the same activity.
- **Placeholders** — editable `{{TARGET:10.0.0.0/24}}` fields fill live into Copy/Download.
- **Tools catalog** — official link, license, platforms, and per-OS install one-liners (AV/EDR
  like ClamAV & Malwarebytes, ransomware decryptors, forensics/RE suites, remote-access tools,
  and a growing set of common **Kali Linux CLI tools** — each paired with ready-to-run command
  and workflow entries).
- **Interactive generators** — built-in widgets such as the **Crontab Generator**: pick a
  preset or set each field, get the cron expression, a plain-English summary, and a
  ready-to-paste `crontab` install line.
- **Filters** — a **collapsible category rail** grouped into domains (Recon & OSINT, Offensive,
  Defense/IR/Forensics, Windows & Endpoint, Infra & Cloud, Data & Dev, Tools & Reference), a
  **team filter** (blue / red / purple), language, full-text search, and **context-aware tag
  chips** (the tag bar shows only the tags present in your current view, so it never becomes a
  wall of 60 chips).
- **Related / next steps** — entries can link to the logical follow-on tasks (e.g. triage
  snapshot → hash processes → persistence sweep), so common workflows chain without leaving
  the detail pane.
- **Color themes** — Field Amber, Night Slate, Paper (light), High-Contrast, and Terminal
  Green, remembered between sessions.
- **Favorites**, keyboard-first nav (`/` focus search, ↑/↓ browse, `Enter` open, `Esc` clear,
  `c` copy), a live **result count** with one-click **clear filters**, and one-click **Copy /
  Download** (works from `file://`).
- **Bookmarkable** — the URL updates to `#entry-id` as you browse, so any command can be
  linked or bookmarked and reopens on load. Works on mobile too (a category selector replaces
  the rail on narrow screens).
- **Printable** — `Ctrl-P` (or Save as PDF) on any open entry produces a clean black-on-white
  one-page reference: title, category, description, danger note, team/ATT&CK, the command (or
  install lines), Detect/Mitigate, and related next-steps — all app chrome stripped out.
- **Add / Edit** entries in-app and sync them to a JSON file on the USB.

## Offline usage

Two ways to run it, both fully offline:

- **Single file** — grab `FieldKit.html` from the [latest release](https://github.com/wyattrossell/FieldKit/releases) (the data is inlined; nothing else needed) and open it in any browser.
- **Source pair** — keep `FieldKit.html` **and `library-data.js` together** (the app loads the
  library via `<script src>` so it works from `file://`, where a fetched `.json` would be blocked).
  Copy both to a USB drive and open the HTML. That's it.

## Build a single file

The repo keeps the app and its library split for clean diffs. To produce the
self-contained single file (inlined data, no external references):

```sh
npm run build      # or: node build.js
```

This writes `dist/FieldKit.html` (the one-file release artifact) and
`dist/index.html` (the GitHub Pages entry point). No dependencies — plain Node.
`dist/` is git-ignored; it's shipped via releases and the live demo, not committed.

## Repository layout

| File | Purpose |
|---|---|
| `FieldKit.html` | The app — UI, rendering, filters, editor. Self-contained, no dependencies. |
| `library-data.js` | The command/tool library (`window.FIELDKIT_LIBRARY`). |
| `build.js` | Inlines the library into a single-file `dist/FieldKit.html` (`npm run build`). |
| `validate.js` | Schema + vocabulary validator (`node validate.js`); runs in CI. |
| `CONTRIBUTING.md` | Entry schema and how to add one. |
| `DISCLAIMER.md` | Authorized-use notice. |

## Contributing

New entries go in `library-data.js`; run `node validate.js` (must print `OK`) and open the app
to confirm it renders. See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the schema, the
purple-team content policy, and the macOS-vs-Linux correctness rules.

## License

[MIT](LICENSE) © 2026 Wyatt Rossell.

---

## Support

If FieldKit saves you time in the field, consider supporting its development — thank you! ☕

<p align="center">
  <a href="https://buymeacoffee.com/wyattrossell" target="_blank">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50">
  </a>
</p>
