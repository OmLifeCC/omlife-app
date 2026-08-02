// ─────────────────────────────────────────────────────────────────────────
// OmLife Desktop — WebContentsView edition (pinch-zoom capable).
//
// WHY THIS REWRITE: the old version embedded omlife.in in a <webview> tag,
// which on Windows does NOT support true trackpad pinch-zoom (a documented
// Electron limitation). This version loads omlife.in in a WebContentsView
// instead — Electron's recommended embedding path — where visual/pinch zoom
// can be enabled via setVisualZoomLevelLimits. Trackpad pinch should scale
// the page freely, like Chrome, WITHOUT re-flowing/adjusting the text.
//
// TRADEOFF: the in-app multi-tab strip is gone (tabs required <webview>).
// The auto-hide top bar, window controls, back/nav/zoom buttons, refresh,
// external-link handling, and Ctrl+Shift popup windows all remain.
// ─────────────────────────────────────────────────────────────────────────

const { app, BrowserWindow, WebContentsView, shell, Menu, screen, ipcMain, webContents } = require('electron');
const path = require('path');
const fs   = require('fs');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }

const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

const HOME   = 'https://omlife.in/my-portal/';
const PORTAL = 'https://omlife.in/my-portal/';
const BAR_HEIGHT = 40;    // height of the control bar when revealed
const HOTZONE   = 6;      // permanent thin strip at very top that catches hover

function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const ok = screen.getAllDisplays().some(d =>
      s.x >= d.bounds.x && s.x < d.bounds.x + d.bounds.width &&
      s.y >= d.bounds.y && s.y < d.bounds.y + d.bounds.height
    );
    if (ok) return s;
  } catch {}
  return { width: 1280, height: 820 };
}

function saveState(win) {
  try {
    if (!win.isMaximized() && !win.isMinimized())
      fs.writeFileSync(STATE_FILE, JSON.stringify(win.getBounds()));
  } catch {}
}

let win;
let view;          // WebContentsView holding omlife.in
let barVisible = false;

function layoutView() {
  if (!win || !view) return;
  const b = win.getContentBounds();
  // A permanent thin HOTZONE strip is always left uncovered at the very top,
  // so the window's own HTML (overlay.html) can catch mouseenter there even
  // while the native content view fills everything below. When the bar is
  // revealed, the content view is pushed down by the full BAR_HEIGHT.
  const top = barVisible ? BAR_HEIGHT : HOTZONE;
  view.setBounds({ x: 0, y: top, width: b.width, height: b.height - top });
}

function setBar(visible) {
  barVisible = visible;
  layoutView();
  if (win) win.webContents.send('bar:visibility', visible);
}

function createWindow() {
  const s = loadState();

  win = new BrowserWindow({
    width:    s.width  || 1280,
    height:   s.height || 820,
    x:        s.x,
    y:        s.y,
    minWidth:  900,
    minHeight: 600,
    icon:      path.join(__dirname, 'build', 'icon.ico'),
    title:     'OmLife',
    frame:     false,
    backgroundColor: '#0F0A1A',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    }
  });

  // The window's own web contents render the auto-hide control bar (overlay.html).
  win.loadFile(path.join(__dirname, 'overlay.html'));
  win.once('ready-to-show', () => win.show());

  // ── The omlife.in content, in a WebContentsView (NOT a <webview>) ──────────
  view = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      partition: 'persist:omlife',
    }
  });
  win.contentView.addChildView(view);
  view.webContents.loadURL(HOME);
  layoutView();

  // Enable true visual (pinch-to-zoom). This is the whole point of the rewrite.
  view.webContents.on('did-finish-load', () => {
    try { view.webContents.setVisualZoomLevelLimits(1, 5); } catch (e) {}
    injectScrollbarCSS(view.webContents);
  });

  // Ctrl+wheel leveled zoom as a secondary path (some users prefer it / use a mouse).
  view.webContents.on('zoom-changed', (_e, dir) => {
    const step = 0.1;
    const cur = view.webContents.getZoomFactor();
    const next = dir === 'in'
      ? Math.min(3.0, parseFloat((cur + step).toFixed(2)))
      : Math.max(0.5, parseFloat((cur - step).toFixed(2)));
    view.webContents.setZoomFactor(next);
  });

  // External links → OS browser; omlife.in links stay in the view.
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (url && url.indexOf('omlife.in') !== -1) {
      view.webContents.loadURL(url);
    } else if (url) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  view.webContents.on('will-navigate', (e, url) => {
    try {
      if (!new URL(url).hostname.endsWith('omlife.in')) {
        e.preventDefault();
        shell.openExternal(url);
      }
    } catch (err) {}
  });

  // Tell the bar about back-button relevance + navigation state.
  const pushNavState = () => {
    if (!win) return;
    let onPortal = false;
    try {
      const u = view.webContents.getURL();
      onPortal = u.startsWith(PORTAL) || u === 'https://omlife.in/my-portal';
    } catch {}
    win.webContents.send('nav:state', {
      canGoBack: view.webContents.canGoBack(),
      canGoForward: view.webContents.canGoForward(),
      onPortal,
    });
  };
  view.webContents.on('did-navigate', pushNavState);
  view.webContents.on('did-navigate-in-page', pushNavState);
  view.webContents.on('did-finish-load', pushNavState);

  let t;
  win.on('resize', () => { layoutView(); clearTimeout(t); t = setTimeout(() => saveState(win), 500); });
  win.on('move',   () => { clearTimeout(t); t = setTimeout(() => saveState(win), 500); });
  win.on('closed', () => { win = null; view = null; });
}

