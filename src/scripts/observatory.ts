import { archiveRooms, archiveWorks } from '../data/observatory';
import { observatoryNotes } from '../data/observatory-notes';
import type { ObservatoryWorld } from './observatory-void';
import { createHallSound } from './observatory-sound';
import { daylightAt, viennaClock, viennaHour } from './observatory-daylight';

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
  let mapping=false,firstPerson=false;
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
    text('[data-obs-room-name]',room[lang]);text('[data-obs-hud-room]',room[lang]);text('[data-obs-hud-work]',`${String(current+1).padStart(2,'0')} / ${String(archiveWorks.length).padStart(2,'0')}`);text('[data-obs-room-description]',room.subtitle[lang]);
    root.querySelectorAll<HTMLButtonElement>('[data-obs-room]').forEach(button=>{
      const ri=Number(button.dataset.obsRoom);if(ri===work.roomIndex)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
      const start=archiveWorks.findIndex(item=>item.roomIndex===ri);
      const progress=Math.min(1,Math.max(0,(current-start+1)/archiveRooms[ri].ids.length));
      (button.querySelector('[data-obs-room-progress]') as HTMLElement).style.transform=`scaleX(${progress})`;
    });
    root.querySelector<HTMLButtonElement>('[data-obs-prev]')!.disabled=current===0;
    root.querySelector<HTMLButtonElement>('[data-obs-next]')!.disabled=false;
    root.querySelector('[data-obs-prev]')!.setAttribute('aria-label',de()?'Vorheriges Werk':'Previous work');
    root.querySelector('[data-obs-next]')!.setAttribute('aria-label',de()?'Nächstes Werk':'Next work');
  }
  // The hall is continuous: the world reports whichever work is in front of the camera.
  const aimed=()=>world&&!world.disposed?world.targetIndex():current;
  function setCurrent(index:number){
    if(index===current)return;current=index;update();
    // The address follows the work in front of you, so a copied link lands right here.
    if(root.classList.contains('is-ready'))try{history.replaceState(history.state,'',`/gallery/${archiveWorks[current].id}/`);}catch{}
    try{sessionStorage.setItem('rb-observatory-index',String(current));}catch{}
    clearTimeout(hoverTimer);hover=false;
  }
  function navigate(index:number,throttle=false,mode:'walk'|'teleport'='walk'){
    if(index===archiveWorks.length&&!world?.isMoving()&&aimed()===archiveWorks.length-1){setFinale(true);return;}
    if(index<0||index>=archiveWorks.length||viewer.open||indexDialog.open||opening)return;
    const now=performance.now();if(throttle&&now-lastNavigation<1250)return;lastNavigation=now;
    if(!world){setCurrent(index);return;}
    if(index===aimed()&&!world.isMoving())return;
    const jump=Math.abs(index-current)>3;
    world.select(index,mode);if(world.isCalm())setCurrent(index);
    if(jump&&!world.isCalm())stage.animate([{opacity:.35},{opacity:1}],{duration:700,easing:'ease-out'});
  }
  // Crossing a gate: the name of the room you enter, large and brief, like a film title.
  const roomCard=root.querySelector<HTMLElement>('[data-obs-room-card]')!;
  function showRoomCard(room:number){
    if(mapping||viewer.open||opening||root.classList.contains('is-intro'))return;
    const info=archiveRooms[room],lang=de()?'de':'en';
    roomCard.querySelector('[data-obs-card-num]')!.textContent=`0${room+1} / 04`;
    roomCard.querySelector('[data-obs-card-name]')!.textContent=info[lang];
    roomCard.querySelector('[data-obs-card-sub]')!.textContent=info.subtitle[lang];
    roomCard.classList.remove('is-on');void roomCard.offsetWidth;roomCard.classList.add('is-on');
  }
  // The hall keeps Vienna time; say so, quietly, in the corner.
  const viennaLabel=()=>{const label=daylightAt(viennaHour()).label[de()?1:0];text('[data-obs-vienna]',`${de()?'WIEN':'VIENNA'} ${viennaClock()} · ${label.toUpperCase()}`);};
  viennaLabel();const viennaTimer=setInterval(viennaLabel,30000);signal.addEventListener('abort',()=>clearInterval(viennaTimer));
  addEventListener('rb:langchange',viennaLabel,{signal});
  // The comet: whoever catches it gets a frame nobody else sees.
  const secret=root.querySelector<HTMLDialogElement>('[data-obs-secret]')!;
  function openSecret(){
    if(viewer.open||indexDialog.open||secret.open)return;
    let caught=1;try{caught=Number(localStorage.getItem('rb-comets')??0)+1;localStorage.setItem('rb-comets',String(caught));}catch{}
    text('[data-obs-secret-count]',String(caught).padStart(2,'0'));
    world?.pause();secret.showModal();
  }
  secret.addEventListener('close',()=>world?.resume(),{signal});
  root.querySelector('[data-obs-close-secret]')!.addEventListener('click',()=>secret.close(),{signal});
  // Stars left by visitors: a city and a date, one per visitor per day.
  const starButton=root.querySelector<HTMLButtonElement>('[data-obs-star]')!;
  const starTip=root.querySelector<HTMLElement>('[data-obs-star-tip]')!;
  let starCount=0,myStar:any=null;
  try{myStar=JSON.parse(localStorage.getItem('rb-star')??'null');}catch{}
  const dateLabel=(t:number)=>new Intl.DateTimeFormat(de()?'de-AT':'en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(t));
  const starLabel=(star:any)=>{const mine=myStar&&star.t===myStar.t;const who=mine?(de()?'Ihr Stern':'Your star'):(star.city?(de()?`Ein Besuch aus ${star.city}`:`A visitor from ${star.city}`):(de()?'Ein Besuch':'A visitor'));return `✦ ${who} · ${dateLabel(star.t)}`;};
  function showStarCount(){text('[data-obs-star-count]',starCount?`✦ ${starCount} ${de()?(starCount===1?'Stern':'Sterne'):(starCount===1?'star':'stars')}`:'');}
  function markStarButton(){
    const done=Boolean(myStar&&Date.now()-myStar.t<86400000);starButton.disabled=done;
    starButton.querySelector('.obs-en')!.textContent=done?'Your star is up':'Leave a star';starButton.querySelector('.obs-de')!.textContent=done?'Ihr Stern leuchtet':'Stern hinterlassen';
  }
  async function loadStars(){
    try{
      const response=await fetch('/api/stars/',{headers:{Accept:'application/json'}});if(!response.ok)throw 0;
      const data=await response.json();let stars=Array.isArray(data.stars)?data.stars:[];
      if(myStar&&!stars.some((s:any)=>s.t===myStar.t))stars=[myStar,...stars];
      starCount=Math.max(Number(data.count)||0,stars.length);world?.setVisitorStars(stars);
    }catch{if(myStar){world?.setVisitorStars([myStar]);starCount=1;}}
    showStarCount();markStarButton();
  }
  starButton.addEventListener('click',async()=>{
    if(!world||starButton.disabled||viewer.open||mapping||inFinale)return;
    starButton.disabled=true;
    const spot=world.freeSkySpot();let star={...spot,city:'',country:'',t:Date.now()};
    try{
      const response=await fetch('/api/stars/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(spot)});
      if(response.ok){const data=await response.json();star=data.star;starCount=data.count;}
      else if(response.status===429){markStarButton();return;}
      else starCount+=1;
    }catch{starCount+=1;}
    myStar=star;try{localStorage.setItem('rb-star',JSON.stringify(star));}catch{}
    sound.comet();await world.launchStar(star);showStarCount();markStarButton();
  },{signal});
  addEventListener('rb:langchange',()=>{showStarCount();markStarButton();},{signal});
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
  // Phone case cards flatten their copy with display:contents, which ignores opacity:
  // animate the real boxes inside instead.
  const chrome=()=>[...viewer.children].filter(child=>!child.classList.contains('obs-viewer-media')).flatMap(child=>getComputedStyle(child).display==='contents'?[...child.children]:[child]) as HTMLElement[];
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
      viewer.classList.add('is-closing');
      chrome().forEach(element=>element.animate([{opacity:1},{opacity:0}],{duration:220,fill:'forwards'}));
      const back=viewer.animate([{backgroundColor:'rgba(5,6,7,1)'},{backgroundColor:'rgba(5,6,7,0)'}],{duration,easing:'ease-in-out',fill:'forwards'});
      const move=media.animate(end?[{transform:'none',transformOrigin:'0 0'},{transform:end,transformOrigin:'0 0'}]:[{opacity:1},{opacity:0}],{duration,easing:handoffEase,fill:'forwards'});
      await move.finished.catch(()=>{});
      viewer.close();
      move.cancel();back.cancel();viewer.getAnimations({subtree:true}).forEach(animation=>animation.cancel());viewer.classList.remove('is-closing');
    }else viewer.close();
    closing=false;
  }
  // Titles fade back only once the camera has returned, so they never sit on the print.
  async function returnToHall(){
    const token=openToken;
    await world?.restoreView();
    if(token===openToken&&!viewer.open&&!opening)root.classList.remove('is-focusing');
  }
  // "How it was made": only facts the site already holds. Web projects use their case
  // study (problem, process, outcome); 3D and film use the real tool chain and format.
  const TOOL_ROLES:Record<string,[string,string]>={
    'CINEMA 4D':['Modelling, scene and camera','Modellierung, Szene und Kamera'],
    'REDSHIFT':['Materials, light and GPU rendering','Materialien, Licht und GPU-Rendering'],
    'AFTER EFFECTS':['Compositing and motion','Compositing und Motion'],
    'PREMIERE PRO':['Edit, sound and colour','Schnitt, Ton und Farbe'],
    'PHOTOSHOP':['Retouch and art direction','Retusche und Art Direction'],
    'ON LOCATION':['Filmed on location','Vor Ort gedreht'],
  };
  const TOOL_NAMES:Record<string,string>={'CINEMA 4D':'Cinema 4D','REDSHIFT':'Redshift','AFTER EFFECTS':'After Effects','PREMIERE PRO':'Premiere Pro','PHOTOSHOP':'Photoshop','ON LOCATION':'On location'};
  const making=root.querySelector<HTMLElement>('[data-obs-making]')!,makingGrid=root.querySelector<HTMLElement>('[data-obs-making-grid]')!;
  function fillMaking(){
    const work=archiveWorks[current],l=de()?1:0,d=dict();makingGrid.textContent='';
    const block=(label:string,body:string|string[],wide=false)=>{
      const el=document.createElement('div');el.className='obs-making-block'+(wide?' is-wide':'');
      const h=document.createElement('span');h.className='obs-making-label';h.textContent=label;el.append(h);
      for(const line of Array.isArray(body)?body:[body]){const p=document.createElement('p');p.textContent=line;el.append(p);}
      makingGrid.append(el);return el;
    };
    if(work.type==='case'){
      const key=(k:string)=>d[`case.${work.id}.${k}`];
      if(key('problem.text'))block(l?'Ausgangslage':'The brief',key('problem.text'));
      if(key('solution.text'))block(l?'Lösung':'The answer',key('solution.text'));
      const steps=[1,2,3].map(i=>key(`process.${i}`)).filter(Boolean);
      if(steps.length)block(l?'Vorgehen':'Process',steps.map((s,i)=>`0${i+1} — ${s}`),true);
      if(key('outcome.text'))block(l?'Ergebnis':'Outcome',key('outcome.text'));
    }else{
      const tools=(work.detail?.tools??'').split('/').map(t=>t.trim()).filter(Boolean);
      if(tools.length)block(l?'Werkzeugkette':'Pipeline',tools.map((t,i)=>`0${i+1} — ${TOOL_NAMES[t]??t}: ${TOOL_ROLES[t]?.[l]??''}`.replace(/: $/,'')),true);
      const format=block(l?'Format':'Format',work.video?(l?'Film':'Film'):(l?'Standbild':'Still image'));
      const describe=()=>{
        const p=format.querySelector('p')!;
        if(work.video&&video.duration){const s=Math.round(video.duration);p.textContent=`${l?'Film':'Film'} · ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')} · ${video.videoWidth>video.videoHeight?'16:9':'9:16'}`;}
        else if(!work.video&&image.naturalWidth)p.textContent=`${l?'Standbild':'Still image'} · ${image.naturalWidth} × ${image.naturalHeight} px`;
      };
      describe();video.addEventListener('loadedmetadata',describe,{once:true});image.addEventListener('load',describe,{once:true});
      const room=archiveRooms[work.roomIndex];block(l?'Saal':'Room',`0${work.roomIndex+1} · ${room[l?'de':'en']} — ${room.subtitle[l?'de':'en']}`);
    }
    making.hidden=!makingGrid.children.length;
  }
  // Fill the viewer with the current work: copy, media, process block, next link.
  function loadViewer(){
    fillViewer();root.querySelector<HTMLDetailsElement>('[data-obs-notes]')!.open=false;
    const work=archiveWorks[current];image.hidden=Boolean(work.video);video.hidden=!work.video;
    picture.hidden=Boolean(work.video);
    if(mobilePreviews[work.id])mobileSource.srcset=mobilePreviews[work.id];else mobileSource.removeAttribute('srcset');
    if(work.video){image.removeAttribute('src');video.src=work.video;video.poster=work.img;video.muted=false;video.currentTime=0;video.style.aspectRatio=String(world?.aspect()??16/9);}
    else {video.pause();video.removeAttribute('src');video.load();image.style.maxWidth='100%';image.src=work.img;}
    root.querySelectorAll<HTMLElement>('[data-obs-process]').forEach(el=>{el.hidden=el.dataset.obsProcess!==work.id;});
    const next=archiveWorks[current+1];nextButton.hidden=!next;
    if(next){nextTitle.textContent=workTitle(next);nextMeta.textContent=`${String(current+2).padStart(2,'0')} / ${archiveRooms[next.roomIndex][de()?'de':'en']}`;}
    shareButton.classList.remove('is-copied');
    fillMaking();
    return work.video?Promise.resolve():image.decode().catch(()=>{});
  }
  // Next work from inside the viewer: the hall moves behind the page, the page crossfades.
  const nextButton=root.querySelector<HTMLButtonElement>('[data-obs-next-work]')!;
  const nextTitle=root.querySelector<HTMLElement>('[data-obs-next-title]')!;
  const nextMeta=root.querySelector<HTMLElement>('[data-obs-next-meta]')!;
  let swapping=false;
  nextButton.addEventListener('click',async()=>{
    if(swapping||!viewer.open||current>=archiveWorks.length-1)return;swapping=true;
    const content=[...viewer.children] as HTMLElement[];
    await Promise.all(content.map(el=>el.animate([{opacity:1},{opacity:0,transform:'translateY(-12px)'}],{duration:260,easing:'ease-in',fill:'forwards'}).finished.catch(()=>{})));
    const target=current+1;world?.jumpTo(target);setCurrent(target);
    await loadViewer();viewer.scrollTop=0;
    content.forEach(el=>el.getAnimations().forEach(a=>a.cancel()));
    content.forEach((el,i)=>el.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:560,delay:i*60,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'}));
    const work=archiveWorks[current];
    window.dispatchEvent(new CustomEvent('rb:exhibition-film',{detail:Boolean(work.video)}));
    if(work.video)video.play().catch(()=>{});
    swapping=false;
  },{signal});
  // Every work has its own address with its own preview; share it or copy it.
  const shareButton=root.querySelector<HTMLButtonElement>('[data-obs-share]')!;
  const workUrl=()=>new URL(`/gallery/${archiveWorks[current].id}/`,location.origin).toString();
  shareButton.addEventListener('click',async()=>{
    const url=workUrl(),title=workTitle(archiveWorks[current]);
    if(navigator.share&&matchMedia('(pointer: coarse)').matches){try{await navigator.share({title,url});return;}catch{}}
    try{await navigator.clipboard.writeText(url);shareButton.classList.add('is-copied');setTimeout(()=>shareButton.classList.remove('is-copied'),2200);}catch{}
  },{signal});
  async function openViewer(){
    if(viewer.open||indexDialog.open||opening||mapping)return;
    opening=true;const token=++openToken;root.classList.add('is-focusing');
    viewerTrigger=document.activeElement as HTMLElement;
    world?.stopPreview();clearTimeout(hoverTimer);
    const work=archiveWorks[current];
    const decoded=loadViewer();
    await Promise.all([world?.focusWork(),decoded]);
    if(token!==openToken||!root.isConnected||!root.classList.contains('is-ready')){return;}
    opening=false;
    viewer.showModal();viewer.scrollTop=0;sound.open();
    await handoff();
    // The interface stays hidden until the camera is back in the hall (see close).
    world?.pause();
    window.dispatchEvent(new CustomEvent('rb:exhibition-film',{detail:Boolean(work.video)}));
    if(work.video&&viewer.open)video.play().catch(()=>{});
  }
  viewer.addEventListener('cancel',event=>{event.preventDefault();void closeViewer();},{signal});
  viewer.addEventListener('close',()=>{
    video.pause();video.removeAttribute('src');video.load();video.style.removeProperty('aspect-ratio');mobileSource.removeAttribute('srcset');image.removeAttribute('src');
    world?.resume();void returnToHall();viewerTrigger?.focus({preventScroll:true});
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
  root.querySelector('[data-obs-next]')!.addEventListener('click',()=>{if(aimed()>=archiveWorks.length-1&&!world?.isMoving())setFinale(true);else navigate(aimed()+1);},{signal});
  // The end of the hall: a last gate, a signal sent from his tablet, and an invitation.
  const finale=root.querySelector<HTMLElement>('[data-obs-finale]')!;let inFinale=false,overscroll=0;
  function setFinale(on:boolean){
    if(!world||mapping||viewer.open)return;
    if(on){
      if(inFinale)return;
      if(firstPerson)setFirstPerson(false);
      inFinale=true;root.classList.add('is-finale');world.setFinale(true);sound.gate();
    }else{
      root.classList.remove('is-contact');finale.setAttribute('aria-hidden','true');world.setFinale(false);
    }
  }
  const portalLines=()=>de()
    ?['Was kommt nach dem letzten Werk?','Noch hat es niemand gebaut.','Vielleicht ist es Ihres.','Treten Sie hindurch.']
    :['What comes after the last work?','Nobody has built it yet.','Maybe it is yours.','Step through.'];
  root.querySelector('[data-obs-finale-back]')!.addEventListener('click',()=>setFinale(false),{signal});
  // All works: with a mouse or finger the camera rises and the hall becomes a map;
  // from the keyboard, or in Calm mode, the accessible list opens instead.
  const indexButton=root.querySelector<HTMLButtonElement>('[data-obs-index]')!;
  const mapLabel=root.querySelector<HTMLElement>('[data-obs-map-label]')!;
  function labelIndexButton(){
    indexButton.querySelector('.obs-en')!.textContent=mapping?'Back to the hall':'All works';
    indexButton.querySelector('.obs-de')!.textContent=mapping?'Zurück in den Saal':'Alle Arbeiten';
    indexButton.setAttribute('aria-pressed',String(mapping));
  }
  async function enterMap(){
    if(!world||mapping||opening||viewer.open)return;
    if(firstPerson)setFirstPerson(false);
    mapping=true;labelIndexButton();root.classList.add('is-overview');
    clearTimeout(hoverTimer);world.endHover();hover=false;
    await world.enterOverview();
  }
  async function leaveMap(index?:number){
    if(!world||!mapping)return;
    mapping=false;labelIndexButton();mapLabel.classList.remove('is-visible');world.mapHover=-1;stage.style.cursor='grab';
    root.classList.add('is-map-leaving');
    const leaving=world.exitOverview(index);
    await leaving;if(!mapping)root.classList.remove('is-overview','is-map-leaving');
  }
  indexButton.addEventListener('click',event=>{
    if(opening)return;
    if(world&&!world.isCalm()&&event.detail!==0){void(mapping?leaveMap():enterMap());return;}
    if(mapping)void leaveMap();
    world?.pause();clearTimeout(hoverTimer);indexDialog.showModal();
  },{signal});
  root.querySelector('[data-obs-close-index]')!.addEventListener('click',()=>indexDialog.close(),{signal});
  indexDialog.addEventListener('close',()=>world?.resume(),{signal});
  root.querySelectorAll<HTMLElement>('[data-obs-select]').forEach(button=>button.addEventListener('click',()=>{indexDialog.close();navigate(Number(button.dataset.obsSelect));},{signal}));
  root.querySelectorAll<HTMLElement>('[data-obs-room]').forEach(button=>button.addEventListener('click',()=>navigate(archiveWorks.findIndex(work=>work.roomIndex===Number(button.dataset.obsRoom)),false,'teleport'),{signal}));
  for(const dialog of [viewer,indexDialog])dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom){if(dialog===viewer)void closeViewer();else dialog.close();}
  },{signal});
  stage.addEventListener('wheel',event=>{
    if(!root.classList.contains('is-ready')||viewer.open||indexDialog.open||opening)return;
    event.preventDefault();if(mapping)return;
    const unit=event.deltaMode===1?16:event.deltaMode===2?innerHeight:1;
    // Wheel forward (away from you) travels right, to the next work; back travels left.
    const delta=(Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:-event.deltaY)*unit;
    if(firstPerson&&world){
      // Through his eyes the wheel walks: forward goes where you look, back goes the other way.
      const now=performance.now();if(now-wheelTime>220)wheelDistance=0;wheelTime=now;wheelDistance+=delta;
      if(Math.abs(wheelDistance)>40){
        const side=world.lookSide(),forward=wheelDistance>0;wheelDistance=0;
        const step=forward?(side||1):(side?-side:-1);
        if(now-lastNavigation>900){lastNavigation=now;navigate(aimed()+step);}
      }
      return;
    }
    if(inFinale){if(delta<-30)setFinale(false);return;}
    if(world&&aimed()===archiveWorks.length-1&&delta>0&&!world.isMoving()){overscroll+=delta;if(overscroll>260){overscroll=0;setFinale(true);}return;}
    overscroll=0;
    if(world&&!world.isCalm()){world.scrollBy(delta);return;}
    const now=performance.now();if(now-wheelTime>180)wheelDistance=0;wheelTime=now;
    wheelDistance+=delta;
    if(Math.abs(wheelDistance)>45){navigate(aimed()+(wheelDistance>0?1:-1),true);wheelDistance=0;}
  },{passive:false,signal});
  // Drag the hall: it follows the hand, a flick carries on, and it settles on a work.
  let lookX=0,lookY=0;
  const eyesButton=root.querySelector<HTMLButtonElement>('[data-obs-eyes]')!;
  function setFirstPerson(on:boolean){
    if(!world||on===firstPerson)return;
    if(on&&mapping)void leaveMap();
    firstPerson=on;world.setFirstPerson(on);sound.firstPerson(on);
    root.classList.toggle('is-first-person',on);eyesButton.setAttribute('aria-pressed',String(on));
    eyesButton.setAttribute('aria-label',on?(de()?'Zurück zur Außenansicht':'Back to the outside view'):(de()?'Durch die Augen des Astronauten sehen':'See through the astronaut’s eyes'));
  }
  eyesButton.addEventListener('click',()=>{if(!opening&&!viewer.open)setFirstPerson(!firstPerson);},{signal});
  const fluid=()=>Boolean(world&&!world.isCalm()&&!mapping&&root.classList.contains('is-ready'));
  stage.addEventListener('pointerdown',event=>{
    if(event.button>0||viewer.open||indexDialog.open||opening)return;
    gesture={x:event.clientX,y:event.clientY,id:event.pointerId,axis:''};lookX=event.clientX;lookY=event.clientY;stage.setPointerCapture(event.pointerId);
    // Grabbing the 3D piece turns it instead of moving the hall.
    if(!firstPerson&&!mapping&&world?.hitModel(event.clientX,event.clientY)){gesture.axis='model';stage.style.cursor='grabbing';return;}
    if(inFinale)return;
    if(fluid()&&!firstPerson)world!.dragStart();
  },{signal});
  stage.addEventListener('pointerup',event=>{
    if(!gesture)return;const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    if(!gesture.axis&&!mapping&&world?.catchComet(event.clientX,event.clientY)){world.dragEnd();gesture=undefined;if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);sound.comet();setTimeout(openSecret,650);return;}
    if(firstPerson){if(!gesture.axis&&world?.hit(event.clientX,event.clientY))openViewer();}
    else if(mapping){
      const picked=Math.max(Math.abs(dx),Math.abs(dy))<10?world!.pick(event.clientX,event.clientY):-1;
      if(picked>=0)void leaveMap(picked);
    }else if(fluid()){world!.dragEnd();if(!gesture.axis&&world!.hit(event.clientX,event.clientY))openViewer();}
    else if(Math.max(Math.abs(dx),Math.abs(dy))>35)navigate(aimed()+((Math.abs(dx)>Math.abs(dy)?-dx:-dy)<0?-1:1));
    else if(world?.hit(event.clientX,event.clientY))openViewer();
    gesture=undefined;stage.style.cursor='grab';if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
  },{signal});
  stage.addEventListener('pointercancel',()=>{world?.dragEnd();gesture=undefined;stage.style.cursor='grab';},{signal});
  stage.addEventListener('pointermove',event=>{
    if(!world||opening)return;world.pointer.set(event.clientX/innerWidth*2-1,-(event.clientY/innerHeight*2-1));world.pointerInside=true;
    if(mapping){
      const picked=world.pick(event.clientX,event.clientY);world.mapHover=picked;stage.style.cursor=picked>=0?'pointer':'default';
      if(picked>=0){
        const work=archiveWorks[picked];
        mapLabel.textContent=`${String(picked+1).padStart(2,'0')} · ${workTitle(work)}`;
        mapLabel.style.transform=`translate(${Math.min(event.clientX+18,innerWidth-mapLabel.offsetWidth-12)}px,${event.clientY+18}px)`;
      }
      mapLabel.classList.toggle('is-visible',picked>=0);
      return;
    }
    if(gesture){
      const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
      if(!gesture.axis&&Math.max(Math.abs(dx),Math.abs(dy))>6)gesture.axis=Math.abs(dx)>=Math.abs(dy)?'x':'y';
      if(gesture.axis==='model'){world.spinModel(event.clientX-lookX);lookX=event.clientX;return;}
      if(firstPerson&&gesture.axis){world.lookBy(event.clientX-lookX,event.clientY-lookY);lookX=event.clientX;lookY=event.clientY;stage.style.cursor='grabbing';return;}
      if(gesture.axis&&fluid()){
        world.dragMove(gesture.axis==='x'?dx:dy,gesture.axis==='x'?stage.clientWidth:stage.clientHeight);
        stage.style.cursor='grabbing';world.hovered=false;if(hover){clearTimeout(hoverTimer);world.endHover();hover=false;}
      }
      return;
    }
    if(event.pointerType==='touch'||world.isMoving())return;
    const hit=world.hit(event.clientX,event.clientY);stage.style.cursor=hit?'pointer':'grab';world.hovered=hit;
    const star=hit?undefined:world.pickVisitorStar(event.clientX,event.clientY);
    if(star){starTip.textContent=starLabel(star);starTip.style.transform=`translate(${Math.min(event.clientX+16,innerWidth-starTip.offsetWidth-12)}px,${event.clientY+16}px)`;}
    starTip.classList.toggle('is-visible',Boolean(star));
    if(hit&&!hover){hoverTimer=setTimeout(()=>world?.previewFilm(),300);hover=true;}
    if(!hit&&hover){clearTimeout(hoverTimer);world.endHover();hover=false;}
  },{signal});
  stage.addEventListener('pointerleave',()=>{clearTimeout(hoverTimer);world?.endHover();hover=false;if(world){world.pointer.set(0,0);world.pointerInside=false;world.hovered=false;}},{signal});
  // Two fingers: pinching in rises to the map of all works, spreading out flies back
  // into the hall. The browser's own page zoom is blocked so the view never gets stuck.
  let pinchStart=0,pinchFired=false;
  const pinchDistance=(touches:TouchList)=>Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);
  root.addEventListener('touchstart',event=>{
    if(event.touches.length===2){pinchStart=pinchDistance(event.touches);pinchFired=false;world?.dragEnd();gesture=undefined;}
  },{passive:true,signal});
  root.addEventListener('touchmove',event=>{
    if(event.touches.length<2||viewer.open||indexDialog.open)return;
    event.preventDefault();
    if(pinchFired||!pinchStart)return;
    const ratio=pinchDistance(event.touches)/pinchStart;
    if(ratio<.72&&!mapping&&!inFinale){pinchFired=true;void enterMap();}
    else if(ratio>1.35&&mapping){pinchFired=true;void leaveMap();}
  },{passive:false,signal});
  root.addEventListener('touchend',event=>{if(event.touches.length<2)pinchStart=0;},{passive:true,signal});
  // iOS Safari zooms on its own gesture events regardless of touch-action on some versions.
  for(const type of ['gesturestart','gesturechange']as const)document.addEventListener(type,event=>{if(!viewer.open)event.preventDefault();},{passive:false,signal});
  // Phones: tilting the device shifts the view a little, like leaning in a room.
  addEventListener('deviceorientation',event=>{
    if(!world?.mobile||event.gamma===null||event.beta===null)return;
    const x=Math.max(-1,Math.min(1,event.gamma/28)),y=Math.max(-1,Math.min(1,(45-event.beta)/28));
    (world.tilt??=new (world.pointer.constructor as any)()).set(x,y);
  },{signal});
  document.addEventListener('keydown',event=>{
    if(opening){if(event.key==='Escape'){openToken++;opening=false;void returnToHall();}return;}
    if(mapping){if(event.key==='Escape'){event.preventDefault();void leaveMap();}return;}
    if(firstPerson&&event.key==='Escape'&&!viewer.open&&!indexDialog.open){event.preventDefault();setFirstPerson(false);return;}
    if(inFinale){if(['Escape','ArrowLeft','ArrowDown'].includes(event.key)){event.preventDefault();setFinale(false);}return;}
    if(viewer.open||indexDialog.open||!root.classList.contains('is-ready'))return;
    if(event.altKey||event.ctrlKey||event.metaKey)return;
    if((event.target as HTMLElement).closest('button,a,input,textarea,select'))return;
    if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End','Enter',' '].includes(event.key))event.preventDefault();
    if(firstPerson&&world&&(event.key==='ArrowUp'||event.key==='ArrowDown')){
      // Up walks towards your gaze, down walks away from it.
      const side=world.lookSide(),step=event.key==='ArrowUp'?(side||1):(side?-side:-1);navigate(aimed()+step,true);
    }else{
      if(event.key==='ArrowRight'||event.key==='ArrowUp')navigate(aimed()+1,Boolean(world?.isCalm()));
      if(event.key==='ArrowLeft'||event.key==='ArrowDown')navigate(aimed()-1,Boolean(world?.isCalm()));
    }
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
    const linked=archiveWorks.findIndex(work=>work.id===root.dataset.obsStart);if(linked>=0)current=linked;
    update();
    if(bootFailed){fallback();return;}
    let intro=false;try{intro=!sessionStorage.getItem('rb-observatory-intro');}catch{}
    world=new ObservatoryWorld(stage,fallback);world.onIndex=setCurrent;
    world.onFrame=state=>sound.frame(state);world.onSettle=room=>sound.arrive(room);world.onTeleport=phase=>sound.teleport(phase);void loadStars();world.onGate=room=>{showRoomCard(room);sound.gate();};
    world.setPortalTexts(portalLines());addEventListener('rb:langchange',()=>world?.setPortalTexts(portalLines()),{signal});
    world.onFinaleDone=()=>{root.classList.add('is-contact');finale.setAttribute('aria-hidden','false');finale.querySelector<HTMLAnchorElement>('[data-obs-finale-cta]')!.href=de()?'/de/kontakt/':'/contact/';setTimeout(()=>finale.querySelector<HTMLElement>('a')?.focus({preventScroll:true}),700);};
    world.onFinaleBack=()=>{inFinale=false;root.classList.remove('is-finale');};world.onLand=()=>sound.land();
    if(location.search.includes('obsdebug'))(window as any).__obsWorld=world;
    // First visit of the session opens in darkness; the interface arrives with the light.
    // After the warp tunnel the hall should already be warming up, not sit in a second darkness.
    const warped=document.documentElement.classList.contains('rb-warp-arriving');
    if(intro&&!world.isCalm()){world.armIntro(warped?.14:0,1);root.classList.add('is-intro');}
    await world.start(current);
    if(world.disposed||bootFailed)return;
    root.classList.add('is-ready');
    // Reveal only after the selected bay, camera and actual first frame agree.
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    finishBoot();window.dispatchEvent(new CustomEvent('rb:webgl-ready'));
    if(root.classList.contains('is-intro')){
      // After the warp, let the tunnel lift first so the opening is seen, not hidden behind it.
      if(warped)await new Promise(resolve=>setTimeout(resolve,700));
      await world.beginIntro();
      if(!world.disposed)revealShell();
      try{sessionStorage.setItem('rb-observatory-intro','1');}catch{}
    }
  }catch(error){console.warn('The Observatory: showing the accessible collection.',error);world?.dispose();fallback();}
}
