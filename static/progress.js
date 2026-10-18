/* Segmented progress bar of the reference deck (ThesisDeck.dc.html
 * applyProgress/paintSeg): one bar per slide along its top edge, one 28px
 * button per slide. Built from the slides, so it needs no manifest. */
(function () {
  const start = () => {
  const secs = [...document.querySelectorAll(".slides section.slide")];
  const labelOf = (s) => {
    const h = s.querySelector("h1, h2, .opener-title");
    return (h ? h.textContent : [...s.classList].find((c) => c.startsWith("slide-")).slice(6)).trim();
  };
  const luminance = (s) => {
    const m = getComputedStyle(s).backgroundColor.match(/\d+(\.\d+)?/g).map(Number);
    if (m[3] === 0) return 255; // transparent: the white page shows through
    return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2];
  };
  const labels = secs.map(labelOf);
  let cur = 0;
  const paint = (seg) => {
    const i = +seg.dataset.idx, dark = !!seg.dataset.dark, line = seg.firstChild;
    line.style.height = seg._hov ? "10px" : i === cur ? "6px" : "4px";
    line.style.backgroundColor = seg._hov ? (dark ? "rgba(255,255,255,.9)" : "var(--blue-700)")
      : i === cur ? (dark ? "rgba(255,255,255,.75)" : "rgba(35,57,130,.75)")
      : i < cur ? (dark ? "rgba(255,255,255,.28)" : "rgba(35,57,130,.22)")
      : (dark ? "rgba(255,255,255,.12)" : "rgba(35,57,130,.08)");
  };
  const paintAll = () => document.querySelectorAll("[data-deck-progress] > button").forEach(paint);

  secs.forEach((sec) => {
    const dark = luminance(sec) < 120;
    const bar = document.createElement("div");
    bar.setAttribute("data-deck-progress", "1");
    bar.style.cssText = "position:absolute;left:0;right:0;top:0;height:28px;display:flex;gap:3px;z-index:60;padding:0;align-items:flex-start";
    secs.forEach((t, ti) => {
      const seg = document.createElement("button");
      seg.type = "button";
      seg.setAttribute("aria-label", `Go to slide ${ti + 1}: ${labels[ti]}`);
      seg.dataset.idx = ti; seg.dataset.dark = dark ? "1" : "";
      seg.style.cssText = "flex:1;height:28px;padding:0;margin:0;border:0;background:transparent;cursor:pointer;position:relative;display:block";
      const line = document.createElement("span");
      line.style.cssText = "position:absolute;left:0;right:0;top:0;height:4px;transition:" + (matchMedia("(prefers-reduced-motion: reduce)").matches ? "none" : "height .18s cubic-bezier(.2,.7,.2,1),background-color .18s");
      const tip = document.createElement("span");
      const x = ti < 3 || ti > secs.length - 4 ? "0" : "-50%";
      const edge = ti < 3 ? "left:0" : ti > secs.length - 4 ? "left:auto;right:0" : "left:50%";
      tip.style.cssText = `position:absolute;top:18px;${edge};transform:translate(${x},-4px);white-space:nowrap;font-family:var(--font-mono);font-size:15px;letter-spacing:.04em;padding:6px 10px;pointer-events:none;display:none;opacity:0;transition:opacity .18s,transform .18s;` + (dark ? "background:#fff;color:var(--blue-900)" : "background:var(--blue-900);color:#fff");
      tip.textContent = String(ti + 1).padStart(2, "0") + "  " + labels[ti];
      seg.append(line, tip);
      const hover = (on) => { seg._hov = on; paint(seg); tip.style.display = on ? "block" : "none"; tip.style.opacity = on ? "1" : "0"; tip.style.transform = `translate(${x},${on ? 0 : -4}px)`; };
      seg.addEventListener("mouseenter", () => hover(true));
      seg.addEventListener("mouseleave", () => hover(false));
      seg.addEventListener("click", (ev) => { ev.stopPropagation(); const at = Reveal.getIndices(secs[ti]); Reveal.slide(at.h, at.v); });
      bar.appendChild(seg);
    });
    sec.appendChild(bar);
  });

  const sync = () => { cur = Math.max(0, secs.indexOf(Reveal.getCurrentSlide())); paintAll(); };
  Reveal.on("slidechanged", sync);
  sync();
  };
  Reveal.isReady() ? start() : Reveal.on("ready", start);
})();
