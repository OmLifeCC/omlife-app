const PORTAL_URL = 'https://omlife.in/my-portal/';

window.addEventListener('DOMContentLoaded', () => {

  const BAR_H = 38;
  const ICON  = 18;

  const bar = document.createElement('div');
  bar.id = 'ol-bar';
  bar.style.cssText = [
    'position:fixed','top:0','left:0','right:0',
    `height:${BAR_H}px`,
    'background:#0F0A1A',
    'border-bottom:1px solid rgba(139,92,246,0.2)',
    'display:flex','align-items:center',
    'padding:0','margin:0',
    'z-index:2147483647',
    '-webkit-app-region:drag',
    'box-sizing:border-box',
  ].join(';');

  function mkSvg(path) {
    return `<svg width="${ICON}" height="${ICON}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
      stroke-linejoin="round" style="display:block;flex-shrink:0">${path}</svg>`;
  }

  function mkBtn(title, path, onClick, id) {
    const b = document.createElement('button');
    if (id) b.id = id;
    b.title = title;
    b.innerHTML = mkSvg(path);
    b.style.cssText = [
      `width:${BAR_H + 4}px`,
      `height:${BAR_H}px`,
      'padding:0','border:none',
      'background:transparent',
      'color:rgba(255,255,255,0.75)',
      'cursor:pointer',
      'display:flex','align-items:center','justify-content:center',
      'flex-shrink:0',
      '-webkit-app-region:no-drag',
      'transition:color 0.1s,background 0.1s',
      'border-radius:0',
    ].join(';');
    b.onmouseenter = () => { b.style.color='#d8b4fe'; b.style.background='rgba(139,92,246,0.15)'; };
    b.onmouseleave = () => { b.style.color='rgba(255,255,255,0.75)'; b.style.background='transparent'; };
    b.onmousedown  = () => { b.style.background='rgba(139,92,246,0.25)'; };
    b.onmouseup    = () => { b.style.background='rgba(139,92,246,0.15)'; };
    b.onclick = onClick;
    return b;
  }

  function mkSep() {
    const d = document.createElement('div');
    d.style.cssText = 'width:1px;height:16px;background:rgba(139,92,246,0.22);margin:0 2px;flex-shrink:0';
    return d;
  }

  // ── zoom ─────────────────────────────────────────────────────────────────
  let zoom = 1.0;
  const STEP = 0.1, MIN = 0.5, MAX = 2.0;

  const badge = document.createElement('span');
  badge.style.cssText = [
    'font-size:11px','font-weight:600',
    'color:#c4b5fd',
    'background:rgba(139,92,246,0.18)',
    'border:1px solid rgba(139,92,246,0.3)',
    'border-radius:4px',
    'padding:2px 6px',
    'min-width:34px','text-align:center',
    'letter-spacing:0.04em',
    'display:none',
    '-webkit-app-region:no-drag',
    'cursor:default','user-select:none',
    'flex-shrink:0',
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

  // ── LEFT GROUP ───────────────────────────────────────────────────────────
  const left = document.createElement('div');
  left.style.cssText = 'display:flex;align-items:center;-webkit-app-region:no-drag;padding-left:6px;gap:0';

  // Back
  const backBtn = mkBtn('Back to portal',
    '<polyline points="15 18 9 12 15 6"/>',
    () => { window.location.href = PORTAL_URL; },
    'ol-back-btn'
  );
  backBtn.style.display = 'none';
  left.appendChild(backBtn);
  left.appendChild(mkSep());

  // Zoom in
  left.appendChild(mkBtn('Zoom in',
    '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    () => { zoom = Math.min(MAX, parseFloat((zoom+STEP).toFixed(1))); applyZoom(); }
  ));

  // Badge between + and -
  left.appendChild(badge);

  // Zoom out
  left.appendChild(mkBtn('Zoom out',
    '<line x1="5" y1="12" x2="19" y2="12"/>',
    () => { zoom = Math.max(MIN, parseFloat((zoom-STEP).toFixed(1))); applyZoom(); }
  ));

  left.appendChild(mkSep());

  // Reset
  left.appendChild(mkBtn('Reset zoom',
    '<path d="M3.51 15a9 9 0 1 0 .49-4.5"/><polyline points="3 3 3 11 11 11"/>',
    () => { zoom = 1.0; applyZoom(); }
  ));

  left.appendChild(mkSep());

  // Refresh
  left.appendChild(mkBtn('Refresh',
    '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    () => location.reload()
  ));

  // ── MIDDLE drag zone ─────────────────────────────────────────────────────
  const mid = document.createElement('div');
  mid.style.cssText = 'flex:1;height:100%;-webkit-app-region:drag';

  // ── RIGHT pad for native overlay controls ────────────────────────────────
  const right = document.createElement('div');
  right.style.cssText = 'width:138px;flex-shrink:0;-webkit-app-region:drag';

  bar.appendChild(left);
  bar.appendChild(mid);
  bar.appendChild(right);
  document.body.prepend(bar);
  document.body.style.paddingTop = BAR_H + 'px';

  // ── back button visibility ────────────────────────────────────────────────
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
