const { app, BrowserWindow, shell, Menu, session } = require('electron');
const path = require('path');

const SITE_URL = 'https://omlife.in/';
// Only navigate freely within this domain; anything else opens in the
// user's default browser instead of inside the app window.
const ALLOWED_HOST = 'omlife.in';

let mainWindow;

function isAllowedUrl(url) {
  try {
    const { hostname } = new URL(url);
    return hostname === ALLOWED_HOST || hostname.endsWith('.' + ALLOWED_HOST);
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    title: 'OmLife',
    autoHideMenuBar: true,
    backgroundColor: '#0B0B0F',
    // Minimal premium chrome: a thin native title bar showing only the
    // window title ("OmLife") and system window controls — no menu bar,
    // no toolbar, no browser-style address bar. Content runs edge-to-edge
    // right up under that thin strip.
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

  // Show once ready to avoid a white flash on launch
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Keep navigation inside the app limited to the OmLife domain.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Links that try to open a new window (target=_blank, popups) get sent
  // to the default browser instead of spawning new Electron windows,
  // unless they're still on the OmLife domain, in which case load them
  // in the same window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedUrl(url)) {
      mainWindow.loadURL(url);
    } else {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Basic offline / load-failure fallback
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    if (errorCode === -3) return; // ignore aborted loads (e.g. redirects)
    mainWindow.loadURL(
      'data:text/html,' +
        encodeURIComponent(`
        <html>
          <body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#0B0B0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#F5F5F7;">
            <div style="text-align:center;">
              <h2 style="font-weight:600;letter-spacing:-0.02em;margin-bottom:8px;">Unable to connect</h2>
              <p style="color:#A1A1AA;margin:0;">Please check your internet connection.</p>
              <p style="color:#52525B;font-size:12px;margin-top:16px;">${errorDescription}</p>
            </div>
          </body>
        </html>
      `)
    );
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null); // remove default File/Edit/View menu bar
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Prevent multiple instances; focus existing window instead
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
