import {BufferAttribute,BufferGeometry,DynamicDrawUsage} from 'three'
import type {Artwork} from '../studio/sampling'

const ease=(x:number)=>x*x*(3-2*x)
const approach=(value:number,target:number,step:number)=>value<target?Math.min(target,value+step):Math.max(target,value-step)
export class ArtworkLayer{
  readonly uniforms={artWeight:{value:0},artBlend:{value:1},artSpread:{value:0},artSpacing:{value:1}}
  active=false
  scattered=false
  private visibility=0
  private transition=1
  private spread=0
  private hasData=false
  private areas=[1,1]
  private positions:BufferAttribute[]
  private colors:BufferAttribute[]
  constructor(geometry:BufferGeometry,count:number){
    const pair=(base:string)=>[0,1].map(i=>{
      const a=new BufferAttribute(new Float32Array(count*3),3).setUsage(DynamicDrawUsage)
      geometry.setAttribute(base+i,a)
      return a
    })
    this.positions=pair('artP');this.colors=pair('artC')
  }
  load(work:Artwork){
    const blend=ease(this.transition)
    // 中途换稿时，以屏幕当时的插值坐标作为新起点；显存缓冲只创建一次。
    const write=(pair:BufferAttribute[],next:Float32Array)=>{
      const from=pair[0].array,to=pair[1].array
      if(this.hasData){for(let i=0;i<from.length;i++)from[i]+=(to[i]-from[i])*blend}
      else from.set(next)
      to.set(next);pair[0].needsUpdate=pair[1].needsUpdate=true
    }
    write(this.positions,work.xyz);write(this.colors,work.rgb)
    this.areas=[this.hasData?this.areas[0]+(this.areas[1]-this.areas[0])*blend:work.area,work.area]
    this.transition=this.hasData?0:1;this.hasData=true;this.active=true;this.scattered=false
  }
  update(dt:number,pixelsPerUnit:number,count:number,ratio:number){
    this.visibility=approach(this.visibility,this.active?1:0,dt/.98)
    this.transition=Math.min(1,this.transition+dt/1.2)
    this.spread=approach(this.spread,this.scattered?1:0,dt/(this.scattered?.90:1.22))
    const u=this.uniforms,b=ease(this.transition)
    u.artWeight.value=ease(this.visibility);u.artBlend.value=b;u.artSpread.value=ease(this.spread)
    const area=this.areas[0]+(this.areas[1]-this.areas[0])*b
    u.artSpacing.value=Math.sqrt(area/count)*pixelsPerUnit*ratio
  }
}