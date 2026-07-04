const { contextBridge, ipcRenderer, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize:     () => ipcRenderer.send('win:minimize'),
  maximize:     () => ipcRenderer.send('win:maximize'),
  close:        () => ipcRenderer.send('win:close'),
  openExternal: (url) => shell.openExternal(url),
  // Absolute file:// path to the webview preload — works in dev and packaged
  webviewPreloadPath: () => pathToFileURL(path.join(__dirname, 'webview-preload.js')).toString(),
});
