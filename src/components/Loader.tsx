import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { projects, internship, skillCount } from '../data'

type Props = { ready: boolean; onEnter: () => void; reduced: boolean }

const lines = [
  { k: 'mount /systems', v: `${projects.length} found` },
  { k: 'load experience', v: internship.org.replace(' Inc.', '') },
  { k: 'link stack', v: `${skillCount} nodes` },
  { k: 'calibrate carrier', v: '48 kHz' },
]

const SESSION_KEY = 'signal:booted'

/**
 * Tuning screen. The field behind it is pure static; ENTER locks the signal and
 * the same particles pull into the hero's carrier wave — no curtain, one world.
 */
export function Loader({ ready, onEnter, reduced }: Props) {
  const [pct, setPct] = useState(0)
  const [gone, setGone] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const [repeat] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1'
    } catch {
      return false
    }
  })
  const duration = reduced || repeat ? 250 : 1400

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const time = Math.min(1, (now - start) / duration)
      const cap = ready ? 1 : 0.86
      const eased = 1 - Math.pow(1 - time, 2.2)
      setPct(Math.min(eased, cap) * 100)
      if (time < 1 || !ready) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ready, duration])

  const done = pct >= 99.95

  const enter = () => {
    if (!done || gone) return
    try {
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      /* storage unavailable: fine */
    }
    setGone(true)
    onEnter()
  }

  useEffect(() => {
    if (!done || gone) return
    if (repeat) {
      enter()
      return
    }
    btn.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        enter()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, gone])

  const shown = Math.min(lines.length, Math.floor((pct / 100) * (lines.length + 1)))
  const freq = (87.5 + (pct / 100) * 20.5).toFixed(1)

  return (
    <AnimatePresence>
      {!gone && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Loading portfolio"
          className="noise fixed inset-0 z-[90] flex flex-col bg-[radial-gradient(ellipse_at_50%_60%,rgb(7_8_11/0.35),rgb(7_8_11/0.92)_70%)] text-fg"
          exit={{ opacity: 0, filter: reduced ? 'none' : 'blur(12px)' }}
          transition={{ duration: reduced ? 0.2 : 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="container-x flex flex-1 flex-col justify-between pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.75rem,env(safe-area-inset-top))] md:pb-12">
            <div className="label-mono flex items-center justify-between">
              <span className="!text-fg">Adithyan C S S</span>
              <span>
                <span className="live-dot mr-2 inline-block size-1.5 rounded-full bg-signal align-middle" />
                {done ? 'Carrier found' : 'Tuning'}
              </span>
            </div>

            <div className="grid gap-10 md:grid-cols-12 md:items-end">
              <div className="md:col-span-7">
                <p className="label-mono">Acquiring signal</p>
                <p className="display mt-4 tabular-nums text-[clamp(4.2rem,15vw,13rem)] [font-variation-settings:'wdth'_125]" aria-hidden>
                  {freq}
                  <span className="mono ml-3 align-top text-[0.12em] font-normal tracking-normal text-mute">MHz</span>
                </p>
              </div>
              <div className="mono text-[11px] leading-7 text-mute md:col-span-5" aria-live="polite">
                <p className="text-soft">&gt; scanning the band…</p>
                {lines.slice(0, shown).map((l) => (
                  <p key={l.k} className="flex gap-3">
                    <span className="text-signal">[lock]</span>
                    <span className="text-soft">{l.k}</span>
                    <span aria-hidden className="flex-1 translate-y-[-4px] border-b border-dotted border-line-2" />
                    <span>{l.v}</span>
                  </p>
                ))}
                {done && (
                  <p className="text-soft">
                    &gt; ready<span className="caret">_</span>
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="relative h-10" aria-hidden>
                <div className="ticks-major absolute inset-x-0 bottom-0 h-[9px]" />
                <div className="mono absolute inset-x-0 bottom-4 flex justify-between text-[9.5px] text-dim">
                  {['88', '92', '96', '100', '104', '108'].map((f) => (
                    <span key={f}>{f}</span>
                  ))}
                </div>
                <div className="absolute bottom-0 h-10 w-px bg-signal shadow-[0_0_12px_rgb(var(--c-accent))]" style={{ left: `${pct}%` }} />
              </div>
              <div className="mt-6 flex h-14 items-center justify-between gap-6">
                <p className="label-mono max-sm:hidden">An interactive portfolio · sound off · keyboard friendly</p>
                {done && !repeat && (
                  <motion.button
                    ref={btn}
                    type="button"
                    onClick={enter}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group mono ml-auto inline-flex h-14 items-center gap-5 rounded-[3px] bg-fg pl-5 pr-4 text-[11px] uppercase tracking-[0.16em] text-ink transition-colors hover:bg-signal hover:text-on-signal"
                    data-cursor="open"
                  >
                    <span aria-hidden className="size-1.5 rounded-[1px] bg-signal group-hover:bg-on-signal" />
                    Enter · lock signal
                    <span aria-hidden className="text-base">↵</span>
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
