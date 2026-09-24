/**
 * Scroll runs the film. On desktop the playhead follows the scroll through a
 * short-GOP encode (a keyframe every six frames), eased towards the target every
 * frame and seeked only when the previous seek has landed, so the decoder never
 * queues up and the picture keeps pace with the hand. Touch and reduced motion
 * just play the film when it is on screen.
 */
export function mountScrollFilm(section: HTMLElement) {
  const video = section.querySelector<HTMLVideoElement>('[data-scrub-video]')!;
  const bar = section.querySelector<HTMLElement>('[data-scrub-bar]');
  const label = section.querySelector<HTMLElement>('[data-scrub-frame]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (coarse || reduced || !section.dataset.scrubFilm) {
    video.loop = true;
    let visible = false;
    const play = () => { if (visible && !document.hidden && video.src) video.play().catch(() => {}); };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!entry.isIntersecting) { video.pause(); return; }
      if (connection?.saveData) return;
      if (!video.src) { video.src = video.dataset.scrubSrc!; video.preload = 'auto'; }
      video.play().catch(() => {});
    }, { threshold: .2 });
    observer.observe(section);
    document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); else play(); });
    addEventListener('pageshow', play);
    addEventListener('pagehide', event => { video.pause(); if (!event.persisted) observer.disconnect(); });
    return;
  }
  const count = Number(section.dataset.frames) || 900;
  let duration = 0, target = 0, shown = 0, seeking = false, active = false, raf = 0, lastFrame = -1;
  // Fetch the whole clip a screen early and play it from memory. Streamed, the
  // browser buffers in patches and every seek into a gap waits on the network
  // (1–2 s), which is what made the picture trail the scroll.
  let objectUrl = '';
  const attach = () => {
    if (video.dataset.scrubAttached || connection?.saveData) return;
    video.dataset.scrubAttached = '1';
    fetch(section.dataset.scrubFilm!).then(response => { if (!response.ok) throw new Error(String(response.status)); return response.blob(); })
      .then(blob => { objectUrl = URL.createObjectURL(blob); video.preload = 'auto'; video.src = objectUrl; })
      .catch(() => { video.preload = 'auto'; video.src = section.dataset.scrubFilm!; });
  };
  const ready = () => { duration = video.duration || 0; tick(); };
  video.addEventListener('loadedmetadata', ready);
  video.addEventListener('seeked', () => { seeking = false; });
  function progress() {
    const rect = section.getBoundingClientRect();
    return Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height - innerHeight)));
  }
  function tick() {
    raf = 0;
    const p = progress();
    target = p * duration;
    // Ease the playhead: the film glides after a flick instead of stepping.
    shown += (target - shown) * .5;
    if (Math.abs(target - shown) < .004) shown = target;
    if (duration && !seeking && Math.abs(video.currentTime - shown) > .012) {
      seeking = true; video.currentTime = Math.min(duration - .01, shown);
    }
    if (bar) bar.style.width = `${(p * 100).toFixed(2)}%`;
    const frame = Math.max(1, Math.round((shown / Math.max(duration, .001)) * (count - 1)) + 1);
    if (label && frame !== lastFrame && duration) { lastFrame = frame; label.textContent = `FRAME ${String(frame).padStart(4, '0')} / ${String(count).padStart(4, '0')}`; }
    // Keep running while the glide or a seek is still settling.
    if (active && (Math.abs(target - shown) > .001 || seeking || Math.abs(video.currentTime - shown) > .012)) raf = requestAnimationFrame(tick);
  }
  const schedule = () => { if (!raf && active) raf = requestAnimationFrame(tick); };
  const near = new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting;
    if (active) { attach(); schedule(); }
  }, { rootMargin: '100% 0px' });
  near.observe(section);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  addEventListener('pageshow', schedule);
  addEventListener('pagehide', event => {
    cancelAnimationFrame(raf); raf = 0;
    if (!event.persisted) { near.disconnect(); if (objectUrl) URL.revokeObjectURL(objectUrl); removeEventListener('scroll', schedule); removeEventListener('resize', schedule); }
  });
}
