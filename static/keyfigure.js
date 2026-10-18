/* Key-figure count-up (port of design-system/components/data/KeyFigure.jsx):
 * 0 -> value in 1100ms, ease-out cubic, each time the slide is entered. The
 * markup already holds the final value, so reduced motion, print and no-JS show
 * it as is. */
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("print-pdf")) return;
  const run = (slide) => {
    if (!slide) return;
    slide.querySelectorAll("[data-kf]").forEach((el) => {
      const text = el.dataset.kf;
      const value = parseFloat(text);
      const decimals = (text.split(".")[1] || "").length;
      const node = el.firstChild;
      cancelAnimationFrame(el._kf);
      let t0;
      const step = (t) => {
        t0 = t0 || t;
        const k = Math.min(1, (t - t0) / 1100);
        node.nodeValue = (value * (1 - Math.pow(1 - k, 3))).toFixed(decimals);
        if (k < 1) el._kf = requestAnimationFrame(step);
      };
      el._kf = requestAnimationFrame(step);
    });
  };
  Reveal.on("slidechanged", (e) => run(e.currentSlide));
  Reveal.isReady() ? run(Reveal.getCurrentSlide()) : Reveal.on("ready", (e) => run(e.currentSlide));
})();
