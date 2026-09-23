import { useEffect, useRef, useState } from 'react'
import { useFinePointer, useReducedMotionPref } from '../hooks/useMedia'

type Mode = 'default' | 'link' | 'label' | 'text' | 'hidden'

const LABELS: Record<string, string> = {
  view: 'View',
  play: 'Play',
  open: 'Open',
  drag: 'Scrub',
  pulse: 'Impulse',
  copy: 'Copy',
}

/**
 * Desktop cursor as a measurement reticle: a crosshair that locks corner brackets
 * onto interactive targets and shows a verb chip for labelled ones. It inverts to
 * light when it passes over an instrument screen. Touch devices keep the native cursor.
 */
export function Cursor() {
  const fine = useFinePointer()
  const reduced = useReducedMotionPref()
  const root = useRef<HTMLDivElement>(null)
  const lag = useRef<HTMLDivElement>(null)
  const exact = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<Mode>('default')
  const [label, setLabel] = useState('')
  const [onScreen, setOnScreen] = useState(false)
  const [pressed, setPressed] = useState(false)
  const override = useRef<string | null>(null)

  useEffect(() => {
    if (!fine) return
    const html = document.documentElement
    html.classList.add('has-cursor')
    let mx = -100,
      my = -100,
      rx = -100,
      ry = -100,
      shown = false,
      raf = 0
    let lastTarget: Element | null = null

    const resolve = (t: Element | null) => {
      setOnScreen(!!t?.closest('.screen'))
      if (override.current) {
        setMode('label')
        setLabel(LABELS[override.current] ?? override.current)
        return
      }
      if (!t) return setMode('default')
      if (t.closest('input:not([type=range]), textarea, [contenteditable=true]')) return setMode('text')
      const labelled = t.closest('[data-cursor]')
      const v = labelled?.getAttribute('data-cursor')
      if (v === 'none') return setMode('hidden')
      if (v && LABELS[v]) {
        setLabel(LABELS[v])
        return setMode('label')
      }
      if (t.closest('a, button, [role=button], label, select, summary, input[type=range], [data-cursor=link]')) return setMode('link')
      setMode('default')
    }

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      mx = e.clientX
      my = e.clientY
      if (!shown) {
        shown = true
        rx = mx
        ry = my
        if (root.current) root.current.style.opacity = '1'
      }
    }
    const over = (e: PointerEvent) => {
      lastTarget = e.target as Element
      resolve(lastTarget)
    }
    const hide = () => {
      shown = false
      if (root.current) root.current.style.opacity = '0'
    }
    const down = () => setPressed(true)
    const up = () => setPressed(false)
    const onOverride = (e: Event) => {
      override.current = (e as CustomEvent<string | null>).detail
      resolve(lastTarget)
    }

    const loop = () => {
      const k = reduced ? 1 : 0.24
      rx += (mx - rx) * k
      ry += (my - ry) * k
      if (exact.current) exact.current.style.transform = `translate3d(${mx}px, ${my}px, 0)`
      if (lag.current) lag.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerover', over, { passive: true })
    html.addEventListener('pointerleave', hide)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    window.addEventListener('cursor:label', onOverride)
    return () => {
      cancelAnimationFrame(raf)
      html.classList.remove('has-cursor')
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerover', over)
      html.removeEventListener('pointerleave', hide)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('cursor:label', onOverride)
    }
  }, [fine, reduced])

  if (!fine) return null

  const color = onScreen ? '#e8eaf0' : 'rgb(var(--c-fg))'
  const box = mode === 'link' ? 38 : mode === 'label' ? 26 : 16
  const corner = 'absolute size-[7px] border-current transition-all duration-300 ease-[var(--ease-expo)]'

  return (
    <div ref={root} aria-hidden className="pointer-events-none fixed inset-0 z-[100] opacity-0 transition-opacity duration-300" style={{ color }}>
      {/* trailing brackets */}
      <div ref={lag} className="absolute left-0 top-0 will-change-transform">
        <div
          className={`relative -translate-x-1/2 -translate-y-1/2 transition-[width,height,opacity] duration-300 ease-[var(--ease-expo)] ${mode === 'text' || mode === 'hidden' ? 'opacity-0' : mode === 'default' ? 'opacity-50' : 'opacity-100'}`}
          style={{ width: box, height: box, scale: pressed ? 0.8 : 1 }}
        >
          <span className={`${corner} left-0 top-0 border-l border-t`} />
          <span className={`${corner} right-0 top-0 border-r border-t`} />
          <span className={`${corner} bottom-0 left-0 border-b border-l`} />
          <span className={`${corner} bottom-0 right-0 border-b border-r`} />
        </div>
        <div
          className={`mono absolute left-5 top-5 whitespace-nowrap rounded-[2px] px-2 py-1 text-[10px] uppercase tracking-[0.12em] transition-[opacity,transform] duration-300 ${mode === 'label' ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}
          style={{ background: color, color: onScreen ? '#0a0b10' : 'rgb(var(--c-bg))' }}
        >
          ● {label}
        </div>
      </div>
      {/* exact crosshair */}
      <div ref={exact} className="absolute left-0 top-0 will-change-transform">
        <div className={`relative size-0 transition-opacity duration-200 ${mode === 'text' || mode === 'hidden' ? 'opacity-0' : 'opacity-100'}`}>
          <span className="absolute -left-[7px] top-[-0.5px] h-px w-[4px] bg-current" />
          <span className="absolute left-[3px] top-[-0.5px] h-px w-[4px] bg-current" />
          <span className="absolute -top-[7px] left-[-0.5px] h-[4px] w-px bg-current" />
          <span className="absolute left-[-0.5px] top-[3px] h-[4px] w-px bg-current" />
        </div>
      </div>
    </div>
  )
}
