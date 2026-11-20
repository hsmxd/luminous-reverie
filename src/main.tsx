import {createRoot} from 'react-dom/client'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/cormorant-garamond/latin-500-italic.css'
import '@fontsource/cormorant-garamond/latin-600.css'
import './styles/art.css'
import './styles/studio.css'
import {App} from './app/App'
createRoot(document.getElementById('root')!).render(<App/>)

