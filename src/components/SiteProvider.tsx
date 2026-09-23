import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Lenis from 'lenis'
import { AnimatePresence, motion } from 'motion/react'
import { play, setSoundEnabled } from '../utils/sound'
import { useReducedMotionPref } from '../hooks/useMedia'
import type { ProjectId } from '../data'

type Toast = { id: number; text: string }

type Site = {
  sound: boolean
  toggleSound: () => void
  terminalOpen: boolean
  setTerminalOpen: (v: boolean) => void
  caseId: ProjectId | null
  openCase: (id: ProjectId) => void
  closeCase: () => void
  toast: (text: string) => void
  scrollTo: (id: string) => void
  scope: boolean
  toggleScope: () => void
  reduced: boolean
}

const SiteCtx = createContext<Site | null>(null)

export const useSite = () => {
  const v = useContext(SiteCtx)
  if (!v) throw new Error('useSite must be used inside <SiteProvider>')
  return v
}

/** Résumé references ("rf2", project ids) → element ids on the page. */
export const refToElementId = (ref: string) => (ref === 'rf2' ? 'exp-rf2' : ref.startsWith('#') ? ref.slice(1) : `project-${ref}`)

export function SiteProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotionPref()
  const [sound, setSound] = useState(false)
  const soundRef = useRef(false)
  const [terminalOpen, setTerminalOpenState] = useState(false)
  const [caseId, setCaseId] = useState<ProjectId | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [scope, setScope] = useState(false)
  const lenisRef = useRef<Lenis | null>(null)
  const toastId = useRef(0)

  // Smooth scroll — skipped entirely for reduced motion.
  useEffect(() => {
    if (reduced) return
    const lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1, smoothWheel: true, syncTouch: false })
    lenisRef.current = lenis
    let raf = 0
    const loop = (t: number) => {
      lenis.raf(t)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [reduced])

  // Freeze page scroll while an overlay owns the screen.
  useEffect(() => {
    const locked = caseId !== null
    const lenis = lenisRef.current
    if (locked) {
      lenis?.stop()
      document.documentElement.style.overflow = 'hidden'
    } else {
      lenis?.start()
      document.documentElement.style.overflow = ''
    }
  }, [caseId])

  useEffect(() => {
    document.documentElement.dataset.mode = scope ? 'scope' : ''
    window.dispatchEvent(new CustomEvent('signal:theme'))
  }, [scope])

  const toast = useCallback((text: string) => {
    const id = ++toastId.current
    setToasts((t) => [...t.slice(-2), { id, text }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4800)
  }, [])

  const scrollTo = useCallback(
    (id: string) => {
      const el = document.getElementById(id.replace(/^#/, ''))
      if (!el) return
      const lenis = lenisRef.current
      if (lenis) lenis.scrollTo(el, { offset: id === 'top' ? 0 : -8, duration: 1.4 })
      else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
      // Move focus for keyboard + screen reader users without jumping the page.
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
      window.setTimeout(() => el.focus({ preventScroll: true }), reduced ? 0 : 900)
    },
    [reduced],
  )

  const value = useMemo<Site>(
    () => ({
      sound,
      toggleSound: () => {
        const next = !soundRef.current
        soundRef.current = next
        setSoundEnabled(next)
        setSound(next)
        if (next) window.setTimeout(() => play('open'), 20)
      },
      terminalOpen,
      setTerminalOpen: (v) => {
        setTerminalOpenState(v)
        play(v ? 'open' : 'close')
      },
      caseId,
      openCase: (id) => {
        setCaseId(id)
        play('open')
      },
      closeCase: () => {
        setCaseId(null)
        play('close')
      },
      toast,
      scrollTo,
      scope,
      toggleScope: () => setScope((s) => !s),
      reduced,
    }),
    [sound, terminalOpen, caseId, toast, scrollTo, scope, reduced],
  )

  return (
    <SiteCtx.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed bottom-5 left-5 z-[80] flex max-w-[min(420px,calc(100vw-40px))] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="screen mono px-4 py-3 text-[11px] leading-relaxed text-soft"
            >
              <span className="mr-2 text-signal">■</span>
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </SiteCtx.Provider>
  )
}
