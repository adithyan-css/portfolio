import { useEffect, useLayoutEffect, useRef } from 'react'
import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react'
import { ArrowDownToLine, ArrowRight } from 'lucide-react'
import { Cta } from '../components/Cta'
import { useSite } from '../components/SiteProvider'
import { education, internship, profile } from '../data'
import { fieldBus, fieldImpulse } from '../three/fieldBus'

const NAME = profile.firstName.toUpperCase()
const GLYPHS = '▮▯/\\_=+<>01∿'
const ease = [0.16, 1, 0.3, 1] as const

/**
 * INPUT. The visitor arrives in static; locking the signal pulls the field into a
 * carrier wave that runs straight through the name. The name is an equaliser:
 * every letter is a band whose *width* responds to the cursor, to impulses and to
 * scroll (it compresses as you leave, like a limiter clamping down).
 */
export function Hero({ entered }: { entered: boolean }) {
  const { scrollTo, reduced, toast } = useSite()
  const ref = useRef<HTMLElement>(null)
  const nameRef = useRef<HTMLSpanElement>(null)
  const letters = useRef<(HTMLSpanElement | null)[]>([])
  const scrollP = useRef(0)
  const clicks = useRef(0)
  const enteredAt = useRef(0)

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  useMotionValueEvent(scrollYProgress, 'change', (v) => (scrollP.current = v))
  const fade = useTransform(scrollYProgress, [0, 0.65], [1, 0])
  const lift = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -120])

  // Anchor the field's carrier to the name's centre line.
  useLayoutEffect(() => {
    const measure = () => {
      // the capitals set the carrier line (initials may wrap below them on phones)
      const el = letters.current[0] ?? nameRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const cy = r.top + r.height * 0.52 + window.scrollY
      fieldBus.heroY = -((cy / window.innerHeight) * 2 - 1)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (nameRef.current) ro.observe(nameRef.current)
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (entered) enteredAt.current = performance.now()
  }, [entered])

  // The equaliser loop.
  useEffect(() => {
    let raf = 0
    let centers: number[] = []
    let frame = 0
    const measure = () => {
      centers = letters.current.map((l) => {
        if (!l) return 0
        const r = l.getBoundingClientRect()
        return r.left + r.width / 2
      })
    }
    const tick = (now: number) => {
      frame++
      if (frame % 20 === 1) measure()
      const t = now / 1000
      const intro = entered ? Math.min(1, (now - enteredAt.current) / (reduced ? 1 : 1500)) : 0
      const introE = 1 - Math.pow(1 - intro, 3)
      const p = scrollP.current
      const base = 62 + (112 - 62) * introE - p * 46
      const px = ((fieldBus.mx + 1) / 2) * window.innerWidth
      const pointer = fieldBus.pointerActive && !reduced ? 1 : 0
      const imp = fieldBus.impulse
      const age = fieldBus.now - imp.t
      const impPx = ((imp.x + 1) / 2) * window.innerWidth
      letters.current.forEach((el, i) => {
        if (!el) return
        const lockAt = 0.15 + i * 0.07
        const locked = intro >= lockAt || reduced
        el.textContent = locked ? NAME[i] : entered ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : NAME[i]
        const dx = (centers[i] ?? 0) - px
        const boost = pointer * Math.exp(-((dx / 170) ** 2)) * 16
        let ripple = 0
        if (age > 0 && age < 2.5 && !reduced) {
          const front = impPx + age * 900
          ripple = Math.exp(-((((centers[i] ?? 0) - front) / 140) ** 2)) * Math.exp(-age * 1.4) * 26
        }
        const idle = reduced ? 0 : Math.sin(t * 1.4 + i * 0.8) * 1.6
        const wd = Math.max(62, Math.min(125, base + boost + ripple + idle))
        el.style.fontVariationSettings = `"wdth" ${wd.toFixed(1)}`
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
    }
  }, [entered, reduced])

  const impulse = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('a,button')) return
    const x = (e.clientX / window.innerWidth) * 2 - 1
    fieldImpulse(x)
    clicks.current++
    if (clicks.current === 1) toast('Impulse sent. Watch the carrier — and the name — ring out.')
    if (clicks.current === 6) toast('You poke systems to see how they respond. Same here. Press ` for a terminal.')
  }

  const show = (d: number) => ({
    initial: { opacity: 0, y: reduced ? 0 : 18 },
    animate: entered ? { opacity: 1, y: 0 } : undefined,
    transition: { duration: 1.1, ease, delay: d },
  })
  const edu = education[0]

  return (
    <section
      ref={ref}
      id="top"
      data-field="hero"
      aria-labelledby="hero-title"
      className="relative z-10 flex min-h-[100svh] flex-col"
      onPointerDown={impulse}
      onPointerEnter={() => window.dispatchEvent(new CustomEvent('cursor:label', { detail: null }))}
    >
      <motion.div style={{ opacity: fade, y: lift }} className="container-x flex flex-1 flex-col pt-[calc(var(--nav-h)+1.5rem)]">
        {/* name on the carrier */}
        <div className="mt-auto pb-[4vh] pt-[16vh] md:pt-0">
          <h1 id="hero-title" className="relative">
            <span className="sr-only">{profile.name}</span>
            <span
              ref={nameRef}
              aria-hidden
              className="display -ml-[0.04em] flex select-none flex-wrap whitespace-nowrap text-[clamp(3.3rem,14.2vw,17.5rem)] leading-[0.8] tracking-[-0.02em] sm:flex-nowrap sm:text-[clamp(3.3rem,12.2vw,16rem)]"
              data-cursor="pulse"
            >
              {NAME.split('').map((ch, i) => (
                <span
                  key={i}
                  ref={(el) => void (letters.current[i] = el)}
                  className="inline-block"
                  style={{ fontVariationSettings: '"wdth" 62', opacity: entered ? 1 : 0, transition: 'opacity .8s' }}
                >
                  {ch}
                </span>
              ))}
              {/* initials are part of the name — set on the same baseline, never as an abbreviation */}
              <span
                className="mt-[0.14em] basis-full pl-[0.04em] text-[0.34em] leading-none tracking-[0.08em] [font-variation-settings:'wdth'_100] sm:mt-0 sm:basis-auto sm:self-end sm:pb-[0.035em] sm:pl-[0.16em] sm:text-[0.3em]"
                style={{ opacity: entered ? 1 : 0, transition: 'opacity .8s .9s' }}
              >
                {profile.initials}
              </span>
            </span>
          </h1>
          <motion.div {...show(0.55)} className="mono mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10.5px] uppercase tracking-[0.14em] text-soft md:text-[11.5px]">
            <span className="text-fg">{profile.label}</span>
            <span aria-hidden className="h-px w-10 bg-line-2 max-sm:hidden" />
            <span className="max-sm:hidden">{profile.institution}</span>
          </motion.div>
        </div>

        <div className="grid gap-8 pb-8 md:grid-cols-12 md:items-end md:pb-10">
          <motion.p {...show(0.75)} className="max-w-[31ch] text-[clamp(1.15rem,1.75vw,1.6rem)] font-[420] leading-[1.25] text-fg md:col-span-6 lg:col-span-5">
            {profile.positioning}
          </motion.p>
          <motion.div {...show(0.9)} className="flex flex-wrap items-center gap-3 md:col-span-6 md:justify-end lg:col-span-7">
            <Cta size="lg" icon={<ArrowRight size={16} />} onClick={() => scrollTo('work')} cursor="view">
              Explore the systems
            </Cta>
            <Cta size="lg" variant="ghost" href={profile.resume.href} download={profile.resume.downloadName} icon={<ArrowDownToLine size={15} />}>
              Résumé
            </Cta>
          </motion.div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={entered ? { opacity: 1 } : undefined} transition={{ duration: 1.2, delay: 1.1 }} className="relative border-t border-line">
        <div className="container-x flex items-center gap-8 py-3.5">
          <dl className="mono flex min-w-0 flex-1 flex-wrap items-center gap-x-10 gap-y-1.5 text-[10px] uppercase tracking-[0.12em]">
            <div className="flex gap-3">
              <dt className="text-dim">Now</dt>
              <dd className="text-soft">
                B.Tech CSE · {edu.short} · CGPA {edu.cgpa.toFixed(2)}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-dim">Latest</dt>
              <dd className="text-soft">
                {internship.role} · {internship.org.replace(' Inc.', '')} · 2026
              </dd>
            </div>
            <div className="hidden gap-3 lg:flex">
              <dt className="text-dim">Try</dt>
              <dd className="text-soft">Click the carrier to send an impulse</dd>
            </div>
          </dl>
          <button type="button" onClick={() => scrollTo('loop')} className="mono hidden items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-soft transition-colors hover:text-fg md:flex" data-cursor="open">
            Scroll
            <span aria-hidden className="relative block h-4 w-px overflow-hidden bg-line-2">
              <motion.span className="absolute inset-x-0 top-0 h-1.5 bg-fg" animate={reduced ? undefined : { y: [0, 12, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />
            </span>
          </button>
        </div>
      </motion.div>
    </section>
  )
}
