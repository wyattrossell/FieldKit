# FieldKit

**An offline, single-file command reference and purple-team learning tool** for blue teams,
red teams, educators, and IT / forensics practitioners. Runs straight from a USB drive — open
`FieldKit.html` in any browser (`file://`), no install, no build, no network.

> **Authorized use & education only. You are responsible for legal compliance.**
> See [DISCLAIMER.md](DISCLAIMER.md).

<!-- Screenshot: drop an image at docs/screenshot.png and it will render here -->
<!-- ![FieldKit](docs/screenshot.png) -->

## What it does

- Searchable library of copy-paste-ready commands across **PowerShell, Windows CMD, macOS
  (BSD), Linux (GNU)**, plus **Python**, **Google dorks**, and **SQL**.
- **Purple-team format:** offensive entries are paired with a MITRE **ATT&CK** id, a
  **Detect** line, and a **Mitigate** line — so defenders can recognize the same activity.
- **Placeholders** — editable `{{TARGET:10.0.0.0/24}}` fields fill live into Copy/Download.
- **Tools catalog** — official link, license, platforms, and per-OS install one-liners.
- **Filters** — category rail, tag chips (AND), language, and full-text search.
- **Favorites**, keyboard nav (`/` search, ↑/↓ list, `c` copy), and one-click **Copy /
  Download** (works from `file://`).
- **Add / Edit** entries in-app and sync them to a JSON file on the USB.

## Offline usage

Keep `FieldKit.html` **and `library-data.js` together** (the command library lives in the
`.js`, loaded via `<script src>` so it works from `file://`, where a fetched `.json` would be
blocked). Copy both to a USB drive and open the HTML in a browser. That's it.

## Repository layout

| File | Purpose |
|---|---|
| `FieldKit.html` | The app — UI, rendering, filters, editor. Self-contained, no dependencies. |
| `library-data.js` | The command/tool library (`window.FIELDKIT_LIBRARY`). |
| `validate.js` | Schema + vocabulary validator (`node validate.js`); runs in CI. |
| `CONTRIBUTING.md` | Entry schema and how to add one. |
| `DISCLAIMER.md` | Authorized-use notice. |

## Contributing

New entries go in `library-data.js`; run `node validate.js` (must print `OK`) and open the app
to confirm it renders. See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the schema, the
purple-team content policy, and the macOS-vs-Linux correctness rules.

## License

[MIT](LICENSE) © 2026 Wyatt Rossell.
