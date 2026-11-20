import {settings} from '../config'
import type {Hand} from '../gestures/recognizer'
import type {HandLandmarker} from '@mediapipe/tasks-vision'
export type CameraStatus='off'|'requesting'|'loading'|'on'|'error'
type State=(status:CameraStatus,message?:string)=>void
const asset=(path:string)=>new URL(import.meta.env.BASE_URL+path,location.href).href
export class HandTracker {
  private stream?:MediaStream
  private worker?:Worker
  private local?:HandLandmarker
  private timer=0
  private videoFrame=0
  private watchdog=0
  private serial=0
  private busy=false
  private suspended=false
  private lastFrame=-1
  private sampledAt=0
  private discardBefore=-Infinity
  private interval=1000/settings.inferenceHz
  private ready=false
  constructor(private video:HTMLVideoElement,private state:State,private result:(hands:Hand[],sampledAt:number)=>void){}
  async start(){
    this.stop(false);const id=this.serial
    try{
      if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('请使用 localhost 或 HTTPS 打开网站，再启用摄像头。')
      this.state('requesting')
      const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:30}}})
      if(id!==this.serial){stream.getTracks().forEach(t=>t.stop());return}
      this.stream=stream;this.video.srcObject=stream
      const track=stream.getVideoTracks()[0]
      track.onended=()=>{if(id===this.serial)this.fail('摄像头已断开，请重新连接后再试。')}
      await this.video.play()
      if(id!==this.serial)return
      this.state('loading')
      let workerOK=false
      if(typeof Worker!=='undefined'&&typeof OffscreenCanvas!=='undefined'&&typeof createImageBitmap==='function'){
        try{await this.openWorker(id);workerOK=true}catch{if(id===this.serial){this.worker?.terminate();this.worker=undefined}}
      }
      if(id!==this.serial)return
      if(!workerOK){
        const {FilesetResolver,HandLandmarker}=await import('@mediapipe/tasks-vision')
        const files=await FilesetResolver.forVisionTasks(asset('vision/wasm'))
        if(id!==this.serial)return
        const model=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:asset('models/hand_landmarker.task'),delegate:'CPU'},
          runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.55,minHandPresenceConfidence:.5,minTrackingConfidence:.55})
        if(id!==this.serial){model.close();return}
        this.local=model;this.interval=1000/15
      }
      this.ready=true;this.state('on');this.schedule(id,0)
    }catch(err){
      if(id!==this.serial)return
      const error=err as Error
      this.fail(error.name==='NotAllowedError'?'摄像头权限未获准。可在地址栏允许访问，或继续使用鼠标。':error.name==='NotFoundError'?'未找到摄像头。连接设备后可重试，鼠标交互随时可用。':error.name==='NotReadableError'?'摄像头正被占用或无法读取，请关闭其他拍摄程序后重试。':!this.stream?error.message:'手部模型或视频加载失败，请检查本地模型和 WASM 后重试。')
    }
  }
  private cancelLoad?:()=>void
  private openWorker(id:number){
    return new Promise<void>((resolve,reject)=>{
      const w=this.worker=new Worker(asset('hand-worker.js'))
      const finish=(err?:Error)=>{clearTimeout(timeout);this.cancelLoad=undefined;err?reject(err):resolve()}
      const timeout=window.setTimeout(()=>finish(new Error('Worker timeout')),15000)
      this.cancelLoad=()=>finish(new Error('cancelled'))
      w.onerror=(err)=>{if(this.ready)this.fail('手势推理中断，可以重新开启摄像头。');else finish(new Error(err.message))}
      w.onmessage=({data})=>{
        if(id!==this.serial)return
        if(data.type==='ready')finish()
        if(data.type==='error'){if(this.ready)this.fail('手势推理失败，请重试。');else finish(new Error(data.message))}
        if(data.type==='result'){
          clearTimeout(this.watchdog);this.busy=false
          if(!this.suspended&&!document.hidden&&this.sampledAt>=this.discardBefore)this.result(data.hands,this.sampledAt)
        }
      }
      w.postMessage({type:'init'})
    })
  }
  private cancelScheduledFrame(){
    clearTimeout(this.timer);this.timer=0
    if(this.videoFrame){this.video.cancelVideoFrameCallback(this.videoFrame);this.videoFrame=0}
  }
  private schedule(id:number,delay:number){
    if(this.suspended||document.hidden||id!==this.serial)return
    this.cancelScheduledFrame()
    // Consume new frames at the camera cadence on the worker path. If the worker
    // is busy, skip the frame instead of building a queue of older positions.
    if(this.worker&&typeof this.video.requestVideoFrameCallback==='function'){
      this.videoFrame=this.video.requestVideoFrameCallback((_,frame)=>{
        this.videoFrame=0;void this.tick(id,frame.mediaTime)
      })
    }else this.timer=window.setTimeout(()=>void this.tick(id),delay)
  }
  private async tick(id:number,mediaTime=this.video.currentTime){
    if(id!==this.serial||this.suspended||document.hidden)return
    const start=performance.now()
    try{
      if(!this.busy&&this.video.readyState>=2&&mediaTime!==this.lastFrame){
        this.lastFrame=mediaTime
        if(this.worker){
          this.busy=true;this.sampledAt=start
          const bitmap=await createImageBitmap(this.video)
          if(id!==this.serial||this.suspended||document.hidden||start<this.discardBefore){
            bitmap.close()
            if(id===this.serial)this.busy=false
          }else{
            this.worker.postMessage({type:'frame',bitmap,time:start},[bitmap])
            this.watchdog=window.setTimeout(()=>this.fail('模型响应超时，请重新开启摄像头。'),8000)
          }
        }else if(this.local){
          const out=this.local.detectForVideo(this.video,start)
          this.result(out.landmarks.map((points,i)=>({points,score:out.handedness[i]?.[0]?.score??0})),start)
          this.interval=Math.min(180,Math.max(1000/15,(performance.now()-start)*3))
        }
      }
    }catch{if(id===this.serial)this.fail('无法读取视频帧，请检查摄像头后重试。');return}
    this.schedule(id,Math.max(5,this.interval-(performance.now()-start)))
  }
  suspend(value:boolean){
    this.suspended=value;this.cancelScheduledFrame()
    if(value)this.discardBefore=performance.now()
    if(!value&&this.ready)this.schedule(this.serial,0)
  }
  private fail(message:string){this.stop(false);this.state('error',message)}
  stop(notify=true){
    this.serial++;this.ready=false;this.cancelLoad?.();this.cancelScheduledFrame();clearTimeout(this.watchdog)
    this.worker?.terminate();this.worker=undefined;this.local?.close();this.local=undefined
    this.stream?.getTracks().forEach(t=>{t.onended=null;t.stop()});this.stream=undefined
    this.video.pause();this.video.srcObject=null;this.busy=false;this.lastFrame=-1;this.interval=1000/settings.inferenceHz
    if(notify)this.state('off')
  }
}
