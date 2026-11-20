import type {GestureFrame} from '../gestures/recognizer'
export type StudioAction='scatter'|'reform'
export type StudioHoldState={action:StudioAction|null;progress:number}

const HOLD_MS=360

/**
 * 创作模式手势保持识别器：
 * 需稳定保持约 0.36 秒触发一次打散或重组；手离开或切换为双手时重置计时。
 */
export class StudioGesture {
  private pose:StudioAction|null=null
  private since=0
  private last=-Infinity
  private fired=false
  private charge=0

  /** 当前手势蓄能进度（0~1），用于界面实时呈现微光环反馈 */
  get state():StudioHoldState{
    return {action:this.fired?null:this.pose,progress:this.fired?0:this.charge}
  }

  reset(){this.pose=null;this.fired=false;this.last=-Infinity;this.charge=0}

  update(frame:GestureFrame,time:number):StudioAction|null{
    if(time-this.last>260)this.reset()
    this.last=time
    const pose=frame.hands!==1?null:frame.name==='手掌引导'?'scatter':frame.name==='握拳蓄能'?'reform':null
    if(pose!==this.pose){this.pose=pose;this.since=time;this.fired=false;this.charge=0}
    if(!pose||this.fired){this.charge=0;return null}
    const elapsed=time-this.since
    this.charge=Math.max(0,Math.min(1,elapsed/HOLD_MS))
    if(elapsed<HOLD_MS)return null
    this.fired=true
    this.charge=0
    return pose
  }
}
