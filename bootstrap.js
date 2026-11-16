/* global Services, PDFViewer */

// Zotero 7+ calls these functions when the plugin starts and stops and when a
// main window opens or closes. pdf-viewer.js defines PDFViewer in this scope.

function install() {}

function uninstall() {}

function startup({ id, version, rootURI }) {
  Services.scriptloader.loadSubScript(rootURI + 'pdf-viewer.js');
  PDFViewer.init({ id, version, rootURI });
  PDFViewer.addToAllWindows();
}

function onMainWindowLoad({ window }) {
  PDFViewer.addToWindow(window);
}

function onMainWindowUnload({ window }) {
  PDFViewer.removeFromWindow(window);
}

function shutdown() {
  PDFViewer.removeFromAllWindows();
  PDFViewer = undefined;
}
