const PORTAL_URL = 'https://omlife.in/my-portal/';
const BAR_H = 38;

// ── Inject layout-shift CSS at the earliest possible moment ─────────────────
// Preload scripts run before the DOM exists, so document.documentElement
// may be null. We poll until <html> exists, then inject synchronously —
// this guarantees it lands before first paint, with no flash and no
// possibility of a WordPress theme overriding it (html-level + !important
// beats virtually all theme CSS specificity).
function injectLayoutCSS() {
  if (!document.documentElement) {
    // <html> not parsed yet — try again on the next microtask
    requestAnimationFrame(injectLayoutCSS);
    return;
  }
  const style = document.createElement('style');
  style.id = 'ol-layout-style';
  style.textContent = `
    html {
      margin-top: ${BAR_H}px !important;
    }
    body {
      min-height: calc(100vh - ${BAR_H}px) !important;
    }
  `;
  document.documentElement.insertBefore(style, document.documentElement.firstChild);
}
injectLayoutCSS();

// ── Toolbar ───────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {

  const bar = document.createElement('div');
  bar.id = 'ol-bar';
  bar.style.cssText = [
    'position:fixed','top:0','left:0','right:0',
    `height:${BAR_H}px`,
    'background:#0F0A1A',
    'border-bottom:1px solid rgba(139,92,246,0.15)',
    'display:flex','align-items:center',
    'padding:0','margin:0',
    'z-index:2147483647',
    '-webkit-app-region:drag',
    'box-sizing:border-box',
  ].join(';');

  function mkSvg(path) {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
      stroke-linejoin="round" style="display:block;flex-shrink:0">${path}</svg>`;
  }

  function mkBtn(title, path, onClick, id) {
    const b = document.createElement('button');
    if (id) b.id = id;
    b.title = title;
    b.innerHTML = mkSvg(path);
    // Very quiet resting state — barely-there gray, matching a calm
    // premium toolbar (macOS Safari / Notion style), not a HUD.
    b.style.cssText = [
      `width:${BAR_H + 4}px`,
      `height:${BAR_H}px`,
      'padding:0','border:none','margin:0',
      'background:transparent',
      'color:#4b4658',
      'cursor:pointer',
      'display:flex','align-items:center','justify-content:center',
      'flex-shrink:0',
      '-webkit-app-region:no-drag',
      'transition:color 0.15s ease,background 0.15s ease',
      'border-radius:0',
      'outline:none',
      'font:inherit',
    ].join(';');
    b.onmouseenter = () => { b.style.color='#a78bfa'; b.style.background='rgba(139,92,246,0.08)'; };
    b.onmouseleave = () => { b.style.color='#4b4658'; b.style.background='transparent'; };
    b.onmousedown  = () => { b.style.background='rgba(139,92,246,0.16)'; };
    b.onmouseup    = () => { b.style.background='rgba(139,92,246,0.08)'; };
    b.onclick = onClick;
    return b;
  }

  function mkSep() {
    const d = document.createElement('div');
    d.style.cssText = 'width:1px;height:14px;background:rgba(255,255,255,0.06);margin:0 3px;flex-shrink:0';
    return d;
  }

  // ── zoom state ───────────────────────────────────────────────────────────
  let zoom = 1.0;
  const STEP = 0.1, MIN = 0.5, MAX = 2.0;

  const badge = document.createElement('span');
  badge.style.cssText = [
    'font-size:10px','font-weight:600',
    'color:#a78bfa',
    'background:rgba(139,92,246,0.10)',
    'border:1px solid rgba(139,92,246,0.18)',
    'border-radius:4px',
    'padding:2px 6px',
    'min-width:32px','text-align:center',
    'letter-spacing:0.03em',
    'display:none',
    '-webkit-app-region:no-drag',
    'cursor:default','user-select:none',
    'flex-shrink:0',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  ].join(';');

  function applyZoom() {
    document.body.style.zoom = zoom;
    const pct = Math.round(zoom * 100);
    if (pct === 100) {
      badge.style.display = 'none';
    } else {
      badge.textContent = pct + '%';
      badge.style.display = 'inline-block';
    }
  }

  // ── LEFT group ───────────────────────────────────────────────────────────
  const left = document.createElement('div');
  left.style.cssText = 'display:flex;align-items:center;-webkit-app-region:no-drag;padding-left:6px;gap:0';

  const backBtn = mkBtn('Back to portal',
    '<polyline points="15 18 9 12 15 6"/>',
    () => { window.location.href = PORTAL_URL; },
    'ol-back-btn'
  );
  backBtn.style.display = 'none';
  left.appendChild(backBtn);
  left.appendChild(mkSep());

  left.appendChild(mkBtn('Zoom in',
    '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    () => { zoom = Math.min(MAX, parseFloat((zoom+STEP).toFixed(1))); applyZoom(); }
  ));

  left.appendChild(badge);

  left.appendChild(mkBtn('Zoom out',
    '<line x1="5" y1="12" x2="19" y2="12"/>',
    () => { zoom = Math.max(MIN, parseFloat((zoom-STEP).toFixed(1))); applyZoom(); }
  ));

  left.appendChild(mkSep());

  left.appendChild(mkBtn('Reset zoom',
    '<path d="M3.51 15a9 9 0 1 0 .49-4.5"/><polyline points="3 3 3 11 11 11"/>',
    () => { zoom = 1.0; applyZoom(); }
  ));

  left.appendChild(mkSep());

  left.appendChild(mkBtn('Refresh',
    '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    () => location.reload()
  ));

  // ── middle drag zone ─────────────────────────────────────────────────────
  const mid = document.createElement('div');
  mid.style.cssText = 'flex:1;height:100%;-webkit-app-region:drag';

  // ── right pad for native overlay window controls ─────────────────────────
  const right = document.createElement('div');
  right.style.cssText = 'width:138px;flex-shrink:0;-webkit-app-region:drag';

  bar.appendChild(left);
  bar.appendChild(mid);
  bar.appendChild(right);
  document.body.prepend(bar);

  // ── back button show/hide ────────────────────────────────────────────────
  function updateBack() {
    const on = window.location.href.startsWith(PORTAL_URL) ||
               window.location.href === 'https://omlife.in/my-portal';
    backBtn.style.display = on ? 'none' : 'flex';
  }
  updateBack();
  const oP = history.pushState.bind(history);
  const oR = history.replaceState.bind(history);
  history.pushState    = (...a) => { oP(...a); updateBack(); };
  history.replaceState = (...a) => { oR(...a); updateBack(); };
  window.addEventListener('popstate', updateBack);
});
