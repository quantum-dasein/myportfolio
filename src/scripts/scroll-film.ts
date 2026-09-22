/** Independent frames avoid both whole-file buffering and random video seeks. */
export function mountScrollFilm(section: HTMLElement) {
  const video = section.querySelector<HTMLVideoElement>('[data-scrub-video]')!;
  const canvas = section.querySelector<HTMLCanvasElement>('[data-scrub-canvas]')!;
  const bar = section.querySelector<HTMLElement>('[data-scrub-bar]');
  const label = section.querySelector<HTMLElement>('[data-scrub-frame]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (coarse || reduced || !section.dataset.sequence) {
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
  const context = canvas.getContext('2d', { alpha: false })!;
  const count = Number(section.dataset.frames);
  // Keep compressed look-ahead separate from the small decoded GPU/CPU cache.
  const cache = new Map<number, ImageBitmap>();
  const compressed = new Map<number, Blob>();
  const pending = new Map<number, AbortController>();
  const decoding = new Set<number>();
  const failed = new Set<number>();
  let velocity=0,lastUpdate=0,fetchLatency=80;
  let target = 1, painted = 0, direction = 1, active = false, disposed = false, raf = 0;
  function draw(index: number) {
    const bitmap = cache.get(index);
    if (!bitmap || painted === index) return;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    painted = index; canvas.hidden = false;
    section.dataset.scrubState = 'ready'; section.dataset.presentedFrame = String(index);
    if (label) label.textContent = `FRAME ${String(index).padStart(4, '0')} / ${String(count).padStart(4, '0')}`;
  }
  function nearest() {
    let best = painted, distance = Math.abs(target - painted);
    for (const index of cache.keys()) if (!best || Math.abs(target - index) < distance) {
      best = index; distance = Math.abs(target - index);
    }
    if (best) draw(best);
  }
  function decode(index:number){
    if(cache.has(index)||decoding.has(index)||!compressed.has(index)||disposed)return;
    decoding.add(index);
    createImageBitmap(compressed.get(index)!).then(bitmap=>{
      if(disposed){bitmap.close();return;}
      cache.set(index,bitmap);
      // 12 decoded 1280x720 frames ~= 42 MiB; future frames remain compressed.
      while(cache.size>12){const farthest=[...cache.keys()].sort((a,b)=>Math.abs(b-target)-Math.abs(a-target))[0];cache.get(farthest)!.close();cache.delete(farthest);}
      nearest();
    }).catch(()=>{}).finally(()=>{decoding.delete(index);pump();});
  }
  function pump() {
    if (!active || disposed || document.hidden) return;
    const predicted=Math.max(1,Math.min(count,target+Math.round(Math.max(-72,Math.min(72,velocity*fetchLatency)))));
    const catchingUp=!painted;
    const wanted = connection?.saveData||catchingUp?[target]:[target,predicted,predicted+direction*2];
    if (!connection?.saveData&&!catchingUp) {
      // Warm the next section of the film before it enters the viewport.
      for(let offset=1;offset<=72;offset++){wanted.push(target+offset*direction);if(offset<=12)wanted.push(target-offset*direction);}
    }
    for (const index of wanted) {
      if(index<1||index>count||failed.has(index))continue;
      if(compressed.has(index)){if(Math.abs(index-target)<=4)decode(index);continue;}
      if(pending.has(index))continue;
      if(pending.size>=4)break;
      const abort=new AbortController();pending.set(index,abort);const started=performance.now();
      fetch(`${section.dataset.sequence}${String(index).padStart(4,'0')}.webp`,{signal:abort.signal,cache:'force-cache',priority:index===target?'high':'low'})
        .then(response=>{if(!response.ok)throw new Error('Frame unavailable');return response.blob();})
        .then(blob=>{
          if(disposed)return;
          fetchLatency=fetchLatency*.75+Math.min(300,performance.now()-started)*.25;
          compressed.set(index,blob);
          while(compressed.size>144){const farthest=[...compressed.keys()].sort((a,b)=>Math.abs(b-target)-Math.abs(a-target))[0];compressed.delete(farthest);}
          if(Math.abs(index-target)<=6||!painted||Math.abs(index-target)<Math.abs(painted-target))decode(index);
        })
        .catch(error=>{if(!disposed&&error.name!=='AbortError')failed.add(index);})
        .finally(()=>{if(pending.get(index)===abort)pending.delete(index);pump();});
    }
  }
  function update() {
    raf = 0;
    const rect = section.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height - innerHeight)));
    const next = 1 + Math.round(progress * (count - 1));
    const now=performance.now(),elapsed=now-lastUpdate;
    velocity=elapsed>0&&elapsed<180?velocity*.6+(next-target)/elapsed*.4:0;lastUpdate=now;
    if (next !== target) direction = next > target ? 1 : -1;
    // A real jump discards obsolete requests; continuous motion keeps useful work.
    if(Math.abs(next-target)>36)pending.forEach((abort,index)=>{if(Math.abs(index-next)>12){abort.abort();pending.delete(index);}});
    target = next;section.dataset.targetFrame=String(next);decode(target);
    if (bar) bar.style.width = `${progress * 100}%`;
    nearest(); pump();
  }
  const schedule = () => { if (!raf && !disposed) raf = requestAnimationFrame(update); };
  const near = new IntersectionObserver(([entry]) => { active = entry.isIntersecting; if (active) update(); }, { rootMargin: '200% 0px' });
  near.observe(section);
  addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', schedule);
  addEventListener('online', () => { failed.clear(); pump(); });
  addEventListener('pageshow', schedule);
  addEventListener('pagehide', event => {
    cancelAnimationFrame(raf); raf = 0;
    if (event.persisted) return;
    disposed = true; near.disconnect(); pending.forEach(abort => abort.abort()); cache.forEach(bitmap => bitmap.close()); cache.clear();compressed.clear();
    removeEventListener('scroll', schedule); removeEventListener('resize', schedule);
  });
}
