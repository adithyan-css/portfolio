import { motion, useReducedMotion } from 'motion/react'
import { SectionHeader } from '../components/SectionHeader'
import { Reveal } from '../components/Reveal'
import { achievements, certifications, education } from '../data'

/**
 * Education as a measurement: CGPA read off a ruled scale, like a gauge on a bench
 * instrument. (The field forms the matching dial behind it.)
 */
export function Education() {
  const reduced = useReducedMotion()
  const credentials = [...achievements, ...certifications]

  return (
    <section id="education" data-field="dial" aria-labelledby="education-title" className="relative z-10 py-[22vh]">
      <SectionHeader id="education-title" index="04" label="Education" readout="2024 → present" title={[{ t: 'Foundations,' }, { t: 'measured.', w: 125, accent: true }]} />

      <div className="container-x mt-16">
        {education.map((e) => {
          const pct = e.cgpa / e.scale
          return (
            <Reveal key={e.institution}>
              <article className="grid gap-12 border-t border-line-2 pt-8 md:grid-cols-12">
                <div className="md:col-span-6">
                  <p className="label-mono">
                    <span className="text-signal">{e.period}</span>
                  </p>
                  <h3 className="display mt-5 text-[clamp(2rem,4.2vw,3.8rem)] leading-[0.95]">{e.institution}</h3>
                  <p className="mt-4 text-lg text-soft md:text-xl">{e.degree}</p>
                </div>
                <div className="md:col-span-6">
                  <div className="flex items-end justify-between gap-6">
                    <p className="label-mono">CGPA</p>
                    <p className="display text-[clamp(4.5rem,11vw,10rem)] leading-[0.8] tabular-nums [font-variation-settings:'wdth'_125]">
                      {e.cgpa.toFixed(2)}
                    </p>
                  </div>
                  {/* the scale */}
                  <div className="relative mt-8 h-12" role="img" aria-label={`CGPA ${e.cgpa} on a ${e.scale}-point scale`}>
                    <div className="absolute inset-x-0 bottom-5 h-px bg-line-2" />
                    {Array.from({ length: 51 }, (_, i) => (
                      <span key={i} className={`absolute bottom-5 w-px ${i % 5 ? 'h-1 bg-fg/25' : 'h-2.5 bg-fg/55'}`} style={{ left: `${i * 2}%` }} />
                    ))}
                    <motion.div
                      className="absolute bottom-5 left-0 h-[3px] origin-left bg-signal"
                      style={{ width: '100%' }}
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: pct }}
                      viewport={{ once: true }}
                      transition={{ duration: reduced ? 0 : 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                    />
                    <motion.div
                      className="absolute bottom-5 h-7 w-px bg-signal"
                      initial={{ left: '0%' }}
                      whileInView={{ left: `${pct * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: reduced ? 0 : 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                    />
                    {Array.from({ length: 11 }, (_, i) => (
                      <span key={i} className="mono absolute bottom-0 -translate-x-1/2 text-[9.5px] text-dim" style={{ left: `${i * 10}%` }}>
                        {i}
                      </span>
                    ))}
                  </div>
                  <p className="label-mono mt-4">Scale / {e.scale.toFixed(2)}</p>
                </div>
              </article>
            </Reveal>
          )
        })}

        {credentials.length > 0 && (
          <Reveal>
            <div className="mt-16">
              <h3 className="label-mono">Credentials</h3>
              <ul className="mt-4 grid gap-3 md:grid-cols-3">
                {credentials.map((c) => (
                  <li key={c.title} className="border-t border-line-2 pt-4">
                    <p className="font-medium">{c.title}</p>
                    <p className="mt-1 text-sm text-mute">
                      {c.issuer}
                      {c.year ? ` · ${c.year}` : ''}
                    </p>
                    {c.href && (
                      <a className="link-u mt-3 inline-block text-sm text-signal" href={c.href} target="_blank" rel="noreferrer noopener">
                        Verify ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}
