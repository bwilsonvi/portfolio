// Decide immediately: show cover (fresh arrival) or remove it (internal nav)
(function() {
  const cover = document.getElementById('cover');
  // One-time "internal nav" flag — set by links within the site, cleared here.
  // Present → user clicked from Studio/modal (skip cover).
  // Absent  → fresh arrival, refresh, bookmark, typed URL (show cover).
  if (sessionStorage.getItem('portfolio_nav') || window.location.hash) {
    sessionStorage.removeItem('portfolio_nav');
    cover.remove();
    return;
  }
  window.__coverActive = true;
  document.documentElement.classList.add('cover-active', 'cover-entered');

  // Pixel-crisp cover lines: snap line weight to whole pixels,
  // adjust SVG viewBox so both CSS vertical lines and SVG horizontal
  // lines render at the identical snapped weight.
  // Mobile: art-directed crop to single left diamond.
  function updateCoverLines() {
    const clip = document.querySelector('.cover__art-clip');
    const svg = document.querySelector('.cover__art');
    if (!clip || !svg) return;
    const containerW = clip.clientWidth;
    if (containerW <= 0) return;

    // Original SVG geometry
    const VB_W = 1396, VB_H = 727, VB_Y = 18;
    const CENTER_X = 720;          // horizontal center of full composition
    const LEFT_DIAMOND_X = 380;    // center of left diamond

    // Natural scale if SVG filled container with original viewBox
    const naturalScale = containerW / VB_W;
    const naturalLineW = 4 * naturalScale;

    // Snap line weight to nearest whole pixel, minimum 2
    const lineW = Math.max(2, Math.round(naturalLineW));

    // Scale that produces this snapped line weight
    const scale = lineW / 4;

    // ViewBox width at the snapped scale
    const vbW = containerW / scale;

    // Mobile art direction: crop to single left diamond
    const isMobile = window.innerWidth < 768;
    const focusX = isMobile ? LEFT_DIAMOND_X : CENTER_X;
    const vbX = focusX - vbW / 2;

    // Update SVG viewBox so its internal lines render at snapped weight
    svg.setAttribute('viewBox', vbX + ' ' + VB_Y + ' ' + vbW + ' ' + VB_H);

    // CSS vertical lines at the same snapped weight, edge-to-edge
    const basePeriod = 16 * scale;
    const n = Math.max(2, Math.round((containerW - lineW) / basePeriod) + 1);
    const period = (containerW - lineW) / (n - 1);

    clip.style.setProperty('--line-w', lineW + 'px');
    clip.style.setProperty('--line-period', period + 'px');
  }
  requestAnimationFrame(updateCoverLines);
  window.addEventListener('resize', updateCoverLines);

  // --- Scramble-dissolve for cover text ---
  // Characters glitch into random glyphs while text shrinks from the end.
  function scrambleOut(el, speed, variation) {
    const original = el.textContent.split('');
    let len = original.length;
    const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    function humanDelay() {
      const min = Math.max(15, speed - variation);
      const max = speed + variation;
      return min + Math.random() * (max - min);
    }

    function tick() {
      if (len <= 0) {
        el.textContent = '';
        return;
      }
      // Remove one character from the end
      len--;
      // Build display: scramble ~30% of remaining characters
      let display = '';
      for (let i = 0; i < len; i++) {
        if (original[i] === ' ') {
          display += ' ';
        } else if (Math.random() < 0.3) {
          display += glyphs[Math.floor(Math.random() * glyphs.length)];
        } else {
          display += original[i];
        }
      }
      el.textContent = display;
      setTimeout(tick, humanDelay());
    }

    tick();
  }

  const HOLD = 2500;
  const FADE = 500;
  const SCRAMBLE_SPEED = 35;     // ms per character removal
  const SCRAMBLE_VARIATION = 15;
  const DIAMOND_LEAD = 800;      // ms before final fade that diamonds start fading
  const RETRACT_LEAD = 400;      // ms before final fade that vertical lines retract

  // Title is ~30 chars × ~35ms ≈ 1050ms to scramble out
  // Start scramble so it finishes around when lines retract
  const scrambleAt = HOLD - DIAMOND_LEAD - 200; // start a bit before diamonds
  const diamondsAt = HOLD - DIAMOND_LEAD;
  const retractAt = HOLD - RETRACT_LEAD;
  const fadeAt = HOLD;

  function dismissCover() {
    if (!cover.parentNode) return;
    cover.remove();
    window.__coverActive = false;
    window.removeEventListener('resize', updateCoverLines);
    // Dispatch BEFORE removing cover-active so the typing animation
    // clears the text synchronously while the header is still hidden.
    document.dispatchEvent(new CustomEvent('cover:dismissed'));
    document.documentElement.classList.remove('cover-active', 'cover-revealing');
  }

  // 0. Cover text scramble-dissolves
  setTimeout(function() {
    // Lock header height before text disappears to prevent layout shift
    const header = cover.querySelector('.cover__header');
    if (header) header.style.height = header.offsetHeight + 'px';

    const title = cover.querySelector('.cover-nav__title');
    const year = cover.querySelector('.cover-nav__year');
    if (title) scrambleOut(title, SCRAMBLE_SPEED, SCRAMBLE_VARIATION);
    if (year) scrambleOut(year, SCRAMBLE_SPEED, SCRAMBLE_VARIATION);
  }, scrambleAt);

  // 1a. Horizontal lines inside diamonds fade out first
  setTimeout(function() {
    cover.classList.add('cover--h-fade');
  }, diamondsAt - 300);

  // 1b. Diamond fills fade out after horizontal lines are gone
  setTimeout(function() {
    cover.classList.add('cover--diamonds-fade');
  }, diamondsAt);

  // 2. Vertical lines retract + bg fades to transparent, reveal work page
  setTimeout(function() {
    cover.classList.add('cover--lines-retract');
    cover.classList.add('cover--bg-fade');
    document.documentElement.classList.add('cover-revealing');
    // Start grid-reveal columns behind the cover
    document.dispatchEvent(new CustomEvent('cover:revealing'));
  }, retractAt);

  // 3. Final opacity fade
  setTimeout(function() {
    cover.classList.add('is-leaving');
    cover.addEventListener('transitionend', dismissCover, { once: true });
    setTimeout(dismissCover, FADE + 100);
  }, fadeAt);
})();
