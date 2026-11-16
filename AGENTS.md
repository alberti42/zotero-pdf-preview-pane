# AGENTS.md

A Zotero 7–10 plugin: a pane below the item list that shows the selected item's PDF with continuous scrolling. `README.md` describes what it does.

The repository, the plugin ID and the preferences were called `zotero-pdf-viewer` until 2026-11-16. GitHub redirects the old repository URLs.

## Files

| Path | What it is |
|---|---|
| `manifest.json` | plugin ID, version, Zotero versions |
| `bootstrap.js` | Zotero's entry points; loads `pdf-preview-pane.js` |
| `pdf-preview-pane.js` | the pane |
| `prefs.js` | default preferences `extensions.zotero-pdf-preview-pane.visible` and `.height` |
| `build.sh` | builds `build/zotero-pdf-preview-pane-<version>.xpi` |
| `CHANGELOG.md` | changes per version, in the format of [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) |
| `updates.json` | the update manifest Zotero reads from `update_url` in `manifest.json` |

## Releases

Versions follow [Semantic Versioning](https://semver.org/). To release version X.Y.Z:

1. Move the entries under `[Unreleased]` in `CHANGELOG.md` to a new section `[X.Y.Z] - <date>` and update the links at the end of the file.
2. Set `version` in `manifest.json` to X.Y.Z and run `./build.sh`.
3. Add an entry to `updates.json` with `update_link` `https://github.com/alberti42/zotero-pdf-preview-pane/releases/download/vX.Y.Z/zotero-pdf-preview-pane-X.Y.Z.xpi` and `update_hash` `sha256:<shasum -a 256 of that .xpi>`. Upload that same `.xpi`: a rebuilt one has different timestamps and a different hash.
4. Commit, tag `vX.Y.Z`, push both, and create the GitHub release from the tag with the `.xpi` attached and the changelog section as notes.

## Zotero facts the plugin depends on

Each was checked in Zotero 10.0.9's code (`omni.ja`); check again after a major update.

- `ReaderPreview` (`chrome/content/zotero/xpcom/reader.js`) is the reader behind the preview in the Attachments section. `Zotero.Reader.openPreview(itemID, browser)` creates one in a `browser` element that has loaded `resource://zotero/reader/reader.html`; `_open({})` opens the PDF.
- `ReaderPreview` injects `#viewerContainer { overflow: hidden }` into the PDF view and sets `scrollMode = 3` and scale `page-height` in `updatePDFAttr`, which runs on every resize of the PDF view's window.
- In preview mode the reader sets `textLayerMode` 0, so it draws no text layer.
- `ZoteroPane.itemSelected()` runs on every selection change in the item list and after every refresh of the list. The plugin wraps it to follow the selection; `ZoteroPane.itemsView` is created once per window.
- `ZoteroStandalone.onViewMenuItemClick` handles clicks in View → Layout and ignores items whose ID does not start with `view-menuitem-`.
- Zotero's own shortcuts are accel+shift with S, N, O, L, K, A, C, Y, R, `` ` `` and `;` (`extensions.zotero.keys.*`). The plugin uses accel+shift+P.
- `ZoteroPane.viewAttachment(itemID, event, noLocateOnMissing, { location: { pageIndex } })` opens an attachment in a reader tab at a page.

## Conventions

- Andrea installs and tests the `.xpi`; nothing in this repo can run code inside Zotero.
- Commit messages say what changed and why.
