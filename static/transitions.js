/* Thesis deck — staged slide transitions.
 * On every slidechange the new slide is split into "atoms" (heading parts, text blocks,
 * list items, cards, media, footer) and each is animated in by tier:
 *   0 backdrop · 1 heading (bar, kicker, title, subtitle) · 2 body · 3 media/charts · 4 footer
 * Atoms are diffed against the previous slide by tier + position (16px grid):
 *   same slot + same content  → no animation (footer, kicker, logos persist)
 *   same slot + new content   → soft cross-fade only
 *   new slot                  → full entrance
 * Overrides on any element: data-anim="skip" (never animate), data-anim="group" (animate as one),
 * data-anim-tier="0-4" (force tier).
 */
(() => {
  const EASE = 'cubic-bezier(.2,.7,.2,1)';
  const LEAF = 'h1,h2,h3,h4,p,li,img,svg,canvas,video,figure,button,a,table';
  const MEDIA = 'img,svg,canvas,video';
  const running = new WeakMap();

  function collect(sec) {
    const S = sec.getBoundingClientRect(); const k = S.width / 1920 || 1;
    const rel = el => { const r = el.getBoundingClientRect(); return { x: (r.left - S.left) / k, y: (r.top - S.top) / k, w: r.width / k, h: r.height / k }; };
    const out = [];
    const push = (el, r, tier) => out.push({ el, r, tier: el.dataset && el.dataset.animTier != null ? +el.dataset.animTier : tier });
    const tierOf = (el, media) => {
      if (el.matches('h1,h2') || el.querySelector('h1,h2')) return 1;
      const p = el.parentElement;
      if (!media && p && p !== sec && (el.textContent || '').trim().length < 160) {
        const hd = p.querySelector('h1,h2');
        if (hd) { const a = rel(el), b = rel(hd); const gap = a.y >= b.y + b.h ? a.y - (b.y + b.h) : b.y - (a.y + a.h); if (gap <= 160) return 1; }
      }
      if (media) return 3;
      return 2;
    };
    const bigMedia = m => { const mr = rel(m); return mr.w >= 120 || mr.h >= 120; };
    const isCard = (el, cs) => { const bw = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth); const bg = cs.backgroundColor; return bw > 0 || (bg && bg !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(bg)) || (cs.boxShadow && cs.boxShadow !== 'none'); };
    function visit(el, depth) {
      if (el.matches('script,style,template,[data-deck-progress],.dc-grid-overlay')) return;
      if (el.dataset && el.dataset.anim === 'skip') return;
      const r = rel(el);
      const kids = Array.from(el.children).filter(c => !c.matches('script,style,template'));
      if (r.w < 2 || r.h < 2) { kids.forEach(c => visit(c, depth)); return; }
      if (r.y + r.h >= 1068 && r.h <= 130 && r.w >= 1800) { push(el, r, 4); return; }
      if (depth <= 2 && r.w * r.h >= 1920 * 1080 * 0.6 && (el.textContent || '').trim().length < 20) { push(el, r, 0); return; }
      if (el.dataset && el.dataset.animTier === '0') { push(el, r, 0); return; }
      if (el.dataset && el.dataset.anim === 'group') { push(el, r, tierOf(el, el.querySelector(MEDIA))); return; }
      let m = el.matches(MEDIA) ? el : Array.from(el.querySelectorAll(MEDIA)).find(bigMedia) || null;
      if (m && !bigMedia(m)) m = null;
      let mediaDominant = false;
      if (m && m !== el) { const mr = rel(m); mediaDominant = mr.w * mr.h >= 0.5 * r.w * r.h; }
      const isLeafTag = el.matches(LEAF);
      if (!isLeafTag && !mediaDominant && kids.length === 1 && depth < 10) { visit(kids[0], depth + 1); return; }
      const cs = getComputedStyle(el);
      const layout = /grid|flex/.test(cs.display) && kids.length >= 2;
      const textLen = (el.textContent || '').trim().length;
      const hasHeading = !!el.querySelector('h1,h2,h3');
      const small = r.w * r.h < 1920 * 1080 * 0.12;
      const compact = (small && textLen < 140 && !m && !hasHeading) || (!hasHeading && textLen < 200 && depth > 1 && isCard(el, cs));
      const leaf = isLeafTag || mediaDominant || !layout || compact;
      if (!leaf && depth < 10) { kids.forEach(c => visit(c, depth + 1)); return; }
      push(el, r, tierOf(el, m && (mediaDominant || el.matches(MEDIA)) ? m : null));
    }
    Array.from(sec.children).forEach(c => visit(c, 1));
    return out;
  }

  const slot = a => a.tier + '|' + [a.r.x, a.r.y, a.r.w].map(v => Math.round(v / 16)).join(',');
  const content = a => (a.el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240) + '|' + Array.from(a.el.matches('img') ? [a.el] : a.el.querySelectorAll('img')).map(i => i.getAttribute('src')).join(',');

  function cancel(sec) { const list = running.get(sec); if (list) list.forEach(an => { try { an.cancel(); } catch (e) {} }); running.delete(sec); }

  function run(sec, prev, mode) {
    if (!sec || !sec.animate) return;
    if (mode === 'off' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    cancel(sec); if (prev) cancel(prev);
    const prevMap = new Map();
    if (prev && prev !== sec) collect(prev).forEach(a => { const s = slot(a); if (!prevMap.has(s)) prevMap.set(s, a.tier === 4 ? '' : content(a)); });
    const atoms = collect(sec).map((a, i) => ({ ...a, i })).sort((a, b) => a.tier - b.tier || a.i - b.i);
    const subtle = mode === 'subtle';
    const step = subtle ? 40 : 70;
    const counts = [0, 0, 0, 0, 0];
    atoms.forEach(a => { a.state = 'new'; const s = slot(a); if (prevMap.has(s)) a.state = (a.tier === 4 || prevMap.get(s) === content(a)) ? 'keep' : 'morph'; });
    const live = t => atoms.filter(a => a.tier === t && a.state !== 'keep').length;
    const start = [0, 60]; start[2] = start[1] + live(1) * step + (live(1) ? 60 : 0); start[3] = start[2] + Math.min(live(2), 6) * (step - 15) + (live(2) ? 80 : 0); start[4] = 120;
    const anims = [];
    atoms.forEach(a => {
      if (a.state === 'keep') return;
      const n = counts[a.tier]++;
      const delay = Math.min(1200, start[a.tier] + n * (a.tier === 2 ? step - 15 : a.tier === 3 ? step + 10 : step));
      const o = getComputedStyle(a.el).opacity || '1';
      let kf, dur;
      if (a.state === 'morph' || subtle) { kf = [{ opacity: 0 }, { opacity: o }]; dur = a.state === 'morph' ? 340 : 480; }
      else if (a.tier === 0) { kf = [{ opacity: 0 }, { opacity: o }]; dur = 900; }
      else if (a.tier === 3) { kf = [{ opacity: 0, translate: '0 18px', scale: '.985' }, { opacity: o, translate: '0 0', scale: '1' }]; dur = 720; }
      else if (a.tier === 4) { kf = [{ opacity: 0, translate: '0 32px' }, { opacity: o, translate: '0 0' }]; dur = 520; }
      else { kf = [{ opacity: 0, translate: '0 24px' }, { opacity: o, translate: '0 0' }]; dur = 560; }
      try { anims.push(a.el.animate(kf, { duration: dur, delay, easing: EASE, fill: 'backwards' })); } catch (e) {}
    });
    running.set(sec, anims);
  }

  window.ThesisTransitions = { run, collect };
})();

/* Riga event deck: divergences from the template's transitions. Recorded in DESIGN.md. */

/* No pure fades: an entrance that only fades (backdrop, new content in the same slot)
   shows at once. Entrances that also move or scale keep their animation. */
(() => {
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (keyframes, options) {
    const fadeOnly = Array.isArray(keyframes) && keyframes.every((k) => Object.keys(k).join() === "opacity");
    // a chart that draws itself in skips its entrance: animate.js raises its axes and text in, then draws its data
    const chart = Array.isArray(keyframes) && keyframes.some((k) => "opacity" in k) && !this.closest?.(".visual-svg")
      && this.querySelector?.(".visual-svg [id*='--']");
    return fadeOnly || chart ? null : animate.call(this, keyframes, options);
  };
})();
