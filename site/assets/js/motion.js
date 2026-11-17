/* Shared progressive animation support. Content and controls never depend on a
   decorative renderer or IntersectionObserver being available. */
(function () {
  const query = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new Set();
  const motion = window.SiteMotion = {
    get reduced() { return !!(query && query.matches); },
    frame(fn) {
      return window.requestAnimationFrame ? window.requestAnimationFrame(fn) : setTimeout(() => fn(performance.now()), 16);
    },
    cancel(id) {
      if (window.cancelAnimationFrame) window.cancelAnimationFrame(id); else clearTimeout(id);
    },
    init(fn) {
      try { fn(); } catch (error) { console.warn('Animation unavailable:', error); }
    },
    context(canvas) {
      try { return canvas.getContext('2d'); } catch (_) { return null; }
    },
    observe(el, callback, options) {
      let observer;
      try {
        observer = new IntersectionObserver(entries => entries.forEach(e => callback(e.isIntersecting)), options);
        observer.observe(el);
      } catch (_) { callback(true); }
      return () => { if (observer) observer.disconnect(); };
    },
    once(el, callback, options) {
      let done = false, stop = () => {};
      stop = motion.observe(el, visible => {
        if (!visible || done) return;
        done = true; callback(); stop();
      }, options);
      if (done) stop();
    },
    reveal(el, delay, options) {
      // Opt into hiding only after this script has loaded. No-JS stays readable.
      el.style.transitionDelay = delay + 'ms';
      el.classList.add('pending');
      motion.once(el, () => el.classList.add('in'), options);
    },
    change(fn) { listeners.add(fn); },
    // Reduce backing-store cost only after sustained expensive drawing. Never
    // infer GPU support from OS, user agent, CPU count or WebGL availability.
    budget() {
      let slow = 0, scale = 1;
      return {
        get scale() { return scale; },
        sample(ms) {
          slow = ms > 12 ? slow + 1 : Math.max(0, slow - 1);
          if (slow < 30 || scale <= .5) return false;
          scale /= 2; slow = 0; return true;
        }
      };
    }
  };
  const notify = () => listeners.forEach(fn => motion.init(fn));
  if (query) {
    if (query.addEventListener) query.addEventListener('change', notify);
    else if (query.addListener) query.addListener(notify);
  }
  document.addEventListener('visibilitychange', notify);
})();
