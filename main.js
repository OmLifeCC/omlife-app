const { app, BrowserWindow, shell, Menu, screen, ipcMain, webContents } = require('electron');
const path = require('path');
const fs   = require('fs');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }

const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

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
      sandbox:          false,
      webviewTag:       true,
      partition:        'persist:omlife',
    }
  });

  win.loadFile(path.join(__dirname, 'toolbar.html'));
  win.once('ready-to-show', () => win.show());

  // ── THE REAL FIX ──────────────────────────────────────────────────────────
  // Control every webview's window-open behaviour at the main-process level.
  // The renderer 'new-window' event is unreliable in Electron 31, so we
  // attach setWindowOpenHandler to each webview's webContents as it attaches.
  // This is what actually stops the popup on a plain single click.
  win.webContents.on('did-attach-webview', (event, webContents) => {
    // Chrome-like Ctrl+scroll / trackpad-pinch zoom. Electron's documented,
    // reliable mechanism for this is the 'zoom-changed' event — fired
    // automatically whenever the user does Ctrl+wheel or a trackpad pinch
    // over this webContents. (Note: setVisualZoomLevelLimits is NOT used
    // here — it's a known-buggy API for <webview> in current Electron and
    // does not reliably fire at all; zoom-changed is the supported path.)
    webContents.on('zoom-changed', (_event, zoomDirection) => {
      const step = 0.1;
      const current = webContents.getZoomFactor();
      const next = zoomDirection === 'in'
        ? Math.min(3.0, parseFloat((current + step).toFixed(2)))
        : Math.max(0.5, parseFloat((current - step).toFixed(2)));
      webContents.setZoomFactor(next);
    });

    webContents.setWindowOpenHandler(({ url }) => {
      // Any attempt to open a new window (target=_blank, window.open, etc.)
      // is DENIED as a popup. Instead we route it based on modifier keys,
      // which the webview preload has already handled for Ctrl / Ctrl+Shift.
      // A plain click reaching here means target=_blank → load in same tab.
      if (url && url.indexOf('omlife.in') !== -1) {
        webContents.loadURL(url);   // same tab
      } else if (url) {
        shell.openExternal(url);    // external → OS browser
      }
      return { action: 'deny' };
    });
  });

  let t;
  win.on('resize', () => { clearTimeout(t); t = setTimeout(() => saveState(win), 500); });
  win.on('move',   () => { clearTimeout(t); t = setTimeout(() => saveState(win), 500); });
  win.on('closed', () => { win = null; });
}

ipcMain.on('win:minimize', () => win && win.minimize());
ipcMain.on('win:maximize', () => win && (win.isMaximized() ? win.unmaximize() : win.maximize()));
ipcMain.on('win:close',    () => win && win.close());

// Toolbar zoom +/- buttons: nudge a specific webview's zoom factor by its
// webContents id (sent from the renderer via webview.getWebContentsId()).
// direction: 1 = zoom in, -1 = zoom out, 0 = reset to 100%.
ipcMain.on('webview:zoom', (event, webContentsId, direction) => {
  const target = webContents.fromId(webContentsId);
  if (!target) return;
  if (direction === 0) {
    target.setZoomFactor(1.0);
    return;
  }
  const step = 0.1;
  const current = target.getZoomFactor();
  const next = direction > 0
    ? Math.min(3.0, parseFloat((current + step).toFixed(2)))
    : Math.max(0.5, parseFloat((current - step).toFixed(2)));
  target.setZoomFactor(next);
});

// Ctrl+Shift+Click → open the link in a separate popup window.
// Multiple popups can be open at once, so each one needs to be
// distinguishable in the Windows taskbar / Alt-Tab / when minimized:
//   1. An immediate, unique placeholder title set BEFORE the page loads
//      (Windows creates the taskbar entry right away, using whatever title
//      the window has at creation time — waiting for the page's own title
//      to arrive later is often too late if you minimize quickly).
//   2. That title is then replaced with the real page title once it loads.
//   3. A cascading spawn position so windows don't stack exactly on top of
//      each other while still open and visible on screen.
let popupCount = 0;

ipcMain.on('win:popup', (event, url) => {
  popupCount++;
  const thisPopupNumber = popupCount;
  const cascadeOffset = ((popupCount - 1) % 8) * 32; // wraps after 8 to avoid drifting off-screen

  const primaryDisplay = screen.getPrimaryDisplay();
  const baseX = primaryDisplay.bounds.x + 80;
  const baseY = primaryDisplay.bounds.y + 60;

  const popup = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 500,
    minHeight: 400,
    x: baseX + cascadeOffset,
    y: baseY + cascadeOffset,
    parent: win || undefined,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    // Unique placeholder immediately, so even if minimized before the page
    // loads, the taskbar entry is never just an ambiguous "OmLife".
    title: 'OmLife — Loading ' + thisPopupNumber + '…',
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: 'persist:omlife',
    }
  });

  // Give this popup its own taskbar identity so Windows doesn't merge/group
  // it ambiguously with the main window or other popups — each one gets its
  // own clickable taskbar button instead of being stacked under one icon.
  popup.setAppDetails({
    appId: 'in.omlife.desktop.popup.' + thisPopupNumber,
  });

  // As soon as the real page title is known, replace the placeholder.
  popup.webContents.on('page-title-updated', (event, title) => {
    event.preventDefault();
    popup.setTitle(title && title.trim() ? title : ('OmLife ' + thisPopupNumber));
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
