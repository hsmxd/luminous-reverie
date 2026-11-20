// Classic worker: this SDK's WASM loader uses importScripts. One transferable frame at a time.
self.exports = {}
let tracker
self.onmessage = async ({data}) => {
  try {
    if(data.type === 'init'){
      importScripts('./vision/vision-runtime.js')
      const {FilesetResolver,HandLandmarker} = self.exports
      const files = await FilesetResolver.forVisionTasks(new URL('./vision/wasm', self.location.href).href)
      tracker = await HandLandmarker.createFromOptions(files,{
        baseOptions:{modelAssetPath:new URL('./models/hand_landmarker.task',self.location.href).href,delegate:'CPU'},
        canvas:new OffscreenCanvas(1,1),runningMode:'VIDEO',numHands:2,
        minHandDetectionConfidence:.55,minHandPresenceConfidence:.5,minTrackingConfidence:.55
      })
      self.postMessage({type:'ready'})
    }else if(data.type==='frame'){
      try {
        const result=tracker.detectForVideo(data.bitmap,data.time)
        self.postMessage({type:'result',hands:result.landmarks.map((points,i)=>({points,score:result.handedness[i]?.[0]?.score??0}))})
      }finally{data.bitmap.close()}
    }else if(data.type==='close'){tracker?.close();self.close()}
  }catch(error){self.postMessage({type:'error',message:String(error)})}
}
