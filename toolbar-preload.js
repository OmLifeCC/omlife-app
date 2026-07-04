const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('omlife', {
  send: (channel) => {
    const allowed = [
      'toolbar:back-to-portal',
      'toolbar:zoom-in',
      'toolbar:zoom-out',
      'toolbar:zoom-reset',
      'toolbar:refresh',
      'toolbar:minimize',
      'toolbar:maximize',
      'toolbar:close',
    ];
    if (allowed.includes(channel)) ipcRenderer.send(channel);
  },
  onZoomChanged: (callback) => {
    ipcRenderer.on('zoom-changed', (event, factor) => callback(factor));
  },
  onSiteUrlChanged: (callback) => {
    ipcRenderer.on('site-url-changed', (event, url) => callback(url));
  },
});
