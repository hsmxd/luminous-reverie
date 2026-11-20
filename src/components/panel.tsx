import {useEffect,useRef,type ReactNode} from 'react'
import {Icon} from './icons'

type PanelProps={
  title:string
  english:string
  close:()=>void
  children:ReactNode
  /** docked：无全屏暗罩的液态玻璃侧栏（窄屏自动转为底部半屏抽屉）；modal：轻遮罩模态浮窗 */
  variant?:'modal'|'docked'
  className?:string
}

export function Panel({title,english,close,children,variant='modal',className=''}:PanelProps){
  const ref=useRef<HTMLElement>(null)

  useEffect(()=>{
    const prior=document.activeElement as HTMLElement|null
    const node=ref.current!
    const focusTarget=node.querySelector<HTMLElement>('textarea,input:not([hidden]),button')
    focusTarget?.focus({preventScroll:true})
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();close()}
      if(e.key==='Tab'){
        const list=node.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled):not([hidden]),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')
        if(!list.length)return
        if(e.shiftKey&&document.activeElement===list[0]){e.preventDefault();list[list.length-1]?.focus()}
        if(!e.shiftKey&&document.activeElement===list[list.length-1]){e.preventDefault();list[0]?.focus()}
      }
    }
    window.addEventListener('keydown',key)
    return()=>{window.removeEventListener('keydown',key);prior?.focus?.()}
  },[close])

  const body=<section
    role="dialog"
    aria-modal={variant==='modal'}
    aria-label={title}
    ref={ref}
    className={`panel panel-${variant} ${className}`.trim()}
  >
    {variant==='docked'&&<div className="sheet-grab" aria-hidden="true"/>}
    <div className="panel-top">
      <div>
        <small>{english}</small>
        <h2>{title}</h2>
      </div>
      <button className="ico glass-ico" aria-label="关闭面板" onClick={close}><Icon name="close" size={16}/></button>
    </div>
    <div className="panel-body">{children}</div>
  </section>

  if(variant==='docked'){
    return <div className="docked-layer">{body}</div>
  }

  return <div className="scrim" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}>{body}</div>
}
