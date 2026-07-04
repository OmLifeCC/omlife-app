const { app, BrowserWindow, shell, Menu, screen } = require('electron');
const path = require('path');
const fs   = require('fs');

const SITE_URL    = 'https://omlife.in/my-portal/';
const ALLOWED_HOST = 'omlife.in';

// ── Window state persistence ─────────────────────────────────────────────────
const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try {
    const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    // Make sure the saved position is still on a connected display
    const displays = screen.getAllDisplays();
    const onScreen = displays.some(d =>
      saved.x >= d.bounds.x && saved.x < d.bounds.x + d.bounds.width &&
      saved.y >= d.bounds.y && saved.y < d.bounds.y + d.bounds.height
    );
    if (onScreen) return saved;
  } catch {}
  return { width: 1280, height: 800 }; // default first launch
}

function saveWindowState(win) {
  try {
    if (win.isMaximized() || win.isMinimized()) return;
    const b = win.getBounds();
    fs.writeFileSync(STATE_FILE, JSON.stringify(b));
  } catch {}
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function isAllowedUrl(url) {
  try {
    const { hostname } = new URL(url);
    return hostname === ALLOWED_HOST || hostname.endsWith('.' + ALLOWED_HOST);
  } catch { return false; }
}

// ── Main window ──────────────────────────────────────────────────────────────
let mainWindow;

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width:    state.width  || 1280,
    height:   state.height || 800,
    x:        state.x,
    y:        state.y,
    minWidth:  900,
    minHeight: 600,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    title: 'OmLife',
    autoHideMenuBar: true,
    backgroundColor: '#0B0B0F',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0B0B0F',
      symbolColor: '#FFFFFF',
      height: 36
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    show: false
  });

  mainWindow.loadURL(SITE_URL);

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Save state on every resize/move (debounced)
  let saveTimer;
  const debouncedSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveWindowState(mainWindow), 500);
  };
  mainWindow.on('resize', debouncedSave);
  mainWindow.on('move',   debouncedSave);

  // External links open in browser
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedUrl(url)) mainWindow.loadURL(url);
    else shell.openExternal(url);
    return { action: 'deny' };
  });

  // Offline fallback
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    if (errorCode === -3) return;
    mainWindow.loadURL(
      'data:text/html,' + encodeURIComponent(`
        <html>
          <body style="margin:0;height:100vh;display:flex;align-items:center;
                justify-content:center;background:#0B0B0F;
                font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                color:#F5F5F7;">
            <div style="text-align:center;">
              <h2 style="font-weight:600;letter-spacing:-0.02em;margin-bottom:8px;">
                Unable to connect</h2>
              <p style="color:#A1A1AA;margin:0;">
                Please check your internet connection.</p>
              <p style="color:#52525B;font-size:12px;margin-top:16px;">
                ${errorDescription}</p>
            </div>
          </body>
        </html>
      `)
    );
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App lifecycle ────────────────────────────────────────────────────────────
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

// Single instance lock
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
