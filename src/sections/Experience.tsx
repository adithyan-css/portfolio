import { useRef } from 'react'
import { motion, useScroll, useSpring } from 'motion/react'
import { SectionHeader, Tag } from '../components/SectionHeader'
import { Reveal, Scramble } from '../components/Reveal'
import { EngineConsole } from '../visuals/EngineConsole'
import { internship, positions, type Milestone } from '../data'

export function Experience() {
  const spine = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: spine, offset: ['start 70%', 'end 60%'] })
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })

  return (
    <section id="experience" data-field="audio" aria-labelledby="experience-title" className="relative z-10 pt-[22vh]">
      <SectionHeader
        id="experience-title"
        index="03"
        label="Experience"
        title={[{ t: 'Where I’ve' }, { t: 'shipped', w: 125, accent: true }, { t: 'and led.' }]}
        intro="An internship building real-time audio infrastructure — and the leadership roles alongside it."
      />

      <div className="container-x relative mt-20 md:mt-28">
        <ol ref={spine} className="relative">
          {/* the tape */}
          <span aria-hidden className="absolute bottom-0 left-[5px] top-0 w-px bg-line-2 md:left-[calc(25%-0.5px)]">
            <motion.span className="block h-full w-full origin-top bg-signal" style={{ scaleY: fill }} />
          </span>
          <Row m={internship} featured />
          {positions.map((m) => (
            <Row key={m.id} m={m} />
          ))}
        </ol>
      </div>
    </section>
  )
}

function Row({ m, featured = false }: { m: Milestone; featured?: boolean }) {
  const when = m.period ?? m.org.match(/\d{4}/)?.[0] ?? ''
  return (
    <li id={`exp-${m.id}`} className={`relative grid scroll-mt-10 gap-6 pl-8 md:grid-cols-4 md:gap-0 md:pl-0 ${featured ? 'pb-28 md:pb-36' : 'pb-20 md:pb-28'}`}>
      <motion.span
        aria-hidden
        className="absolute left-0 top-1.5 size-[11px] border border-signal bg-ink md:left-[calc(25%-5.5px)]"
        initial={{ scale: 0.3, rotate: 45, opacity: 0 }}
        whileInView={{ scale: 1, rotate: 45, opacity: 1, backgroundColor: 'rgb(var(--c-accent))' }}
        viewport={{ once: true, margin: '0px 0px -40% 0px' }}
        transition={{ duration: 0.6 }}
      />
      <Reveal className="min-w-0 md:pr-10">
        <p className="mono text-[11px] tracking-[0.04em] text-fg">{when}</p>
        <p className="label-mono mt-2">{m.type}</p>
        {m.location && <p className="label-mono mt-1 !text-dim">{m.location}</p>}
      </Reveal>

      <div className="min-w-0 md:col-span-3 md:pl-12">
        <Reveal>
          <h3 className={`display ${featured ? 'text-[clamp(2.3rem,5.2vw,4.8rem)]' : 'text-[clamp(1.8rem,3.4vw,3rem)]'} leading-[0.92]`}>
            <span className="block">{m.role}</span>
            <span className="block text-signal [font-variation-settings:'wdth'_122]">{m.org}</span>
          </h3>
        </Reveal>
        <Reveal delay={0.05}>
          <p className={`mt-5 text-soft ${featured ? 'text-xl md:text-2xl' : 'text-lg md:text-xl'}`}>{m.headline}</p>
        </Reveal>

        <ul className={`mt-8 grid gap-x-10 ${featured ? 'lg:grid-cols-2' : ''}`}>
          {m.points.map((pt, k) => (
            <Reveal as="li" key={pt} delay={0.05 * k} className="flex gap-4 border-t border-line py-4 text-[15px] leading-relaxed text-mute">
              <span className="mono pt-[3px] text-[10px] text-dim">{String(k + 1).padStart(2, '0')}</span>
              <span>{pt}</span>
            </Reveal>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          {m.tech && (
            <Reveal delay={0.1}>
              <ul className="flex flex-wrap gap-1.5" aria-label="Technologies">
                {m.tech.map((t) => (
                  <li key={t}>
                    <Tag>{t}</Tag>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
          {m.outcome && (
            <Reveal delay={0.15} className="ml-auto text-right">
              <p className="display text-[clamp(2.4rem,5vw,4.4rem)] leading-none [font-variation-settings:'wdth'_120]">{m.outcome.value}</p>
              <p className="mono mt-2 max-w-[30ch] text-[10px] uppercase tracking-[0.06em] text-mute">{m.outcome.label}</p>
            </Reveal>
          )}
        </div>

        {featured && (
          <Reveal delay={0.1} className="mt-14">
            <div className="mb-4 flex items-end gap-4">
              <Scramble text="TRY THE ENGINE" className="label-mono !text-signal" />
              <span aria-hidden className="ticks mb-[2px] h-[5px] flex-1" />
              <span className="label-mono hidden sm:inline">IPC · compressor · underrun</span>
            </div>
            <EngineConsole />
          </Reveal>
        )}
      </div>
    </li>
  )
}
