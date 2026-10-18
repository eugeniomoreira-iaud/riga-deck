/* Port of design-system/components/brand/WordStrip.jsx (same PRNG, same rows).
 * Fills every [data-wordstrip]; drifts unless prefers-reduced-motion. Also
 * static in print: PDF capture runs with reduced motion emulated. */
(function () {
  const WORDS = ["STRUCTURAL", "SEISMIC", "HYDRAULIC", "GEOTECHNICAL ENGINEERING", "ARCHITECTURE", "ENVIRONMENTAL SCIENCES"];
  const SIZES = [14, 16, 18, 22, 28, 40, 64, 96], SIZE_W = [5, 5, 4, 3, 2, 2, 1.2, 0.6], WEIGHTS = [300, 400, 500, 700, 800];
  const rng = (seed) => { let a = seed >>> 0 || 1; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const pickW = (r, arr, w) => { const s = w.reduce((a, b) => a + b, 0); let x = r() * s; for (let i = 0; i < arr.length; i++) { x -= w[i]; if (x <= 0) return arr[i]; } return arr[arr.length - 1]; };
  const shuffle = (r, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function build(host) {
    const seed = +host.dataset.seed || 1308, h = host.clientHeight || 1080;
    const quiet = JSON.parse(host.dataset.quiet || "[]");
    const inQuiet = (a, b) => quiet.some(([q0, q1]) => b > q0 && a < q1);
    const r = rng(seed), rows = [];
    for (let y = 0; y < h;) {
      let size = pickW(r, SIZES, SIZE_W);
      if (inQuiet(y, y + size * 1.15)) size = 14 + Math.floor(r() * 3) * 2;
      const q = inQuiet(y, y + size * 1.15), toks = shuffle(r, WORDS).concat(shuffle(r, WORDS));
      const lh = size * (0.85 + (size > 30 ? 0.05 : 0.35));
      rows.push({
        y, size, lh,
        weight: size >= 40 ? pickW(r, WEIGHTS, [1, 1, 1, 2, 3]) : pickW(r, WEIGHTS, [3, 3, 2, 1, 0.5]),
        alpha: 0.5 * (q ? 0.28 : size >= 40 ? 0.22 + r() * 0.25 : 0.3 + r() * 0.35),
        dir: r() > 0.5 ? 1 : -1, v: (6 + r() * 22) * (size >= 40 ? 0.6 : 1), toks, offset: r(),
      });
      y += lh;
    }
    const strip = document.createElement("div");
    strip.setAttribute("aria-hidden", "true");
    strip.style.cssText = "position:relative;overflow:hidden;background:var(--blue-700);width:100%;height:100%";
    const els = rows.map((row) => {
      const el = document.createElement("div");
      el.style.cssText = `position:absolute;left:0;top:${row.y}px;height:${row.lh}px;white-space:nowrap;will-change:transform`;
      const span = `<span style="font-family:var(--font-sans);font-size:${row.size}px;line-height:${row.lh}px;font-weight:${row.weight};letter-spacing:${row.size >= 40 ? "-0.02em" : "0.04em"}">${row.toks.map((t) => `<span style="color:rgba(159,176,221,${row.alpha});transition:color 1.4s var(--ease-out)">${t}, </span>`).join("")}</span>`;
      el.innerHTML = span + span;
      strip.appendChild(el);
      return el;
    });
    host.replaceChildren(strip);
    // Highlight pulse: three random words light up every 1.8s (colour transition).
    const ids = rows.flatMap((row, i) => row.toks.map((_, k) => [i, k]));
    const words = (i, k) => [...els[i].children].map((c) => c.children[k]);
    let hot = [];
    const pulse = () => {
      hot.forEach(([i, k, c]) => words(i, k).forEach((w) => (w.style.color = c)));
      hot = [0, 1, 2].map(() => ids[Math.floor(Math.random() * ids.length)]).map(([i, k]) => [i, k, words(i, k)[0].style.color]);
      hot.forEach(([i, k]) => words(i, k).forEach((w) => (w.style.color = "rgba(255,255,255,.5)")));
    };
    const place = (i, x) => { els[i].style.transform = `translateX(${-x}px)`; };
    const half = (i) => els[i].scrollWidth / 2 || 1;
    if (reduce || matchMedia("print").matches) { els.forEach((_, i) => place(i, rows[i].offset * half(i))); return; }
    const t0 = performance.now();
    const tick = (t) => {
      els.forEach((_, i) => {
        const hf = half(i);
        let x = (rows[i].offset * hf + rows[i].dir * rows[i].v * ((t - t0) / 1000)) % hf;
        if (x < 0) x += hf;
        place(i, x);
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setInterval(pulse, 1800);
  }

  // Fonts first: scrollWidth, hence the offset, depends on the face.
  document.fonts.ready.then(() => document.querySelectorAll("[data-wordstrip]").forEach(build));
})();
