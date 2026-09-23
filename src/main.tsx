import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/martian-mono/wdth.css'
import 'lenis/dist/lenis.css'
import './styles/index.css'
import App from './App'
import { installConsoleEasterEgg } from './utils/easterEggs'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

installConsoleEasterEgg()
