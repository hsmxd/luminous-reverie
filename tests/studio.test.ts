import assert from 'node:assert/strict'
import test from 'node:test'
import {sampleRaster} from '../src/studio/sampling.ts'
import {clearEdgeBackground} from '../src/studio/source.ts'
import {StudioGesture} from '../src/studio/gesture.ts'
import {GestureRecognizer,neutral,type GestureFrame,type Hand} from '../src/gestures/recognizer.ts'
test('彩色透明图仅采样可见像素，各绘制档位覆盖两端',()=>{
  const width=9,data=new Uint8ClampedArray(width*4)
  data.set([255,0,0,255],0);data.set([0,255,0,255],32)
  const s=sampleRaster({width,height:1,data},40000,1)
  for(const n of [5000,18000,40000]){
    let red=0,green=0
    for(let i=0;i<n;i++){
      const x=s.xyz[i*3];assert.ok(Math.abs(x)>1.7)
      if(x<0){red++;assert.ok(s.rgb[i*3]>.9)}else{green++;assert.ok(s.rgb[i*3+1]>.9)}
    }
    assert.ok(Math.abs(red-green)<8)
  }
})
test('相同素材采样可复现，零浮雕深度为平面，空图给出可操作错误',()=>{
  const source={width:1,height:1,data:new Uint8ClampedArray([18,50,80,255])}
  const a=sampleRaster(source,500,0),b=sampleRaster(source,500,1)
  assert.deepEqual(a.rgb,b.rgb)
  assert.deepEqual(a.xyz,sampleRaster(source,500,0).xyz)
  assert.ok(a.xyz.every((v,i)=>i%3!==2||v===0));assert.ok(b.xyz.some((v,i)=>i%3===2&&Math.abs(v)>.1))
  assert.throws(()=>sampleRaster({...source,data:new Uint8ClampedArray(4)},100,1),/没有可采样/)
})
test('连通去底保留封闭轮廓内部的白色细节及已有透明边缘',()=>{
  const data=new Uint8ClampedArray(7*7*4).fill(255)
  for(let y=1;y<6;y++)for(let x=1;x<6;x++)if(x===1||x===5||y===1||y===5)data.set([160,20,35,255],4*(y*7+x))
  const img={width:7,height:7,data}
  clearEdgeBackground(img)
  assert.equal(data[3],0);assert.equal(data[4*(3*7+3)+3],255);assert.equal(data[4*(3*7+1)+3],255)
  const after=data.slice();clearEdgeBackground(img);assert.deepEqual(data,after)
})
test('张掌与握拳需要持续确认；双手或中途丢手会取消，保持手势只触发一次',()=>{
  const g=new StudioGesture(),frame:GestureFrame={hands:1,name:'手掌引导',motion:neutral()}
  const collect=(start:number,n:number,f:GestureFrame)=>Array.from({length:n},(_,i)=>g.update(f,start+50*i)).filter(Boolean)
  assert.deepEqual(collect(0,6,frame),[])
  assert.deepEqual(collect(300,4,{...frame,hands:2,name:'双手塑形'}),[])
  assert.deepEqual(collect(500,20,frame),['scatter'])
  assert.deepEqual(collect(1600,4,{...frame,name:'握拳蓄能'}),[])
  assert.deepEqual(collect(1800,2,{...frame,hands:0,name:'等待手势'}),[])
  assert.deepEqual(collect(1900,20,{...frame,name:'握拳蓄能'}),['reform'])
})
test('创作模式以实际食指尖为锚点，并保持镜像一致',()=>{
  const points=Array.from({length:21},()=>({x:.5,y:.5,z:0}))
  points[0].y=.63
  for(const [base,dx] of [[5,-.05],[9,-.01],[13,.02],[17,.05]]){
    for(let i=0;i<4;i++)points[base+i]={x:.5+dx,y:.5+(base===5?-i*.045:[0,-.03,-.01,.04][i]),z:0}
  }
  points[4]={x:.34,y:.54,z:0}
  const h:Hand={points,score:.99},g=new GestureRecognizer()
  let f=g.update([h],0,1,4/3,true)
  for(let t=50;t<=450;t+=50)f=g.update([h],t,1,4/3,true)
  assert.equal(f.name,'指尖拨动');assert.equal(f.motion.x,1-points[8].x);assert.equal(f.motion.y,points[8].y)
})
