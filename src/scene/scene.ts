import * as T from 'three'
import {settings,clamp} from '../config'
import {createForms,dandelionThreads,type Shape} from '../particles/shapes'
import {ArtworkLayer} from '../particles/artwork-layer'
import type {Artwork} from '../studio/sampling'
import {ParticleMorph} from '../particles/morph'
import {InteractionManager} from '../interaction/manager'
import * as sh from '../shaders/art'
import {nightSky} from './sky'
export type Stats={fps:number;count:number;bloom:boolean}
export class ArtScene{
  readonly shapes:Shape[]
  readonly input=new InteractionManager()
  private morph=new ParticleMorph()
  private gl:T.WebGLRenderer
  private scene=new T.Scene()
  private camera=new T.PerspectiveCamera(39,1,.1,75)
  private postScene=new T.Scene()
  private flat=new T.Camera()
  private post:T.ShaderMaterial
  private target:T.WebGLRenderTarget
  private geometry=new T.BufferGeometry()
  private art:ArtworkLayer
  private mat:T.ShaderMaterial
  private stars:T.ShaderMaterial
  private trail:T.ShaderMaterial
  private trailGeometry=new T.BufferGeometry()
  private trackPos=new Float32Array(768*3)
  private born=new Float32Array(768).fill(-100)
  private trailIndex=0
  private oldX=0;private oldY=0;private wasActive=false
  private observer:ResizeObserver
  private raf=0;private last=0;private time=0;private paused=false;private disposed=false
  private width=1;private height=1;private viewWidth=1;private viewHeight=1
  private originX=0;private originY=0
  private cap:number=settings.initial;private count:number=settings.initial
  private elapsed=0;private frames=0;private slow=0;private fast=0
  private ratio=1;private bloom=true;private power=1
  constructor(private host:HTMLElement,private report:(stats:Stats)=>void,private lost:()=>void){
    this.gl=new T.WebGLRenderer({alpha:false,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:false})
    this.gl.setClearColor(0x080a16);this.gl.outputColorSpace=T.LinearSRGBColorSpace
    this.scene.background=nightSky();this.camera.position.z=12
    this.shapes=createForms(settings.max)
    const rand=new Float32Array(settings.max)
    for(let i=0;i<rand.length;i++)rand[i]=((Math.imul(i+1,2654435761)>>>0)%65521)/65521
    this.shapes.forEach((shape,i)=>{
      this.geometry.setAttribute(i?'a'+i:'position',new T.BufferAttribute(shape.xyz,3))
      this.geometry.setAttribute('c'+i,new T.BufferAttribute(shape.tint,3))
    })
    this.geometry.setAttribute('seed',new T.BufferAttribute(rand,1))
    this.art=new ArtworkLayer(this.geometry,settings.max)
    const u={...this.art.uniforms,time:{value:0},weights:{value:this.morph.weights},pointScale:{value:1},power:{value:1},burst:{value:20},ripple:{value:20},field:{value:0},gather:{value:0},scale:{value:1},tilt:{value:0},turn:{value:0},origin:{value:new T.Vector2()},hand:{value:new T.Vector2()},wave:{value:new T.Vector2()},velocity:{value:new T.Vector2()}}
    this.mat=new T.ShaderMaterial({defines:{ARTWORK:1},vertexShader:sh.vertex,fragmentShader:sh.fragment,uniforms:u,transparent:true,blending:T.AdditiveBlending,depthWrite:false})
    const main=new T.Points(this.geometry,this.mat);main.frustumCulled=false;this.scene.add(main)
    const fibers=dandelionThreads(),fiberGeo=new T.BufferGeometry()
    const coords=new T.BufferAttribute(fibers.xyz,3),pigment=new T.BufferAttribute(fibers.tint,3)
    for(const key of ['position','a1','a2','a3'])fiberGeo.setAttribute(key,coords)
    for(const key of ['c0','c1','c2','c3'])fiberGeo.setAttribute(key,pigment)
    fiberGeo.setAttribute('seed',new T.BufferAttribute(fibers.seeds,1))
    const fiberMat=new T.ShaderMaterial({uniforms:u,vertexShader:sh.vertex,fragmentShader:
      'varying vec3 ink;varying float alpha;uniform vec4 weights;uniform float gather,burst,artWeight;void main(){gl_FragColor=vec4(ink,alpha*(1.-artWeight)*weights.x*weights.x*(1.-.92*gather)*(1.-.85*exp(-burst*1.4)));}',
      transparent:true,blending:T.AdditiveBlending,depthWrite:false})
    const fibersObject=new T.LineSegments(fiberGeo,fiberMat);fibersObject.frustumCulled=false;this.scene.add(fibersObject)
    const starGeo=new T.BufferGeometry(),n=2100,stars=new Float32Array(n*3)
    const random=(i:number)=>{const x=Math.sin(i*127.1+37.2)*43758.5453;return x-Math.floor(x)}
    for(let i=0;i<n;i++){stars[i*3]=(random(i*3)-.5)*42;stars[i*3+1]=(random(i*3+1)-.5)*25;stars[i*3+2]=-1-random(i*3+2)*15}
    starGeo.setAttribute('position',new T.BufferAttribute(stars,3));starGeo.setAttribute('seed',new T.BufferAttribute(rand.slice(0,n),1))
    const glowOptions={transparent:true,blending:T.AdditiveBlending,depthWrite:false}
    this.stars=new T.ShaderMaterial({...glowOptions,vertexShader:sh.starVertex,fragmentShader:sh.starFrag,uniforms:{time:{value:0},pointScale:{value:1}}})
    const sky=new T.Points(starGeo,this.stars);sky.frustumCulled=false;this.scene.add(sky)
    this.trailGeometry.setAttribute('position',new T.BufferAttribute(this.trackPos,3).setUsage(T.DynamicDrawUsage))
    this.trailGeometry.setAttribute('born',new T.BufferAttribute(this.born,1).setUsage(T.DynamicDrawUsage))
    this.trailGeometry.setAttribute('seed',new T.BufferAttribute(rand.slice(0,768),1))
    this.trail=new T.ShaderMaterial({...glowOptions,vertexShader:sh.trailVertex,fragmentShader:sh.trailFrag,uniforms:{time:{value:0},pointScale:{value:1}}})
    const trail=new T.Points(this.trailGeometry,this.trail);trail.frustumCulled=false;this.scene.add(trail)
    this.target=new T.WebGLRenderTarget(1,1,{depthBuffer:false,stencilBuffer:false})
    this.post=new T.ShaderMaterial({uniforms:{frame:{value:this.target.texture},pixel:{value:new T.Vector2()}},vertexShader:sh.postVert,fragmentShader:sh.postFrag,depthWrite:false,depthTest:false})
    this.postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),this.post))
    host.appendChild(this.gl.domElement);this.gl.domElement.addEventListener('webglcontextlost',this.contextLost)
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host)
    document.addEventListener('visibilitychange',this.visibility);this.resize();this.loop()
  }
  select(index:number){
    this.art.active=index===4
    if(index<4)this.morph.select(index)
    if(this.paused){this.morph.update(2);this.art.update(2,this.height/this.viewHeight,this.count,this.ratio);this.draw(0,performance.now())}
  }
  loadArtwork(work:Artwork){this.art.load(work);this.input.reset()}
  scatterArtwork(scatter:boolean){this.art.scattered=scatter}
  density(cap:number){this.cap=cap;this.count=cap;this.slow=this.fast=0;if(this.paused)this.draw(0,performance.now())}
  intensity(value:number){this.power=value}
  pause(value:boolean){this.paused=value;this.visibility()}
  private resize(){
    this.width=this.host.clientWidth||1;this.height=this.host.clientHeight||1
    this.ratio=Math.min(window.devicePixelRatio||1,this.bloom?1.65:1.1)
    this.gl.setPixelRatio(this.ratio);this.gl.setSize(this.width,this.height,false)
    this.target.setSize(Math.max(1,Math.round(this.width*this.ratio)),Math.max(1,Math.round(this.height*this.ratio)))
    this.post.uniforms.pixel.value.set(1/this.target.width,1/this.target.height)
    this.camera.aspect=this.width/this.height
    const mobile=this.width<760
    const desired=Math.min(this.height*(mobile?.45:.66),this.width*(mobile?.91:.52))
    this.viewHeight=this.height*4.92/desired;this.viewWidth=this.viewHeight*this.camera.aspect
    this.camera.fov=T.MathUtils.radToDeg(2*Math.atan(this.viewHeight/24));this.camera.updateProjectionMatrix()
    this.originX=(mobile?.035:.145)*this.viewWidth;this.originY=(mobile?.006:.044)*this.viewHeight
    if(this.paused)this.draw(0,performance.now())
  }
  private contextLost=(e:Event)=>{e.preventDefault();this.pause(true);this.lost()}
  private visibility=()=>{cancelAnimationFrame(this.raf);this.last=0;this.frames=0;this.elapsed=0;if(!this.paused&&!document.hidden&&!this.disposed)this.loop()}
  private loop=()=>{
    if(this.disposed||this.paused||document.hidden)return
    const now=performance.now(),real=this.last?(now-this.last)/1000:0;this.last=now
    this.draw(Math.min(.07,real),now)
    if(real>0){this.frames++;this.elapsed+=real}
    if(this.elapsed>=1.2){
      const fps=Math.round(this.frames/this.elapsed);this.frames=0;this.elapsed=0
      this.slow=fps<39?this.slow+1:0;this.fast=fps>55?this.fast+1:0
      if(this.slow>=2){this.count=Math.max(settings.min,Math.round(this.count*.81/100)*100);if(this.bloom){this.bloom=false;this.resize()}this.slow=0}
      else if(this.fast>=5){this.count=Math.min(this.cap,this.count+1000);if(!this.bloom&&this.count===this.cap){this.bloom=true;this.resize()}this.fast=0}
      this.report({fps,count:this.count,bloom:this.bloom})
    }
    this.raf=requestAnimationFrame(this.loop)
  }
  private draw(dt:number,now:number){
    this.time+=dt;this.input.update(dt,now);this.morph.update(dt,settings.morphSeconds)
    this.art.update(dt,this.height/this.viewHeight,this.count,this.ratio)
    const m=this.input.current,u=this.mat.uniforms
    u.time.value=this.time;u.pointScale.value=this.ratio*clamp(this.height/800,.79,1.35)
    u.power.value=this.power;u.burst.value=this.input.burstAge;u.ripple.value=this.input.rippleAge;u.field.value=m.field;u.gather.value=m.gather
    u.scale.value=m.scale;u.tilt.value=m.tilt;u.turn.value=m.rotation
    u.origin.value.set(this.originX+m.dx*this.viewWidth,this.originY-m.dy*this.viewHeight)
    const x=(m.x-.5)*this.viewWidth,y=(.5-m.y)*this.viewHeight
    u.hand.value.set(x,y);u.wave.value.set((this.input.rippleX-.5)*this.viewWidth,(.5-this.input.rippleY)*this.viewHeight)
    u.velocity.value.set(m.vx*this.viewWidth,-m.vy*this.viewHeight)
    if(m.field>.08&&dt>0){
      if(!this.wasActive){this.oldX=x;this.oldY=y}
      const steps=Math.min(18,Math.max(2,Math.ceil(Math.hypot(x-this.oldX,y-this.oldY)*24)))
      for(let j=0;j<steps;j++){
        const idx=this.trailIndex++%this.born.length,t=(j+1)/steps
        this.trackPos[idx*3]=this.oldX+(x-this.oldX)*t;this.trackPos[idx*3+1]=this.oldY+(y-this.oldY)*t
        this.trackPos[idx*3+2]=.06*Math.sin(idx*1.8);this.born[idx]=this.time
      }
      this.trailGeometry.attributes.position.needsUpdate=this.trailGeometry.attributes.born.needsUpdate=true
    }
    this.wasActive=m.field>.08;this.oldX=x;this.oldY=y
    this.stars.uniforms.time.value=this.trail.uniforms.time.value=this.time
    this.stars.uniforms.pointScale.value=this.trail.uniforms.pointScale.value=this.ratio
    this.geometry.setDrawRange(0,this.count)
    this.gl.setRenderTarget(this.bloom?this.target:null);this.gl.render(this.scene,this.camera)
    if(this.bloom){this.gl.setRenderTarget(null);this.gl.render(this.postScene,this.flat)}
  }
  dispose(){
    this.disposed=true;cancelAnimationFrame(this.raf);this.observer.disconnect();document.removeEventListener('visibilitychange',this.visibility)
    this.gl.domElement.removeEventListener('webglcontextlost',this.contextLost)
    for(const scene of [this.scene,this.postScene])scene.traverse(obj=>{
      const mesh=obj as T.Mesh;if(mesh.geometry)mesh.geometry.dispose()
      if(mesh.material){const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];materials.forEach(m=>m.dispose())}
    })
    if(this.scene.background instanceof T.Texture)this.scene.background.dispose()
    this.target.dispose();this.gl.dispose();this.gl.forceContextLoss();this.gl.domElement.remove()
  }
}
