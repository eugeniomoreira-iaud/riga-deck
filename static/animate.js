/* Chart draw-in (docs/superpowers/specs/2026-10-14-riga-animations.md § 2). An inlined figure's parts carry ids
 * "<figure>--<role>-<n>-<k>". Its axes and text, everything untagged, rise in first, as the slide title does; then
 * the data draws in. A keep part (an axes the previous slide showed at the same place) does not move at all. An each part's children (dots, hexes, runs) appear one by one, in the order written, one layer
 * per n in n order; parts sharing an n run at once. Then the wipes, one layer per n in n order, each layer's time in proportion to its width: each reveals left to right, slowing towards its end
 * like every other entrance (EASE), one sweep per axes, so side-by-side charts draw at the same time. Grow rises from its baseline with the
 * data; late parts then appear one group at a time, in n order. Every animation is timed from the slide change, so a
 * slide slow to paint shows more per frame and still ends on time. The SVG as written is the final picture, so
 * reduced motion, print and no-JS show it as is. */
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("print-pdf")) return;
  const LEAD = 250, DRAW = 750, LATE = 900; // ms: axes and text, then the data (1 s in all), then the late groups
  const RISE = 400, EASE = "cubic-bezier(.2,.7,.2,1)"; // the title's entrance (transitions.js), shortened to fit
  // EASE as [time, progress] pairs along its curve, so a sweep split into parts, or dots shown a group per frame, keep to
  // it too; when(p) is the share of the time at which progress p is reached
  const CURVE = Array.from({ length: 33 }, (_, i) => {
    const s = i / 32, b = (p, q) => 3 * (1 - s) ** 2 * s * p + 3 * (1 - s) * s ** 2 * q + s ** 3;
    return [b(0.2, 0.2), b(0.7, 1)];
  });
  const when = (p) => {
    const j = CURVE.findIndex(([, y]) => y >= p);
    if (j <= 0) return 0;
    const [t0, y0] = CURVE[j - 1], [t1, y1] = CURVE[j];
    return t0 + ((t1 - t0) * (p - y0)) / (y1 - y0);
  };
  const EACH = 0.5; // share of the data's time the each parts take; the wipe layers share the rest
  const HIDE = [{ visibility: "hidden" }, { visibility: "hidden" }];
  const FRAMES = {
    wipe: [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }],
  };
  // a bar grows from its base: the transform origin and the scale along its length
  const BASES = { up: ["50% 100%", "scaleY"], down: ["50% 0%", "scaleY"], right: ["0% 50%", "scaleX"],
    left: ["100% 50%", "scaleX"] };
  // a figure's own times, ms: its data's draw-in, then a hold, then the dim parts' fade; a morph figure's morph
  const TIMES = { "simulation-screening": { draw: 1000, hold: 300, fade: 500 }, "simulation-year-daily": { morph: 1000 } };
  const MORPH = new Set(["morph", "from", "swap", "gone"]);
  // a morph figure continues the slide before it (figures/src/mapkit.py, tag): nothing rises; each morph line or bar
  // reshapes from its "from" ghost, drawn invisible, and swap text fades in as gone text fades out
  const morph = (svg, play) => {
    const f = svg.querySelector("[id*='--morph-']").id.split("--")[0], M = TIMES[f]?.morph ?? DRAW;
    const d = (p) => `path("${p.getAttribute("d").replace(/\s+/g, " ").trim()}")`;
    svg.querySelectorAll("[id*='--morph-']").forEach((el) => {
      const from = svg.querySelector(`[id='${el.id.replace("--morph-", "--from-")}'] path`), path = el.querySelector("path");
      play(path.animate([{ d: d(from) }, { d: d(path) }], { duration: M, easing: EASE, fill: "backwards" }));
    });
    // the offsets keep a deck that drops opacity-only entrances (presentation_riga/overrides.js) from dropping these
    const fade = (role, a, b) => svg.querySelectorAll(`[id*='--${role}-'] text`).forEach((t) =>
      play(t.animate([{ opacity: a, offset: 0 }, { opacity: b, offset: 1 }], { duration: RISE, easing: EASE, fill: "backwards" })));
    fade("swap", 0, 1);
    fade("gone", 1, 0);
  };

  // what rises in first: the outermost figure and axes children holding no tagged part
  const still = (svg) => {
    const free = [...svg.querySelectorAll("g[id^='figure_'] > *, g[id^='axes_'] > *")]
      .filter((el) => !el.id.includes("--") && !el.querySelector("[id*='--']:not([id*='--mark'])"));
    return free.filter((el) => !free.some((o) => o !== el && o.contains(el)));
  };
  let running = [];
  const run = (slide) => {
    running.forEach((a) => a.finish()); // a slide left mid-draw is complete when it is seen again, then replays
    running = [];
    if (!slide) return;
    const t0 = document.timeline.currentTime;
    const play = (a) => running.push(Object.assign(a, { startTime: t0 }));
    const parts = [...slide.querySelectorAll(".visual-svg [id*='--']")].map((el) => {
      const [role, n] = el.id.split("--")[1].split("-"), bar = role.match(/^(grow|dim)(\w+)$/);
      // dim grows in at full colour, then fades to its own, lighter one once all data has drawn; the offset keeps a
      // deck that drops opacity-only entrances (presentation_riga/overrides.js) from dropping this one
      const own = TIMES[el.id.split("--")[0]] || {};
      const settle = { delay: LEAD + (own.draw ?? DRAW) + (own.hold ?? 0), duration: own.fade ?? RISE, easing: EASE,
        fill: "backwards" };
      if (bar?.[1] === "dim") el.querySelectorAll("path").forEach((p) => play(p.animate([{ opacity: 1, offset: 0 }], settle)));
      // mark rises with the axes in plain ink, then takes its own weight and colour as the dim parts fade
      if (role === "mark") {
        el.querySelectorAll("text").forEach((t) => play(t.animate([{ fontWeight: 400, fill: "var(--ink-900)", offset: 0 }], settle)));
        return null;
      }
      if (MORPH.has(role)) return null;
      return bar ? { el, role: "grow", base: bar[2], n: +n } : { el, role, n: +n };
    }).filter(Boolean);
    slide.querySelectorAll(".visual-svg svg:has([id*='--morph-'])").forEach((svg) => morph(svg, play));
    new Set(parts.map((p) => p.el.ownerSVGElement)).forEach((svg) => {
      const rise = `0 ${(24 * svg.viewBox.baseVal.height) / svg.clientHeight}px`; // the title's 24 px, in the SVG's units
      still(svg).forEach((el) => play(el.animate([{ opacity: 0, translate: rise }, { opacity: 1, translate: "0 0" }],
        { duration: RISE, easing: EASE })));
    });
    const figure = (el) => el.id.split("--")[0];
    // wipe parts of one axes and one n share a single sweep: each is timed by where its box sits in the union of them
    const sweep = (el) => `${figure(el)} ${el.closest("g[id^='axes_']")?.id} ${el.id.split("-").at(-2)}`;
    const span = new Map(), layers = new Map();
    parts.filter((p) => p.role === "wipe").forEach((p) => {
      const b = p.el.getBBox(), u = span.get(sweep(p.el)) || { x: Infinity, r: -Infinity };
      span.set(sweep(p.el), { x: Math.min(u.x, b.x), r: Math.max(u.r, b.x + b.width) });
      layers.set(figure(p.el), [...new Set([...(layers.get(figure(p.el)) || []), p.n])].sort((a, b) => a - b));
    });
    const first = new Set(parts.filter((p) => p.role === "each").map((p) => figure(p.el)));
    const eachLayers = new Map();
    parts.filter((p) => p.role === "each").forEach((p) => eachLayers.set(figure(p.el),
      [...new Set([...(eachLayers.get(figure(p.el)) || []), p.n])].sort((a, b) => a - b)));
    // a layer's time is in proportion to its widest sweep, so every layer moves at one speed: a peak marker is quick
    const width = (f, n) => Math.max(0, ...[...span].filter(([k]) => k.startsWith(`${f} `) && k.endsWith(` ${n}`))
      .map(([, u]) => u.r - u.x));
    const wipe = (el, n) => {
      const f = figure(el), u = span.get(sweep(el)), ns = layers.get(f), D = TIMES[f]?.draw ?? DRAW;
      const at = first.has(f) ? D * EACH : 0;
      const ws = ns.map((m) => width(f, m)), all = ws.reduce((a, b) => a + b, 0), i = ns.indexOf(n);
      const share = (j) => (all > 0 ? ws[j] / all : 1 / ns.length);
      const d = (D - at) * share(i), from = LEAD + at + (D - at) * ns.slice(0, i).reduce((a, _, j) => a + share(j), 0);
      const b = el.getBBox(), w = u.r - u.x;
      const a = w > 0 ? (b.x - u.x) / w : 0, c = w > 0 ? (b.x + b.width - u.x) / w : 1, t0 = when(a), t1 = when(c);
      if (t1 <= t0) return el.animate(FRAMES.wipe, { delay: from, duration: d, easing: EASE, fill: "backwards" });
      // this part's stretch of the sweep's curve
      const frames = [[t0, a], ...CURVE.filter(([, y]) => y > a && y < c), [t1, c]].map(([t, y]) =>
        ({ offset: (t - t0) / (t1 - t0), clipPath: `inset(0 ${100 * (1 - (y - a) / (c - a))}% 0 0)` }));
      return el.animate(frames, { delay: from + d * t0, duration: d * (t1 - t0), easing: "linear", fill: "backwards" });
    };
    // grow layers, one per n in n order, share the data's time: every bar of a layer is at the same share of its length
    const growLayers = new Map();
    parts.filter((p) => p.role === "grow").forEach((p) => growLayers.set(figure(p.el),
      [...new Set([...(growLayers.get(figure(p.el)) || []), p.n])].sort((a, b) => a - b)));
    const groups = [...new Set(parts.filter((p) => p.role === "late").map((p) => p.n))].sort((a, b) => a - b);
    const only = !parts.some((p) => p.role !== "late" && p.role !== "keep"), start = LEAD + (only ? 0 : DRAW);
    // late groups alone share the data's time, the last at its end; after a draw-in they share the late window
    const [lateTime, last] = only ? [DRAW, Math.max(1, groups.length - 1)] : [LATE, groups.length];
    parts.forEach(({ el, role, base, n }) => {
      if (role === "keep") return;
      if (role === "grow") Object.assign(el.style, { transformBox: "fill-box", transformOrigin: BASES[base][0] });
      if (role === "each") {
        // each layers, one per n in n order, share the data's time, or its first part when wipes follow
        const f0 = figure(el), ns = eachLayers.get(f0), d = (layers.has(f0) ? DRAW * EACH : DRAW) / ns.length;
        const from = LEAD + ns.indexOf(n) * d;
        // children regrouped once, one group per frame at 60 fps: a few dozen animations, not thousands
        const frames = Math.max(2, Math.round(d / 16.7));
        let box = el, kids;
        // a scatter wraps all its dots in one clipped group: regroup inside it
        while ((kids = [...box.children].filter((c) => c.tagName !== "defs")).length === 1) box = kids[0];
        if (!el.dataset.frames) {
          for (let f = 0; f < frames; f++) {
            const g = document.createElementNS(el.namespaceURI, "g");
            g.append(...kids.slice(Math.floor((f * kids.length) / frames), Math.floor(((f + 1) * kids.length) / frames)));
            box.append(g);
          }
          el.dataset.frames = frames;
          kids = [...box.children].slice(-frames);
        }
        kids.forEach((g, f) => play(g.animate(HIDE, from + d * when(f / frames))));
        return;
      }
      play(role === "late"
        // hidden until its turn, then shown at once
        ? el.animate(HIDE, start + lateTime * when(groups.indexOf(n) / last))
        : role === "wipe" ? wipe(el, n)
        : role === "grow" ? ((ns, d, s) => el.animate([{ transform: `${s}(0)` }, { transform: `${s}(1)` }],
          { delay: LEAD + ns.indexOf(n) * d, duration: d, easing: EASE, fill: "backwards" }))(growLayers.get(figure(el)),
          (TIMES[figure(el)]?.draw ?? DRAW) / growLayers.get(figure(el)).length, BASES[base][1])
        : el.animate(FRAMES[role], { delay: LEAD, duration: DRAW, easing: EASE, fill: "backwards" }));
    });
  };
  Reveal.on("slidechanged", (e) => run(e.currentSlide));
  Reveal.isReady() ? run(Reveal.getCurrentSlide()) : Reveal.on("ready", (e) => run(e.currentSlide));
})();
