export type Landmark={x:number;y:number;z:number}
export type Hand={points:Landmark[];score:number}
export const isTrackedHand=(hand:Hand)=>hand.score>=.50&&hand.points.length===21
export type Motion={x:number;y:number;vx:number;vy:number;field:number;gather:number;scale:number;dx:number;dy:number;tilt:number;rotation:number}
export const neutral=():Motion=>({x:.5,y:.5,vx:0,vy:0,field:0,gather:0,scale:1,dx:0,dy:0,tilt:0,rotation:0})
export type GestureName='等待手势'|'手掌引导'|'指尖聚集'|'握拳蓄能'|'双手塑形'|'指尖拨动'
export type GestureFrame={motion:Motion;name:GestureName;hands:number;anchor?:{x:number;y:number};event?:'burst'|'ripple'|'next'|'prev'}
const bound=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n))
type Palm={x:number;y:number;points:Landmark[]}
export class GestureRecognizer {
  private palms:Palm[]=[]
  private lastSeen=-Infinity
  private pinchMotion:Motion|null=null
  private count=0
  private wait=0
  private prevTime=-1
  private state:GestureName='等待手势'
  private candidate:GestureName='等待手势'
  private since=0
  private fistAt=-Infinity
  private swipeArmed=true
  private quietSince=0
  private cooldown=0
  private trail:{x:number;y:number;t:number}[]=[]
  private hold:{x:number;y:number;t:number;fired:boolean}|null=null
  private dual:{distance:number;angle:number;x:number;y:number}|null=null
  reset(){
    this.palms=[];this.lastSeen=-Infinity;this.pinchMotion=null;this.count=0;this.wait=0;this.prevTime=-1;this.state=this.candidate='等待手势';this.fistAt=-Infinity
    this.swipeArmed=true;this.quietSince=0;this.cooldown=0;this.trail=[];this.hold=null;this.dual=null
  }
  update(hands:Hand[],now:number,sensitivity=1,aspect=4/3,studio=false):GestureFrame{
    if(this.prevTime>=0&&now-this.prevTime>500)this.reset()
    const dt=this.prevTime<0?.05:bound((now-this.prevTime)/1000,.01,.18);this.prevTime=now
    const valid=hands.filter(isTrackedHand).slice(0,2)
    // Keep the last grip position during a brief tracking gap caused by motion blur.
    if(!valid.length&&this.pinchMotion&&now-this.lastSeen<=200)return {motion:this.pinchMotion,name:'指尖聚集',hands:1}
    if(!valid.length&&this.count===1&&now-this.lastSeen<=145)return {motion:neutral(),name:'等待手势',hands:0}
    if(valid.length)this.lastSeen=now
    if(valid.length!==this.count){
      this.count=valid.length;this.swipeArmed=true;this.quietSince=0;this.wait=now+80;this.fistAt=-Infinity;this.trail=[];this.hold=null;this.dual=null
      this.palms=[];this.pinchMotion=null;this.state=this.candidate='等待手势'
    }
    if(!valid.length||now<this.wait)return {motion:neutral(),name:'等待手势',hands:0}
    const center=(pts:Landmark[])=>{
      let x=0,y=0;for(const i of [0,5,9,13,17]){x+=pts[i].x;y+=pts[i].y}
      return {x:x/5,y:y/5}
    }
    let ordered=valid
    if(valid.length===2){
      const [a,b]=valid.map(h=>center(h.points))
      const old=this.palms,dist=(p:{x:number;y:number},q:Palm)=>Math.hypot(1-p.x-q.x,p.y-q.y)
      const swap=old.length===2?dist(a,old[1])+dist(b,old[0])<dist(a,old[0])+dist(b,old[1]):a.x<b.x
      if(swap)ordered=[valid[1],valid[0]]
    }
    const k=1-Math.exp(-dt*(13+4*sensitivity))
    const palms=ordered.map((h,idx)=>{
      const old=this.palms[idx]
      const points=h.points.map((pt,i)=>{
        const q=old?.points[i];return q?{x:q.x+(pt.x-q.x)*k,y:q.y+(pt.y-q.y)*k,z:q.z+(pt.z-q.z)*k}:pt
      })
      const c=center(points)
      return {points,x:old?old.x+(1-c.x-old.x)*.78:1-c.x,y:old?old.y+(c.y-old.y)*.78:c.y}
    })
    const old=this.palms[0];this.palms=palms
    const a=palms[0], m=neutral();m.x=a.x;m.y=a.y
    if(palms.length===2){
      const b=palms[1],x=(a.x+b.x)/2,y=(a.y+b.y)/2
      const d=Math.max(.09,Math.hypot((b.x-a.x)*aspect,b.y-a.y)),angle=Math.atan2(a.y-b.y,(b.x-a.x)*aspect)
      const base=this.dual??={distance:d,angle,x,y}
      base.distance=Math.max(.13,base.distance)
      m.scale=bound(1+(d/base.distance-1)*sensitivity,.45,2.25);m.dx=(x-base.x)*sensitivity;m.dy=(y-base.y)*sensitivity
      const turn=Math.atan2(Math.sin(angle-base.angle),Math.cos(angle-base.angle))
      m.rotation=bound(turn,-2.3,2.3);m.tilt=bound((a.y-b.y)*2.7,-1.1,1.1)
      this.state='双手塑形'
      return {motion:m,name:this.state,hands:2}
    }
    const pts=a.points
    const dist=(i:number,j:number)=>Math.hypot((pts[i].x-pts[j].x)*aspect,pts[i].y-pts[j].y)
    const size=Math.max(.025,dist(5,17),dist(0,9)*.85)
    let extended=0,indexUp=false
    for(const tip of [8,12,16,20]){
      const base=pts[tip-3],joint=pts[tip-2],end=pts[tip]
      const ax=(joint.x-base.x)*aspect,ay=joint.y-base.y,az=(joint.z-base.z)*aspect
      const bx=(end.x-joint.x)*aspect,by=end.y-joint.y,bz=(end.z-joint.z)*aspect
      const straight=(ax*bx+ay*by+az*bz)/Math.max(.000001,Math.hypot(ax,ay,az)*Math.hypot(bx,by,bz))
      if(dist(0,tip)>dist(0,tip-2)*1.13||straight>.66){extended++;if(tip===8)indexUp=true}
    }
    const tipGap=dist(4,8),depthGap=(pts[4].z-pts[8].z)*aspect
    const pinch=Math.hypot(tipGap,depthGap)/size
    const gripGap=Math.hypot(tipGap,depthGap*.5)/size
    // A fist can have nearby fingertips too. Require the index to reach away from
    // its knuckle on entry, then allow a wider gap until the grip is released.
    const gripping=this.pinchMotion
      ?gripGap<.58
      :gripGap<.36&&(dist(5,8)>size*.34||extended>=2)
    let raw:GestureName='等待手势'
    if(gripping)raw='指尖聚集'
    else if(studio&&indexUp&&extended===1&&pinch>.37)raw='指尖拨动'
    else if((studio&&extended===0)||(extended<=1&&!indexUp&&pinch>.24))raw='握拳蓄能'
    else if(extended>=3)raw='手掌引导'
    if(raw!==this.candidate){this.candidate=raw;this.since=now}
    let event:GestureFrame['event']
    if(raw!==this.state && now-this.since>=72){
      this.state=raw
      if(!studio&&raw==='手掌引导'&&now-this.fistAt<850&&now>=this.cooldown){event='burst';this.cooldown=now+850}
    }
    if(this.state==='握拳蓄能')this.fistAt=now
    m.field=this.state==='等待手势'?0:1
    m.gather=this.state==='握拳蓄能'?.82:0
    m.vx=old?bound((a.x-old.x)/dt,-3,3):0;m.vy=old?bound((a.y-old.y)/dt,-3,3):0
    if(this.state==='指尖聚集'){
      const measured=ordered[0].points
      m.x=1-(measured[4].x+measured[8].x)*.5
      m.y=(measured[4].y+measured[8].y)*.5
      m.gather=1
      this.pinchMotion=m;this.fistAt=-Infinity;this.trail=[];this.hold=null
      return {motion:m,name:this.state,hands:1,anchor:{x:m.x,y:m.y}}
    }
    this.pinchMotion=null
    if(studio){
      if(this.state==='指尖拨动'){
        const tip=ordered[0].points[8]
        m.x=1-tip.x;m.y=tip.y
        return {motion:m,name:this.state,hands:1,anchor:{x:m.x,y:m.y}}
      }
      if(this.state==='手掌引导'||this.state==='握拳蓄能'){m.field=0;m.gather=0}
      return {motion:m,name:this.state,hands:1}
    }
    // A fast lateral translation is recognized independently of finger posture.
    // Stationary finger gestures and slower pointer-like movements keep their own effects.
    const measured=center(ordered[0].points)
    const swipe=()=>{
      const sample={x:(1-measured.x)*.72+a.x*.28,y:measured.y*.72+a.y*.28,t:now}
      const previous=this.trail.at(-1)
      if(!this.swipeArmed&&previous){
        const speed=Math.hypot(sample.x-previous.x,sample.y-previous.y)*1000/Math.max(1,now-previous.t)
        if(speed>.18)this.quietSince=0
        else if(!this.quietSince)this.quietSince=now
        else if(now-this.quietSince>=120)this.swipeArmed=true
      }
      this.trail.push(sample)
      while(this.trail.length&&now-this.trail[0].t>340)this.trail.shift()
      if(!this.swipeArmed||event||now<this.cooldown)return
      const travel=bound(size/aspect*.71,.065,.088)/sensitivity
      const speed=Math.max(.32/sensitivity,travel*3.85)
      const flickSpeed=.39/sensitivity
      const start=this.trail.find((p,i)=>{
        const dt=(now-p.t)/1000,dx=Math.abs(sample.x-p.x),dy=Math.abs(sample.y-p.y)
        if(dt<.085||dt>.31||dx<travel||dx/dt<speed||dx<1.65*dy||this.trail.length-i<3)return false
        let path=0,peak=0
        for(let j=i+1;j<this.trail.length;j++){
          const prev=this.trail[j-1],cur=this.trail[j],step=Math.abs(cur.x-prev.x)
          path+=step
          if(j>=i+2){const a=this.trail[j-2];peak=Math.max(peak,Math.abs(cur.x-a.x)*1000/Math.max(1,cur.t-a.t))}
        }
        return dx>=.86*path&&peak>=flickSpeed
      })
      if(start){
        const dx=sample.x-start.x
        event=dx>0?'next':'prev';this.swipeArmed=false;this.quietSince=0;this.cooldown=now+1050;this.trail=[]
      }
    }
    if(raw==='指尖聚集')this.trail=[]
    else swipe()
    if(this.state==='手掌引导'){
      if(!this.hold||Math.hypot(a.x-this.hold.x,a.y-this.hold.y)>.035)this.hold={x:a.x,y:a.y,t:now,fired:false}
      if(!event&&!this.hold.fired&&now-this.hold.t>740&&now>=this.cooldown){
        event='ripple';this.hold.fired=true;this.cooldown=now+580
      }
    }else this.hold=null
    const anchor=m.field?{x:1-measured.x,y:measured.y}:undefined
    return {motion:m,name:this.state,hands:1,event,anchor}
  }
}
