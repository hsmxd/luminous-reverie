// Serve the model runtime from the same origin; the camera never needs a CDN.
import { cp, mkdir } from 'node:fs/promises'
await mkdir('public/vision', {recursive:true})
await cp('node_modules/@mediapipe/tasks-vision/wasm', 'public/vision/wasm', {recursive:true})
await cp('node_modules/@mediapipe/tasks-vision/vision_bundle.cjs', 'public/vision/vision-runtime.js')

