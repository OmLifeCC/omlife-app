// webview-preload.js
// Injected into every site webview.
// - Single click  → normal navigation in the SAME tab (default browser behaviour)
// - Ctrl+Shift+Click → open the link in a NEW tab
const { ipcRenderer } = require('electron');

window.addEventListener('click', (e) => {
  // Only intercept Ctrl+Shift+Click (or Cmd+Shift on Mac)
  if (!((e.ctrlKey || e.metaKey) && e.shiftKey)) return;

  let el = e.target;
  while (el && el.tagName !== 'A') el = el.parentElement;
  if (!el || !el.href) return;

  e.preventDefault();
  e.stopPropagation();
  ipcRenderer.sendToHost('open-in-new-tab', el.href);
}, true);
