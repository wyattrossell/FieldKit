<!-- Thanks for contributing to FieldKit! -->

## What this changes


## If you added or changed library entries

Entry schema (full details in [CONTRIBUTING.md](../CONTRIBUTING.md)):

- [ ] `id` is lowercase-hyphenated and unique; `cat`, `title`, `desc` are set
- [ ] the entry has **one of**: `code` (`ps` / `cmd` / `mac` / `linux` / `py` / `dork` / `sql`) · a tool (`url` + `install`) · a `widget`
- [ ] offensive entries (`team: red` or `purple`) carry an `attack` id **and** a `detect` line (a `danger` note too)
- [ ] macOS (BSD) and Linux (GNU) commands are correct and distinct; native tools first; any non-default tool is named in `desc`
- [ ] any `related` ids exist; text is original (no vendor docs pasted verbatim)

## Checks

- [ ] `node validate.js` prints `OK`
- [ ] opened `FieldKit.html` (offline, `file://`) and confirmed it renders and the changed entries look right
