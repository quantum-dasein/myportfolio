// The Model Room's entrance in the archive: a living painting instead of a still print.
// A tunnel of frames drifts towards you, a wireframe gem turns on its plinth, and short
// invitations appear one after another. Stepping in, it burns open into green light.
import * as THREE from 'three';

const NOISE = /* glsl */`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}`;

export const livingFragment = /* glsl */`uniform sampler2D uMap,uText;uniform float uTime,uShift,uReveal,uDim,uHover,uLight,uHolo,uOpen,uTextAlpha,uAspect,uWake;uniform vec3 uTint,uGlare;varying vec2 vUv;
${NOISE}
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float glow(float d,float w){return exp(-d*d/(w*w));}
vec2 proj(vec3 v,float a,float s){
  float c=cos(a),n=sin(a);v=vec3(c*v.x+n*v.z,v.y,-n*v.x+c*v.z);
  float ct=cos(.38),st=sin(.38);v=vec3(v.x,ct*v.y-st*v.z,st*v.y+ct*v.z);
  return v.xy*s/(1.+v.z*.25);
}
void main(){
  vec2 p=(vUv-.5)*vec2(uAspect,1.);float t=uTime,open=uOpen;
  vec3 jade=vec3(.35,1.,.72),mint=vec3(.75,1.,.9);
  // Deep green room light, brightest behind the gem.
  vec3 col=mix(vec3(.006,.022,.018),vec3(.02,.075,.06),smoothstep(.9,0.,length(p*vec2(.7,1.))));
  // A corridor of frames drifting towards you: slow while you look, rushing when you step in.
  float flow=t*(.035+open*.5)+open*open*1.4;
  vec2 hv=vec2(.47*uAspect,.46);
  for(int i=0;i<8;i++){
    float k=fract(float(i)/8.+flow);float s=.05+k*k*1.05;
    vec2 d=abs(p-vec2(0.,.03*(1.-s)))-hv*s;float edge=abs(max(d.x,d.y));
    float fade=smoothstep(0.,.25,k)*(1.-smoothstep(.82,1.,k));
    col+=jade*glow(edge,.0016+.0035*s)*fade*(.55+open*.9);
  }
  // Rails from the vanishing point to the corners, and a faint floor grid.
  vec2 vp=vec2(0.,.03);
  for(int i=0;i<4;i++){vec2 c=vec2(i<2?-1.:1.,mod(float(i),2.)<1.?-1.:1.)*hv*1.1;col+=jade*glow(seg(p,vp,c),.0022)*.22;}
  float below=vp.y-.02-p.y;
  if(below>0.){float z=.12/below;float gl=abs(fract(z-t*(.25+open*3.))-.5);col+=jade*smoothstep(.06,0.,gl*below*14.)*smoothstep(0.,.3,below)*.12;}
  // The gem: a turning wireframe octahedron in a cage, on a lit plinth, with a scan line.
  vec2 g=p-vec2(0.,.07);float a=t*.45+open*4.;
  vec3 V[6];V[0]=vec3(1,0,0);V[1]=vec3(-1,0,0);V[2]=vec3(0,1.35,0);V[3]=vec3(0,-1.35,0);V[4]=vec3(0,0,1);V[5]=vec3(0,0,-1);
  vec2 P[6];for(int i=0;i<6;i++)P[i]=proj(V[i],a,.105);
  float dg=1e3;
  dg=min(dg,seg(g,P[2],P[0]));dg=min(dg,seg(g,P[2],P[1]));dg=min(dg,seg(g,P[2],P[4]));dg=min(dg,seg(g,P[2],P[5]));
  dg=min(dg,seg(g,P[3],P[0]));dg=min(dg,seg(g,P[3],P[1]));dg=min(dg,seg(g,P[3],P[4]));dg=min(dg,seg(g,P[3],P[5]));
  dg=min(dg,seg(g,P[0],P[4]));dg=min(dg,seg(g,P[4],P[1]));dg=min(dg,seg(g,P[1],P[5]));dg=min(dg,seg(g,P[5],P[0]));
  float gem=glow(dg,.0028)*1.3+glow(dg,.018)*.25;
  float scan=fract(t*.22);float sy=mix(-.16,.2,scan);gem*=1.+2.2*glow(g.y-sy,.012);
  col+=mix(jade,mint,.5)*gem*(1.+uWake*.6);
  col+=jade*exp(-dot(g,g)*40.)*.18*(1.+.25*sin(t*1.6));
  vec2 pl=(p-vec2(0.,-.115))*vec2(1.,5.2);col+=jade*(glow(length(pl)-.13,.006)*.8+exp(-dot(pl,pl)*30.)*.12);
  // Slow motes rising through the light.
  vec2 m=p*vec2(1.,1.)*14.+vec2(0.,-t*.35);vec2 mi=floor(m);float mh=hash(mi);
  vec2 mf=fract(m)-.5-vec2(sin(mh*40.+t*.4)*.3,cos(mh*17.)*.3);col+=mint*step(.93,mh)*glow(length(mf),.05)*.45;
  // The invitation.
  vec4 text=texture2D(uText,vec2(vUv.x,(vUv.y-.07)/.26));
  float inText=step(.07,vUv.y)*step(vUv.y,.33);
  float ink=text.a*inText*(1.-open);
  float kicker=step(.62,(vUv.y-.07)/.26);   // the small line above stays; the big line cycles
  col=mix(col,mix(vec3(.93,1.,.96),jade*1.05,kicker),ink*mix(uTextAlpha,.85,kicker));
  // Stepping in: the print burns open from the gem outwards into a vortex of green light.
  float r=length(p*vec2(1./uAspect,1.)*2.);
  float n=noise(p*7.+t*.3)*.62+noise(p*23.-t*.5)*.38;
  float burn=open*1.9-(r*.75+n*.55);
  float gone=smoothstep(0.,.05,burn);
  float ang=atan(p.y,p.x);float s2=ang+r*4.-t*(1.+open*3.);vec2 ring=vec2(cos(s2),sin(s2));
  float swirl=noise(ring*2.4+r*5.-t*.8)*.6+noise(ring*r*12.+t*.3)*.4;
  vec3 vortex=mix(vec3(.01,.16,.09),vec3(.22,.9,.52),swirl)*(.55+.75*exp(-r*r*2.5))+mint*exp(-r*r*9.)*(.35+open*.6);
  col=mix(col,vortex,gone);
  col+=vec3(.55,1.,.75)*exp(-abs(burn)*38.)*step(.001,open)*2.2;
  // The hall's print behaviour: dimming, the torch glare, the hairline edge, the drawing-in.
  float grey=dot(col,vec3(.2126,.7152,.0722));
  float dim=uDim*(1.-open);col=mix(col,vec3(grey),dim*.5)*(1.-dim*.55)*mix(uLight,1.,open);
  vec2 gl2=(vUv-uGlare.xy)*vec2(1.,.8);col+=vec3(.85,1.,.92)*(exp(-dot(gl2,gl2)*9.)*.045)*uGlare.z;
  vec2 px=fwidth(vUv);vec2 e=min(vUv,1.-vUv)/px;
  col+=jade*(1.-smoothstep(0.,1.8,min(e.x,e.y)))*(.35+open)*(1.-dim*.6);
  float nn=noise(vUv*vec2(5.,3.5)+uTime*.04)*.7+noise(vUv*26.)*.3;
  float front=vUv.x*.7+nn*.3,edge=uReveal*1.32-.16;
  float mask=smoothstep(front,front+.012,edge);
  float line=(1.-smoothstep(0.,.03,abs(edge-front-.006)))*(1.-step(.999,uReveal));
  col+=jade*line*1.5;
  gl_FragColor=vec4(col,max(max(mask,line),open));
  #include <colorspace_fragment>
}`;

