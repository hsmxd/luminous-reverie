import type {GestureFrame} from '../gestures/recognizer'
export type StudioAction='scatter'|'reform'

// 创作命令需要稳定保持一次。手离开或变为双手时放弃此次计时。
export class StudioGesture {
  private pose:StudioAction|null=null
  private since=0
  private last=-Infinity
  private fired=false
  reset(){this.pose=null;this.fired=false;this.last=-Infinity}
  update(frame:GestureFrame,time:number):StudioAction|null{
    if(time-this.last>260)this.reset()
    this.last=time
    const pose=frame.hands!==1?null:frame.name==='手掌引导'?'scatter':frame.name==='握拳蓄能'?'reform':null
    if(pose!==this.pose){this.pose=pose;this.since=time;this.fired=false}
    if(!pose||this.fired||time-this.since<360)return null
    this.fired=true
    return pose
  }
}