// Inject a slim scrollbar into the loaded page (same look as before).
function injectScrollbarCSS(wc) {
  wc.insertCSS(`
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background-color: rgba(139,92,246,0.35); border-radius: 8px; }
    ::-webkit-scrollbar-thumb:hover { background-color: rgba(139,92,246,0.55); }
    ::-webkit-scrollbar-corner { background: transparent; }
  `).catch(() => {});
}

// ── Window controls ─────────────────────────────────────────────────────────
ipcMain.on('win:minimize', () => win && win.minimize());
ipcMain.on('win:maximize', () => win && (win.isMaximized() ? win.unmaximize() : win.maximize()));
ipcMain.on('win:close',    () => win && win.close());

// ── Auto-hide bar reveal/hide, driven by the renderer's hot-zone + hover ─────
ipcMain.on('bar:show', () => setBar(true));
ipcMain.on('bar:hide', () => setBar(false));

// ── Navigation + zoom from the bar buttons ──────────────────────────────────
ipcMain.on('nav:back',    () => { if (view && view.webContents.canGoBack()) view.webContents.goBack(); });
ipcMain.on('nav:forward', () => { if (view && view.webContents.canGoForward()) view.webContents.goForward(); });
ipcMain.on('nav:refresh', () => { if (view) view.webContents.reload(); });
ipcMain.on('nav:portal',  () => { if (view) view.webContents.loadURL(PORTAL); });

ipcMain.on('zoom:step', (event, direction) => {
  if (!view) return;
  if (direction === 0) { view.webContents.setZoomFactor(1.0); return; }
  const step = 0.1;
  const cur = view.webContents.getZoomFactor();
  const next = direction > 0
    ? Math.min(3.0, parseFloat((cur + step).toFixed(2)))
    : Math.max(0.5, parseFloat((cur - step).toFixed(2)));
  view.webContents.setZoomFactor(next);
});

// ── Ctrl+Shift+Click popups (kept from before) ──────────────────────────────
let popupCount = 0;
ipcMain.on('win:popup', (event, url) => {
  popupCount++;
  const n = popupCount;
  const cascade = ((popupCount - 1) % 8) * 32;
  const disp = screen.getPrimaryDisplay();

  const popup = new BrowserWindow({
    width: 900, height: 680, minWidth: 500, minHeight: 400,
    x: disp.bounds.x + 80 + cascade,
    y: disp.bounds.y + 60 + cascade,
    parent: win || undefined,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    title: 'OmLife — Loading ' + n + '…',
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      partition: 'persist:omlife',
    }
  });
  popup.setAppDetails({ appId: 'in.omlife.desktop.popup.' + n });
  popup.webContents.on('page-title-updated', (e, title) => {
    e.preventDefault();
    popup.setTitle(title && title.trim() ? title : ('OmLife ' + n));
  });
  popup.webContents.on('did-finish-load', () => {
    try { popup.webContents.setVisualZoomLevelLimits(1, 5); } catch (err) {}
  });
  popup.loadURL(url);
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
