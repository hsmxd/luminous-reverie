// All forms share the same stable particle indices. Each prefix samples the entire sculpture.
export type Shape = {xyz:Float32Array; tint:Float32Array}
const tau = Math.PI*2
function generator(seed:number) {
  return () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
}
function flowerHead(rand:()=>number) {
  // Fibonacci distribution orients seed parachutes around a spherical receptacle.
  const filaments=166
  const axes=Array.from({length:filaments},(_,i)=>{
    const y=1-2*(i+.5)/filaments, h=Math.sqrt(1-y*y), a=i*2.399963+0.23
    return {x:h*Math.cos(a),y,z:h*Math.sin(a),a,r:1.40+rand()*.31,b:rand()*tau}
  })
  const detached=Array.from({length:11},(_,i)=>{
    const a=i*2.39996, r=1.95+rand()*.8
    return {x:Math.cos(a)*r+(i%3===0?.42:0),y:Math.sin(a)*r*.76+.64,z:rand()-.5,a:a+.65}
  })
  return {axes,detached,filaments}
}
// Hairline supports trace the actual rachis and individual parachute bristles.
export function dandelionThreads(){
  const {axes,detached}=flowerHead(generator(0x3c20a))
  const xyz:number[]=[], tint:number[]=[],seeds:number[]=[]
  type Vec=[number,number,number]
  const segment=(a:Vec,b:Vec,p:number,brightness:number,seed:number)=>{
    xyz.push(...a,...b);tint.push(p,brightness,0,p,brightness,0);seeds.push(seed,seed)
  }
  for(const [i,{x,y,z,r,a,b}] of axes.entries()){
    const palette=Math.min(.99,Math.max(.01,.54+y*.25-x*.27+Math.sin(b)*.12)),seed=(i*.618)%1
    const spine=(t:number):Vec=>[x*r*t-.09*Math.sin(t*Math.PI)*Math.cos(b),.56+y*r*t-.061*Math.sin(t*Math.PI),z*r*t]
    for(let j=1;j<=6;j++)segment(spine((j-1)/6),spine(j/6),palette,.095+.075*(z+1)/2,seed)
    const base=spine(.97)
    for(let j=0;j<19;j++){
      const angle=b+j*tau/19,len=.14+.17*(.5+.5*Math.sin(angle*12.3+b))
      const bristle=(t:number):Vec=>{
        const s=len*t,f=(.43+.60*t)*s
        return [base[0]+s*(-Math.sin(a)*Math.cos(angle)-y*Math.cos(a)*Math.sin(angle))+x*f,
                base[1]+s*Math.sqrt(1-y*y)*Math.sin(angle)+y*f,
                base[2]+s*(Math.cos(a)*Math.cos(angle)-y*Math.sin(a)*Math.sin(angle))+z*f]
      }
      segment(base,bristle(.55),palette,.24,seed);segment(bristle(.55),bristle(1),palette,.16,seed)
    }
  }
  for(const s of detached){
    const base:Vec=[s.x,s.y,s.z]
    segment(base,[s.x-.34*Math.cos(s.a),s.y-.34*Math.sin(s.a),s.z],.83,.48,.35)
    for(let j=0;j<11;j++){
      const a=s.a+j*.135-.68;segment(base,[s.x+.15*Math.cos(a),s.y+.15*Math.sin(a),s.z+.04],.78,.31,.35)
    }
  }
  return {xyz:new Float32Array(xyz),tint:new Float32Array(tint),seeds:new Float32Array(seeds)}
}
export function createForms(count:number): Shape[] {
  const out=Array.from({length:4},()=>({xyz:new Float32Array(count*3),tint:new Float32Array(count*3)}))
  const rand=generator(0x3c20a),{axes,detached,filaments}=flowerHead(rand)
  const set=(f:number,i:number,x:number,y:number,z:number,p:number,value:number,accent:number)=>{
    out[f].xyz.set([x,y,z],i*3);out[f].tint.set([p,value,accent],i*3)
  }
  for(let i=0;i<count;i++){
    const u=rand(),v=rand(),w=rand(),q=rand(),s=rand(), pick=rand()
    let x=0,y=0,z=0,p=0,light=1,accent=0
    const strand=axes[Math.floor(rand()*filaments)]
    const {x:dx,y:dy,z:dz,r,a,b}=strand
    const ray=pick<.32, canopy=pick>=.32&&pick<.86
    if(ray || canopy){
      const t=ray?u:.97, spine=r*t
      x=dx*spine-.09*Math.sin(t*Math.PI)*Math.cos(b);y=dy*spine+.56-.061*Math.sin(t*Math.PI);z=dz*spine
      if(canopy){
        const angle=b+Math.floor(v*19)*tau/19
        const len=(.14+.17*(.5+.5*Math.sin(angle*12.3+b)))*u
        const forward=.43*len+.60*u*len
        const tx=-Math.sin(a),tz=Math.cos(a)
        x+=len*(tx*Math.cos(angle)-dy*Math.cos(a)*Math.sin(angle))+dx*forward
        y+=len*(Math.sqrt(1-dy*dy)*Math.sin(angle))+dy*forward
        z+=len*(tz*Math.cos(angle)-dy*Math.sin(a)*Math.sin(angle))+dz*forward
        light=.66+w*.5;accent=u>.935&&w>.58?1:0
      }else light=.40+.50*w
      p=Math.min(.99,Math.max(.01,.54+dy*.25-dx*.27+Math.sin(b)*.12))
      if(t<.18){p=.92;light*=.74}
    }else if(pick<.931){
      const t=u, radius=(.021+.024*t)*Math.sqrt(v),angle=w*tau
      x=-.98*t*t-.21*t+radius*Math.cos(angle);y=.55-3.41*t;z=.12*Math.sin(t*3)+radius*Math.sin(angle)
      p=.70+.19*s;light=.34+.45*q
    }else if(pick<.965){
      const rr=.245*Math.cbrt(u)
      x=dx*rr;y=dy*rr+.56;z=dz*rr;p=.80+.17*w;light=.76+.28*q
    }else{
      const seed=detached[Math.floor(rand()*detached.length)], angle=seed.a+Math.floor(w*11)*.135-.68
      const len=pick<.974?-.34*u:.15*u
      x=seed.x+len*Math.cos(len<0?seed.a:angle);y=seed.y+len*Math.sin(len<0?seed.a:angle)
      z=seed.z+.07*q*u;p=.60+.26*v;light=.47+.35*v;accent=u>.95?.7:0
    }
    set(0,i,x+(rand()-.5)*.007,y+(rand()-.5)*.007,z,p,light,accent)

    // Butterfly wings use closed polar outlines, branching radial veins and nested eye spots.
    const side=s>.5?1:-1
    if(pick<.055){
      const t=u; x=(v-.5)*.135*Math.sin(Math.PI*t);y=-.86+1.95*t;z=.15+.07*Math.sin(t*3);p=.9;light=.9
    }else if(pick<.073){
      x=side*(.015+.47*u*u);y=.95+.59*u;z=.17+.10*u;p=.87;light=.8
    }else{
      const top=v<.59
      const t=(pick<.32?Math.floor(w*27)/27:w)*tau
      const edge=pick<.20? .984+.016*q :pick<.40?u:pick<.53?.76+.012*u:Math.sqrt(u)
      const cx=top?1.08:.79,cy=top?.68:-.53,rx=top?1.14:.82,ry=top?.71:.73
      const xx=Math.cos(t)*rx, yy=Math.sin(t)*ry
      const xx2=xx*(top?1:.93)-yy*(top?.14:-.20)
      const yy2=yy+xx*(top?.78:-.52)
      x=side*(cx+xx2*edge);y=cy+yy2*edge;z=.15+.34*edge*Math.sin(t+.8)+.21*Math.sin(Math.abs(x)*1.7)
      p=top?.18+.58*(1-edge)+.12*(.5+.5*Math.cos(3*t)):.53+.39*edge
      light=pick<.38?.85: .44+.45*w;accent=pick<.18&&q>.90?1:0
    }
    set(1,i,x,y,z,p,light,accent)
    // Four staggered whorls; dipping the midrib reveals the curvature of each petal.
    const layer=Math.floor(v*4), n=9-layer, petal=Math.floor(w*n)
    const t=u, edge=pick<.19?(q>.5?1:-1):(q-.5)*2
    const ang=petal*tau/n+layer*.44+.11*t
    const length=2.20-layer*.34
    const radius=.05+length*t, width=Math.pow(Math.sin(Math.PI*t),.72)*(.53-.044*layer)*edge
    const xx=radius*Math.cos(ang)-width*Math.sin(ang), yy=radius*Math.sin(ang)+width*Math.cos(ang)
    const zz=.06+layer*.19+.34*Math.sin(t*Math.PI)-.31*t+.22*edge*edge+.13*t*t
    x=xx;y=yy*.79+zz*.45;z=zz-yy*.36;p=.24+.43*(1-t)+.18*layer/3+.13*Math.abs(edge);light=pick<.24?.92:.48+.45*s;accent=t>.95&&s>.8?.7:0
    if(pick>.94){x=dx*.33*u;y=dy*.29*u+.20;z=.55+dz*.18;p=.93;light=1.12;accent=w>.9?1:0}
    set(2,i,x,y,z,p,light,accent)
    if(pick<.61){
      // Difference of two circles parameterized by horizontal scanlines, tapering to both horns.
      const yy=(u*2-1)*1.57, ang=Math.asin(yy/1.57)
      const outer=-Math.sqrt(Math.max(0,1.60*1.60-yy*yy)), inner=.52-Math.sqrt(Math.max(0,1.60*1.60-yy*yy))
      const k=Math.cos(ang)**2, fill=pick<.10?(v>.5?1:0):v
      x=outer+.50+(inner-outer)*k*fill;y=yy;z=(w-.5)*.32*k; p=.75+.22*q;light=.51+.52*s
      const rot=-.38, ox=x;x=ox*Math.cos(rot)-y*Math.sin(rot);y=ox*Math.sin(rot)+y*Math.cos(rot)
      accent=pick<.05&&w>.7?1:0
    }else{
      const band=Math.floor(v*3),theta=u*tau,rad=1.78+band*.27+(q-.5)*.033
      const xr=rad*Math.cos(theta),yr=rad*Math.sin(theta),tilt=.20+band*.13, rotation=-.29+band*.28
      x=xr*Math.cos(rotation)-yr*tilt*Math.sin(rotation);y=xr*Math.sin(rotation)+yr*tilt*Math.cos(rotation)
      z=yr*.80;p=.12+band*.29;light=.6+.40*s;accent=w>.96?1:0
    }
    set(3,i,x,y,z,p,light,accent)
  }
  return out
}
