import {clamp} from '../config.ts'
import {neutral,type GestureFrame,type GestureName,type Motion} from '../gestures/recognizer.ts'

type HandSample={x:number;y:number;at:number;name:GestureName;vx:number;vy:number;predict:boolean}
export class InteractionManager {
  private mouse=neutral()
  private hand=neutral()
  private handAt=-Infinity
  private dragging=false
  private sample:HandSample|null=null
  private prevMouse=0
  readonly current=neutral()
  burstAge=20; rippleAge=20
  rippleX=.5;rippleY=.5
  lastSource='mouse'
  accept(frame:GestureFrame,now:number,sampledAt=now){
    this.hand=frame.motion
    this.dragging=frame.name==='指尖聚集'
    this.handAt=frame.hands?now:-Infinity
    const previous=this.sample
    this.sample=null
    if(frame.anchor){
      const x=clamp(frame.anchor.x,0,1),y=clamp(frame.anchor.y,0,1)
      const elapsed=previous?(sampledAt-previous.at)/1000:0
      let vx=0,vy=0,predict=false
      if(previous?.name===frame.name&&elapsed>=.012&&elapsed<=.12){
        vx=(x-previous.x)/elapsed;vy=(y-previous.y)/elapsed
        // Extrapolate only after consecutive samples agree about the direction.
        const speed=Math.hypot(vx,vy),lastSpeed=Math.hypot(previous.vx,previous.vy)
        predict=speed>.24&&lastSpeed>.24&&vx*previous.vx+vy*previous.vy>speed*lastSpeed*.7
      }
      this.sample={x,y,at:sampledAt,name:frame.name,vx,vy,predict}
    }
    if(frame.event==='burst')this.burstAge=0
    if(frame.event==='ripple')this.ripple(frame.motion.x,frame.motion.y)
  }
  pointer(x:number,y:number,pressed:boolean,now:number){
    const dt=Math.max(.012,(now-this.prevMouse)/1000)
    this.mouse.vx=this.mouse.field?Math.max(-2,Math.min(2,(x-this.mouse.x)/dt)):0
    this.mouse.vy=this.mouse.field?Math.max(-2,Math.min(2,(y-this.mouse.y)/dt)):0
    this.prevMouse=now;this.mouse.x=x;this.mouse.y=y;this.mouse.field=1;this.mouse.gather=pressed?1:0
  }
  release(){this.mouse.gather=0}
  leave(){this.mouse.field=0;this.mouse.gather=0;this.mouse.vx=this.mouse.vy=0}
  reset(){this.leave();this.clearHand();this.burstAge=this.rippleAge=20}
  clearHand(){this.handAt=-Infinity;this.hand=neutral();this.dragging=false;this.sample=null}
  ripple(x:number,y:number){this.rippleX=x;this.rippleY=y;this.rippleAge=0}
  update(dt:number,now:number){
    const hasHand=now-this.handAt<330, src=hasHand?this.hand:this.mouse
    this.lastSource=hasHand?'hand':'mouse'
    const k=1-Math.exp(-dt*(hasHand&&this.dragging?22:6.6))
    if(!hasHand){this.mouse.vx*=Math.exp(-dt*8);this.mouse.vy*=Math.exp(-dt*8)}
    const sample=hasHand?this.sample:null
    let x=src.x,y=src.y,positionK=k
    if(sample){
      const age=(now-sample.at)/1000
      const seconds=sample.predict?clamp(age,0,.038)*clamp((.1-age)/.04,0,1):0
      const lead=Math.min(seconds,.035/Math.max(.001,Math.hypot(sample.vx,sample.vy)))
      x=clamp(sample.x+sample.vx*lead,0,1);y=clamp(sample.y+sample.vy*lead,0,1)
      const distance=Math.hypot(x-this.current.x,y-this.current.y)
      const rate=8+48*clamp((distance-.006)/.055,0,1)
      positionK=1-Math.exp(-dt*rate)
    }
    this.current.x+=(x-this.current.x)*positionK
    this.current.y+=(y-this.current.y)*positionK
    for(const key of Object.keys(src) as (keyof Motion)[]){
      if(key!=='x'&&key!=='y')this.current[key]+=(src[key]-this.current[key])*k
    }
    this.burstAge+=dt;this.rippleAge+=dt
  }
}
