const backBtn    = document.getElementById('back-btn');
const backSep    = document.getElementById('back-sep');
const zoomBadge  = document.getElementById('zoom-badge');

document.getElementById('back-btn').addEventListener('click', () => {
  window.omlife.send('toolbar:back-to-portal');
});
document.getElementById('zoom-in-btn').addEventListener('click', () => {
  window.omlife.send('toolbar:zoom-in');
});
document.getElementById('zoom-out-btn').addEventListener('click', () => {
  window.omlife.send('toolbar:zoom-out');
});
document.getElementById('zoom-reset-btn').addEventListener('click', () => {
  window.omlife.send('toolbar:zoom-reset');
});
document.getElementById('refresh-btn').addEventListener('click', () => {
  window.omlife.send('toolbar:refresh');
});
document.getElementById('min-btn').addEventListener('click', () => {
  window.omlife.send('toolbar:minimize');
});
document.getElementById('max-btn').addEventListener('click', () => {
  window.omlife.send('toolbar:maximize');
});
document.getElementById('close-btn').addEventListener('click', () => {
  window.omlife.send('toolbar:close');
});

// ── Updates pushed from main process ─────────────────────────────────────
window.omlife.onZoomChanged((factor) => {
  const pct = Math.round(factor * 100);
  if (pct === 100) {
    zoomBadge.style.display = 'none';
  } else {
    zoomBadge.textContent = pct + '%';
    zoomBadge.style.display = 'inline-block';
  }
});

const PORTAL_URL = 'https://omlife.in/my-portal/';

window.omlife.onSiteUrlChanged((url) => {
  const onPortal = url.startsWith(PORTAL_URL) || url === 'https://omlife.in/my-portal';
  backBtn.style.display = onPortal ? 'none' : 'flex';
  backSep.style.display = onPortal ? 'none' : 'block';
});
