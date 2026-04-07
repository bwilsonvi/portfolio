/* Main JS */

/* Grid overlay toggle — press 'G' to show/hide column guides.
   Reuses .grid-reveal CSS classes for visual consistency.
   Auto-rebuilds when browser is resized across breakpoints. */
(function () {
  let active = false;

  function getBreakpoint() {
    if (window.innerWidth >= 1024) return 'desktop';
    if (window.innerWidth >= 768) return 'tablet';
    return 'mobile';
  }

  function buildOverlay() {
    const existing = document.getElementById('grid-debug');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'grid-debug';
    overlay.className = 'grid-reveal';
    overlay.style.animation = 'none';
    overlay.style.opacity = '1';
    overlay.setAttribute('aria-hidden', 'true');

    const container = document.createElement('div');
    container.className = 'container';

    const columnsWrap = document.createElement('div');
    columnsWrap.className = 'grid-reveal__columns';

    for (let i = 0; i < 12; i++) {
      const col = document.createElement('div');
      col.className = 'grid-reveal__col';

      const label = document.createElement('span');
      label.textContent = i + 1;
      col.appendChild(label);

      columnsWrap.appendChild(col);
    }

    container.appendChild(columnsWrap);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
  }

  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    if (e.key === 'g' || e.key === 'G') {
      active = !active;
      if (active) {
        buildOverlay();
      } else {
        const el = document.getElementById('grid-debug');
        if (el) el.remove();
      }
    }
  });

  let lastBp = getBreakpoint();
  window.addEventListener('resize', function () {
    if (!active) return;
    const bp = getBreakpoint();
    if (bp !== lastBp) {
      lastBp = bp;
      buildOverlay();
    }
  });
})();
