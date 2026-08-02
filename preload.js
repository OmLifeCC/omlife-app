const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  close:    () => ipcRenderer.send('win:close'),

  // Auto-hide bar reveal/hide (main adjusts the content view bounds)
  barShow: () => ipcRenderer.send('bar:show'),
  barHide: () => ipcRenderer.send('bar:hide'),

  // Navigation
  navBack:    () => ipcRenderer.send('nav:back'),
  navForward: () => ipcRenderer.send('nav:forward'),
  navRefresh: () => ipcRenderer.send('nav:refresh'),
  navPortal:  () => ipcRenderer.send('nav:portal'),

  // Zoom (1 = in, -1 = out, 0 = reset)
  zoomStep: (direction) => ipcRenderer.send('zoom:step', direction),

  // State pushed from main → renderer
  onNavState: (cb) => ipcRenderer.on('nav:state', (_e, s) => cb(s)),
  onBarVisibility: (cb) => ipcRenderer.on('bar:visibility', (_e, v) => cb(v)),
});
