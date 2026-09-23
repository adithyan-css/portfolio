import type { ComponentType } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { SectionHeader, Tag } from '../components/SectionHeader'
import { Reveal, Scramble } from '../components/Reveal'
import { Cta } from '../components/Cta'
import { useSite } from '../components/SiteProvider'
import { projects, type Project, type ProjectId } from '../data'
import { RiderShieldViz } from '../visuals/RiderShieldViz'
import { AgriPriceViz } from '../visuals/AgriPriceViz'
import { RoboGuardViz } from '../visuals/RoboGuardViz'
import { HelixViz } from '../visuals/HelixViz'
import { GithubIcon } from '../components/Icons'

export const VIZ: Record<ProjectId, ComponentType<{ caption?: string }>> = {
  ridershield: RiderShieldViz,
  agriprice: AgriPriceViz,
  roboguard: RoboGuardViz,
  helix: HelixViz,
}

export function Work() {
  return (
    <section id="work" aria-labelledby="work-title" className="relative z-10 pt-[22vh]">
      {/* starts half a screen early, so the loop's waveform clears out as its sticky stage scrolls away */}
      <div data-field="rest" aria-hidden className="pointer-events-none absolute inset-x-0 -top-[50vh] h-[120vh]" />
      <SectionHeader
        id="work-title"
        index="02"
        label="Systems"
        title={[{ t: 'Four systems,' }, { t: 'edge to autonomous.', w: 125, accent: true }]}
        intro="From on-device inference on a Raspberry Pi to software that patches itself. Each chapter carries an interactive model of how the system works — poke at them."
      />
      <div className="mt-[10vh]">
        {projects.map((p) => (
          <Chapter key={p.id} project={p} />
        ))}
      </div>
    </section>
  )
}

function Chapter({ project: p }: { project: Project }) {
  const { openCase } = useSite()
  const reduced = useReducedMotion()
  const Viz = VIZ[p.id]
  const github = p.links.find((l) => l.label === 'GitHub')

  return (
    <article id={`project-${p.id}`} aria-labelledby={`${p.id}-title`} className="relative scroll-mt-4 pb-[14vh] pt-[8vh]">
      {/* The emblem zone: while this is on the centre line, the field draws this system. */}
      <div data-field={p.id} className="container-x relative flex min-h-[92svh] flex-col md:min-h-[88vh]">
        <Reveal>
          <div className="flex items-end gap-4">
            <span className="mono text-[11px] text-signal">SYS{p.index}</span>
            <Scramble text={p.kind.toUpperCase()} className="label-mono !text-fg" />
            <span aria-hidden className="ticks-major mb-[3px] h-[9px] flex-1" />
          </div>
        </Reveal>

        {/* the emblem's slot: the field parks this system's shape here and scrolls it with the chapter */}
        <div data-field-anchor aria-hidden className="min-h-[34vh] flex-1 md:min-h-[26vh]" />

        <div>
          <h3 id={`${p.id}-title`} className="display text-[clamp(3.1rem,9.8vw,10.5rem)] leading-[0.84]">
            <button type="button" onClick={() => openCase(p.id)} className="group text-left" data-cursor="view" aria-label={`${p.name} — open case study`}>
              <motion.span
                className="inline-block transition-colors duration-500 group-hover:text-signal"
                initial={reduced ? { opacity: 0 } : { opacity: 0, fontVariationSettings: '"wdth" 62', y: '30%' }}
                whileInView={{ opacity: 1, fontVariationSettings: '"wdth" 100', y: '0%' }}
                viewport={{ once: true, margin: '0px 0px -12% 0px' }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              >
                {p.name}
              </motion.span>
              <ArrowUpRight className="ml-[0.08em] inline size-[0.3em] -translate-y-[0.55em] text-mute transition-all duration-500 group-hover:-translate-y-[0.65em] group-hover:translate-x-1 group-hover:text-signal" aria-hidden />
            </button>
          </h3>

          <div className="mt-10 grid gap-8 md:grid-cols-12 md:items-end">
            <Reveal className="md:col-span-5">
              <p className="max-w-[40ch] text-[19px] leading-snug text-soft md:text-[21px]">{p.summary}</p>
            </Reveal>
            <Reveal delay={0.08} className="md:col-span-7">
              <dl className="grid grid-cols-3 border-t border-line-2">
                {p.readouts.map((r, k) => (
                  <div key={r.label} className={`pt-4 ${k ? 'border-l border-line pl-4' : 'pr-4'}`}>
                    <dt className="sr-only">{r.label}</dt>
                    <dd>
                      <span className="display block text-[clamp(1.9rem,4.2vw,4.2rem)] leading-none [font-variation-settings:'wdth'_118]">{r.value}</span>
                      <span className="mono mt-3 block text-[10px] uppercase leading-snug tracking-[0.06em] text-mute" aria-hidden>
                        {r.label}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </div>
      </div>

      <Reveal className="container-x mt-12">
        <Viz caption={p.vizCaption} />
      </Reveal>

      <div className="container-x mt-6 flex flex-wrap items-center justify-between gap-6">
        <ul className="flex flex-wrap gap-1.5" aria-label="Technologies">
          {p.stack.map((s) => (
            <li key={s}>
              <Tag>{s}</Tag>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2.5">
          <Cta onClick={() => openCase(p.id)} icon={<ArrowUpRight size={15} />} cursor="view">
            Case study
          </Cta>
          {github && (
            <Cta variant="ghost" href={github.href} external icon={<GithubIcon className="size-4" />} ariaLabel={`${p.name} on GitHub (opens in a new tab)`}>
              GitHub
            </Cta>
          )}
        </div>
      </div>
    </article>
  )
}
