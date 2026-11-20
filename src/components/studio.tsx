import {useEffect,useMemo,useRef,useState} from 'react'
import {Panel} from './panel'
import {Icon} from './icons'
import {imageSource,palettes,textSource,type Draft,type Source} from '../studio/source'
import {sampleRaster,type Artwork} from '../studio/sampling'
import {settings} from '../config'

type Props={
  unavailable:string
  replacing:boolean
  draft:Draft
  change:(draft:Draft)=>void
  close:()=>void
  create:(art:Artwork)=>void
}

export function Studio({draft,change,close,create,replacing,unavailable}:Props){
  const input=useRef<HTMLInputElement>(null)
  const [result,setResult]=useState<{source?:Source;error?:string;key:object}|null>(null)
  const [failure,setFailure]=useState('')
  // 浮雕深度只影响三维采样坐标，滑动时无需重新解码图片。
  const {kind,text,palette,file,removeBackground}=draft
  const readyKey=useMemo(()=>({kind,text,palette,file,removeBackground}),[kind,text,palette,file,removeBackground])

  useEffect(()=>{
    let live=true
    const key=readyKey;setFailure('')
    const timer=window.setTimeout(async()=>{
      try{
        if(kind==='image'&&!file){if(live)setResult({key});return}
        const source=kind==='text'?textSource(text,palette):await imageSource(file!,removeBackground)
        if(live)setResult({source,key})
      }catch(e){if(live)setResult({error:(e as Error).message,key})}
    },90)
    return()=>{live=false;clearTimeout(timer)}
  },[readyKey,kind,text,palette,file,removeBackground])

  const source=result?.key===readyKey?result.source:undefined
  const error=unavailable||failure||(result?.key===readyKey?result.error:'')
  const update=(fields:Partial<Draft>)=>change({...draft,...fields})
  const commit=()=>{
    if(!source)return
    try{
      create({...sampleRaster(source.raster,settings.max,draft.depth),title:source.title,kind,thumbnail:source.thumbnail})
    }catch(e){
      setFailure((e as Error).message)
    }
  }

  return <Panel title="创意工坊" english="PARTICLE STUDIO" variant="docked" className="studio-panel" close={close}>
    <div className="studio-tabs" role="group" aria-label="创作素材">
      <button aria-pressed={kind==='text'} onClick={()=>update({kind:'text'})}><b>Aa</b><span>文字</span></button>
      <button aria-pressed={kind==='image'} onClick={()=>update({kind:'image'})}><Icon name="image" size={15}/><span>图片</span></button>
    </div>

    {kind==='text'?<>
      <label className="studio-field">
        <span>作品文字</span>
        <textarea
          rows={2}
          value={text}
          placeholder="输入中文或英文，支持换行…"
          onChange={e=>update({text:e.target.value})}
        />
      </label>
      <div className="studio-palette">
        <span>粒子配色</span>
        <div role="group" aria-label="粒子配色">
          {palettes.map((p,i)=><button
            key={p.name}
            aria-label={p.name}
            title={p.name}
            aria-pressed={palette===i}
            onClick={()=>update({palette:i})}
          >
            <i style={{background:`radial-gradient(circle at 30% 28%, #ffffffcc, transparent 42%), linear-gradient(135deg, ${p.colors.join(',')})`}}/>
          </button>)}
        </div>
      </div>
    </>:<>
      <input ref={input} type="file" accept="image/*" hidden aria-label="选择图片文件" onChange={e=>{const f=e.target.files?.[0];if(f)update({file:f});e.target.value=''}}/>
      <button className="upload" onClick={()=>input.current?.click()}>
        <span className="upload-badge"><Icon name="image" size={18}/></span>
        <span className="upload-copy">
          <strong>{file?file.name:'选择一张图片'}</strong>
          <small>支持点击上传、拖入或粘贴剪贴板</small>
        </span>
      </button>
      <label className="studio-check">
        <input type="checkbox" checked={removeBackground} onChange={e=>update({removeBackground:e.target.checked})}/>
        <span>去除边缘相连的纯色背景</span>
      </label>
    </>}

    <div className="proof">
      <span>采样预览</span>
      {source
        ?<img src={source.thumbnail} alt="将采样为粒子的内容"/>
        :<small>{error?'等待有效素材':kind==='image'&&!file?'拖入或选择一张图片':'正在采样…'}</small>}
    </div>

    <label className="range studio-range">
      <span>浮雕深度<output>{Math.round(draft.depth*100)}%</output></span>
      <input
        type="range"
        min="0"
        max="1"
        step=".05"
        value={draft.depth}
        onChange={e=>update({depth:Number(e.target.value)})}
        style={{'--fill':(100*draft.depth)+'%'} as React.CSSProperties}
      />
    </label>

    {error&&<p className="studio-error" role="alert">{error}</p>}

    <button className="primary create-art" disabled={!source||!!unavailable} onClick={commit}>
      <Icon name="studio" size={16}/>
      <span>生成粒子作品</span>
    </button>
    <p className="studio-local">{replacing?'生成后将平滑替换当前页面的自定义作品。':'素材完全在本机处理，作品保留于当前会话。'}</p>
  </Panel>
}
