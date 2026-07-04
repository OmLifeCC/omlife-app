const PORTAL_URL = 'https://omlife.in/my-portal/';

window.addEventListener('DOMContentLoaded', () => {

  // ── 1. Drag bar ──────────────────────────────────────────────────────────
  const dragBar = document.createElement('div');
  dragBar.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:140px',
    'height:36px', '-webkit-app-region:drag',
    'z-index:2147483646', 'pointer-events:auto',
    'background:transparent'
  ].join(';');
  document.body.appendChild(dragBar);

  // ── 2. Back button (arrow only, no text) ─────────────────────────────────
  const btn = document.createElement('button');
  btn.id = 'ol-back-btn';
  btn.title = 'Back to Portal';
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2.5"
         stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  `;
  btn.style.cssText = [
    'position:fixed', 'top:6px', 'left:10px',
    'width:26px', 'height:24px', 'padding:0',
    'display:none', 'align-items:center', 'justify-content:center',
    'background:rgba(255,255,255,0.07)',
    'border:1px solid rgba(255,255,255,0.10)',
    'border-radius:6px', 'color:#ffffff',
    'cursor:pointer',
    '-webkit-app-region:no-drag',
    'z-index:2147483647',
    'transition:background 0.15s',
  ].join(';');

  btn.addEventListener('mouseenter', () => {
    btn.style.background = 'rgba(255,255,255,0.14)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = 'rgba(255,255,255,0.07)';
  });
  btn.addEventListener('click', () => {
    window.location.href = PORTAL_URL;
  });
  document.body.appendChild(btn);

  // ── 3. Show/hide based on current URL ────────────────────────────────────
  function updateButton() {
    const onPortal = window.location.href.startsWith(PORTAL_URL) ||
                     window.location.href === 'https://omlife.in/my-portal';
    btn.style.display = onPortal ? 'none' : 'inline-flex';
  }

  updateButton();

  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);
  history.pushState    = (...a) => { origPush(...a);    updateButton(); };
  history.replaceState = (...a) => { origReplace(...a); updateButton(); };
  window.addEventListener('popstate', updateButton);
});
