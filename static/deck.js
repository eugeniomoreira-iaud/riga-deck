/* reveal.js is navigation, overview mode, fragments and the speaker view. Notes
 * render as aside.notes, hidden in the deck and shown in the speaker window the
 * notes plugin opens on `s`. Visual identity is design-system/'s (see DESIGN.md). */
Reveal.initialize({
  plugins: [RevealNotes],
  width: 1920,
  height: 1080,
  margin: 0,
  center: false,
  hash: true,
  // The reference has neither arrows nor reveal's bar: static/progress.js is its own.
  controls: false,
  progress: false,
  // The footer carries "page / total" (templates/partials/footer.html.j2).
  slideNumber: false,
  transition: "none",
  // Parts are vertical stacks, so overview mode shows the chapter structure.
  // Linear navigation keeps one forward key through the slides.
  navigationMode: "linear",
}).then(() => {
  // Staged entrance of the reference deck; a no-op under reduced motion.
  const enter = (slide, prev) => window.ThesisTransitions && ThesisTransitions.run(slide, prev, "staged");
  Reveal.on("slidechanged", (e) => enter(e.currentSlide, e.previousSlide));
  enter(Reveal.getCurrentSlide(), null);
});

// Full-screen toggle in the slide's top-right corner, scaled with it; deck.css styles it.
const fullscreenToggle = document.createElement("button");
fullscreenToggle.className = "fullscreen-toggle";
fullscreenToggle.setAttribute("aria-label", "Full screen mode");
fullscreenToggle.textContent = "⛶";
fullscreenToggle.onclick = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
document.querySelector(".reveal .slides").append(fullscreenToggle);
