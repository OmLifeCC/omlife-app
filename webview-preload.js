// webview-preload.js
// Injected into every site webview. Detects Ctrl/Cmd+Click on links and
// tells the parent toolbar to open them in a NEW TAB instead of navigating.
const { ipcRenderer } = require('electron');

window.addEventListener('click', (e) => {
  // Only care about Ctrl (Win/Linux) or Cmd (Mac) + click
  if (!e.ctrlKey && !e.metaKey) return;

  // Find the nearest anchor with an href
  let el = e.target;
  while (el && el.tagName !== 'A') el = el.parentElement;
  if (!el || !el.href) return;

  e.preventDefault();
  e.stopPropagation();
  // Send up to the host page (toolbar.html)
  ipcRenderer.sendToHost('open-in-new-tab', el.href);
}, true);
