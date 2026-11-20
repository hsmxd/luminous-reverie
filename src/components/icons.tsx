import type {ReactNode} from 'react'

export type IconName=
  |'camera'|'cameraOff'|'settings'|'full'|'exitFull'|'book'|'play'|'pause'|'close'
  |'cursor'|'hand'|'pinch'|'burst'|'wave'|'dual'|'back'|'check'|'orbit'|'studio'
  |'image'|'eye'|'eyeOff'|'edit'

const paths:Record<IconName,ReactNode>={
  studio:<><path d="m12 2 2.1 6.5L21 11l-6.9 2.4L12 20l-2.1-6.6L3 11l6.9-2.5Z"/><path d="m19 3 .7 2.3L22 6l-2.3.7L19 9l-.7-2.3L16 6l2.3-.7Z"/></>,
  image:<><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.6"/><path d="m4 17 5-5 3 3 3-4 5 6"/></>,
  camera:<><rect x="3" y="6" width="12" height="12" rx="3"/><path d="m15 10 5-3v10l-5-3"/></>,
  cameraOff:<><path d="m3 3 18 18M10 6h3a2 2 0 0 1 2 2v2l5-3v10l-3-2M15 17a2 2 0 0 1-2 1H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2"/></>,
  settings:<><path d="M4 7h6m4 0h6M4 17h10m4 0h2"/><circle cx="12" cy="7" r="2"/><circle cx="16" cy="17" r="2"/></>,
  full:<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>,
  exitFull:<path d="M4 9h5V4m11 5h-5V4M9 20v-5H4m11 5v-5h5"/>,
  book:<><path d="M12 6c-3-2-6-2-9-1v13c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Z"/><path d="M12 6v13"/></>,
  play:<path d="m8 5 11 7-11 7Z"/>,
  pause:<><path d="M8 5v14m8-14v14" strokeWidth="2.4"/></>,
  close:<path d="m6 6 12 12M18 6 6 18"/>,
  cursor:<path d="m5 3 14 10-7 1-3 6Z"/>,
  hand:<path d="M7 12V7c0-2 3-2 3 0v4-7c0-2 3-2 3 0v7-5c0-2 3-2 3 0v6-3c0-2 3-2 3 0v5c0 4-2 7-6 7-3 0-5-1-7-4l-3-4c-1-2 1-3 2-2l2 2"/>,
  pinch:<><path d="m5 9 4-5c2-2 5 0 3 2L9 9m-4 3 6-2c1-1 2-3 4-2 1 1 0 3-1 4l-3 5m2 3c4-1 6-4 7-8"/><circle cx="5" cy="11" r="1"/></>,
  burst:<path d="m12 2 1.5 7 6-4-4.5 6.5L22 13l-7 1.5 4 6-6-4.5L11 23l-1-7-6 4 4-6-7-2 7-1.5-4-6 6 4Z"/>,
  wave:<><circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="6"/><path d="M4 5a10 10 0 0 0 0 14m16-14a10 10 0 0 1 0 14"/></>,
  dual:<><path d="M2 9v5c0 3 2 5 5 5h1V9c0-2-2-2-2 0v3-6M22 9v5c0 3-2 5-5 5h-1V9c0-2 2-2 2 0v3-6"/></>,
  back:<path d="M9 5 3 11l6 6m-5-6h10c4 0 6 2 6 6"/>,
  check:<path d="m5 12 4 4L19 6"/>,
  orbit:<><circle cx="12" cy="12" r="6"/><ellipse cx="12" cy="12" rx="11" ry="3" transform="rotate(-30 12 12)"/></>,
  eye:<><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.7"/></>,
  eyeOff:<><path d="m3 3 18 18"/><path d="M10.6 5.7A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16.8 16.8 0 0 1-3.3 4.2M6.2 7.2A16.5 16.5 0 0 0 2.5 12s3.5 6.5 9.5 6.5c1.5 0 2.8-.3 4-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>,
  edit:<><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></>
}

export function Icon({name,size=18}:{name:IconName;size?:number}){
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export function Mark(){
  return <svg viewBox="0 0 48 48" width="32" height="32" aria-hidden="true" fill="none" stroke="currentColor">
    <path d="m24 3 3.4 15.6L43 24l-15.6 5.4L24 45l-3.4-15.6L5 24l15.6-5.4Z" fill="currentColor" fillOpacity=".14" strokeWidth="1.25"/>
    <path d="m24 8 1.9 12.1L38 24l-12.1 3.9L24 40l-1.9-12.1L10 24l12.1-3.9Z" strokeWidth=".85" opacity=".75"/>
    <circle cx="24" cy="24" r="3" fill="currentColor" stroke="none"/>
  </svg>
}
