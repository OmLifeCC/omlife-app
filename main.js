const { app, BrowserWindow, shell, Menu, screen } = require('electron');
const path = require('path');
const fs   = require('fs');

const SITE_URL     = 'https://omlife.in/my-portal/';
const ALLOWED_HOST = 'omlife.in';

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
  return { width: 1280, height: 38 };
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

let mainWindow;

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
    // Custom toolbar injected via preload — use hidden title bar
    // with the overlay handling only the native window controls (min/max/close).
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0F0A1A',
      symbolColor: '#a78bfa',
      height: 38
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

  // Remember size/position
  let saveTimer;
  const debouncedSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveWindowState(mainWindow), 500);
  };
  mainWindow.on('resize', debouncedSave);
  mainWindow.on('move',   debouncedSave);

  // Keep external links in browser
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
                justify-content:center;background:#0F0A1A;
                font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                color:#F5F5F7;">
            <div style="text-align:center;">
              <div style="width:48px;height:48px;border-radius:50%;
                background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.3);
                display:flex;align-items:center;justify-content:center;
                margin:0 auto 16px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="#8B5CF6" stroke-width="2" stroke-linecap="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <h2 style="font-weight:600;font-size:17px;margin:0 0 6px;
                letter-spacing:-0.02em;">Unable to connect</h2>
              <p style="color:rgba(255,255,255,0.4);margin:0;font-size:13px;">
                Check your internet and try again.</p>
            </div>
          </body>
        </html>
      `)
    );
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

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
