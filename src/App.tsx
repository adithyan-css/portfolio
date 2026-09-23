import { lazy, Suspense, useEffect, useState } from 'react'
import { SiteProvider, useSite } from './components/SiteProvider'
import { Loader } from './components/Loader'
import { Cursor } from './components/Cursor'
import { Nav } from './components/Nav'
import { SceneDirector } from './components/SceneDirector'
import { Hero } from './sections/Hero'
import { SignalChain } from './sections/SignalChain'
import { Work } from './sections/Work'
import { CaseStudy } from './sections/CaseStudy'
import { Experience } from './sections/Experience'
import { Education } from './sections/Education'
import { Stack } from './sections/Stack'
import { Lab } from './sections/Lab'
import { Contact, Footer } from './sections/Contact'
import { useReducedMotionPref } from './hooks/useMedia'
import { useKonami } from './hooks/useKonami'

const loadField = () => import('./three/Field')
const Field = lazy(loadField)
const Terminal = lazy(() => import('./terminal/Terminal'))

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** Global shortcuts: ` opens the terminal; the Konami code flips oscilloscope mode. */
function GlobalKeys() {
  const { terminalOpen, setTerminalOpen, toggleScope, scope, toast } = useSite()
  const [everOpened, setEverOpened] = useState(false)

  useEffect(() => {
    if (terminalOpen) setEverOpened(true)
  }, [terminalOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.isContentEditable) return
      if (e.key === '`' || e.key === '~') {
        e.preventDefault()
        setTerminalOpen(!terminalOpen)
      }
    }
    const onOpen = () => setTerminalOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('terminal:open', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('terminal:open', onOpen)
    }
  }, [terminalOpen, setTerminalOpen])

  useKonami(() => {
    toggleScope()
    toast(scope ? 'Oscilloscope mode off.' : '↑↑↓↓←→←→BA — oscilloscope mode on. Enter it again to exit.')
  })

  return everOpened || terminalOpen ? (
    <Suspense fallback={null}>
      <Terminal />
    </Suspense>
  ) : null
}

export default function App() {
  const reduced = useReducedMotionPref()
  const [ready, setReady] = useState(false)
  const [entered, setEntered] = useState(false)
  const [webgl] = useState(hasWebGL)

  // Boot waits for fonts + the field chunk — bounded, so a slow network never blocks entry.
  useEffect(() => {
    const timeout = new Promise((r) => setTimeout(r, 2500))
    Promise.race([Promise.all([document.fonts?.ready, webgl ? loadField() : null]), timeout]).finally(() => setReady(true))
  }, [webgl])

  return (
    <SiteProvider>
      <a href="#main" className="sr-only z-[95] rounded-[3px] bg-fg px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      {webgl && (
        <Suspense fallback={null}>
          <Field />
        </Suspense>
      )}
      <SceneDirector entered={entered} />
      <Loader ready={ready} reduced={reduced} onEnter={() => setEntered(true)} />
      <Cursor />
      <Nav visible={entered} />
      <main id="main" inert={!entered} className="relative">
        <Hero entered={entered} />
        <SignalChain />
        <Work />
        <Experience />
        <Education />
        <Stack />
        <Lab />
        <Contact />
      </main>
      <Footer />
      <CaseStudy />
      <GlobalKeys />
      <div aria-hidden className="grain" />
      <div aria-hidden className="scanlines" />
    </SiteProvider>
  )
}
