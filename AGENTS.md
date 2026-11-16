# AGENTS.md

A Zotero 7–10 plugin: a pane below the item list that shows the selected item's PDF with continuous scrolling. `README.md` describes what it does.

The repository, the plugin ID and the preferences were called `zotero-pdf-viewer` until 2026-11-16. GitHub redirects the old repository URLs.

## Files

| Path | What it is |
|---|---|
| `manifest.json` | plugin ID, version, Zotero versions |
| `bootstrap.js` | Zotero's entry points; loads `pdf-preview-pane.js` |
| `pdf-preview-pane.js` | the pane |
| `prefs.js` | default preferences `extensions.zotero-pdf-preview-pane.visible` and `.heightPercent` |
| `build.sh` | builds `build/zotero-pdf-preview-pane-<version>.xpi`; the same commit gives the same bytes on any system |
| `.github/workflows/release.yml` | on a pushed tag `vX.Y.Z`: builds the `.xpi`, checks it, attests it and creates the GitHub release |
| `CHANGELOG.md` | changes per version, in the format of [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) |
| `updates.json` | the update manifest Zotero reads from `update_url` in `manifest.json` |
| `SECURITY.md` | how to report a vulnerability (GitHub private vulnerability reporting, enabled on the repository) and what the plugin reads, stores and sends; update it when the code starts reading, storing or sending something new |

## Releases

Versions follow [Semantic Versioning](https://semver.org/). To release version X.Y.Z:

1. Move the entries under `[Unreleased]` in `CHANGELOG.md` to a new section `[X.Y.Z] - <date>` and update the links at the end of the file.
2. Set `version` in `manifest.json` to X.Y.Z and run `./build.sh`.
3. Add an entry to `updates.json` with `update_link` `https://github.com/alberti42/zotero-pdf-preview-pane/releases/download/vX.Y.Z/zotero-pdf-preview-pane-X.Y.Z.xpi` and `update_hash` `sha256:<shasum -a 256 of that .xpi>`.
4. Commit, tag `vX.Y.Z` (annotated), and push the commit and the tag.

The workflow `release.yml` then builds the `.xpi` again and stops without a release if the tag differs from `version` in `manifest.json`, or if `updates.json` has no entry for the version with that `update_link` and the SHA-256 of its build. It attests the `.xpi` with `actions/attest` and creates a **draft** release with the `.xpi` attached and the `CHANGELOG.md` section as notes. Do not create the release by hand.

5. Andrea reviews the draft on GitHub (Releases → the draft → Edit) and publishes it. Until then the `.xpi` cannot be downloaded, and Zotero installs that see the new version in `updates.json` on `main` fail to download it and try again at their next update check.

Releases 0.1.0 and 0.1.1 were built with `zip` before `build.sh` became reproducible and have no attestation; a build of their tags gives a different SHA-256 from the one in `updates.json`.

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
