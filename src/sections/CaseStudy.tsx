import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from 'lucide-react'
import { useSite } from '../components/SiteProvider'
import { projects, projectById } from '../data'
import { VIZ } from './Work'
import { Tag } from '../components/SectionHeader'
import { GithubIcon } from '../components/Icons'

const ease = [0.16, 1, 0.3, 1] as const

/**
 * Case study as a lab report: always on the light "lab" ground, with the live
 * model mounted as its instrument. Focus-trapped, Esc closes, ←/→ between systems.
 */
export function CaseStudy() {
  const { caseId, closeCase, openCase, reduced } = useSite()
  const panel = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const p = caseId ? projectById(caseId) : undefined
  const idx = p ? projects.indexOf(p) : -1
  const prev = idx >= 0 ? projects[(idx - 1 + projects.length) % projects.length] : undefined
  const next = idx >= 0 ? projects[(idx + 1) % projects.length] : undefined

  useEffect(() => {
    if (!caseId) return
    if (!returnFocus.current) returnFocus.current = document.activeElement as HTMLElement
    scroller.current?.scrollTo({ top: 0 })
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus(), 60)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCase()
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight' && next) openCase(next.id)
      if (e.key === 'ArrowLeft' && prev) openCase(prev.id)
      if (e.key === 'Tab' && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])')
        if (!f.length) return
        const first = f[0],
          last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [caseId, closeCase, openCase, next, prev])

  useEffect(() => {
    if (caseId === null && returnFocus.current) {
      returnFocus.current.focus({ preventScroll: true })
      returnFocus.current = null
    }
  }, [caseId])

  const Viz = p ? VIZ[p.id] : null
  const sq = 'grid size-10 place-items-center rounded-[3px] border border-line-2 text-soft transition-colors hover:border-fg hover:text-fg'

  return (
    <AnimatePresence>
      {p && Viz && (
        <motion.div
          key="case"
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="case-title"
          className="lab fixed inset-0 z-[88] bg-ink text-fg"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.015, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.99, filter: 'blur(8px)' }}
          transition={{ duration: reduced ? 0.2 : 0.7, ease }}
        >
          <div ref={scroller} className="h-full overflow-y-auto overscroll-contain" data-lenis-prevent>
            <div className="sticky top-0 z-10 border-b border-line bg-ink/85 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl">
              <div className="container-x flex h-16 items-center justify-between gap-4">
                <p className="label-mono truncate">
                  <span className="text-signal">Report · SYS{p.index}</span> <span className="text-dim">/ 0{projects.length}</span>
                  <span className="max-sm:hidden"> · {p.kind}</span>
                </p>
                <div className="flex items-center gap-2">
                  {prev && (
                    <button type="button" onClick={() => openCase(prev.id)} className={sq} aria-label={`Previous: ${prev.name}`}>
                      <ArrowLeft size={15} />
                    </button>
                  )}
                  {next && (
                    <button type="button" onClick={() => openCase(next.id)} className={sq} aria-label={`Next: ${next.name}`}>
                      <ArrowRight size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeCase}
                    data-autofocus
                    className="mono ml-1 inline-flex h-10 items-center gap-2 rounded-[3px] bg-fg px-3.5 text-[10.5px] uppercase tracking-[0.12em] text-ink transition-colors hover:bg-signal hover:text-on-signal"
                    aria-label="Close case study"
                  >
                    Close <X size={14} />
                  </button>
                </div>
              </div>
            </div>

            <motion.article key={p.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease, delay: reduced ? 0 : 0.2 }} className="container-x pb-24 pt-12 md:pt-16">
              <div className="grid gap-8 md:grid-cols-12 md:items-end">
                <h2 id="case-title" className="display text-[clamp(3rem,9vw,9rem)] md:col-span-8 [font-variation-settings:'wdth'_104]">
                  {p.name}
                </h2>
                <p className="max-w-[40ch] text-lg leading-snug text-soft md:col-span-4 md:text-xl">{p.summary}</p>
              </div>

              <div className="mt-12">
                <Viz caption={p.vizCaption} />
              </div>

              <div className="mt-16 grid gap-px overflow-hidden rounded-[4px] border border-line bg-line md:grid-cols-2">
                {[
                  ['01', 'Problem', p.problem],
                  ['02', 'Solution', p.solution],
                ].map(([n, h, body]) => (
                  <section key={h} aria-labelledby={`cs-${h}`} className="bg-ink p-6 md:p-8">
                    <h3 id={`cs-${h}`} className="label-mono">
                      <span className="text-signal">{n}</span> · {h}
                    </h3>
                    <p className="mt-5 text-[17px] leading-relaxed text-soft md:text-lg">{body}</p>
                  </section>
                ))}
              </div>

              <section aria-labelledby="cs-arch" className="mt-16">
                <h3 id="cs-arch" className="label-mono">
                  <span className="text-signal">03</span> · Architecture
                </h3>
                <div className="mt-6 divide-y divide-line border-y border-line">
                  {p.architecture.map((lane) => (
                    <div key={lane.title} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:gap-8">
                      <span className="mono w-44 shrink-0 text-[10.5px] uppercase tracking-[0.12em] text-mute">{lane.title}</span>
                      <ol className="flex flex-wrap items-center gap-2">
                        {lane.steps.map((s, k) => (
                          <li key={s} className="flex items-center gap-2">
                            <span className="mono rounded-[3px] border border-line-2 px-2.5 py-1.5 text-[11px] text-fg">{s}</span>
                            {k < lane.steps.length - 1 && (
                              <span aria-hidden className="text-signal">
                                →
                              </span>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </section>

              <div className="mt-16 grid gap-12 md:grid-cols-12">
                <section aria-labelledby="cs-built" className="md:col-span-8">
                  <h3 id="cs-built" className="label-mono">
                    <span className="text-signal">04</span> · What I built
                  </h3>
                  <ul className="mt-6 divide-y divide-line border-y border-line">
                    {p.built.map((b, k) => (
                      <li key={b} className="flex gap-5 py-4 text-[16px] leading-relaxed text-soft">
                        <span className="mono pt-1 text-[10px] text-dim">{String(k + 1).padStart(2, '0')}</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </section>
                <aside className="md:col-span-4">
                  <h3 className="label-mono">
                    <span className="text-signal">05</span> · Stack
                  </h3>
                  <ul className="mt-6 flex flex-wrap gap-1.5">
                    {p.stack.map((s) => (
                      <li key={s}>
                        <Tag>{s}</Tag>
                      </li>
                    ))}
                  </ul>
                  <h3 className="label-mono mt-10">
                    <span className="text-signal">06</span> · Numbers
                  </h3>
                  <dl className="mt-4 space-y-3">
                    {p.readouts.map((r) => (
                      <div key={r.label} className="flex items-baseline gap-4">
                        <dt className="sr-only">{r.label}</dt>
                        <dd className="flex items-baseline gap-4">
                          <span className="display w-20 text-2xl [font-variation-settings:'wdth'_118]">{r.value}</span>
                          <span className="text-sm text-mute">{r.label}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-10 flex flex-wrap gap-2">
                    {p.links.map((l) => (
                      <a key={l.href} href={l.href} target="_blank" rel="noreferrer noopener" className="mono inline-flex h-11 items-center gap-2 rounded-[3px] border border-line-2 px-4 text-[10.5px] uppercase tracking-[0.12em] hover:border-fg" data-cursor="open">
                        {l.label === 'GitHub' && <GithubIcon className="size-4" />} {l.label} <ArrowUpRight size={14} />
                      </a>
                    ))}
                  </div>
                </aside>
              </div>

              {next && (
                <button type="button" onClick={() => openCase(next.id)} className="group mt-24 block w-full border-t border-line pt-10 text-left" data-cursor="view">
                  <span className="label-mono">Next report · SYS{next.index}</span>
                  <span className="display mt-4 flex items-center gap-6 text-[clamp(2.4rem,7vw,6rem)] text-dim transition-[color,font-variation-settings] duration-700 [font-variation-settings:'wdth'_80] group-hover:text-fg group-hover:[font-variation-settings:'wdth'_112]">
                    {next.name}
                    <ArrowRight className="size-[0.5em] transition-transform duration-500 group-hover:translate-x-3" />
                  </span>
                </button>
              )}
            </motion.article>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
