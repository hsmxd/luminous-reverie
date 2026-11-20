export const settings = { initial: 18000, min: 5000, max: 40000, morphSeconds: 1.55, inferenceHz: 30 }
export const forms = [
  {name:'Dandelion', cn:'蒲公英', line:'在星尘之间，吹散一朵微光。', detail:'细小的种子沿着银丝摇曳，随你的动作飘散、重聚。'},
  {name:'Butterfly', cn:'蝴蝶', line:'一双光翼，在静夜里舒展。', detail:'羽翼上的光点随振翅明灭，跟随你的手掌流动。'},
  {name:'Flower of Light', cn:'光之花', line:'层层花瓣，在呼吸之间绽放。', detail:'轻轻收拢指尖，再松开，让光从花心向外生长。'},
  {name:'Moon Ring', cn:'月之星环', line:'让一弯新月，沿你的指尖运行。', detail:'双手拉开星环，改变两掌的相对角度，让轨道倾转。'}
] as const
export const clamp = (v:number, min:number, max:number) => Math.max(min,Math.min(max,v))
