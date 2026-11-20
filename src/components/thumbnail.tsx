import {useEffect,useRef} from 'react'
import type {Shape} from '../particles/shapes'

/**
 * 渲染底部悬浮液态玻璃 Dock 中的微缩粒子形态缩略图。
 */
export function Thumbnail({shape,index}:{shape?:Shape;index:number}){
  const ref=useRef<HTMLCanvasElement>(null)
  useEffect(()=>{
    const cv=ref.current,ctx=cv?.getContext('2d')
    if(!cv||!ctx||!shape)return
    const w=cv.width,h=cv.height
    ctx.clearRect(0,0,w,h)
    ctx.globalCompositeOperation='lighter'
    for(let i=0;i<Math.min(shape.xyz.length/3,4800);i++){
      const x=shape.xyz[i*3],y=shape.xyz[i*3+1],z=shape.xyz[i*3+2],p=shape.tint[i*3]
      const d=1+.026*z,k=index===0?16.5:19.5
      ctx.fillStyle=p>.74?'rgba(246,220,178,.68)':p>.48?'rgba(218,184,244,.64)':'rgba(156,204,252,.68)'
      ctx.fillRect(w*.5+x*k*d,h*(index===0?.45:.51)-y*k*d,.68+(i%9===0?.62:.18),.88)
    }
  },[shape,index])
  return <canvas ref={ref} className="thumb" width="112" height="112" aria-hidden="true"/>
}
