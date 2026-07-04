const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize:      () => ipcRenderer.send('win:minimize'),
  maximize:      () => ipcRenderer.send('win:maximize'),
  close:         () => ipcRenderer.send('win:close'),
  openExternal:  (url) => shell.openExternal(url),
});
