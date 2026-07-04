window.addEventListener('DOMContentLoaded', () => {
  const dragBar = document.createElement('div');
  dragBar.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: 0',
    'right: 0',
    'height: 36px',
    '-webkit-app-region: drag',
    'z-index: 2147483647',
    'pointer-events: auto',
    'background: transparent',
  ].join(';');

  document.body.appendChild(dragBar);
});
