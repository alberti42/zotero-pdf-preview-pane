# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.3] - 2026-11-16

### Fixed

- On a smaller screen the pane covered the whole item list: its height was a fixed number of pixels. The height is now a share, in percent, of the height that the item list and the pane share (preference `extensions.zotero-pdf-preview-pane.heightPercent`, default 50), and the item list keeps at least 100 px. The old preference `extensions.zotero-pdf-preview-pane.height` is removed.

## [0.1.2] - 2026-11-16

### Changed

- GitHub Actions builds the `.xpi` of each release and attests its build provenance; `gh attestation verify` checks a downloaded `.xpi`.
- `build.sh` is reproducible: the same commit gives the same `.xpi`, byte for byte. Files are stored uncompressed, so the `.xpi` is 17 KB instead of 6 KB.

## [0.1.1] - 2026-11-16

### Fixed

- The pane showed no PDF: it called pdf.js's `PDFViewerApplication` by a wrong name, `PDFPreviewPaneApplication`, which the renaming in 0.1.0 had introduced. The pane kept the first message it showed, usually "No item selected".

## [0.1.0] - 2026-11-16

### Added

- A pane below the item list that shows the selected item's PDF, with continuous scrolling and fit-to-width. It shows the item itself if it is a PDF attachment, otherwise its main attachment, and changes when the selection changes.
- A selection change loads the PDF at once and closes the reader still opening the previous PDF. While ↑, ↓, Page Up or Page Down repeats in the item list, the pane loads nothing; it loads the selected paper when the key is released.
- Drag the splitter above the pane to change its height. Zotero keeps the height.
- Double-click the PDF to open it in a reader tab, at the page shown.
- View → Layout → PDF Preview Pane, or ⇧⌘P (Ctrl+Shift+P on Linux and Windows), shows or hides the pane.

[Unreleased]: https://github.com/alberti42/zotero-pdf-preview-pane/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/alberti42/zotero-pdf-preview-pane/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/alberti42/zotero-pdf-preview-pane/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/alberti42/zotero-pdf-preview-pane/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/alberti42/zotero-pdf-preview-pane/releases/tag/v0.1.0
