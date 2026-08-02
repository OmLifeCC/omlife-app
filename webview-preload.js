// webview-preload.js
// Injected into every site webview. Handles click routing:
//   • single click          → same tab (default, let it navigate)
//   • Ctrl + click           → new tab
//   • Ctrl + Shift + click   → popup window
// Also handles trackpad pinch-to-zoom / Ctrl+scroll-wheel zoom (like Chrome).
const { ipcRenderer } = require('electron');

// Inject a slim, unobtrusive scrollbar style into every page — overrides
// the default thick OS/Chromium scrollbar with something closer to the
// app's dark, minimal aesthetic. Runs once the page DOM is ready.
function injectScrollbarStyle() {
  if (document.getElementById('__omlife_scrollbar_style__')) return;
  const style = document.createElement('style');
  style.id = '__omlife_scrollbar_style__';
  style.textContent = `
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb {
      background-color: rgba(139,92,246,0.35);
      border-radius: 8px;
    }
    ::-webkit-scrollbar-thumb:hover { background-color: rgba(139,92,246,0.55); }
    ::-webkit-scrollbar-corner { background: transparent; }
  `;
  (document.head || document.documentElement).appendChild(style);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectScrollbarStyle);
} else {
  injectScrollbarStyle();
}

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

// Note: trackpad pinch-to-zoom and Ctrl+scroll-wheel zoom are NOT
// intercepted here anymore. Chromium's native visual (pinch) zoom is
// enabled at the main-process level via setVisualZoomLevelLimits, and
// letting the browser handle it directly gives the same free, non-reflowing
// zoom feel as real Chrome — scaling pixels without "adjusting" the layout.
