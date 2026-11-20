import test from 'node:test'
import assert from 'node:assert/strict'
import {GestureRecognizer,type Hand,type GestureFrame} from '../src/gestures/recognizer.ts'
import {InteractionManager} from '../src/interaction/manager.ts'
import {ParticleMorph} from '../src/particles/morph.ts'
import {createForms} from '../src/particles/shapes.ts'
const pose=(mode:'open'|'fist'|'pinch'='open',x=.50,y=.50):Hand=>{
  const p=Array.from({length:21},()=>({x,y,z:0}))
  p[0].y+=.12
  for(const [index,dx] of [[5,-.057],[9,-.015],[13,.025],[17,.067]]){
    for(let j=0;j<4;j++){p[index+j]={x:x+dx,y:y+(mode==='fist'?[.0,-.03,-.015,.03][j]:-.044*j),z:0}}
  }
  p[4]={x:x-.128,y:y+.07,z:0}
  if(mode==='pinch')p[4]={...p[8],x:p[8].x-.012}
  return {points:p,score:.98}
}
function rig(){
 const g=new GestureRecognizer();let now=0
 const frames=(hands:Hand[],n:number)=>{const history:GestureFrame[]=[];for(let i=0;i<n;i++){now+=50;history.push(g.update(hands,now))}return history}
 return {g,frames}
}
test('all four geometries are finite and represented throughout low-density prefixes',()=>{
 const all=createForms(40000);assert.equal(all.length,4)
 for(const s of all){
  assert.equal(s.xyz.length,120000);assert.ok(s.xyz.every(Number.isFinite));assert.ok(s.tint.every(Number.isFinite))
  const ys=s.xyz.slice(0,15000).filter((_,i)=>i%3===1);assert.ok(Math.max(...ys)-Math.min(...ys)>2)
 }
})
test('interrupted morph remains continuous and finishes on the requested original pool',()=>{
 const m=new ParticleMorph();m.select(1);m.update(.5);const before=Array.from(m.weights)
 m.select(3);m.update(0);assert.deepEqual(Array.from(m.weights),before);m.update(.6)
 assert.ok(Math.abs(m.weights.reduce((a,b)=>a+b,0)-1)<1e-6);m.update(2);assert.deepEqual(Array.from(m.weights),[0,0,0,1])
})
test('open palm, pinch, confidence gate and loss',()=>{
 const {frames}=rig();const open=frames([pose()],8).at(-1)!
 assert.equal(open.name,'手掌引导');assert.equal(open.motion.field,1)
 const pinch=frames([pose('pinch')],10).at(-1)!;assert.equal(pinch.name,'指尖聚集');assert.ok(pinch.motion.gather>.85)
 assert.equal(frames([{...pose(),score:.28}],1)[0].motion.gather,1)
 assert.equal(frames([],5).at(-1)?.motion.gather,0)
})
test('a stable fist must precede a burst; a held open palm fires one ripple',()=>{
 const {frames}=rig();const first=frames([pose()],35)
 assert.equal(first.filter(f=>f.event==='ripple').length,1);assert.equal(first.filter(f=>f.event==='burst').length,0)
 assert.equal(frames([pose('fist')],12).at(-1)?.name,'握拳蓄能')
 assert.equal(frames([pose()],12).filter(f=>f.event==='burst').length,1)
})
test('fast mirrored swipe switches once; slow movements do not switch',()=>{
 for(const dir of [-1,1]){
  const {frames}=rig();frames([pose()],10)
  const motion=Array.from({length:7},(_,i)=>frames([pose('open',.5-dir*i*.068)],1)[0])
  assert.equal(motion.filter(f=>f.event===(dir>0?'next':'prev')).length,1)
 }
 const {frames}=rig();frames([pose()],10)
 for(let i=0;i<32;i++)assert.ok(!['next','prev'].includes(frames([pose('open',.5+i*.007)],1)[0].event??''))
})
test('moderate 19%-width sweep over 300 ms works after a stationary lead-in',()=>{
 const {frames}=rig();frames([pose('open',.60)],15)
 const events=Array.from({length:7},(_,i)=>frames([pose('open',.6-i*.032)],1)[0].event)
 assert.equal(events.filter(e=>e==='next').length,1)
 // The reverse stroke inside the cooldown must not immediately undo the selection.
 assert.ok(Array.from({length:7},(_,i)=>frames([pose('open',.408+i*.032)],1)[0]).every(f=>f.event!=='prev'))
})
test('12%-width natural swipe survives one missed frame and a change in palm pose',()=>{
 const {frames}=rig();frames([pose('open',.64)],9)
 const stroke:GestureFrame[]=[]
 for(let i=0;i<7;i++)stroke.push(frames(i===3?[]:[pose(i<2?'open':'fist',.64-i*.020)],1)[0])
 assert.equal(stroke.filter(f=>f.event==='next').length,1)
})
test('a pinched sphere follows the fingertip midpoint through a fast drag and tracking gap',()=>{
 const {frames}=rig()
 const start=frames([pose('pinch',.64)],10).at(-1)!
 assert.equal(start.name,'指尖聚集')
 assert.equal(start.motion.x,1-(.64-.057-.006))
 assert.ok(Math.abs(start.motion.y-(.5-.132))<.001)
 const drag=Array.from({length:7},(_,i)=>{
  const hand=pose('pinch',.64-i*.042,.5+i*.022)
  hand.points[4].x-=.042 // Vary the perceived gap as the fingers rotate.
  hand.points[4].z=.04
  return frames(i===3?[]:[hand],1)[0]
 })
 assert.ok(drag.every(f=>f.name==='指尖聚集'&&f.motion.gather===1&&f.event===undefined))
 assert.equal(drag[3].motion,drag[2].motion)
 assert.ok(drag.at(-1)!.motion.x-start.motion.x>.23)
 assert.ok(drag.at(-1)!.motion.y-start.motion.y>.10)
 const release=frames([pose('open',.39,.63)],8)
 assert.equal(release.at(-1)?.name,'手掌引导')
 assert.equal(release.at(-1)?.motion.gather,0)
 assert.ok(release.every(f=>!f.event))
})
test('fast pinch tracking reduces lag and stays stable on stop and jitter',()=>{
 const g=new GestureRecognizer(),input=new InteractionManager()
 const renderEvery=1000/120, sampleEvery=40, inferenceDelay=24
 const anchorX=(t:number)=>.30+.95*Math.max(0,Math.min(t-500,400))/1000
 let sampledAt=0,error=0,movingFrames=0,overshoot=0,jitter=0
 for(let frame=0;frame<200;frame++){
   const now=frame*renderEvery
   if(sampledAt+inferenceDelay<=now){
     const noise=sampledAt>1250?(sampledAt%80===0?.004:-.004):0
     const measured=pose('pinch',1-anchorX(sampledAt)+.063-noise)
     input.accept(g.update([measured],sampledAt),now,sampledAt)
     sampledAt+=sampleEvery
   }
   input.update(renderEvery/1000,now)
   const delta=input.current.x-anchorX(now)
   if(now>=600&&now<=900){error+=Math.abs(delta);movingFrames++}
   if(now>=900&&now<1100)overshoot=Math.max(overshoot,delta)
   if(now>=1400)jitter=Math.max(jitter,Math.abs(delta))
 }
 assert.ok(error/movingFrames<.055,'the sphere should stay within 5.5% of the moving range width on average')
 assert.ok(overshoot<.02,'the sphere should settle close to an abrupt stop')
 assert.ok(jitter<.0015,'stationary sensor noise should be damped')
})
test('ordinary continuous guiding motion does not select another sculpture',()=>{
 const {frames}=rig();frames([pose('open',.72)],10)
 for(let i=0;i<26;i++)assert.ok(!['next','prev'].includes(frames([pose('open',.72-i*.0145)],1)[0].event??''))
})
test('two-hand priority, order independence, scale, translation, tilt and release',()=>{
 const {frames}=rig();const a=pose('open',.34),b=pose('open',.66)
 assert.equal(frames([a,b],8).at(-1)?.name,'双手塑形')
 const reversed=frames([b,a],3).at(-1)!;assert.ok(Math.abs(reversed.motion.rotation)<.01)
 const out=frames([pose('open',.27,.45),pose('open',.79,.57)],8).at(-1)!
 assert.ok(out.motion.scale>1.35);assert.ok(Math.abs(out.motion.rotation)>.1&&Math.abs(out.motion.tilt)>.1)
 assert.ok(Math.abs(out.motion.dx)>.01);assert.equal(out.motion.field,0);assert.equal(out.event,undefined)
 assert.equal(frames([a],1)[0].hands,0);assert.equal(frames([a],8).at(-1)?.name,'手掌引导')
})
