/* Modal Overlay Navigation
   Full-page overlay for portfolio details, resume, and contact.
   Inherits theme from parent page via CSS custom properties.

   Triggers: any element with [data-modal="slug"] attribute.
   Modal shell must exist in HTML with id="modal".
*/
(function () {
  const modal = document.getElementById('modal');
  if (!modal) return;

  const modalBody = modal.querySelector('.modal__body .container');
  const modalNumber = modal.querySelector('.modal__title-number');
  const modalTitle = modal.querySelector('.modal-nav__title');
  const closeBtn = modal.querySelector('.modal__close');
  const printBtn = modal.querySelector('.modal__print');
  const downloadBtn = modal.querySelector('.modal__download');
  let savedScrollY = 0;
  let currentModalId = null;
  let triggerElement = null;

  // Prevent browser's automatic scroll restoration from fighting manual restore
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // Sticky nav scroll tracking
  const stickyNav = modal.querySelector('.modal-sticky-nav');
  let lastScrollTop = 0;
  let directionChangeTop = 0;
  let scrollingDown = true;
  const SHOW_THRESHOLD = 40;
  const DEAD_ZONE = 5;

  // Main page content wrapper — hidden when modal is active
  const pageContent = document.querySelector('.page-content');

  // Focus trap — keeps Tab/Shift+Tab within the modal
  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  // Statement truncation: truncates text inline with "… Read the full story" button
  // Supports responsive recalculation via ResizeObserver
  let statementObserver = null;

  function setupStatementTruncation(statement) {
    const fullText = statement.textContent;
    const words = fullText.split(' ');
    let expanded = false;
    let lastWidth = 0;
    let debounceTimer = null;

    function truncate() {
      if (expanded) return;

      const lineHeight = parseFloat(getComputedStyle(statement).lineHeight);
      // 3 lines is the visual target for text
      const threeLineHeight = lineHeight * 3;
      // Allow 4 lines for measurement to accommodate the inline button
      const maxHeight = lineHeight * 4;

      // Reset to full text to measure natural height
      statement.textContent = fullText;
      statement.style.maxHeight = '';
      statement.style.overflow = '';

      // Check if truncation is needed: full text must exceed 4 lines
      // (the maxHeight allowance). If it fits in 4 lines, show it all —
      // truncation is only meaningful when significant content is hidden.
      if (statement.scrollHeight <= maxHeight + 1) return;

      // Create the inline button
      const btn = document.createElement('button');
      btn.className = 'statement__toggle';
      btn.setAttribute('aria-label', 'Read full project description');
      btn.textContent = 'Read more';

      // Find the maximum number of words where text + "… Read more" fits
      // within maxHeight. Single binary search over all words.
      statement.style.overflow = 'hidden';
      statement.style.maxHeight = maxHeight + 'px';

      let low = 0;
      let high = words.length;
      let truncated = '';

      while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        statement.textContent = words.slice(0, mid).join(' ') + '… ';
        statement.appendChild(btn);

        if (statement.scrollHeight <= maxHeight + 1) {
          low = mid;
          truncated = words.slice(0, mid).join(' ');
        } else {
          high = mid - 1;
        }
      }

      // Only apply truncation if we actually removed words
      if (!truncated || truncated.split(' ').length >= words.length) {
        // Truncation didn't remove any words — full text fits or is equal
        statement.textContent = fullText;
        statement.style.maxHeight = '';
        statement.style.overflow = '';
        return;
      }

      // Apply final truncated text with button
      statement.textContent = truncated + '… ';
      statement.appendChild(btn);

      // Handle expand
      btn.onclick = function() {
        expanded = true;
        const clampedH = statement.clientHeight;
        statement.textContent = fullText;
        statement.style.maxHeight = 'none';
        const expandedH = statement.scrollHeight;

        // Animate
        statement.style.maxHeight = clampedH + 'px';
        statement.classList.add('statement--expanding');
        statement.offsetHeight; // force reflow
        statement.style.maxHeight = expandedH + 'px';

        statement.addEventListener('transitionend', function handler() {
          statement.style.maxHeight = '';
          statement.style.overflow = '';
          statement.classList.remove('statement--expanding');
          statement.removeEventListener('transitionend', handler);
        });
      };
    }

    // Initial truncation
    setTimeout(truncate, 50);

    // Watch for resize — debounced recalculation
    if (typeof ResizeObserver !== 'undefined') {
      statementObserver = new ResizeObserver(function(entries) {
        const newWidth = entries[0].contentRect.width;
        if (Math.abs(newWidth - lastWidth) < 1) return; // skip sub-pixel changes
        lastWidth = newWidth;

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(truncate, 150);
      });
      statementObserver.observe(statement);
    }
  }

  function teardownStatementTruncation() {
    if (statementObserver) {
      statementObserver.disconnect();
      statementObserver = null;
    }
  }

  function onModalScroll() {
    if (!stickyNav) return;
    const st = window.scrollY;
    const delta = st - lastScrollTop;

    if (st <= 2) {
      stickyNav.classList.remove('is-sticky', 'is-hidden');
      scrollingDown = true;
      lastScrollTop = st;
      return;
    }

    // Once past the top, make it always sticky (no position change later)
    if (!stickyNav.classList.contains('is-sticky')) {
      stickyNav.classList.add('is-sticky', 'is-hidden');
    }

    if (Math.abs(delta) > DEAD_ZONE) {
      const nowDown = delta > 0;

      if (nowDown !== scrollingDown) {
        directionChangeTop = st;
        scrollingDown = nowDown;
      }

      if (nowDown) {
        stickyNav.classList.add('is-hidden');
      } else {
        const upDistance = directionChangeTop - st;
        if (upDistance >= SHOW_THRESHOLD) {
          stickyNav.classList.remove('is-hidden');
        }
      }
      lastScrollTop = st;
    }
  }

  function setupScrollTracking() {
    if (!stickyNav) return;
    const modalHeader = modal.querySelector('.modal__header');
    const docHeight = document.documentElement.scrollHeight;
    const viewHeight = window.innerHeight;
    const scrollPastHeader = (docHeight - viewHeight) - modalHeader.offsetHeight;
    if (scrollPastHeader < viewHeight * 0.75) return;
    lastScrollTop = 0;
    stickyNav.classList.remove('is-sticky', 'is-hidden');
    window.addEventListener('scroll', onModalScroll);
  }

  function teardownScrollTracking() {
    window.removeEventListener('scroll', onModalScroll);
    stickyNav.classList.remove('is-sticky', 'is-hidden');
    lastScrollTop = 0;
  }

  function getTitle(trigger) {
    const parent = trigger.closest('.portfolio-item') || trigger;
    const textEl = parent.querySelector('.portfolio-item__text');
    if (textEl) {
      const parts = textEl.textContent.trim().split(/\s*\/\s*/);
      if (parts.length >= 2) return parts[0] + ' \u2014 ' + parts[1];
      return parts[0];
    }
    return trigger.textContent.trim();
  }

  function getContent(id) {
    // Look for a <template id="tmpl-{id}"> in the page
    const tmpl = document.getElementById('tmpl-' + id);
    if (tmpl && tmpl.innerHTML.trim()) return tmpl.innerHTML;

    // Fallback: placeholder cards for items without content yet
    // Derive prefix: "w-01" → "W1", "s-03" → "S3"
    const prefix = id.replace(/^([ws])-0?(\d+)$/i, function (_, letter, num) {
      return letter.toUpperCase() + parseInt(num);
    });

    let cards = '';
    for (let i = 0; i < 5; i++) {
      cards +=
        '<article class="portfolio-item">' +
          '<div class="portfolio-item__placeholder"></div>' +
          '<div class="portfolio-item__info grid">' +
            '<span class="label portfolio-item__number">' + prefix + '.' + (i + 1) + '</span>' +
            '<span class="label portfolio-item__text">Detail Title / <span class="portfolio-item__teaser">Placeholder description</span></span>' +
          '</div>' +
        '</article>';
    }
    return cards;
  }

  // Check if contact form has user input
  function contactFormHasInput() {
    if (currentModalId !== 'contact') return false;
    const form = modalBody.querySelector('.contact-form');
    if (!form) return false;
    const inputs = form.querySelectorAll('input:not([type="hidden"]), textarea');
    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i].value.trim()) return true;
    }
    return false;
  }

  function openModal(id, title, scrollY) {
    savedScrollY = (scrollY != null) ? scrollY : window.scrollY;
    currentModalId = id;

    // Derive number prefix: "w-01" → "W1", "s-03" → "S3"; empty for non-portfolio modals
    const number = id.replace(/^([ws])-0?(\d+)$/i, function (_, letter, num) {
      return letter.toUpperCase() + parseInt(num);
    });
    modalNumber.textContent = (number !== id) ? number : '';
    modalTitle.textContent = title || id;
    modalBody.innerHTML = getContent(id);

    // Statement read-more: inline truncation with "Read the full story" button
    const statement = modalBody.querySelector('.statement');
    if (statement) {
      setupStatementTruncation(statement);
    }

    if (pageContent) pageContent.style.display = 'none';
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.toggle('modal--resume', id === 'resume');
    modal.classList.add('is-active');
    window.scrollTo(0, 0);
    modal.focus();
    modal.addEventListener('keydown', trapFocus);

    history.pushState({ modal: id }, '', '#' + id);
    setupScrollTracking();
  }

  function closeModal() {
    if (!currentModalId) return;

    teardownScrollTracking();
    teardownStatementTruncation();
    modal.removeEventListener('keydown', trapFocus);

    modal.classList.remove('is-active', 'modal--resume');
    modal.setAttribute('aria-hidden', 'true');

    if (pageContent) {
      const fadeSections = pageContent.querySelectorAll('.info-section, .portfolio-section');
      for (let i = 0; i < fadeSections.length; i++) {
        fadeSections[i].style.animation = 'none';
      }
      pageContent.style.display = '';
    }
    const restoreY = savedScrollY;
    const returnFocus = triggerElement;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        window.scrollTo(0, restoreY);
        if (returnFocus) returnFocus.focus();
      });
    });

    currentModalId = null;
    triggerElement = null;

    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname);
    }
  }

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      if (contactFormHasInput() && !confirm('You have unsent form data. Leave anyway?')) return;
      history.back();
    });
  }

  // Print button
  if (printBtn) {
    printBtn.addEventListener('click', function () {
      window.print();
    });
  }

  // Download PDF button
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function () {
      const resume = modalBody.querySelector('.resume');
      if (!resume || typeof html2pdf === 'undefined') return;
      if (downloadBtn.classList.contains('is-busy')) return;

      // Loading state
      downloadBtn.classList.add('is-busy');
      resume.classList.add('resume--pdf');

      const opt = {
        margin: [15, 20, 15, 20],
        filename: 'resume.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: 'avoid-all' }
      };

      html2pdf().set(opt).from(resume).save()
        .then(function () {
          resume.classList.remove('resume--pdf');
          downloadBtn.classList.remove('is-busy');
        })
        .catch(function () {
          resume.classList.remove('resume--pdf');
          downloadBtn.classList.remove('is-busy');
        });
    });
  }

  // Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && currentModalId) {
      if (contactFormHasInput() && !confirm('You have unsent form data. Leave anyway?')) return;
      history.back();
    }
  });

  // Click delegation for all [data-modal] triggers
  // Capture scroll position before browser follows href="#" and scrolls to top
  let pendingScrollY = null;
  document.addEventListener('mousedown', function (e) {
    if (e.target.closest('[data-modal]')) pendingScrollY = window.scrollY;
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-modal]')) {
      pendingScrollY = window.scrollY;
      // Non-interactive elements with role="button" don't synthesize click on Enter/Space
      if (e.target.tagName !== 'A' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        e.target.closest('[data-modal]').click();
      }
    }
  });
  document.addEventListener('click', function (e) {
    const trigger = e.target.closest('[data-modal]');
    if (!trigger) return;

    e.preventDefault();
    triggerElement = trigger;
    openModal(trigger.getAttribute('data-modal'), getTitle(trigger), pendingScrollY);
    pendingScrollY = null;
  });

  // Contact form submission with feedback
  const SUBMIT_TIMEOUT = 15000;
  modal.addEventListener('submit', function (e) {
    const form = e.target;
    if (!form.classList.contains('contact-form')) return;
    e.preventDefault();

    const submitBtn = form.querySelector('.contact-form__submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending\u2026';
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');

    const controller = new AbortController();
    const timeoutId = setTimeout(function () { controller.abort(); }, SUBMIT_TIMEOUT);

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString(),
      signal: controller.signal
    }).then(function (response) {
      clearTimeout(timeoutId);
      submitBtn.removeAttribute('aria-busy');
      if (!response.ok) throw new Error('Network response was not ok');
      history.back();
      showToast('Message sent');
    }).catch(function (err) {
      clearTimeout(timeoutId);
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      const existing = form.querySelector('.contact-form__error');
      if (existing) existing.remove();
      const error = document.createElement('p');
      error.className = 'contact-form__error body-text';
      error.setAttribute('role', 'alert');
      error.textContent = err.name === 'AbortError'
        ? 'Request timed out. Please try again.'
        : 'Something went wrong. Please try again.';
      form.insertBefore(error, submitBtn);
    });
  });

  // Browser back/forward button
  window.addEventListener('popstate', function () {
    if (currentModalId) {
      closeModal();
    } else if (window.location.hash) {
      const id = window.location.hash.substring(1);
      if (id) {
        const trigger = document.querySelector('[data-modal="' + id + '"]');
        const title = trigger ? getTitle(trigger) : id;
        triggerElement = trigger;
        openModal(id, title);
      }
    }
  });

  // Snackbar toast — appears in lower portion of screen, auto-dismisses
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'snackbar';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('is-visible');
    });

    setTimeout(function () {
      toast.classList.remove('is-visible');
      const fallback = setTimeout(function () { toast.remove(); }, 500);
      toast.addEventListener('transitionend', function () {
        clearTimeout(fallback);
        toast.remove();
      });
    }, 3000);
  }

  // Deep link support — open modal if URL has hash on load
  if (window.location.hash) {
    const id = window.location.hash.substring(1);
    if (id) {
      const trigger = document.querySelector('[data-modal="' + id + '"]');
      const title = trigger ? getTitle(trigger) : id.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      setTimeout(function () { openModal(id, title); }, 100);
    }
  }
})();
