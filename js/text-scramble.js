/* Typing Effect
   Simulates a human typing text into the layout, letter by letter,
   with a vermillion cursor bar. Cursor is solid while typing, blinks
   after completion, then fades out.

   Usage:
     <span data-typing>Brian Wilson</span>

   Configuration via data attributes (all optional):
     data-typing-speed="90"         — base ms per keystroke (default: 90)
     data-typing-variation="40"     — +/- ms random variation for human feel (default: 40)
     data-typing-delay="0"          — ms before typing starts (default: 0)
     data-typing-trigger="load"     — "load" or "scroll" (default: "load")
     data-typing-cursor-linger="1500" — ms the cursor blinks after typing before fading (default: 1500)
*/
(function () {
  const DEFAULTS = {
    speed: 90,
    variation: 40,
    delay: 0,
    trigger: 'load',
    cursorLinger: 1500
  };

  function getConfig(el) {
    return {
      speed: parseInt(el.dataset.typingSpeed, 10) || DEFAULTS.speed,
      variation: parseInt(el.dataset.typingVariation, 10) || DEFAULTS.variation,
      delay: parseInt(el.dataset.typingDelay, 10) || DEFAULTS.delay,
      trigger: el.dataset.typingTrigger || DEFAULTS.trigger,
      cursorLinger: parseInt(el.dataset.typingCursorLinger, 10) || DEFAULTS.cursorLinger
    };
  }

  function humanDelay(speed, variation) {
    const min = Math.max(20, speed - variation);
    const max = speed + variation;
    return min + Math.random() * (max - min);
  }

  function typeText(el) {
    const config = getConfig(el);
    const target = el.dataset.typingText || el.textContent;
    const letters = target.split('');

    el.dataset.typingText = target;

    const textNode = document.createTextNode('');
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    cursor.setAttribute('aria-hidden', 'true');

    el.textContent = '';
    el.appendChild(textNode);
    el.appendChild(cursor);
    el.style.opacity = '1';

    let index = 0;

    function fadeCursor() {
      cursor.classList.add('typing-cursor--fade');
      cursor.addEventListener('animationend', function () {
        cursor.remove();
      });
    }

    function typeNext() {
      if (index >= letters.length) {
        cursor.classList.add('typing-cursor--blink');
        setTimeout(fadeCursor, config.cursorLinger);
        return;
      }

      textNode.textContent += letters[index];
      index++;

      setTimeout(typeNext, humanDelay(config.speed, config.variation));
    }

    typeNext();
  }

  function initElement(el) {
    if (window.getComputedStyle(el).display === 'none') return;

    const config = getConfig(el);

    if (config.trigger === 'scroll') {
      let fired = false;
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !fired) {
            fired = true;
            setTimeout(function () { typeText(el); }, config.delay);
            observer.unobserve(el);
          }
        });
      }, { threshold: 0.1 });
      observer.observe(el);
    } else {
      setTimeout(function () { typeText(el); }, config.delay);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    const elements = document.querySelectorAll('[data-typing]');

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (let j = 0; j < elements.length; j++) {
        elements[j].style.opacity = '1';
      }
      return;
    }

    function startTyping() {
      for (let i = 0; i < elements.length; i++) {
        if (window.getComputedStyle(elements[i]).display === 'none') {
          elements[i].style.opacity = '1';
        }
        initElement(elements[i]);
      }
    }

    if (window.__coverActive) {
      document.addEventListener('cover:dismissed', startTyping);
    } else {
      startTyping();
    }
  });
})();
