export const vertex = `
attribute vec3 a1,a2,a3,c0,c1,c2,c3;
#ifdef ARTWORK
attribute vec3 artP0,artP1,artC0,artC1;
uniform float artWeight,artBlend,artSpread,artSpacing;
#endif
attribute float seed;
uniform vec4 weights;
uniform float time,pointScale,power,burst,ripple,field,gather,scale,tilt,turn;
uniform vec2 origin,hand,velocity,wave;
varying vec3 ink;
varying float alpha,glint;
mat2 rot(float a){return mat2(cos(a),sin(a),-sin(a),cos(a));}
vec3 dye(float t){
  vec3 ice=vec3(.42,.74,1.), lilac=vec3(.70,.63,.99), rose=vec3(.97,.74,.88), gold=vec3(1.,.88,.66);
  return mix(mix(ice,lilac,smoothstep(.03,.45,t)),mix(rose,gold,smoothstep(.65,.95,t)),smoothstep(.39,.69,t));
}
void main(){
  vec3 d=position,b=a1,f=a2,m=a3;
  float phase=time*.44;
  d.x+=.045*sin(phase+d.y*1.6)*smoothstep(-2.8,1.,d.y);
  d.xz=rot(.12*sin(phase*.33))*d.xz;
  float wing=.20+.28*sin(time*1.9+abs(b.x)*.28);
  b.z+=abs(b.x)*sin(wing);b.x*=cos(wing);
  f.xy*=1.+.034*sin(time*.79);f.z+=.10*sin(time*.79+length(f.xy));
  // Each ring has a fixed palette index and a distinct angular speed.
  if(c3.x<.73){float speed=.25+c3.x*.65; m.xz=rot(time*speed*.23)*m.xz;m.y+=.07*sin(time*speed+atan(m.z,m.x));}
  vec3 p=d*weights.x+b*weights.y+f*weights.z+m*weights.w;
  vec3 col=c0*weights.x+c1*weights.y+c2*weights.z+c3*weights.w;
  p+=.012*vec3(sin(time*.7+p.y*3.+seed*6.),cos(time*.57+p.x*3.+seed*6.),sin(time*.46+seed*7.));
  #ifdef ARTWORK
  vec3 rest=mix(artP0,artP1,artBlend);
  float a=seed*452.4,z=fract(seed*593.2)*2.-1.;
  float radius=1.05+1.4*sqrt(fract(seed*953.67));
  vec3 dust=vec3(cos(a)*sqrt(1.-z*z)*1.28,z*.85,sin(a)*sqrt(1.-z*z))*radius;
  dust.xz=rot(time*(.10+fract(seed*61.)*.15))*dust.xz;
  vec3 sculpture=mix(rest,dust,artSpread);
  sculpture.xy=rot(sin(artSpread*3.14159)*(.7+seed*1.7))*sculpture.xy;
  sculpture.z+=sin(artSpread*3.14159)*sin(seed*77.)*.75;
  p=mix(p,sculpture,artWeight);
  #endif
  p.xz=rot(.08*sin(time*.14)+tilt*.85)*p.xz;p.xy=rot(turn)*p.xy;
  p*=scale;p.xy+=origin;
  vec2 delta=p.xy-hand;float dist=length(delta),fall=exp(-dist*dist*.71)*field*power;
  p.xy+=fall*(normalize(delta+vec2(.0001))*.33+vec2(-delta.y,delta.x)*.58+velocity*.16)*(1.-gather);
  float angle=seed*467.19,zz=fract(seed*731.)*2.-1.,rr=.44*pow(fract(seed*143.15),.3333);
  vec3 sphere=vec3(cos(angle)*sqrt(1.-zz*zz),sin(angle)*sqrt(1.-zz*zz),zz)*rr;
  vec3 radial=normalize(p-vec3(hand,-.1)+.01);
  p+=radial*(1.-exp(-burst*11.))*exp(-burst*1.32)*2.75*(.5+seed)*power;
  float rd=length(p.xy-wave);
  float rippleBand=exp(-pow((rd-ripple*3.1)*5.2,2.))*exp(-ripple*1.3);
  p.xy+=normalize(p.xy-wave+.0001)*rippleBand*.30*power;
  p=mix(p,vec3(hand,0.)+sphere,clamp(gather,0.,1.));
  vec4 mv=modelViewMatrix*vec4(p,1.);
  gl_Position=projectionMatrix*mv;
  float spark=step(.974,seed)*smoothstep(.36,.92,col.y);
  glint=max(col.z,spark)*(.72+.28*sin(time*1.25+seed*23.));
  float sz=(1.50+1.68*seed+glint*5.6)*pointScale*12./(-mv.z);
  gl_PointSize=clamp(sz,1.,28.);
  ink=dye(col.x)+vec3(.20,.15,.13)*(gather+rippleBand);
  alpha=col.y*(.78+.27*seed)*(.76+.24*power);
  #ifdef ARTWORK
  float sparkArt=step(.984,seed)*(.68+.32*sin(time*1.65+seed*200.));
  float spacing=artSpacing*12./(-mv.z);
  float artSize=clamp(spacing*(1.78+.78*seed)+sparkArt*2.4*pointScale,1.05,7.4*pointScale);
  gl_PointSize=mix(gl_PointSize,artSize,artWeight);
  glint=mix(glint,sparkArt,artWeight);
  ink=mix(ink,mix(artC0,artC1,artBlend)+.10*rippleBand+vec3(.06,.05,.08)*sparkArt,artWeight);
  alpha=mix(alpha,clamp(spacing*spacing*1.52,.11,.94)*(.76+.24*seed)*(.88+.12*power),artWeight);
  #endif
  alpha*=mix(1.,.19+.19*seed,smoothstep(.86,1.,gather));
}`

