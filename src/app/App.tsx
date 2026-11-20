import {useCallback,useEffect,useRef,useState} from 'react'
import {ArtScene,type Stats} from '../scene/scene'
import {HandTracker,type CameraStatus} from '../camera/tracker'
import {GestureRecognizer} from '../gestures/recognizer'
import {settings,forms} from '../config'
import {Icon,Mark,type IconName} from '../components/icons'
import {CameraPreview,type CameraFeedback} from '../components/camera-preview'
import {Thumbnail} from '../components/thumbnail'
import {Panel} from '../components/panel'
import type {Shape} from '../particles/shapes'
import {Studio} from '../components/studio'
import {initialDraft,type Draft} from '../studio/source'
import type {Artwork} from '../studio/sampling'
import {StudioGesture,type StudioAction,type StudioHoldState} from '../studio/gesture'

const number=(n:number)=>n.toLocaleString('en-US')
const names:Record<CameraStatus,string>={
  off:'开启摄像头',
  requesting:'等待授权',
  loading:'加载模型',
  on:'关闭摄像头',
  error:'重试摄像头'
}
const themes=['dandelion','butterfly','flower','moon','custom'] as const
const help:[IconName,string,string][]=[
  ['hand','张开手掌 · 引导','移动掌心，带动附近的粒子旋转流动。'],
  ['pinch','指尖捏合 · 聚集','捏住拇指和食指，把光球拖到想要的位置。松开手指，粒子会散回原形。'],
  ['burst','握拳再张开 · 爆发','先握紧拳头蓄能，再张开手掌释放粒子。'],
  ['wave','悬停或挥手','张掌静止片刻激起光波，快速左右挥动可切换形态。'],
  ['dual','双手 · 塑形','双掌靠近或拉开以缩放，同时移动以平移。改变高低和角度以倾斜、旋转。']
]

