import type {Raster} from './sampling'
export const palettes=[
  {name:'星砂',colors:['#f4d9b2','#d5b6fa','#9adbfa']},
  {name:'晨雾',colors:['#9bdbfb','#d2a7ff','#ffe2c1']},
  {name:'潮汐',colors:['#96f1d7','#80cafa','#a6a8fd']},
  {name:'余晖',colors:['#ffbe81','#fba6bb','#c7a6f6']}
] as const
export type Draft={kind:'text'|'image';text:string;palette:number;file:File|null;removeBackground:boolean;depth:number}
export const initialDraft:Draft={kind:'text',text:'浮光',palette:0,file:null,removeBackground:false,depth:.55}
export type Source={raster:Raster;thumbnail:string;title:string}
function surface(width:number,height:number){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
  const ctx=canvas.getContext('2d',{willReadFrequently:true})
  if(!ctx)throw new Error('浏览器无法读取画布像素。')
  return {canvas,ctx}
}
function readSource(canvas:HTMLCanvasElement,ctx:CanvasRenderingContext2D,title:string):Source{
  const raster=ctx.getImageData(0,0,canvas.width,canvas.height)
  if(!raster.data.some((alpha,i)=>i%4===3&&alpha>15))throw new Error('画面中没有可见像素。请调整输入或关闭去底。')
  const ratio=Math.min(1,340/Math.max(canvas.width,canvas.height))
  const thumb=surface(Math.max(1,Math.round(canvas.width*ratio)),Math.max(1,Math.round(canvas.height*ratio)))
  thumb.ctx.drawImage(canvas,0,0,thumb.canvas.width,thumb.canvas.height)
  return {raster,thumbnail:thumb.canvas.toDataURL('image/png'),title}
}
export function textSource(value:string,palette:number):Source{
  const text=value.replace(/\r\n?/g,'\n').trim()
  if(!text)throw new Error('先输入想变成粒子的文字。')
  const {canvas,ctx}=surface(960,624)
  const font='600 80px "Microsoft YaHei","Segoe UI",sans-serif'
  ctx.font=font
  const paragraphs=text.split('\n')
  const budget=Math.max(560,Math.sqrt(paragraphs.reduce((sum,line)=>sum+ctx.measureText(line).width,0)*155))
  const lines:string[]=[]
  const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null
  for(const line of paragraphs){
    if(ctx.measureText(line).width<=budget){lines.push(line);continue}
    let part='',width=0
    const chars=segmenter?Array.from(segmenter.segment(line),s=>s.segment):Array.from(line)
    for(const char of chars){
      const advance=ctx.measureText(char).width
      if(part&&width+advance>budget){lines.push(part);part='';width=0}
      part+=char;width+=advance
    }
    lines.push(part)
  }
  const metrics=lines.map(s=>ctx.measureText(s))
  const widest=metrics.reduce((v,m)=>Math.max(v,m.width,m.actualBoundingBoxLeft+m.actualBoundingBoxRight),1)
  const ascent=metrics.reduce((v,m)=>Math.max(v,m.actualBoundingBoxAscent),70)
  const descent=metrics.reduce((v,m)=>Math.max(v,m.actualBoundingBoxDescent),14)
  const leading=Math.max(105,ascent+descent+12),block=ascent+descent+(lines.length-1)*leading
  const scale=Math.min(924/(widest+12),584/block)
  ctx.translate(canvas.width/2,(canvas.height-block*scale)/2);ctx.scale(scale,scale);ctx.textAlign='center'
  const grad=ctx.createLinearGradient(-widest/2,0,widest/2,block*.48)
  palettes[palette].colors.forEach((color,i)=>grad.addColorStop(i/2,color));ctx.fillStyle=grad
  lines.forEach((s,i)=>ctx.fillText(s,0,ascent+i*leading))
  return readSource(canvas,ctx,text.split('\n').find(s=>s.trim())!.trim())
}
// 只移除从画面外沿连通的底色，保留主体内部的同色区域。
export function clearEdgeBackground({width:w,height:h,data}:Raster){
  const corners=[0,w-1,(h-1)*w,w*h-1].filter(i=>data[4*i+3]>200)
  if(corners.length<2)return
  const matches=(a:number,b:number)=>Math.max(
    Math.abs(data[4*a]-data[4*b]),Math.abs(data[4*a+1]-data[4*b+1]),Math.abs(data[4*a+2]-data[4*b+2]))<30
  const votes=(p:number)=>corners.filter(c=>matches(p,c)).length
  const bg=corners.reduce((best,c)=>votes(c)>votes(best)?c:best)
  if(votes(bg)<2)throw new Error('图片边缘没有一致的底色，可关闭去底以保留原图。')
  const queue=new Uint32Array(w*h)
  let read=0,written=0
  const visit=(i:number)=>{
    if(data[i*4+3]&&matches(i,bg)){data[i*4+3]=0;queue[written++]=i}
  }
  for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x)}
  for(let y=0;y<h;y++){visit(y*w);visit(y*w+w-1)}
  while(read<written){
    const i=queue[read++],x=i%w
    if(x>0)visit(i-1);if(x<w-1)visit(i+1)
    if(i>=w)visit(i-w);if(i<(h-1)*w)visit(i+w)
  }
}
export async function imageSource(file:File,removeBackground:boolean):Promise<Source>{
  const url=URL.createObjectURL(file)
  try{
    const image=new Image();image.src=url
    try{await image.decode()}catch{throw new Error('图片无法解码，请使用浏览器能打开的 PNG、JPEG 或 WebP 等格式。')}
    const scale=Math.min(1,768/Math.max(image.naturalWidth,image.naturalHeight))
    const {canvas,ctx}=surface(Math.max(1,Math.round(image.naturalWidth*scale)),Math.max(1,Math.round(image.naturalHeight*scale)))
    ctx.drawImage(image,0,0,canvas.width,canvas.height)
    if(removeBackground){
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height)
      clearEdgeBackground(pixels)
      ctx.putImageData(pixels,0,0)
    }
    return readSource(canvas,ctx,file.name.replace(/\.[^.]+$/,'')||'图像作品')
  }finally{URL.revokeObjectURL(url)}
}
