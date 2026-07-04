// webview-preload.js
// Injected into every site webview. Handles click routing:
//   • single click          → same tab (default, let it navigate)
//   • Ctrl + click           → new tab
//   • Ctrl + Shift + click   → popup window
const { ipcRenderer } = require('electron');

window.addEventListener('click', (e) => {
  const ctrl  = e.ctrlKey || e.metaKey;
  const shift = e.shiftKey;

  // Plain click → do nothing special, let the page navigate in the same tab
  if (!ctrl) return;

  // Find nearest anchor
  let el = e.target;
  while (el && el.tagName !== 'A') el = el.parentElement;
  if (!el || !el.href) return;

  e.preventDefault();
  e.stopPropagation();

  if (ctrl && shift) {
    ipcRenderer.sendToHost('open-in-popup', el.href);
  } else if (ctrl) {
    ipcRenderer.sendToHost('open-in-new-tab', el.href);
  }
}, true);
