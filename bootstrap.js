/* global Services, PDFPreviewPane */

// Zotero 7+ calls these functions when the plugin starts and stops and when a
// main window opens or closes. pdf-preview-pane.js defines PDFPreviewPane in
// this scope.

function install() {}

function uninstall() {}

function startup({ id, version, rootURI }) {
  Services.scriptloader.loadSubScript(rootURI + 'pdf-preview-pane.js');
  PDFPreviewPane.init({ id, version, rootURI });
  PDFPreviewPane.addToAllWindows();
}

function onMainWindowLoad({ window }) {
  PDFPreviewPane.addToWindow(window);
}

function onMainWindowUnload({ window }) {
  PDFPreviewPane.removeFromWindow(window);
}

function shutdown() {
  PDFPreviewPane.removeFromAllWindows();
  PDFPreviewPane = undefined;
}
