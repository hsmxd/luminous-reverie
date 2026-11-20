export type Raster = {width:number;height:number;data:Uint8ClampedArray}
export type Artwork = {xyz:Float32Array;rgb:Float32Array;area:number;title:string;kind:'text'|'image';thumbnail:string}
type PointCloud = Pick<Artwork,'xyz'|'rgb'|'area'>

// 使用低差异序列取样，降低粒子数量时，前面的粒子仍能覆盖整幅作品。
export function sampleRaster(source:Raster,count:number,depth:number):PointCloud{
  const {width,height,data}=source
  const cumulative=new Float64Array(width*height)
  let left=width,right=-1,top=height,bottom=-1,total=0
  // 沿 Morton 曲线遍历像素，使相邻概率区间在二维平面上也相邻。
  let side=1,used=0
  while(side<Math.max(width,height))side*=2
  const pixels=new Uint32Array(width*height)
  const compact=(v:number)=>{
    v&=0x55555555;v=(v|(v>>>1))&0x33333333;v=(v|(v>>>2))&0x0f0f0f0f
    v=(v|(v>>>4))&0x00ff00ff;return (v|(v>>>8))&0xffff
  }
  for(let cell=0;cell<side*side;cell++){
    const x=compact(cell),y=compact(cell>>>1)
    if(x>=width||y>=height)continue
    const i=y*width+x,alpha=data[i*4+3]/255
    if(alpha>.06){
      total+=alpha;pixels[used]=i;cumulative[used++]=total
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)
    }
  }
  if(!total)throw new Error('没有可采样的像素。请更换内容，或关闭背景过滤。')
  const unit=Math.min(4.52/(right-left+1),3.25/(bottom-top+1))
  const cx=(left+right+1)/2,cy=(top+bottom+1)/2
  const xyz=new Float32Array(count*3),rgb=new Float32Array(count*3)
  let state=0x735b0def
  const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296}
  for(let i=0;i<count;i++){
    const target=((.5+i*.6180339887498949)%1)*total
    let lo=0,hi=used-1
    while(lo<hi){const mid=(lo+hi)>>>1;if(cumulative[mid]>target)hi=mid;else lo=mid+1}
    const pixel=pixels[lo],p=pixel*4,o=i*3
    const r=data[p]/255,g=data[p+1]/255,b=data[p+2]/255
    const light=r*.2126+g*.7152+b*.0722
    const jx=random(),jy=random()
    xyz[o]=(pixel%width+jx-cx)*unit
    xyz[o+1]=(cy-Math.floor(pixel/width)-jy)*unit
    xyz[o+2]=depth*((light-.5)*.86+(random()-.5)*.10)
    rgb[o]=.035+.94*r;rgb[o+1]=.04+.93*g;rgb[o+2]=.055+.92*b
  }
  return {xyz,rgb,area:total*unit*unit}
}