/** Text and timing for the living painting; the hall owns the mesh and its other uniforms. */
export class LivingPainting {
  canvas = document.createElement('canvas');
  texture: THREE.CanvasTexture;
  private lines: string[] = [];
  private kicker = '';
  private line = -1;
  private at = -1e9;
  constructor() {
    this.canvas.width = 2048; this.canvas.height = 512;
    this.texture = new THREE.CanvasTexture(this.canvas); this.texture.colorSpace = THREE.SRGBColorSpace; this.texture.anisotropy = 8;
  }
  uniforms() {
    return { uText: { value: this.texture }, uTextAlpha: { value: 0 }, uOpen: { value: 0 }, uAspect: { value: 16 / 9 }, uWake: { value: 0 } };
  }
  setTexts(kicker: string, lines: string[]) { this.kicker = kicker; this.lines = lines; this.at = -1e9; }
  /** time in ms; returns the current line's opacity. */
  update(time: number) {
    const cycle = 3600;
    if (time - this.at >= cycle) { this.at = time; this.line = (this.line + 1) % Math.max(1, this.lines.length); this.draw(); }
    const ph = (time - this.at) / cycle;
    const s = (a: number, b: number, x: number) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
    return s(0, .12, ph) * (1 - s(.86, 1, ph));
  }
  private draw() {
    const ctx = this.canvas.getContext('2d'); if (!ctx) return;
    const line = this.lines[this.line] ?? '';
    ctx.clearRect(0, 0, 2048, 512); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const css = getComputedStyle(document.documentElement);
    const display = css.getPropertyValue('--font-display').trim() || 'sans-serif';
    const mono = css.getPropertyValue('--font-mono').trim() || 'monospace';
    ctx.font = `500 58px ${mono}`; (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '14px';
    ctx.fillText(this.kicker.toUpperCase(), 1024, 90);
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px';
    let size = 150; ctx.font = `500 ${size}px ${display}`;
    while (ctx.measureText(line).width > 1800 && size > 70) { size -= 6; ctx.font = `500 ${size}px ${display}`; }
    ctx.fillText(line, 1024, 330);
    this.texture.needsUpdate = true;
  }
  dispose() { this.texture.dispose(); }
}
