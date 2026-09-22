import { archiveRooms, archiveWorks } from '../data/observatory';
import { observatoryNotes } from '../data/observatory-notes';
import type { ObservatoryWorld } from './observatory-void';
import { createHallSound } from './observatory-sound';

// Real responsive captures, separate from the desktop exhibition textures.
const mobilePreviews:Record<string,string>={
  bridge:'/cases/observatory-bridge-mobile.webp',
  academy:'/cases/observatory-academy-mobile.webp',
};

export async function mountObservatory(root:HTMLElement){
  if(!root)return;
  const stage=root.querySelector<HTMLElement>('[data-obs-stage]')!;
  const indexDialog=root.querySelector<HTMLDialogElement>('[data-obs-index-dialog]')!;
  const viewer=root.querySelector<HTMLDialogElement>('[data-obs-viewer]')!;
  const video=root.querySelector<HTMLVideoElement>('[data-obs-viewer-video]')!;
  const image=root.querySelector<HTMLImageElement>('[data-obs-viewer-image]')!;
  const mobileSource=root.querySelector<HTMLSourceElement>('[data-obs-viewer-mobile]')!;
  const picture=root.querySelector<HTMLPictureElement>('[data-obs-viewer-picture]')!;
  const link=root.querySelector<HTMLAnchorElement>('[data-obs-viewer-link]')!;
  let world:ObservatoryWorld|undefined;
  const sound=createHallSound();
  let current=0;
  let opening=false,openToken=0;
  let lastNavigation=0;
  let wheelDistance=0;
  let wheelTime=0;
  let gesture:{x:number;y:number;id:number;axis:string}|undefined;
  let hoverTimer:ReturnType<typeof setTimeout>|undefined;
  let hover=false;
  let viewerTrigger:HTMLElement|null=null;
  const events=new AbortController();
  const signal=events.signal;
  const de=()=>document.documentElement.lang.startsWith('de');
  const dict=()=>((window as any).__I18N__?.[de()?'de':'en']??{}) as Record<string,string>;
  const workTitle=(work:typeof archiveWorks[number])=>work.title??dict()[work.kTitle??'']??work.hrefLabel;
  const text=(selector:string,value:string)=>{const el=root.querySelector<HTMLElement>(selector);if(el)el.textContent=value;};
  let bootFailed=Boolean((window as any).__obsBootExpired);
  const finishBoot=()=>{
    clearTimeout((window as any).__obsBootTimer);
    document.documentElement.classList.remove('obs-booting');
    window.dispatchEvent(new Event('rb:observatory-ready'));
  };
  const fallback=()=>{bootFailed=true;root.classList.remove('is-ready');root.classList.add('is-fallback');indexDialog.close();viewer.close();finishBoot();};
  addEventListener('rb:observatory-timeout',()=>{world?.dispose();fallback();},{once:true,signal});

  function update(){
    const work=archiveWorks[current];const room=archiveRooms[work.roomIndex];const lang=de()?'de':'en';
    root.dataset.currentWork=work.id;root.dataset.currentIndex=String(current);root.style.setProperty('--obs-accent',room.color);
    root.classList.toggle('is-travelled',current>0);
    text('[data-obs-number]',String(current+1).padStart(2,'0'));
    text('[data-obs-position]',String(current+1).padStart(2,'0'));
    text('[data-obs-title]',workTitle(work));
    text('[data-obs-category]',dict()[work.kCat]??(work.video?'Motion':'3D'));
    text('[data-obs-room-number]',`0${work.roomIndex+1} / 04`);
    text('[data-obs-room-name]',room[lang]);text('[data-obs-room-description]',room.subtitle[lang]);
    root.querySelectorAll<HTMLButtonElement>('[data-obs-room]').forEach(button=>{
      const ri=Number(button.dataset.obsRoom);if(ri===work.roomIndex)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
      const start=archiveWorks.findIndex(item=>item.roomIndex===ri);
      const progress=Math.min(1,Math.max(0,(current-start+1)/archiveRooms[ri].ids.length));
      (button.querySelector('[data-obs-room-progress]') as HTMLElement).style.transform=`scaleX(${progress})`;
    });
    root.querySelector<HTMLButtonElement>('[data-obs-prev]')!.disabled=current===0;
    root.querySelector<HTMLButtonElement>('[data-obs-next]')!.disabled=current===archiveWorks.length-1;
    root.querySelector('[data-obs-prev]')!.setAttribute('aria-label',de()?'Vorheriges Werk':'Previous work');
    root.querySelector('[data-obs-next]')!.setAttribute('aria-label',de()?'Nächstes Werk':'Next work');
  }
  // The hall is continuous: the world reports whichever work is in front of the camera.
  const aimed=()=>world&&!world.disposed?world.targetIndex():current;
  function setCurrent(index:number){
    if(index===current)return;current=index;update();
    try{sessionStorage.setItem('rb-observatory-index',String(current));}catch{}
    clearTimeout(hoverTimer);hover=false;
  }
  function navigate(index:number,throttle=false){
    if(index<0||index>=archiveWorks.length||viewer.open||indexDialog.open||opening)return;
    const now=performance.now();if(throttle&&now-lastNavigation<1250)return;lastNavigation=now;
    if(!world){setCurrent(index);return;}
    if(index===aimed()&&!world.isMoving())return;
    const jump=Math.abs(index-current)>3;
    world.select(index);if(world.isCalm())setCurrent(index);
    if(jump&&!world.isCalm())stage.animate([{opacity:.35},{opacity:1}],{duration:700,easing:'ease-out'});
  }
  function revealShell(){
    root.classList.remove('is-intro');
    root.querySelectorAll<HTMLElement>('.obs-shell > *').forEach((element,i)=>{
      const opacity=getComputedStyle(element).opacity;if(opacity==='0')return;
      element.animate([{opacity:0,translate:'0 16px'},{opacity,translate:'0 0'}],{duration:900,delay:i*75,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'});
    });
  }
  const detailsToggle=root.querySelector<HTMLButtonElement>('[data-obs-details]')!;
  detailsToggle.addEventListener('click',()=>{
    const expanded=detailsToggle.getAttribute('aria-expanded')!=='true';
    detailsToggle.setAttribute('aria-expanded',String(expanded));root.classList.toggle('has-details',expanded);
  },{signal});
  function fillViewer(){
    const work=archiveWorks[current];const lang=de()?'de':'en';
    viewer.classList.toggle('is-web-case',work.type==='case');
    root.querySelector('[data-obs-close-viewer]')!.setAttribute('aria-label',de()?'Zurück zur Galerie':'Back to the gallery');
    text('[data-obs-viewer-title]',workTitle(work));
    text('[data-obs-viewer-meta]',`0${work.roomIndex+1} / ${archiveRooms[work.roomIndex][lang]} — ${String(current+1).padStart(2,'0')}`);
    const note=observatoryNotes[work.id],language=de()?1:0;
    text('[data-obs-note-focus]',note?.focus[language]??'');text('[data-obs-note-approach]',note?.approach[language]??'');
    const caseRole=work.type==='case'?dict()[`case.${work.id}.role.value`]:'';
    const role=note?.role?.[language]??caseRole??'';
    root.querySelector<HTMLElement>('[data-obs-note-role-row]')!.hidden=!role;text('[data-obs-note-role]',role);
    text('[data-obs-viewer-tools]',work.detail?.tools??'WEB / DESIGN / DEVELOPMENT');
    text('[data-obs-viewer-description]',work.detail?.[lang]??dict()[work.kText??'']??'');
    video.setAttribute('aria-label',workTitle(work));image.alt=workTitle(work);
    link.hidden=Boolean(work.video);link.href=work.href;
    if(work.href.startsWith('https:')){link.target='_blank';link.rel='noopener';}else{link.removeAttribute('target');link.removeAttribute('rel');}
    root.querySelectorAll<HTMLElement>('[data-obs-credit]').forEach(el=>{el.hidden=el.dataset.obsCredit!==work.id;});
  }
  image.addEventListener('load',()=>{
    // Some older boards are narrow exports; do not magnify them fourfold.
    image.style.maxWidth=`${Math.max(image.naturalWidth,Math.min(640,image.naturalWidth*2))}px`;
  },{signal});
  // The lit frame in the hall and the image in the viewer are one object:
  // it leaves its 3D position, becomes the page, and lands back on close.
  const handoffEase='cubic-bezier(.76,0,.18,1)';
  const viewerMedia=()=>archiveWorks[current].video?video:image;
  const chrome=()=>[...viewer.children].filter(child=>!child.classList.contains('obs-viewer-media')) as HTMLElement[];
  function flight(from:DOMRect,to:DOMRect){
    // Differently shaped media (phone captures) cross-fade instead of stretching.
    if(!from.width||!to.width||Math.abs(from.width/from.height-to.width/to.height)/(to.width/to.height)>.25)return null;
    return `translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`;
  }
  async function handoff(){
    const from=world?.screenRect();const media=viewerMedia();
    if(!from||world?.isCalm())return;
    viewer.classList.add('is-handoff');
    const to=media.getBoundingClientRect();const start=flight(from,to);
    const duration=world?.mobile?620:880;
    const move=media.animate(start?[{transform:start,transformOrigin:'0 0'},{transform:'none',transformOrigin:'0 0'}]:[{opacity:0},{opacity:1}],{duration,easing:handoffEase});
    const backdrop=viewer.animate([{backgroundColor:'rgba(5,6,7,0)'},{backgroundColor:'rgba(5,6,7,1)'}],{duration:duration*.9,easing:'ease-in-out'});
    await move.finished.catch(()=>{});
    viewer.classList.remove('is-handoff');
    backdrop.cancel();
    chrome().forEach((element,i)=>element.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:620,delay:i*70,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'}));
  }
  let closing=false;
  async function closeViewer(){
    if(!viewer.open||closing)return;closing=true;sound.close();
    const media=viewerMedia();const to=world?.screenRect();const from=media.getBoundingClientRect();
    const visible=from.bottom>0&&from.top<innerHeight;
    if(to&&visible&&!world?.isCalm()){
      video.pause();
      const end=flight(to,from);const duration=world?.mobile?520:760;
      chrome().forEach(element=>element.animate([{opacity:1},{opacity:0}],{duration:220,fill:'forwards'}));
      const back=viewer.animate([{backgroundColor:'rgba(5,6,7,1)'},{backgroundColor:'rgba(5,6,7,0)'}],{duration,easing:'ease-in-out',fill:'forwards'});
      const move=media.animate(end?[{transform:'none',transformOrigin:'0 0'},{transform:end,transformOrigin:'0 0'}]:[{opacity:1},{opacity:0}],{duration,easing:handoffEase,fill:'forwards'});
      await move.finished.catch(()=>{});
      viewer.close();
      move.cancel();back.cancel();viewer.getAnimations({subtree:true}).forEach(animation=>animation.cancel());
    }else viewer.close();
    closing=false;
  }
  async function openViewer(){
    if(viewer.open||indexDialog.open||opening)return;
    opening=true;const token=++openToken;root.classList.add('is-focusing');
    viewerTrigger=document.activeElement as HTMLElement;
    world?.stopPreview();clearTimeout(hoverTimer);fillViewer();root.querySelector<HTMLDetailsElement>('[data-obs-notes]')!.open=false;
    const work=archiveWorks[current];image.hidden=Boolean(work.video);video.hidden=!work.video;
    picture.hidden=Boolean(work.video);
    if(mobilePreviews[work.id])mobileSource.srcset=mobilePreviews[work.id];else mobileSource.removeAttribute('srcset');
    if(work.video){video.src=work.video;video.poster=work.img;video.muted=false;video.currentTime=0;video.style.aspectRatio=String(world?.aspect()??16/9);}
    else {image.style.maxWidth='100%';image.src=work.img;}
    root.querySelectorAll<HTMLElement>('[data-obs-process]').forEach(el=>{el.hidden=el.dataset.obsProcess!==work.id;});
    const decoded=work.video?Promise.resolve():image.decode().catch(()=>{});
    await Promise.all([world?.focusWork(),decoded]);
    if(token!==openToken||!root.isConnected||!root.classList.contains('is-ready')){return;}
    opening=false;
    viewer.showModal();viewer.scrollTop=0;sound.open();
    await handoff();
    root.classList.remove('is-focusing');world?.pause();
    window.dispatchEvent(new CustomEvent('rb:exhibition-film',{detail:Boolean(work.video)}));
    if(work.video&&viewer.open)video.play().catch(()=>{});
  }
  viewer.addEventListener('cancel',event=>{event.preventDefault();void closeViewer();},{signal});
  viewer.addEventListener('close',()=>{
    video.pause();video.removeAttribute('src');video.load();video.style.removeProperty('aspect-ratio');mobileSource.removeAttribute('srcset');image.removeAttribute('src');
    root.classList.remove('is-focusing');world?.resume();world?.restoreView();viewerTrigger?.focus({preventScroll:true});
    window.dispatchEvent(new CustomEvent('rb:exhibition-film',{detail:false}));
  },{signal});
  root.querySelector('[data-obs-close-viewer]')!.addEventListener('click',()=>void closeViewer(),{signal});
  root.querySelectorAll<HTMLElement>('[data-obs-compare]').forEach(compare=>{
    const range=compare.querySelector<HTMLInputElement>('[data-obs-compare-range]')!;
    range.addEventListener('input',()=>compare.style.setProperty('--split',`${range.value}%`),{signal});
  });
  const labelCompare=()=>root.querySelectorAll<HTMLInputElement>('[data-obs-compare-range]').forEach(range=>range.setAttribute('aria-label',de()?'Szene und Markenversion vergleichen':'Compare scene and brand version'));
  labelCompare();
  root.querySelector('[data-obs-open]')!.addEventListener('click',openViewer,{signal});
  root.querySelector('[data-obs-prev]')!.addEventListener('click',()=>navigate(aimed()-1),{signal});
  root.querySelector('[data-obs-next]')!.addEventListener('click',()=>navigate(aimed()+1),{signal});
  root.querySelector('[data-obs-index]')!.addEventListener('click',()=>{if(opening)return;world?.pause();clearTimeout(hoverTimer);indexDialog.showModal();},{signal});
  root.querySelector('[data-obs-close-index]')!.addEventListener('click',()=>indexDialog.close(),{signal});
  indexDialog.addEventListener('close',()=>world?.resume(),{signal});
  root.querySelectorAll<HTMLElement>('[data-obs-select]').forEach(button=>button.addEventListener('click',()=>{indexDialog.close();navigate(Number(button.dataset.obsSelect));},{signal}));
  root.querySelectorAll<HTMLElement>('[data-obs-room]').forEach(button=>button.addEventListener('click',()=>navigate(archiveWorks.findIndex(work=>work.roomIndex===Number(button.dataset.obsRoom))),{signal}));
  for(const dialog of [viewer,indexDialog])dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom){if(dialog===viewer)void closeViewer();else dialog.close();}
  },{signal});
  stage.addEventListener('wheel',event=>{
    if(!root.classList.contains('is-ready')||viewer.open||indexDialog.open||opening)return;
    event.preventDefault();
    const unit=event.deltaMode===1?16:event.deltaMode===2?innerHeight:1;
    const delta=(Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY)*unit;
    if(world&&!world.isCalm()){world.scrollBy(delta);return;}
    const now=performance.now();if(now-wheelTime>180)wheelDistance=0;wheelTime=now;
    wheelDistance+=delta;
    if(Math.abs(wheelDistance)>45){navigate(aimed()+(wheelDistance>0?1:-1),true);wheelDistance=0;}
  },{passive:false,signal});
  // Drag the hall: it follows the hand, a flick carries on, and it settles on a work.
  const fluid=()=>Boolean(world&&!world.isCalm()&&root.classList.contains('is-ready'));
  stage.addEventListener('pointerdown',event=>{
    if(event.button>0||viewer.open||indexDialog.open||opening)return;
    gesture={x:event.clientX,y:event.clientY,id:event.pointerId,axis:''};stage.setPointerCapture(event.pointerId);
    if(fluid())world!.dragStart();
  },{signal});
  stage.addEventListener('pointerup',event=>{
    if(!gesture)return;const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    if(fluid()){world!.dragEnd();if(!gesture.axis&&world!.hit(event.clientX,event.clientY))openViewer();}
    else if(Math.max(Math.abs(dx),Math.abs(dy))>35)navigate(aimed()+((Math.abs(dx)>Math.abs(dy)?-dx:-dy)<0?-1:1));
    else if(world?.hit(event.clientX,event.clientY))openViewer();
    gesture=undefined;stage.style.cursor='grab';if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
  },{signal});
  stage.addEventListener('pointercancel',()=>{world?.dragEnd();gesture=undefined;stage.style.cursor='grab';},{signal});
  stage.addEventListener('pointermove',event=>{
    if(!world||opening)return;world.pointer.set(event.clientX/innerWidth*2-1,-(event.clientY/innerHeight*2-1));world.pointerInside=true;
    if(gesture){
      const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
      if(!gesture.axis&&Math.max(Math.abs(dx),Math.abs(dy))>6)gesture.axis=Math.abs(dx)>=Math.abs(dy)?'x':'y';
      if(gesture.axis&&fluid()){
        world.dragMove(gesture.axis==='x'?dx:dy,gesture.axis==='x'?stage.clientWidth:stage.clientHeight);
        stage.style.cursor='grabbing';world.hovered=false;if(hover){clearTimeout(hoverTimer);world.endHover();hover=false;}
      }
      return;
    }
    if(event.pointerType==='touch'||world.isMoving())return;
    const hit=world.hit(event.clientX,event.clientY);stage.style.cursor=hit?'pointer':'grab';world.hovered=hit;
    if(hit&&!hover){hoverTimer=setTimeout(()=>world?.previewFilm(),300);hover=true;}
    if(!hit&&hover){clearTimeout(hoverTimer);world.endHover();hover=false;}
  },{signal});
  stage.addEventListener('pointerleave',()=>{clearTimeout(hoverTimer);world?.endHover();hover=false;if(world){world.pointer.set(0,0);world.pointerInside=false;world.hovered=false;}},{signal});
  // Phones: tilting the device shifts the view a little, like leaning in a room.
  addEventListener('deviceorientation',event=>{
    if(!world?.mobile||event.gamma===null||event.beta===null)return;
    const x=Math.max(-1,Math.min(1,event.gamma/28)),y=Math.max(-1,Math.min(1,(45-event.beta)/28));
    (world.tilt??=new (world.pointer.constructor as any)()).set(x,y);
  },{signal});
  document.addEventListener('keydown',event=>{
    if(opening){if(event.key==='Escape'){openToken++;opening=false;root.classList.remove('is-focusing');world?.restoreView();}return;}
    if(viewer.open||indexDialog.open||!root.classList.contains('is-ready'))return;
    if(event.altKey||event.ctrlKey||event.metaKey)return;
    if((event.target as HTMLElement).closest('button,a,input,textarea,select'))return;
    if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End','Enter',' '].includes(event.key))event.preventDefault();
    if(event.key==='ArrowRight'||event.key==='ArrowDown')navigate(aimed()+1,Boolean(world?.isCalm()));
    if(event.key==='ArrowLeft'||event.key==='ArrowUp')navigate(aimed()-1,Boolean(world?.isCalm()));
    if(event.key==='Home')navigate(0);if(event.key==='End')navigate(archiveWorks.length-1);
    if(event.key==='Enter'||event.key===' ')openViewer();
  },{signal});
  addEventListener('rb:langchange',()=>{update();labelCompare();if(viewer.open)fillViewer();},{signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){world?.pause();video.pause();}else if(!viewer.open&&!indexDialog.open)world?.resume();},{signal});
  addEventListener('pagehide',event=>{openToken++;opening=false;root.classList.remove('is-focusing');world?.restoreView();world?.pause();video.pause();if(!(event as PageTransitionEvent).persisted){world?.dispose();sound.dispose();events.abort();}},{signal});
  addEventListener('pageshow',event=>{if((event as PageTransitionEvent).persisted)world?.resume();},{signal});
  update();
  try {
    const {ObservatoryWorld}=await import('./observatory-void');
    if(!root.isConnected)return;
    let saved=0;try{saved=Number(sessionStorage.getItem('rb-observatory-index')??0);}catch{}
    current=Number.isInteger(saved)&&saved>=0&&saved<archiveWorks.length?saved:0;
    update();
    if(bootFailed){fallback();return;}
    let intro=false;try{intro=!sessionStorage.getItem('rb-observatory-intro');}catch{}
    world=new ObservatoryWorld(stage,fallback);world.onIndex=setCurrent;
    world.onFrame=state=>sound.frame(state);world.onSettle=room=>sound.arrive(room);
    if(location.search.includes('obsdebug'))(window as any).__obsWorld=world;
    // First visit of the session opens in darkness; the interface arrives with the light.
    if(intro&&!world.isCalm()){world.armIntro();root.classList.add('is-intro');}
    await world.start(current);
    if(world.disposed||bootFailed)return;
    root.classList.add('is-ready');
    // Reveal only after the selected bay, camera and actual first frame agree.
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    finishBoot();window.dispatchEvent(new CustomEvent('rb:webgl-ready'));
    if(root.classList.contains('is-intro')){
      await world.beginIntro();
      if(!world.disposed)revealShell();
      try{sessionStorage.setItem('rb-observatory-intro','1');}catch{}
    }
  }catch(error){console.warn('The Observatory: showing the accessible collection.',error);world?.dispose();fallback();}
}
