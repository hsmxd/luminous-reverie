import {DataTexture,RGBAFormat,LinearFilter} from 'three'

/**
 * 预烘焙低分辨率墨夜星云底图，避免逐帧噪声计算。
 * 色调压低为深邃墨夜黑蓝（#04060d），衬托液态玻璃浮层与发光粒子的高对比度细节。
 */
export function nightSky(){
  const w=448,h=272,data=new Uint8Array(w*h*4)
  const hash=(x:number,y:number)=>{const v=Math.sin(x*127.1+y*311.7)*43758.545312;return v-Math.floor(v)}
  const smooth=(t:number)=>t*t*(3-2*t)
  const noise=(x:number,y:number)=>{
    const i=Math.floor(x),j=Math.floor(y),a=smooth(x-i),b=smooth(y-j)
    return (hash(i,j)*(1-a)+hash(i+1,j)*a)*(1-b)+(hash(i,j+1)*(1-a)+hash(i+1,j+1)*a)*b
  }
  const cloud=(x:number,y:number)=>noise(x,y)*.52+noise(x*2.1+7,y*2.1)*.27+noise(x*4.2,y*4.2+9)*.14+noise(x*8.4,y*8.4)*.07
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const x=i/w,y=j/h,n=cloud(x*5.5+3.9,y*4.4+6.1),ridge=(y-(.34+.22*x+.095*Math.sin(x*6.8)+.08*(n-.5)))
    const ribbon=Math.exp(-ridge*ridge*52)*(.22+.78*smooth(x))*(.28+.75*n)
    const mist=Math.exp(-((x-.56)**2*5.2+(y-.48)**2*4.8))
    const lace=Math.pow(Math.max(0,cloud(x*12+n*3,y*10+n*2)-.34),1.75)
    const teal=Math.exp(-((x-.82)**2*34+(y-.35)**2*26))
    const grain=(hash(i,j)-.5)*1.1,idx=(j*w+i)*4
    data[idx]=Math.max(0,Math.min(255,3+3.2*mist+ribbon*(9+22*lace)+grain))
    data[idx+1]=Math.max(0,Math.min(255,5+2.6*mist+ribbon*(7+16*lace)+teal*4.2+grain))
    data[idx+2]=Math.max(0,Math.min(255,12+6.5*mist+ribbon*(17+34*lace)+teal*7.5+grain))
    data[idx+3]=255
  }
  const texture=new DataTexture(data,w,h,RGBAFormat)
  texture.magFilter=texture.minFilter=LinearFilter
  texture.needsUpdate=true
  return texture
}
