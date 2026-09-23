import { useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { SectionHeader } from '../components/SectionHeader'
import { refToElementId, useSite } from '../components/SiteProvider'
import { loop } from '../data'

/** What the field is drawing at each stage — shown as scope annotations. */
const NOTES: Record<string, { k: string; v: string }[]> = {
  sense: [
    { k: 'Input', v: 'raw' },
    { k: 'DC offset', v: '+0.30' },
    { k: 'Noise', v: 'broadband' },
  ],
  process: [
    { k: 'DC', v: 'blocked' },
    { k: 'Peaks', v: 'under threshold' },
    { k: 'Latency', v: 'real-time' },
  ],
  predict: [
    { k: 'Observed', v: '← now' },
    { k: 'Forecast', v: 'now →' },
    { k: 'Interval', v: 'widens with horizon' },
  ],
  recover: [
    { k: 'Fault', v: 'dropout' },
    { k: 'Detect', v: 'in-band' },
    { k: 'Recover', v: 'healed' },
  ],
}

/** Each stage word is set at its own width: raw input is cramped, recovery is wide open. */
const WIDTH = [62, 92, 112, 125]

/**
 * THE LOOP — the site's set piece. A pinned sequence where the persistent field
 * draws each stage of the signal, and by RECOVER the page itself has been
 * filtered from noise (dark) into the lab (light).
 */
export function SignalChain() {
  const { scrollTo } = useSite()
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [prog, setProg] = useState(0)
  const { scrollYProgress } = useScroll({ target: track, offset: ['start start', 'end end'] })
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const el = track.current
    if (!el) return
    const H = el.offsetHeight
    const vh = window.innerHeight
    const f = (p * (H - vh) + vh / 2) / H
    const idx = Math.max(0, Math.min(3, Math.floor(f * 4)))
    setActive((a) => (a === idx ? a : idx))
    setProg(Math.max(0, Math.min(1, f * 4 - idx)))
  })

  const st = loop[active]

  return (
    <section id="loop" aria-labelledby="loop-title" className="relative z-10">
      <div className="pb-[8vh] pt-[20vh]">
        <SectionHeader
          id="loop-title"
          index="01"
          label="The loop"
          title={[{ t: 'Every system I build runs' }, { t: 'the same loop.', w: 125, accent: true }]}
          intro={
            <p>
              Computer Science undergraduate at VIT Vellore. Across an internship and four projects, the work keeps returning to one shape:{' '}
              <span className="text-fg">sense a signal, process it in real time, predict what comes next, recover when something breaks.</span> Scroll, and this page runs it.
            </p>
          }
        />
      </div>

      <div id="loop-track" ref={track} className="relative h-[430vh]">
        {loop.map((s, i) => (
          <div key={s.id} data-field={s.id} aria-hidden className="pointer-events-none absolute inset-x-0" style={{ top: `${i * 25}%`, height: '25%' }} />
        ))}

        <div className="sticky top-0 flex h-[100svh] flex-col justify-end overflow-hidden md:justify-center">
          <div className="container-x grid w-full gap-6 pb-10 md:grid-cols-12 md:pb-0">
            <div className="md:col-span-5">
              {/* stage meter */}
              <ol className="grid grid-cols-4 gap-1.5" aria-label="Stages">
                {loop.map((s, i) => (
                  <li key={s.id} aria-current={i === active ? 'step' : undefined}>
                    <span className="block h-[2px] overflow-hidden bg-line-2">
                      <span className="block h-full bg-signal transition-[width] duration-200" style={{ width: `${i < active ? 100 : i === active ? prog * 100 : 0}%` }} />
                    </span>
                    <span className={`mono mt-2 block text-[9.5px] uppercase tracking-[0.12em] transition-colors duration-500 ${i <= active ? 'text-fg' : 'text-dim'}`}>
                      {s.index} {s.title}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="relative mt-8 h-[clamp(4.2rem,9.5vw,9rem)]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.h3
                    key={st.id}
                    className="display absolute inset-x-0 top-0 whitespace-nowrap text-[clamp(4rem,9.5vw,9rem)] uppercase"
                    initial={{ opacity: 0, y: '40%', fontVariationSettings: '"wdth" 62' }}
                    animate={{ opacity: 1, y: '0%', fontVariationSettings: `"wdth" ${WIDTH[active]}` }}
                    exit={{ opacity: 0, y: '-40%', fontVariationSettings: '"wdth" 62' }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {st.title}
                  </motion.h3>
                </AnimatePresence>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={st.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45 }}>
                  <p className="mt-6 text-xl font-[520] tracking-[-0.01em] md:text-2xl">{st.headline}</p>
                  <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-mute md:text-base">{st.body}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {st.evidence.map((e) => (
                      <button
                        key={e.label}
                        type="button"
                        onClick={() => scrollTo(refToElementId(e.target))}
                        className="mono group inline-flex items-center gap-1.5 rounded-[3px] border border-line-2 px-2.5 py-1.5 text-[10.5px] uppercase tracking-[0.08em] text-soft transition-colors hover:border-fg hover:text-fg"
                      >
                        {e.label}
                        <ArrowUpRight size={11} className="transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* scope annotations framing the field's waveform */}
            <div className="relative hidden md:col-span-7 md:block" aria-hidden>
              <div className="absolute -top-[26vh] bottom-[-8vh] left-[4%] right-0">
                <span className="absolute left-0 top-0 h-3 w-3 border-l border-t border-fg/40" />
                <span className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-fg/40" />
                <div className="mono absolute left-4 top-0 flex gap-6 text-[10px] uppercase tracking-[0.12em] text-mute">
                  <span>
                    <span className="text-signal">●</span> CH1 · field
                  </span>
                  <span>Timebase · normalised</span>
                </div>
                <div className="absolute bottom-0 left-4 right-4 flex flex-wrap gap-x-8 gap-y-1">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.dl key={st.id} className="mono flex gap-8 text-[10px] uppercase tracking-[0.12em]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {NOTES[st.id].map((n) => (
                        <div key={n.k} className="flex gap-2">
                          <dt className="text-dim">{n.k}</dt>
                          <dd className="text-fg">{n.v}</dd>
                        </div>
                      ))}
                    </motion.dl>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
