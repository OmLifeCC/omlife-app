const { app, BrowserWindow, BrowserView, shell, Menu, screen, ipcMain } = require('electron');
const path = require('path');
const fs   = require('fs');

const SITE_URL     = 'https://omlife.in/my-portal/';
const PORTAL_URL   = SITE_URL;
const ALLOWED_HOST = 'omlife.in';
const BAR_H        = 38;

// ── Window state persistence ─────────────────────────────────────────────────
const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try {
    const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const displays = screen.getAllDisplays();
    const onScreen = displays.some(d =>
      saved.x >= d.bounds.x && saved.x < d.bounds.x + d.bounds.width &&
      saved.y >= d.bounds.y && saved.y < d.bounds.y + d.bounds.height
    );
    if (onScreen) return saved;
  } catch {}
  return { width: 1280, height: 820 };
}

function saveWindowState(win) {
  try {
    if (win.isMaximized() || win.isMinimized()) return;
    const b = win.getBounds();
    fs.writeFileSync(STATE_FILE, JSON.stringify(b));
  } catch {}
}

function isAllowedUrl(url) {
  try {
    const { hostname } = new URL(url);
    return hostname === ALLOWED_HOST || hostname.endsWith('.' + ALLOWED_HOST);
  } catch { return false; }
}

// ── Main window + two BrowserViews (toolbar + site) ─────────────────────────
// This is the real fix: the toolbar is a COMPLETELY SEPARATE renderer from
// the website. Zooming the site (via webContents.setZoomFactor) never
// touches the toolbar's own BrowserView, so the bar can never grow. And
// because the site view's bounds start exactly BAR_H px down, no page's
// own CSS (fixed headers, sticky nav, anything) can ever overlap or hide
// behind our bar — they're not even in the same layout tree.

let mainWindow;
let toolbarView;
let siteView;
let zoomFactor = 1.0;

function layoutViews() {
  const [w, h] = mainWindow.getContentSize();
  toolbarView.setBounds({ x: 0, y: 0, width: w, height: BAR_H });
  siteView.setBounds({ x: 0, y: BAR_H, width: w, height: h - BAR_H });
}

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width:     state.width  || 1280,
    height:    state.height || 820,
    x:         state.x,
    y:         state.y,
    minWidth:  900,
    minHeight: 640,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    title: 'OmLife',
    autoHideMenuBar: true,
    backgroundColor: '#0F0A1A',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0F0A1A',
      symbolColor: '#a78bfa',
      height: BAR_H
    },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false
  });

  // ── Toolbar view (loads our own local HTML, never touches the website) ───
  toolbarView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'toolbar-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });
  mainWindow.addBrowserView(toolbarView);
  toolbarView.webContents.loadFile(path.join(__dirname, 'toolbar.html'));

  // ── Site view (loads the actual OmLife website) ──────────────────────────
  siteView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    }
  });
  mainWindow.addBrowserView(siteView);
  siteView.webContents.loadURL(SITE_URL);

  layoutViews();
  mainWindow.on('resize', layoutViews);

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Remember size/position
  let saveTimer;
  const debouncedSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveWindowState(mainWindow), 500);
  };
  mainWindow.on('resize', debouncedSave);
  mainWindow.on('move',   debouncedSave);

  // External links from the site open in the OS browser
  siteView.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  siteView.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedUrl(url)) siteView.webContents.loadURL(url);
    else shell.openExternal(url);
    return { action: 'deny' };
  });

  // Tell the toolbar whenever the site's URL changes, so it can show/hide
  // the back button correctly.
  function notifyUrl() {
    const url = siteView.webContents.getURL();
    toolbarView.webContents.send('site-url-changed', url);
  }
  siteView.webContents.on('did-navigate', notifyUrl);
  siteView.webContents.on('did-navigate-in-page', notifyUrl);
  siteView.webContents.on('did-finish-load', notifyUrl);

  // Offline fallback
  siteView.webContents.on('did-fail-load', (event, errorCode) => {
    if (errorCode === -3) return;
    siteView.webContents.loadURL(
      'data:text/html,' + encodeURIComponent(`
        <html><body style="margin:0;height:100vh;display:flex;align-items:center;
          justify-content:center;background:#0F0A1A;
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#F5F5F7;">
          <div style="text-align:center;">
            <h2 style="font-weight:600;font-size:17px;margin:0 0 6px;">Unable to connect</h2>
            <p style="color:rgba(255,255,255,0.4);margin:0;font-size:13px;">
              Check your internet and try again.</p>
          </div>
        </body></html>
      `)
    );
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── IPC handlers: toolbar tells main process what to do ─────────────────────
ipcMain.on('toolbar:back-to-portal', () => {
  siteView.webContents.loadURL(PORTAL_URL);
});

ipcMain.on('toolbar:zoom-in', () => {
  zoomFactor = Math.min(2.0, parseFloat((zoomFactor + 0.1).toFixed(1)));
  siteView.webContents.setZoomFactor(zoomFactor);
  toolbarView.webContents.send('zoom-changed', zoomFactor);
});

ipcMain.on('toolbar:zoom-out', () => {
  zoomFactor = Math.max(0.5, parseFloat((zoomFactor - 0.1).toFixed(1)));
  siteView.webContents.setZoomFactor(zoomFactor);
  toolbarView.webContents.send('zoom-changed', zoomFactor);
});

ipcMain.on('toolbar:zoom-reset', () => {
  zoomFactor = 1.0;
  siteView.webContents.setZoomFactor(zoomFactor);
  toolbarView.webContents.send('zoom-changed', zoomFactor);
});

ipcMain.on('toolbar:refresh', () => {
  siteView.webContents.reload();
});

ipcMain.on('toolbar:minimize', () => { mainWindow.minimize(); });
ipcMain.on('toolbar:maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('toolbar:close', () => { mainWindow.close(); });

// ── App lifecycle ─────────────────────────────────────────────────────────
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
