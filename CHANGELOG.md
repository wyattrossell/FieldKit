# Changelog

Notable changes to FieldKit. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); releases are date-stamped.

## [Unreleased]

- Nothing yet.

## [1.0.0] — 2026-07-04

First tagged release — an offline, single-file-friendly command reference with ~1,100 entries.

### App
- Searchable library across **PowerShell, Windows CMD, macOS (BSD), Linux (GNU), Python,
  Google dorks, and SQL**.
- **Purple-team format:** offensive entries carry a MITRE **ATT&CK** id plus **Detect** and
  **Mitigate** guidance.
- Live **placeholders** (`{{NAME:default}}`) with per-snippet inputs.
- **Filters:** domain-grouped collapsible category rail, **team filter** (blue/red/purple),
  language, full-text search with title-match ranking, and **context-aware tag chips**.
- **Related / next-steps** links between entries, plus end-to-end **workflow** entries for the
  heavy-hitter tools.
- Beginner-focused **Linux Essentials** and **Windows Essentials** command references.
- Interactive **Crontab Generator**.
- **Favorites**, keyboard navigation, **deep-linking** (`#id`), mobile category selector, and a
  result count with one-click "clear filters".
- **Color themes:** Field Amber, Night Slate, Paper, High-Contrast, Terminal Green.
- **Print / PDF** one-page cheat-sheet view.
- **Add / edit** entries in-app with JSON import/export and optional USB file sync.
- **"Report an incorrect command"** link on every entry (opens a prefilled GitHub issue).

### Content
- ~1,100 entries across 39 categories, including a catalog of common **Kali Linux CLI tools**
  each paired with command and workflow entries (GUI apps excluded).

### Distribution
- **Single-file build** (`build.js` → `dist/FieldKit.html`), a live **GitHub Pages** demo, and a
  two-file source download (`FieldKit.html` + `library-data.js`).
- CI validation (`validate.js`) and a demo redeploy on every push.

### Guarantees
- Fully offline: **no external/CDN dependencies, no network calls at runtime, no telemetry**;
  runs air-gapped from `file://`.

[Unreleased]: https://github.com/wyattrossell/FieldKit/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/wyattrossell/FieldKit/releases/tag/v1.0.0