export function App(){
  const host=useRef<HTMLDivElement>(null),video=useRef<HTMLVideoElement>(null)
  const scene=useRef<ArtScene|null>(null),tracker=useRef<HandTracker|null>(null)
  const cameraFeedback=useRef<CameraFeedback>(null)
  const gesture=useRef(new GestureRecognizer()),index=useRef(0),sensitivity=useRef(1)
  const [form,setForm]=useState(0),[active,setActive]=useState(false),[paused,setPaused]=useState(false)
  const [pure,setPure]=useState(false)
  const [panel,setPanel]=useState<'settings'|'guide'|'studio'|null>(()=>new URLSearchParams(location.search).get('studio')==='1'?'studio':null)
  const [camera,setCamera]=useState<CameraStatus>('off'),[err,setErr]=useState('')
  const [graphics,setGraphics]=useState(''),[retry,setRetry]=useState(0),[shapes,setShapes]=useState<Shape[]>([])
  const [stats,setStats]=useState<Stats>({fps:0,count:settings.initial,bloom:true}),[density,setDensity]=useState(settings.initial)
  const [power,setPower]=useState(1),[sense,setSense]=useState(1),[preview,setPreview]=useState(true),[full,setFull]=useState(false)
  const [hand,setHand]=useState('等待手势'),[hint,setHint]=useState(false)
  const [hold,setHold]=useState<StudioHoldState>({action:null,progress:0})
  const [draft,setDraft]=useState<Draft>(initialDraft),[work,setWork]=useState<Artwork|null>(null),[scattered,setScattered]=useState(false)
  const workRef=useRef<Artwork|null>(null),spreadRef=useRef(false),studioGesture=useRef(new StudioGesture())
  const panelRef=useRef(panel)
  panelRef.current=panel

  const studioAction=useCallback((action:StudioAction)=>{
    if(index.current!==4)return
    const spread=action==='scatter'
    scene.current?.scatterArtwork(spread);spreadRef.current=spread;setScattered(spread)
  },[])

  const close=useCallback(()=>setPanel(null),[])

  const choose=useCallback((n:number)=>{
    const size=workRef.current?5:4,next=((n%size)+size)%size
    if((index.current===4)!==(next===4)){
      gesture.current.reset();studioGesture.current.reset();scene.current?.input.reset()
      setHold({action:null,progress:0})
    }
    index.current=next;scene.current?.select(next);setForm(next)
  },[])

  const create=useCallback((art:Artwork)=>{
    if(!scene.current)return
    workRef.current=art;setWork(art);scene.current.loadArtwork(art);choose(4);studioAction('reform')
    studioGesture.current.reset();setHold({action:null,progress:0})
    setActive(true);setPaused(false);setPure(false);setPanel(null)
  },[choose,studioAction])

  useEffect(()=>{
    const importFile=(file:File)=>{setDraft(d=>({...d,kind:'image',file}));setPure(false);setPanel('studio')}
    const over=(e:DragEvent)=>{if(e.dataTransfer?.types.includes('Files'))e.preventDefault()}
    const drop=(e:DragEvent)=>{
      if(!e.dataTransfer?.types.includes('Files'))return
      e.preventDefault()
      const f=e.dataTransfer.files[0]
      if(f)importFile(f)
    }
    const paste=(e:ClipboardEvent)=>{
      if(!e.clipboardData)return
      const editing=e.target instanceof Element&&e.target.closest('textarea,input,[contenteditable="true"]')
      if(editing&&e.clipboardData.getData('text/plain'))return
      const item=Array.from(e.clipboardData.items).find(i=>i.kind==='file'&&i.type.startsWith('image/'))
      const f=item?.getAsFile();if(f){e.preventDefault();importFile(f)}
    }
    window.addEventListener('dragover',over);window.addEventListener('drop',drop);window.addEventListener('paste',paste)
    return()=>{window.removeEventListener('dragover',over);window.removeEventListener('drop',drop);window.removeEventListener('paste',paste)}
  },[])

  useEffect(()=>{
    let art:ArtScene|undefined
    try{
      art=new ArtScene(host.current!,setStats,()=>setGraphics('图形设备连接已中断。请重新初始化画布。'))
      scene.current=art
      if(workRef.current){art.loadArtwork(workRef.current);art.scatterArtwork(spreadRef.current)}
      art.select(index.current);setShapes(art.shapes);setGraphics('')
    }catch{
      setGraphics('WebGL 2 无法启动。请启用浏览器图形加速，再重新初始化画布。')
    }
    return()=>{art?.dispose();scene.current=null}
  },[retry])

  // 同步三维粒子构图中心：打开创意工坊时平滑左移避让，沉浸/纯净态居中展示
  useEffect(()=>{
    const mode=panel==='studio'?'studio':(active||pure)?'immersive':'welcome'
    scene.current?.setLayoutMode(mode)
  },[panel,active,pure,retry])

  useEffect(()=>{
    let previousName='等待手势'
    let lastHoldBucket=-1
    const cam=new HandTracker(video.current!,(s,message)=>{
      setCamera(s);setErr(message??'')
      if(s!=='on'){
        studioGesture.current.reset();gesture.current.reset();scene.current?.input.clearHand()
        previousName='等待手势';setHand(previousName)
        lastHoldBucket=-1;setHold({action:null,progress:0})
      }
    },(hands,sampledAt)=>{
      cameraFeedback.current?.update(hands)
      const v=video.current,now=performance.now()
      const f=gesture.current.update(hands,sampledAt,sensitivity.current,v?.videoHeight?v.videoWidth/v.videoHeight:4/3,index.current===4)
      scene.current?.input.accept(f,now,sampledAt)
      if(f.name!==previousName){previousName=f.name;setHand(f.name)}
      if(index.current===4){
        if(panelRef.current!=='studio'){
          const action=studioGesture.current.update(f,now)
          if(action)studioAction(action)
          const s=studioGesture.current.state
          const bucket=s.action?Math.round(s.progress*20):-1
          if(bucket!==lastHoldBucket){lastHoldBucket=bucket;setHold(s)}
        }
      }else{
        if(lastHoldBucket!==-1){lastHoldBucket=-1;setHold({action:null,progress:0})}
        if(panelRef.current!=='studio'&&(f.event==='next'||f.event==='prev'))choose(index.current+(f.event==='next'?1:-1))
      }
    })
    tracker.current=cam
    return()=>{cam.stop(false);tracker.current=null}
  },[choose,studioAction])

  useEffect(()=>{scene.current?.density(density)},[density,retry])
  useEffect(()=>{scene.current?.intensity(power)},[power,retry])
  useEffect(()=>{sensitivity.current=sense},[sense])

  useEffect(()=>{
    scene.current?.pause(paused)
    const sync=()=>{
      const halt=paused||document.hidden
      tracker.current?.suspend(halt)
      if(halt){
        cameraFeedback.current?.clear();studioGesture.current.reset()
        gesture.current.reset();scene.current?.input.reset()
        setHold({action:null,progress:0})
      }
    }
    sync();document.addEventListener('visibilitychange',sync)
    return()=>document.removeEventListener('visibilitychange',sync)
  },[paused,retry])

  useEffect(()=>{
    if(panel==='studio'){studioGesture.current.reset();setHold({action:null,progress:0})}
  },[panel])

  useEffect(()=>{
    const sync=()=>setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange',sync)
    return()=>document.removeEventListener('fullscreenchange',sync)
  },[])

  useEffect(()=>{
    if(!active)return
    setHint(true);const id=window.setTimeout(()=>setHint(false),6000)
    return()=>clearTimeout(id)
  },[active,form])

  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.isComposing||e.altKey||e.metaKey||e.ctrlKey||(e.target as HTMLElement).matches('input,textarea,select'))return
      if(e.code==='KeyH'&&!panel){e.preventDefault();setPure(p=>!p);return}
      if(panel)return
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();choose(index.current+(e.key==='ArrowRight'?1:-1))}
      if(index.current===4&&!paused&&['KeyD','KeyR'].includes(e.code)){e.preventDefault();studioAction(e.code==='KeyD'?'scatter':'reform')}
      if(e.code==='Space'&&active&&!(e.target as HTMLElement).closest('button')){e.preventDefault();setPaused(p=>!p)}
    }
    window.addEventListener('keydown',key)
    return()=>window.removeEventListener('keydown',key)
  },[active,panel,choose,paused,studioAction])

  const leave=()=>{
    tracker.current?.stop();gesture.current.reset();scene.current?.input.reset()
    setActive(false);setPaused(false);setPure(false);setPanel(null);setHint(false)
  }

  const toggleCamera=()=>{
    if(['on','requesting','loading'].includes(camera)){tracker.current?.stop();return}
    setActive(true);setPaused(false);setPure(false);void tracker.current?.start()
  }

  const toggleFull=async()=>{
    try{
      if(document.fullscreenElement)await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    }catch{setErr('当前窗口不支持全屏显示。')}
  }

  const pos=(e:React.PointerEvent<HTMLDivElement>)=>{
    const box=e.currentTarget.getBoundingClientRect()
    return [(e.clientX-box.left)/box.width,(e.clientY-box.top)/box.height]
  }

  const custom=form===4&&!!work
  const studioOpen=panel==='studio'
  const current=custom
    ?{name:work.kind==='text'?'Type Study':'Image Relief',cn:work.title,line:'张掌打散，握拳重组，食指拨动星尘。'}
    :forms[form]
  const theme=themes[custom?4:form]
  const handLabel=camera==='on'?(custom&&hand==='手掌引导'?'张掌打散':custom&&hand==='握拳蓄能'?'握拳重组':hand):'鼠标模式'

  return <main
    className={`observatory${active?' in-session':' welcome'}${studioOpen?' studio-open':''}${pure?' is-pure':''}`}
    data-theme={theme}
  >
    <div
      className="stage"
      ref={host}
      aria-label="实时三维粒子画布"
      onPointerMove={e=>{if(!paused){const [x,y]=pos(e);scene.current?.input.pointer(x,y,!!(e.buttons&1),performance.now())}}}
      onPointerDown={e=>{if(e.button!==0||paused)return;const [x,y]=pos(e);e.currentTarget.setPointerCapture(e.pointerId);scene.current?.input.pointer(x,y,true,performance.now())}}
      onPointerUp={e=>{scene.current?.input.release();if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);if(e.pointerType==='touch')scene.current?.input.leave()}}
      onPointerCancel={()=>scene.current?.input.leave()}
      onPointerLeave={()=>scene.current?.input.leave()}
      onDoubleClick={()=>{if(scene.current&&!paused){if(custom)studioAction(spreadRef.current?'reform':'scatter');else scene.current.input.burstAge=0}}}
    />
    <div className="atmosphere" aria-hidden="true"/>

    <header className="header chrome">
      <div className="brand">
        <Mark/>
        <span className="brand-en">Luminous Reverie</span>
        <i aria-hidden="true"/>
        <b className="brand-cn">浮光梦境</b>
      </div>
      <nav aria-label="体验工具">
        <button className={`glass-pill camera-button${camera==='on'?' live':''}`} onClick={toggleCamera} disabled={!!graphics}>
          <Icon name={camera==='off'||camera==='error'?'cameraOff':'camera'} size={15}/>
          <span>{names[camera]}</span>
        </button>
        <button className="ico glass-ico" aria-label="手势指南" title="手势指南" onClick={()=>setPanel('guide')}>
          <Icon name="book" size={16}/>
        </button>
        <button className="ico glass-ico" aria-label="体验设置" title="体验设置" onClick={()=>setPanel('settings')}>
          <Icon name="settings" size={16}/>
        </button>
        <button className="ico glass-ico pure-btn" aria-label="纯净观赏 (H)" title="纯净观赏 (快捷键 H)" onClick={()=>setPure(true)}>
          <Icon name="eyeOff" size={16}/>
        </button>
        <button className="ico glass-ico screen-btn" aria-label={full?'退出全屏':'进入全屏'} title={full?'退出全屏':'全屏'} onClick={toggleFull}>
          <Icon name={full?'exitFull':'full'} size={16}/>
        </button>
      </nav>
    </header>

    {/* 欢迎态左侧诗意导视；当打开创意工坊或进入沉浸态时平滑收起，绝不遮挡移至左侧/居中的粒子主角 */}
    <section className={`intro chrome${custom?' custom-intro':''}`} aria-label="当前粒子形态" aria-hidden={studioOpen||pure}>
      <div className="eyebrow">
        <i aria-hidden="true"/>
        <span>{custom?'PARTICLE STUDIO':'PARTICLE FORM'}</span>
        <em>/</em>
        <span>{custom?(work.kind==='text'?'TYPE':'IMAGE'):String(form+1).padStart(2,'0')}</span>
      </div>
      <div key={form} className="form-copy">
        {custom
          ?<>
            <h1 className="cn-hero" title={current.cn}>{current.cn}</h1>
            <div className="en-sub">{current.name}</div>
          </>
          :<>
            <h1 className={form===2?'long':''}>{current.name}</h1>
            <div className="cn-name">{current.cn}</div>
          </>}
        {!active&&<p className="poem">{current.line}</p>}
      </div>
      {!active&&<div className="hero-actions">
        <button className="primary" disabled={!!graphics} onClick={()=>setPanel('studio')}>
          <Icon name="studio" size={16}/>
          <span>创作粒子</span>
        </button>
        <button className="glass-pill ghost-btn" disabled={!!graphics} onClick={()=>setActive(true)}>
          <Icon name="play" size={14}/>
          <span>沉浸体验</span>
        </button>
        <button className="guide-link" onClick={()=>setPanel('guide')}>
          <Icon name="book" size={15}/>
          <span>手势指南</span>
        </button>
      </div>}
    </section>

    {/* 沉浸体验态极简悬浮操控条（不挡中央粒子主角） */}
    {active&&!studioOpen&&<div className="session-bar chrome" aria-label="沉浸体验控制">
      <span className="session-tag">
        <i aria-hidden="true"/>
        <strong>{current.cn}</strong>
      </span>
      {custom&&<>
        <span className="bar-sep" aria-hidden="true"/>
        <button className={`bar-btn${scattered?' active':''}`} disabled={paused} aria-pressed={scattered} onClick={()=>studioAction('scatter')}>
          <Icon name="burst" size={14}/><span>打散</span>
        </button>
        <button className={`bar-btn${!scattered?' active':''}`} disabled={paused} aria-pressed={!scattered} onClick={()=>studioAction('reform')}>
          <Icon name="orbit" size={14}/><span>重组</span>
        </button>
        <button className="bar-btn" onClick={()=>setPanel('studio')}>
          <Icon name="edit" size={14}/><span>微调</span>
        </button>
      </>}
      <span className="bar-sep" aria-hidden="true"/>
      <button className="bar-btn" onClick={()=>setPaused(v=>!v)}>
        <Icon name={paused?'play':'pause'} size={14}/><span>{paused?'继续':'暂停'}</span>
      </button>
      <button className="bar-btn subtle" onClick={leave} title="返回欢迎页">
        <Icon name="back" size={14}/><span>返回</span>
      </button>
    </div>}

    {/* 手势蓄能进度反馈环（自定义作品张掌/握拳保持 0.36 秒触发时显示） */}
    {hold.action&&hold.progress>0.06&&<div className="hold-pill" role="status" aria-live="polite">
      <span>{hold.action==='scatter'?'保持张掌 · 即将打散':'保持握拳 · 即将重组'}</span>
      <div className="hold-track"><b style={{transform:`scaleX(${hold.progress})`}}/></div>
    </div>}

    <div className={`field-hint${active&&hint&&!studioOpen&&!pure?' show':''}`} aria-hidden={!(active&&hint&&!studioOpen&&!pure)}>
      {custom
        ?(camera==='on'?'保持张掌打散 · 保持握拳重组 · 食指拨动':'D 打散 · R 重组 · 双击切换聚散')
        :(camera==='on'?'张开手掌引导粒子 · 双指捏合拖动光球':'移动鼠标引导粒子 · 按住聚集光球 · 双击爆发')}
    </div>

    {/* 底部居中 VisionOS 风格悬浮液态玻璃形态 Dock */}
    <nav className="dock chrome" aria-label="形态图鉴">
      <div className="dock-items">
        {forms.map((f,i)=><button
          key={f.name}
          onClick={()=>choose(i)}
          className={`dock-item${i===form?' selected':''}`}
          aria-pressed={i===form}
          aria-label={`切换到${f.cn}`}
          title={`${f.cn} · ${f.name}`}
        >
          <Thumbnail shape={shapes[i]} index={i}/>
          <span className="dock-tip">{f.cn}</span>
          <i className="dock-dot" aria-hidden="true"/>
        </button>)}
        {work&&<button
          onClick={()=>choose(4)}
          className={`dock-item dock-work${custom?' selected':''}`}
          aria-pressed={custom}
          aria-label={`切换到我的作品 ${work.title}`}
          title={`我的创作 · ${work.title}`}
        >
          <img src={work.thumbnail} alt="" className="thumb work-thumb"/>
          <span className="dock-tip">{work.title}</span>
          <i className="dock-dot" aria-hidden="true"/>
        </button>}
      </div>
      <span className="dock-divider" aria-hidden="true"/>
      <button
        className={`dock-create${studioOpen?' is-open':''}`}
        disabled={!!graphics}
        onClick={()=>setPanel(p=>p==='studio'?null:'studio')}
        aria-pressed={studioOpen}
        aria-label="打开创意工坊"
        title="创意工坊"
      >
        <Icon name="studio" size={16}/>
        <span>创作</span>
      </button>
    </nav>

    {/* 底部左右极轻状态遥测（无通栏横线） */}
    <footer className="chrome">
      <div className="telemetry">
        <span className={`status-dot${paused?' idle':''}`}/>
        <span>{graphics?'渲染异常':paused?'已暂停':'实时渲染'}</span>
        <i aria-hidden="true"/>
        <span>{number(stats.count)} 粒子</span>
        <i aria-hidden="true"/>
        <span>{stats.fps||'—'} FPS</span>
      </div>
      <div className="status-right">
        <span className="key-guide" aria-hidden="true"><kbd>←</kbd><kbd>→</kbd> 切换</span>
        <span className={`input-mode${camera==='on'?' is-live':''}`}>
          <Icon name={camera==='on'?'hand':'cursor'} size={13}/>
          <span>{handLabel}</span>
        </span>
      </div>
    </footer>

    {/* 纯净观赏模式下的极轻还原按钮 */}
    {pure&&<button className="pure-exit glass-pill" onClick={()=>setPure(false)} aria-label="恢复界面显示">
      <Icon name="eye" size={15}/>
      <span>显示界面 (H)</span>
    </button>}

    <CameraPreview
      ref={cameraFeedback}
      video={video}
      status={camera}
      enabled={preview}
      paused={paused}
      shifted={studioOpen}
    />

    {(err||graphics)&&<div role="alert" className="notice">
      <p>{graphics||err}</p>
      {graphics
        ?<button onClick={()=>setRetry(v=>v+1)}>重新初始化</button>
        :<button aria-label="关闭提示" onClick={()=>setErr('')}><Icon name="close" size={15}/></button>}
    </div>}

    {studioOpen&&<Studio unavailable={graphics} replacing={!!work} draft={draft} change={setDraft} close={close} create={create}/>}

    {panel==='guide'&&<Panel title="手势指南" english="GESTURE GUIDE" close={close}>
      {custom&&<p className="panel-note">自定义作品中，张掌保持约半秒打散，握拳保持约半秒重组。食指可局部拨动，双手可移动、缩放和倾转作品。D / R 或画布双击也可控制聚散。</p>}
      <div className="guide-list">
        {(custom?help.filter(h=>h[0]==='dual'||h[0]==='pinch'):help).map(([icon,title,text])=><div key={title}>
          <span className="guide-ico"><Icon name={icon} size={17}/></span>
          <article><h3>{title}</h3><p>{text}</p></article>
        </div>)}
      </div>
      <p className="panel-note">
        <Icon name="cursor" size={15}/>
        <span>{custom?'在画布上双击，可以交替打散和重组作品。按 H 键可切换纯净观赏模式。':'鼠标模式支持移动引导、按住聚集和双击爆发。按 H 键可切换纯净观赏模式。'}</span>
      </p>
    </Panel>}

    {panel==='settings'&&<Panel title="体验设置" english="STUDIO SETTINGS" close={close}>
      <Range label="粒子数量上限" value={density} min={5000} max={40000} step={1000} display={number(density)} change={setDensity}/>
      <Range label="效果强度" value={power} min={.35} max={1.8} step={.05} display={Math.round(power*100)+'%'} change={setPower}/>
      <Range label="手势灵敏度" value={sense} min={.65} max={1.65} step={.05} display={Math.round(sense*100)+'%'} change={setSense}/>
      <label className="toggle-row">
        <span>摄像头预览<small>显示镜像画面与手部追踪框</small></span>
        <input type="checkbox" checked={preview} onChange={e=>setPreview(e.target.checked)}/>
        <b aria-hidden="true"/>
      </label>
      <p className="panel-note"><Icon name="camera" size={16}/><span>摄像头画面与创意工坊素材均仅在本机处理。</span></p>
    </Panel>}
  </main>
}

function Range({label,value,min,max,step,display,change}:{label:string;value:number;min:number;max:number;step:number;display:string;change:(v:number)=>void}){
  return <label className="range">
    <span>{label}<output>{display}</output></span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e=>change(Number(e.target.value))}
      style={{'--fill':((value-min)/(max-min)*100)+'%'} as React.CSSProperties}
    />
  </label>
}
