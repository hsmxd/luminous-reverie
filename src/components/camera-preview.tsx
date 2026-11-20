import {useCallback,useImperativeHandle,useLayoutEffect,useRef,useState,type Ref,type RefObject} from 'react'
import type {CameraStatus} from '../camera/tracker'
import {isTrackedHand,type Hand} from '../gestures/recognizer'

export type CameraFeedback={update:(hands:Hand[])=>void;clear:()=>void}
type Props={
  ref:Ref<CameraFeedback>
  video:RefObject<HTMLVideoElement|null>
  status:CameraStatus
  enabled:boolean
  paused:boolean
}

function handCorners(hand:Hand,width:number,height:number){
  let left=width,right=0,top=height,bottom=0
  for(const point of hand.points){
    const x=point.x*width,y=point.y*height
    left=Math.min(left,x);right=Math.max(right,x)
    top=Math.min(top,y);bottom=Math.max(bottom,y)
  }
  const pad=Math.min(width,height)*.035
  left=Math.max(0,left-pad);right=Math.min(width,right+pad)
  top=Math.max(0,top-pad);bottom=Math.min(height,bottom+pad)
  if(right<=left||bottom<=top)return ''
  const arm=Math.min((right-left)*.22,(bottom-top)*.22,pad*2)
  return [
    `M${left} ${top+arm}v${-arm}h${arm}`,`M${right-arm} ${top}h${arm}v${arm}`,
    `M${right} ${bottom-arm}v${arm}h${-arm}`,`M${left+arm} ${bottom}h${-arm}v${-arm}`
  ].join(' ')
}

export function CameraPreview({ref,video,status,enabled,paused}:Props){
  const overlay=useRef<SVGSVGElement>(null)
  const lastCount=useRef<number|null>(null)
  const [count,setCount]=useState<number|null>(null)
  const visible=enabled&&(status==='loading'||status==='on')
  const clear=useCallback(()=>{
    for(const mark of overlay.current?.children??[])mark.removeAttribute('d')
    if(lastCount.current!==null){lastCount.current=null;setCount(null)}
  },[])
  useLayoutEffect(clear,[clear,visible,status,paused])
  useImperativeHandle(ref,()=>({
    clear,
    update(hands){
      const svg=overlay.current,feed=video.current
      if(!visible||paused||status!=='on'||!svg||!feed?.videoWidth||!feed.videoHeight)return
      const width=feed.videoWidth,height=feed.videoHeight
      const frame=`0 0 ${width} ${height}`
      if(svg.getAttribute('viewBox')!==frame)svg.setAttribute('viewBox',frame)
      const tracked=hands.filter(isTrackedHand).slice(0,2)
      for(let i=0;i<svg.children.length;i++){
        if(tracked[i])svg.children[i].setAttribute('d',handCorners(tracked[i],width,height))
        else svg.children[i].removeAttribute('d')
      }
      if(lastCount.current!==tracked.length){lastCount.current=tracked.length;setCount(tracked.length)}
    }
  }),[clear,visible,paused,status,video])
  const label=status==='loading'?'正在加载识别模型':paused?'识别已暂停':count===null?'正在检测手部':count===0?'未检测到手':`已识别 ${count} 只手`
  return <aside className={'camera-monitor'+(visible?' is-visible':'')} aria-label="摄像头取景" aria-hidden={!visible}>
    <div className="camera-frame">
      <video ref={video} muted playsInline aria-label="镜像摄像头预览"/>
      <svg ref={overlay} aria-hidden="true"><path vectorEffect="non-scaling-stroke"/><path vectorEffect="non-scaling-stroke"/></svg>
    </div>
    <div className="camera-readout" data-tracked={status==='on'&&!paused&&!!count} role="status"><i aria-hidden="true"/>{label}</div>
  </aside>
}
