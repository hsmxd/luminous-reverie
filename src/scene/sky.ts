import {DataTexture,RGBAFormat,LinearFilter} from 'three'
// Low-resolution seeded dust clouds are baked once, keeping noise evaluation off the frame loop.
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
   const x=i/w,y=j/h, n=cloud(x*5.5+3.9,y*4.4+6.1), ridge=(y-(.32+.26*x+.105*Math.sin(x*7.2)+.09*(n-.5)))
   const ribbon=Math.exp(-ridge*ridge*48)*(.27+.73*smooth(x))*(.33+.80*n)
   const mist=Math.exp(-((x-.62)**2*6+(y-.51)**2*5)),lace=Math.pow(Math.max(0,cloud(x*12+n*3,y*10+n*2)-.32),1.7)
   const teal=Math.exp(-((x-.85)**2*38+(y-.37)**2*29))
   const grain=(hash(i,j)-.5)*1.4,idx=(j*w+i)*4
   data[idx]=5+5*mist+ribbon*(14+32*lace)+grain
   data[idx+1]=7+3*mist+ribbon*(8+18*lace)+teal*5+grain
   data[idx+2]=18+8*mist+ribbon*(24+46*lace)+teal*8+grain
   data[idx+3]=255
 }
 const texture=new DataTexture(data,w,h,RGBAFormat);texture.magFilter=texture.minFilter=LinearFilter;texture.needsUpdate=true;return texture
}
