# AGENTS.md

A Zotero 7–10 plugin: a pane below the item list that shows the selected item's PDF with continuous scrolling. `README.md` describes what it does.

## Files

| Path | What it is |
|---|---|
| `manifest.json` | plugin ID, version, Zotero versions |
| `bootstrap.js` | Zotero's entry points; loads `pdf-viewer.js` |
| `pdf-viewer.js` | the pane |
| `prefs.js` | default preferences `extensions.zotero-pdf-viewer.visible` and `.height` |
| `build.sh` | builds `build/zotero-pdf-viewer-<version>.xpi` |

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
