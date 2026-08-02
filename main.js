const { app, BrowserWindow, shell, Menu, screen, ipcMain } = require('electron');
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

// Ctrl+Shift+Click → open the link in a separate popup window.
// Multiple popups can be open at once, so each one needs:
//   1. A title that reflects the actual page (not a hardcoded "OmLife"),
//      so Windows taskbar / Alt-Tab / minimized icons are distinguishable.
//   2. A cascading spawn position, so new popups don't stack exactly on
//      top of the previous one with no visible way to tell them apart.
let popupCount = 0;

ipcMain.on('win:popup', (event, url) => {
  const cascadeOffset = (popupCount % 8) * 32; // wraps after 8 to avoid drifting off-screen
  popupCount++;

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
    title: 'OmLife',
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: 'persist:omlife',
    }
  });

  // Keep the window title (and therefore its taskbar entry) in sync with
  // the actual page title, so minimized popups are identifiable at a glance.
  popup.webContents.on('page-title-updated', (event, title) => {
    event.preventDefault();
    popup.setTitle(title || 'OmLife');
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
