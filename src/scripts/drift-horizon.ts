/**
 * The black hole of the 404. Light paths are integrated per pixel around a
 * Schwarzschild hole (radius 1), so the far side of the disk rises over the
 * shadow and folds under it by itself. The accretion disk is a volume, not a
 * plane: turbulent gas in a thin slab, each ring orbiting at its own Keplerian
 * speed, so eddies shear into spiral filaments and visibly flow. The address the
 * visitor typed is written into that gas and falls in with it — sheared into a
 * streak by the same differential rotation, lensed over the top like everything
 * else — then the cycle begins again.
 */
export const HORIZON_FRAGMENT = /* glsl */`
precision highp float;
uniform vec2 uRes,uCenter,uTilt;
uniform float uTime,uDist,uFlash,uDetail,uTextFall,uTextAge,uTextAspect,uTextOn;
uniform int uSteps;
uniform sampler2D uText;

float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){
  float s=noise(p)*.55;p=p*2.07+vec3(1.7,9.2,3.1);s+=noise(p)*.28;
  if(uDetail>.5){p=p*2.03+vec3(4.1,.7,8.3);s+=noise(p)*.12;}
  return s;
}

// Sparse, cold stars. The frame is meant to be almost black.
vec3 sky(vec3 d){
  vec3 col=vec3(.0006,.0008,.0014);
  col+=vec3(.012,.016,.03)*smoothstep(.55,.95,fbm(d*2.4+3.))*.6;
  for(int k=0;k<2;k++){
    float sc=k==0?110.:260.;vec3 p=d*sc;vec3 c=floor(p);float h=hash(c+float(k)*19.);
    vec3 f=fract(p)-.5-(vec3(hash(c+3.1),hash(c+7.7),hash(c+1.3))-.5)*.6;
    float s=smoothstep(k==0?.988:.972,1.,h)*max(0.,1.-length(f)*(k==0?2.4:3.4));
    col+=mix(vec3(.55,.7,1.),vec3(1.,.78,.58),fract(h*13.))*s*s*(.7+.3*sin(uTime*(.8+h*2.)+h*40.))*(k==0?1.6:.55);
  }
  return col;
}

// Hot gas: ember at the rim, white-gold where it is about to cross.
vec3 heatColor(float t){
  vec3 c=mix(vec3(.42,.05,.012),vec3(1.,.42,.12),smoothstep(0.,.5,t));
  return mix(c,vec3(1.,.9,.76),smoothstep(.55,1.,t));
}

void main(){
  vec2 uv=(gl_FragCoord.xy/uRes-uCenter)*vec2(uRes.x/uRes.y,1.);
  vec3 ro=vec3(0.,0.,-uDist);vec3 rd=normalize(vec3(uv,1.6));
  float cx=cos(uTilt.x),sx=sin(uTilt.x),cr=cos(uTilt.y),sr=sin(uTilt.y);
  mat3 pitch=mat3(1.,0.,0.,0.,cx,sx,0.,-sx,cx);
  mat3 roll=mat3(cr,sr,0.,-sr,cr,0.,0.,0.,1.);
  ro=pitch*ro;rd=pitch*(roll*rd);
  vec3 pos=ro,dir=rd;vec3 h=cross(pos,dir);float h2=dot(h,h);
  vec4 acc=vec4(0.);bool hole=false,escaped=false;float ring=0.;
  // The falling address: where its band sits now, and how far it has been sheared.
  float rText=mix(7.2,2.4,uTextFall*uTextFall*(3.-2.*uTextFall));float span=2.35;float band=rText*span/uTextAspect;
  float textFade=smoothstep(0.,.07,uTextFall)*(1.-smoothstep(.8,1.,uTextFall));
  for(int i=0;i<360;i++){
    if(i>=uSteps)break;
    float r2=dot(pos,pos);float r=sqrt(r2);
    bool slab=abs(pos.y)<1.1&&r>2.1&&r<12.5;
    float dt=clamp(.045*r*max(r-1.,.25)+.012,.012,slab?.085:1.4);
    vec3 p=pos+dir*dt*.5;float pr=length(p);
    // The address is a thin sheet in the mid-plane: sampled once, where the ray crosses it.
    if(uTextOn>.5&&pos.y*(pos.y+dir.y*dt)<0.){
      vec3 hp=pos+dir*dt*(pos.y/(pos.y-(pos.y+dir.y*dt)));float hr=length(hp.xz);
      float at=atan(hp.z,hp.x)+uTextAge*2.6/(hr*sqrt(hr));float d=atan(sin(at+1.5708),cos(at+1.5708));
      vec2 tuv=vec2(d/span+.5,(hr-rText)/band+.5);
      if(tuv.x>0.&&tuv.x<1.&&tuv.y>0.&&tuv.y<1.){
        float glyph=texture2D(uText,vec2(tuv.x,1.-tuv.y)).a*textFade;
        vec3 vv=normalize(vec3(-hp.z,0.,hp.x));float dp=1.+.62*dot(vv,-normalize(dir));
        acc.rgb+=(1.-acc.a)*vec3(1.,.9,.78)*glyph*(1.4+2.6*uTextFall)*dp*dp;acc.a+=(1.-acc.a)*glyph*.5;
      }
    }
    if(slab){
      float H=.07+.03*pr;float vert=exp(-p.y*p.y/(H*H));
      if(vert>.004){
        float ang=atan(p.z,p.x);float omega=1./(pr*sqrt(pr));
        // Co-rotating coordinates: every ring turns at its own speed, so the gas winds up.
        float a=ang+uTime*omega*2.6;
        vec3 sp=vec3(cos(a)*pr,p.y*3.,sin(a)*pr);
        float n=fbm(sp*.62+vec3(0.,uTime*.06,0.));
        float n2=uDetail>.5?fbm(sp*1.9+vec3(7.,-uTime*.04,2.)):n;
        float lanes=.5+.5*sin(pr*9.+n*6.);
        float inner=smoothstep(2.2,2.8,pr),outer=1.-smoothstep(6.5,12.5,pr);
        float dens=vert*inner*outer*(.1+1.5*n*n+.55*n2*n2*lanes);
        float heat=clamp(1.-(pr-2.3)/8.,0.,1.);heat*=heat;
        vec3 v=normalize(vec3(-p.z,0.,p.x));float dop=1.+.62*dot(v,-normalize(dir));
        vec3 emi=heatColor(heat*(.65+.5*n))*(.05+2.2*heat*heat+.25*heat)*dop*dop;
        float stepA=1.-exp(-dens*dt*7.);
        acc.rgb+=(1.-acc.a)*emi*stepA;acc.a+=(1.-acc.a)*stepA*.9;
        if(acc.a>.985)break;
      }
    }
    ring+=dt*exp(-(r-1.5)*(r-1.5)*40.);
    dir+=-1.5*h2*pos/(r2*r2*r)*dt;pos+=dir*dt;
    if(r2<1.){hole=true;break;}
    if(r2>2500.){escaped=true;break;}
  }
  if(!hole&&!escaped&&acc.a<.97&&dot(pos,pos)<36.)hole=true;
  vec3 col=acc.rgb;
  if(!hole)col+=(1.-acc.a)*(sky(normalize(dir))+vec3(1.,.72,.48)*min(ring,1.5)*.08);
  col+=vec3(.6,.72,.85)*uFlash;
  gl_FragColor=vec4(col,1.);
}`;
