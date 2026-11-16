# Security and privacy

## Reporting a vulnerability

Report security problems privately through GitHub: open the repository's [Security tab](https://github.com/alberti42/zotero-pdf-preview-pane/security) and click "Report a vulnerability", or go to [the report form](https://github.com/alberti42/zotero-pdf-preview-pane/security/advisories/new) directly. Only the maintainer sees the report. Do not open a public issue for a security problem.

Security fixes go into a new release of the latest version. Older versions are not updated.

## What the plugin does with your data

The plugin collects no information and sends nothing anywhere. Its code makes no network requests and contains no telemetry or analytics.

- **Files it reads.** The PDF of the selected item, from Zotero's storage on your computer. Zotero's own preview reader (`ReaderPreview`) opens it; the plugin does not copy it.
- **What it stores.** Two Zotero preferences in your Zotero profile: `extensions.zotero-pdf-preview-pane.visible` (whether the pane is shown) and `extensions.zotero-pdf-preview-pane.height` (its height in pixels).
- **Errors.** Errors go to Zotero's error log on your computer (Help → Report Errors…). They leave your computer only if you send a report to Zotero yourself.

## Network access by Zotero

Zotero, not the plugin, checks for plugin updates: it downloads `updates.json` from `raw.githubusercontent.com`, at the address in the plugin's `manifest.json`, and the `.xpi` of a new version from the GitHub release. These requests go to GitHub, which receives your IP address as for any download; they contain no information about your library.

## Checking a release

From version 0.1.2, each release's `.xpi` is built by GitHub Actions and has a build provenance attestation. To check a downloaded `.xpi`:

```
gh attestation verify zotero-pdf-preview-pane-<version>.xpi --repo alberti42/zotero-pdf-preview-pane
```