export const fragment = `
varying vec3 ink;varying float alpha,glint;
void main(){
 vec2 uv=gl_PointCoord-.5;float r=length(uv)*2.;
 if(r>1.)discard;
 float dotLight=exp(-5.4*r*r);
 float core=glint*(exp(-24.*abs(uv.x))*exp(-5.*abs(uv.y))+exp(-24.*abs(uv.y))*exp(-5.*abs(uv.x)))*.38;
 gl_FragColor=vec4(ink,clamp((dotLight+core)*alpha,0.,1.));
}`

export const starVertex=`
attribute float seed;uniform float time,pointScale;varying float vSeed;
void main(){vSeed=seed;vec3 p=position;p.x+=.14*sin(time*.085+seed*24.);p.y+=.07*cos(time*.10+p.x);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
gl_PointSize=(seed>.982?7.+4.*seed:1.3+1.95*seed)*pointScale;}`

export const starFrag=`
varying float vSeed;void main(){vec2 p=gl_PointCoord-.5;float r=length(p)*2.;if(r>1.)discard;
float a=exp(-6.*r*r)*(.34+.58*vSeed);
if(vSeed>.982)a=.22*exp(-7.*r*r)+.68*(exp(-43.*abs(p.x))*exp(-7.*abs(p.y))+exp(-43.*abs(p.y))*exp(-7.*abs(p.x)));
gl_FragColor=vec4(mix(vec3(.45,.52,.78),vec3(.99,.91,.78),fract(vSeed*37.)),a);}`

export const trailVertex=`
attribute float born,seed;uniform float time,pointScale;varying float fade;
void main(){float age=max(0.,time-born);vec3 p=position;p.x+=sin(seed*63.+age*1.3)*age*.17;p.y+=age*(.09+.13*seed);p.z+=age*.09;
fade=exp(-age*2.8)*step(age,2.);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(2.4+5.*seed)*pointScale*fade;}`

export const trailFrag=`varying float fade;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(.85,.82,1.,fade*exp(-5.*r*r)*.58);}`

export const postVert=`varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}`

/**
 * 双层柔光后处理：内层保留粒子星点锐度，外层扩散细腻星尘晕光，并辅以极柔和边缘暗角。
 */
export const postFrag=`uniform sampler2D frame;uniform vec2 pixel;varying vec2 uv0;
vec3 bright(vec2 offset){return max(texture2D(frame,uv0+offset*pixel).rgb-.24,0.);}
void main(){
  vec3 c=texture2D(frame,uv0).rgb;
  vec3 inner=bright(vec2(2.,0.))+bright(vec2(-2.,0.))+bright(vec2(0.,2.))+bright(vec2(0.,-2.));
  vec3 outer=bright(vec2(4.5,4.5))+bright(vec2(-4.5,4.5))+bright(vec2(4.5,-4.5))+bright(vec2(-4.5,-4.5));
  vec3 wide=bright(vec2(8.,0.))+bright(vec2(-8.,0.))+bright(vec2(0.,8.))+bright(vec2(0.,-8.));
  vec3 bloom=.072*inner+.048*outer+.026*wide;
  vec2 centered=uv0-.5;
  float vignette=1.-dot(centered,centered)*.34;
  gl_FragColor=vec4((c+bloom)*vignette,1.);
}`
