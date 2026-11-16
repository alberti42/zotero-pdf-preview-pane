/* global Zotero */

// PDF Preview Pane: shows the selected item's PDF in a pane below the item
// list, with continuous scrolling and fit-to-width.
//
// The pane uses Zotero's ReaderPreview (chrome/content/zotero/xpcom/reader.js
// in omni.ja), the reader behind the preview in the Attachments section of
// the item pane. ReaderPreview holds that preview to one page with two
// settings, which makeScrollable() undoes:
// - the CSS rule `#viewerContainer { overflow: hidden }`;
// - `scrollMode = 3` (one page at a time) and scale `page-height`, set by
//   ReaderPreview.updatePDFAttr on every resize of the reader's window.
// ReaderPreview is not part of Zotero's plugin API; check these after a major
// Zotero update.

var PDFViewer = {
  PREF_VISIBLE: 'extensions.zotero-pdf-viewer.visible',
  PREF_HEIGHT: 'extensions.zotero-pdf-viewer.height',
  // Pause after a selection change before the pane loads a PDF, so that
  // holding ↓ does not load every paper on the way.
  DELAY_MS: 150,
  MIN_HEIGHT: 100,
  HTML_NS: 'http://www.w3.org/1999/xhtml',

  id: null,
  version: null,
  rootURI: null,
  // Main window → state of its pane.
  windows: new Map(),

  init({ id, version, rootURI }) {
    this.id = id;
    this.version = version;
    this.rootURI = rootURI;
  },

  addToAllWindows() {
    for (const win of Zotero.getMainWindows()) {
      if (win.ZoteroPane) this.addToWindow(win);
    }
  },

  removeFromAllWindows() {
    for (const win of [...this.windows.keys()]) this.removeFromWindow(win);
  },

  isVisible() {
    return Zotero.Prefs.get(this.PREF_VISIBLE, true) !== false;
  },

  // ── Window setup ────────────────────────────────────────────────────

  addToWindow(win) {
    if (this.windows.has(win)) return;
    const doc = win.document;
    const container = doc.getElementById('zotero-items-pane-container');
    if (!container) return;

    const s = {
      win,
      timer: null,
      // Incremented by every update; an update that finds a newer token
      // after an await gives up.
      token: 0,
      reader: null,
      browser: null,
      spare: null,
      shownID: null,
      // The reader still opening a PDF: { browser, reader }.
      pending: null,
    };

    // Splitter and pane below the item list. The item list keeps flex 1;
    // the pane has a fixed height, which the splitter changes.
    s.splitter = doc.createXULElement('splitter');
    s.splitter.id = 'zotero-pdf-viewer-splitter';
    s.splitter.setAttribute('resizebefore', 'closest');
    s.splitter.setAttribute('resizeafter', 'closest');

    s.pane = doc.createXULElement('vbox');
    s.pane.id = 'zotero-pdf-viewer-pane';
    s.pane.style.height = `${Zotero.Prefs.get(this.PREF_HEIGHT, true) || 450}px`;
    s.pane.style.minHeight = `${this.MIN_HEIGHT}px`;

    // A stack draws its children on top of each other: the message, the
    // browser being shown and the spare browser loading the next PDF.
    s.stack = doc.createXULElement('stack');
    s.stack.setAttribute('flex', '1');
    s.message = doc.createElementNS(this.HTML_NS, 'div');
    Object.assign(s.message.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--fill-secondary)',
      backgroundColor: 'var(--material-background)',
    });
    s.stack.append(s.message);
    s.pane.append(s.stack);
    container.append(s.splitter, s.pane);

    s.onSplitterRelease = () => this.saveHeight(s);
    s.splitter.addEventListener('command', s.onSplitterRelease);
    s.splitter.addEventListener('mouseup', s.onSplitterRelease);

    // Double-click opens the PDF in a reader tab, at the page shown.
    s.onDblClick = (event) => this.openInTab(s, event);
    s.pane.addEventListener('dblclick', s.onDblClick);

    // Follow the selection. ZoteroPane calls itemSelected() whenever the
    // selection in the item list changes, and after every refresh of the
    // list.
    const self = this;
    s.origItemSelected = win.ZoteroPane.itemSelected;
    s.itemSelected = function (...args) {
      const result = s.origItemSelected.apply(this, args);
      self.scheduleUpdate(s);
      return result;
    };
    win.ZoteroPane.itemSelected = s.itemSelected;

    this.addMenuItem(s);
    s.onKeyDown = (event) => this.handleKeyDown(s, event);
    win.addEventListener('keydown', s.onKeyDown, true);

    this.windows.set(win, s);
    this.applyVisibility(s);
  },

  removeFromWindow(win) {
    const s = this.windows.get(win);
    if (!s) return;
    this.windows.delete(win);
    win.clearTimeout(s.timer);
    s.token++;
    this.cancelPending(s);
    if (win.ZoteroPane?.itemSelected === s.itemSelected) {
      win.ZoteroPane.itemSelected = s.origItemSelected;
    }
    win.removeEventListener('keydown', s.onKeyDown, true);
    this.releaseReader(s);
    s.spare?.remove();
    s.menuItem?.remove();
    s.menuPopup?.removeEventListener('popupshowing', s.onPopupShowing);
    s.splitter.remove();
    s.pane.remove();
  },

  // ── Showing and hiding the pane ─────────────────────────────────────

  // View → Layout → PDF Preview Pane, after Zotero's pane items.
  addMenuItem(s) {
    const doc = s.win.document;
    s.menuPopup = doc.querySelector('#layout-menu > menupopup');
    if (!s.menuPopup) return;
    s.menuItem = doc.createXULElement('menuitem');
    s.menuItem.id = 'zotero-pdf-viewer-menuitem';
    s.menuItem.setAttribute('label', 'PDF Preview Pane');
    s.menuItem.setAttribute('type', 'checkbox');
    s.menuItem.setAttribute('acceltext', Zotero.isMac ? '⇧⌘P' : 'Ctrl+Shift+P');
    s.menuItem.addEventListener('command', () => this.toggle());
    s.menuPopup.append(s.menuItem);
    s.onPopupShowing = () => {
      s.menuItem.setAttribute('checked', this.isVisible() ? 'true' : 'false');
    };
    s.menuPopup.addEventListener('popupshowing', s.onPopupShowing);
  },

  // ⇧⌘P (Ctrl+Shift+P on Linux and Windows) in the library tab.
  handleKeyDown(s, event) {
    const accel = Zotero.isMac ? event.metaKey : event.ctrlKey;
    if (!accel || !event.shiftKey || event.altKey) return;
    if (event.key.toLowerCase() !== 'p') return;
    if (s.win.Zotero_Tabs?.selectedType !== 'library') return;
    event.preventDefault();
    event.stopPropagation();
    this.toggle();
  },

  toggle() {
    Zotero.Prefs.set(this.PREF_VISIBLE, !this.isVisible(), true);
    for (const s of this.windows.values()) this.applyVisibility(s);
  },

  applyVisibility(s) {
    const visible = this.isVisible();
    s.splitter.hidden = !visible;
    s.pane.hidden = !visible;
    if (visible) {
      this.scheduleUpdate(s);
    } else {
      // Free the reader while the pane is hidden.
      s.win.clearTimeout(s.timer);
      s.token++;
      this.cancelPending(s);
      this.releaseReader(s);
      s.spare?.remove();
      s.spare = null;
    }
  },

  saveHeight(s) {
    const height = Math.round(s.pane.getBoundingClientRect().height);
    if (height >= this.MIN_HEIGHT) Zotero.Prefs.set(this.PREF_HEIGHT, height, true);
  },

  // ── Following the selection ─────────────────────────────────────────

  // A selection change closes the reader still opening the previous PDF at
  // once, so that its parsing and drawing do not delay the next one. Zotero's
  // own preview does the same (_processDiscard in attachmentPreview.js).
  scheduleUpdate(s) {
    if (s.pane.hidden) return;
    s.token++;
    this.cancelPending(s);
    s.win.clearTimeout(s.timer);
    s.timer = s.win.setTimeout(() => {
      this.update(s).catch((e) => Zotero.logError(e));
    }, this.DELAY_MS);
  },

  // The PDF to show for the selection: the selected item itself if it is a
  // PDF attachment, otherwise its main attachment (getBestAttachment, which
  // prefers PDFs). Returns { attachment } or { message }.
  async findPDF(win) {
    const items = win.ZoteroPane.getSelectedItems();
    if (items.length === 0) return { message: 'No item selected' };
    if (items.length > 1) return { message: `${items.length} items selected` };
    const item = items[0];
    let attachment = null;
    if (item.isRegularItem()) attachment = await item.getBestAttachment();
    else if (item.isAttachment()) attachment = item;
    if (!attachment || !attachment.isPDFAttachment()) return { message: 'No PDF' };
    return { attachment };
  },

  async update(s) {
    const token = ++s.token;
    const found = await this.findPDF(s.win);
    if (token !== s.token) return;
    if (found.message) {
      this.showMessage(s, found.message);
      return;
    }
    const attachment = found.attachment;
    if (attachment.id === s.shownID) return;
    if (!(await attachment.fileExists())) {
      if (token === s.token) this.showMessage(s, 'The PDF is not on this computer');
      return;
    }
    if (token !== s.token) return;

    // Open the PDF in the spare browser, hidden, and swap it with the
    // browser shown once the first page is drawn.
    const browser = s.spare || this.createBrowser(s);
    s.spare = null;
    const pending = { browser, reader: null };
    s.pending = pending;
    let ok = false;
    try {
      await this.waitForReaderPage(browser);
      if (token === s.token) {
        pending.reader = await Zotero.Reader.openPreview(attachment.id, browser);
        if (token === s.token) ok = await pending.reader._open({});
      }
    }
    catch (e) {
      // A reader closed by cancelPending() may throw; that is expected.
      if (token === s.token) Zotero.logError(e);
    }
    if (s.pending === pending) s.pending = null;

    if (token !== s.token || !ok) {
      this.discard(pending);
      if (token === s.token) this.showMessage(s, 'Zotero could not open the PDF');
      return;
    }

    const reader = pending.reader;
    this.makeScrollable(reader);
    this.releaseReader(s);
    browser.style.visibility = '';
    s.reader = reader;
    s.browser = browser;
    s.shownID = attachment.id;
    s.message.hidden = true;
    // Load reader.html in a new spare browser for the next selection.
    if (!s.spare) s.spare = this.createBrowser(s);
  },

  showMessage(s, text) {
    this.releaseReader(s);
    s.message.textContent = text;
    s.message.hidden = false;
  },

  cancelPending(s) {
    if (!s.pending) return;
    this.discard(s.pending);
    s.pending = null;
    // The discarded browser was the spare; load reader.html in a new one
    // now, while the next update waits out DELAY_MS.
    if (!s.spare) s.spare = this.createBrowser(s);
  },

  // Closes a reader that is opening or was given up, and removes its
  // browser. Safe to call twice.
  discard(pending) {
    if (pending.discarded) return;
    pending.discarded = true;
    try { pending.reader?.uninit(); } catch (e) {}
    pending.browser.remove();
  },

  releaseReader(s) {
    try { s.reader?.uninit(); }
    catch (e) { Zotero.logError(e); }
    s.browser?.remove();
    s.reader = null;
    s.browser = null;
    s.shownID = null;
  },

  // ── Reader ──────────────────────────────────────────────────────────

  // The same browser element Zotero's attachment preview uses
  // (chrome/content/zotero/elements/attachmentPreview.js), hidden until it
  // shows a PDF. visibility keeps its size, so the PDF is laid out to the
  // pane's width before it appears.
  createBrowser(s) {
    const browser = s.win.document.createXULElement('browser');
    browser.setAttribute('type', 'content');
    browser.setAttribute('transparent', 'transparent');
    browser.setAttribute('src', 'resource://zotero/reader/reader.html');
    browser.style.visibility = 'hidden';
    s.stack.append(browser);
    return browser;
  },

  async waitForReaderPage(browser) {
    for (let i = 0; i < 200; i++) {
      if (!browser.isConnected) throw new Error('The browser was removed');
      if (browser.contentDocument?.readyState === 'complete') return;
      await Zotero.Promise.delay(50);
    }
    throw new Error('reader.html did not load in 10 s');
  },

  makeScrollable(reader) {
    const pwin = reader._internalReader._primaryView._iframeWindow;
    const viewer = pwin.PDFViewerApplication.pdfViewer;
    pwin.removeEventListener('resize', reader.updatePDFAttr);
    const fit = () => {
      viewer.scrollMode = 0; // vertical, continuous
      viewer.currentScaleValue = 'page-width';
    };
    pwin.addEventListener('resize', fit);
    fit();
    const style = pwin.document.createElement('style');
    style.textContent = '#viewerContainer { overflow: auto !important; }';
    pwin.document.head.append(style);
  },

  openInTab(s, event) {
    if (!s.reader || s.shownID === null) return;
    let location;
    try {
      const pwin = s.reader._internalReader._primaryView._iframeWindow;
      location = { pageIndex: pwin.PDFViewerApplication.pdfViewer.currentPageNumber - 1 };
    }
    catch (e) {}
    s.win.ZoteroPane.viewAttachment(s.shownID, event, false, { location });
  },
};
