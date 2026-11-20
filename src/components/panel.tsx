import {useEffect,useRef,type ReactNode} from 'react'
import {Icon} from './icons'
export function Panel({title,english,close,children}:{title:string;english:string;close:()=>void;children:ReactNode}){
 const ref=useRef<HTMLElement>(null)
 useEffect(()=>{
   const prior=document.activeElement as HTMLElement
   const node=ref.current!
   node.querySelector<HTMLButtonElement>('button')?.focus()
   const key=(e:KeyboardEvent)=>{
     if(e.key==='Escape'){e.preventDefault();close()}
     if(e.key==='Tab'){
       const list=node.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled):not([hidden]),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')
       if(e.shiftKey&&document.activeElement===list[0]){e.preventDefault();list[list.length-1]?.focus()}
       if(!e.shiftKey&&document.activeElement===list[list.length-1]){e.preventDefault();list[0]?.focus()}
     }
   }
   node.addEventListener('keydown',key);return()=>{node.removeEventListener('keydown',key);prior?.focus()}
 },[close])
 return <div className="scrim" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><section role="dialog" aria-modal="true" aria-label={title} ref={ref} className="panel">
 <div className="panel-top"><div><small>{english}</small><h2>{title}</h2></div><button className="ico" aria-label="关闭面板" onClick={close}><Icon name="close"/></button></div>{children}</section></div>
}
