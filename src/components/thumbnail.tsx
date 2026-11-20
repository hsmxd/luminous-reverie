import {useEffect,useRef} from 'react'
import type {Shape} from '../particles/shapes'
export function Thumbnail({shape,index}:{shape?:Shape;index:number}){
  const ref=useRef<HTMLCanvasElement>(null)
  useEffect(()=>{
    const cv=ref.current,ctx=cv?.getContext('2d');if(!cv||!ctx||!shape)return
    const w=cv.width,h=cv.height;ctx.clearRect(0,0,w,h);ctx.globalCompositeOperation='lighter'
    for(let i=0;i<Math.min(shape.xyz.length/3,4300);i++){
      const x=shape.xyz[i*3],y=shape.xyz[i*3+1],z=shape.xyz[i*3+2],p=shape.tint[i*3]
      const d=1+.026*z,k=index===0?15:17.7
      ctx.fillStyle=p>.74?'rgba(242,216,174,.59)':p>.48?'rgba(218,176,219,.58)':'rgba(154,172,242,.62)'
      ctx.fillRect(w*.5+x*k*d,h*(index===0?.44:.51)-y*k*d, .60+(i%9===0?.57:.14),.8)
    }
  },[shape,index])
  return <canvas ref={ref} className="thumb" width="110" height="86" aria-hidden="true"/>
}
