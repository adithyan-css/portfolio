import { motion, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

const ease = [0.16, 1, 0.3, 1] as const

export function Reveal({ children, delay = 0, y = 26, className = '', as = 'div' }: { children: ReactNode; delay?: number; y?: number; className?: string; as?: 'div' | 'li' | 'p' | 'span' }) {
  const reduced = useReducedMotion()
  const M = motion[as]
  return (
    <M
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: reduced ? 0.2 : 1, ease, delay }}
    >
      {children}
    </M>
  )
}

export type Part = { t: string; w?: number; accent?: boolean; className?: string }

/**
 * Headline whose words *open up* like a signal: each word animates its variable
 * width axis from compressed (62) to its target, staggered. Width carries emphasis.
 */
export function WidthText({ parts, className = '', delay = 0, stagger = 0.05, as = 'span', once = true }: { parts: Part[]; className?: string; delay?: number; stagger?: number; as?: 'span' | 'div'; once?: boolean }) {
  const reduced = useReducedMotion()
  const words: { w: string; wd: number; accent?: boolean; cls?: string; br?: boolean }[] = []
  parts.forEach((p) => {
    if (p.t === '\n') {
      words.push({ w: '', wd: 100, br: true })
      return
    }
    p.t.split(' ').filter(Boolean).forEach((w) => words.push({ w, wd: p.w ?? 100, accent: p.accent, cls: p.className }))
  })
  const full = parts.map((p) => (p.t === '\n' ? ' ' : p.t)).join(' ')
  const Tag = as
  let k = 0
  return (
    <Tag className={className}>
      <span className="sr-only">{full}</span>
      {words.map((w, i) => {
        if (w.br) return <br key={i} aria-hidden />
        const idx = k++
        return (
          <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.1em] align-bottom">
            <motion.span
              className={`inline-block ${w.accent ? 'text-signal' : ''} ${w.cls ?? ''}`}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: '70%', fontVariationSettings: `"wdth" 62` }}
              whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: '0%', fontVariationSettings: `"wdth" ${w.wd}` }}
              style={reduced ? { fontVariationSettings: `"wdth" ${w.wd}` } : undefined}
              viewport={{ once, margin: '0px 0px -8% 0px' }}
              transition={{ duration: 1.25, ease, delay: delay + idx * stagger }}
            >
              {w.w}
            </motion.span>
            {' '}
          </span>
        )
      })}
    </Tag>
  )
}

const GLYPHS = '▮▯/\\_—=+<>01∿'

/** Text that decodes out of noise — on mount/in-view, and again on hover when asked. */
export function Scramble({ text, className = '', trigger = 'view', speed = 28, hoverTarget }: { text: string; className?: string; trigger?: 'view' | 'mount' | 'none'; speed?: number; hoverTarget?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -5% 0px' })
  const reduced = useReducedMotion()
  const [out, setOut] = useState(trigger === 'none' || reduced ? text : text.replace(/\S/g, ' '))
  const raf = useRef(0)

  const run = () => {
    if (reduced) {
      setOut(text)
      return
    }
    cancelAnimationFrame(raf.current)
    const start = performance.now()
    const tick = (now: number) => {
      const n = Math.floor((now - start) / speed)
      let s = ''
      for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        if (ch === ' ' || i < n - 3) s += ch
        else if (i < n) s += GLYPHS[(Math.random() * GLYPHS.length) | 0]
        else s += ' '
      }
      setOut(s)
      if (n < text.length + 3) raf.current = requestAnimationFrame(tick)
      else setOut(text)
    }
    raf.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    if ((trigger === 'mount') || (trigger === 'view' && inView)) run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, trigger, text])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  return (
    <span ref={ref} className={className} onMouseEnter={hoverTarget ? run : undefined}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="whitespace-pre">
        {out}
      </span>
    </span>
  )
}

/** Imperative scramble for a parent that controls hover (buttons, links). */
export function useScramble(text: string, speed = 22) {
  const [out, setOut] = useState(text)
  const raf = useRef(0)
  const reduced = useReducedMotion()
  useEffect(() => setOut(text), [text])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const run = () => {
    if (reduced) return
    cancelAnimationFrame(raf.current)
    const start = performance.now()
    const tick = (now: number) => {
      const n = Math.floor((now - start) / speed)
      let s = ''
      for (let i = 0; i < text.length; i++) s += text[i] === ' ' || i < n ? text[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0]
      setOut(s)
      if (n < text.length) raf.current = requestAnimationFrame(tick)
      else setOut(text)
    }
    raf.current = requestAnimationFrame(tick)
  }
  return [out, run] as const
}
