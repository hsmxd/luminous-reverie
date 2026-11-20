export class ParticleMorph {
  readonly weights = new Float32Array([1,0,0,0])
  private start = new Float32Array(this.weights)
  private elapsed = 1
  private target = 0
  select(index:number) {
    if(index===this.target)return
    this.start.set(this.weights); this.target=index; this.elapsed=0
  }
  update(dt:number,duration=1.55){
    this.elapsed=Math.min(1,this.elapsed+dt/duration)
    const x=this.elapsed, k=x*x*(3-2*x)
    for(let i=0;i<4;i++)this.weights[i]=this.start[i]*(1-k)+(i===this.target?k:0)
  }
}
