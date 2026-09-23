import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, List, Orbit } from 'lucide-react'
import { SectionHeader, Tag } from '../components/SectionHeader'
import { Reveal } from '../components/Reveal'
import { refToElementId, useSite } from '../components/SiteProvider'
import { skillCount, skillGroups, usedIn } from '../data'
import { useIsMobile, useReducedMotionPref } from '../hooks/useMedia'
import { useVisible } from '../hooks/useVisible'

const W = 1200,
  H = 720,
  CX = W / 2,
  CY = H / 2
const ORDER = ['lang', 'ai', 'embedded', 'frontend', 'tools', 'backend']

type Leaf = { name: string; cat: string; x: number; y: number; anchor: 'start' | 'end' | 'middle'; lx: number; ly: number }
type Cat = { id: string; label: string; short: string; x: number; y: number; angle: number }

function computeLayout() {
  const groups = ORDER.map((id) => skillGroups.find((g) => g.id === id)!)
  const GAP = 1.2 // empty slots between sectors
  const slots = skillCount + GAP * groups.length
  const per = (Math.PI * 2) / slots
  const first = groups[0].items.length
  let a = -Math.PI / 2 - ((first - 1) / 2) * per
  const cats: Cat[] = []
  const leaves: Leaf[] = []
  groups.forEach((g, gi) => {
    g.items.forEach((name) => {
      const x = CX + Math.cos(a) * 380
      const y = CY + Math.sin(a) * 262
      const c = Math.cos(a),
        s = Math.sin(a)
      const anchor = c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle'
      // near the poles labels sit above/below the node, staggered on two rows so neighbours never collide
      const row = leaves.length % 2 === 0 ? 0 : 16
      leaves.push({ name, cat: g.id, x, y, anchor, lx: anchor === 'start' ? 12 : anchor === 'end' ? -12 : 0, ly: anchor === 'middle' ? (s > 0 ? 22 + row : -12 - row) : 4 })
      a += per
    })
    // categories sit evenly on the inner orbit (same order as their sectors)
    const mid = -Math.PI / 2 + (gi * Math.PI * 2) / groups.length
    cats.push({ id: g.id, label: g.label, short: g.short, x: CX + Math.cos(mid) * 205, y: CY + Math.sin(mid) * 142, angle: mid })
    a += per * GAP
  })
  return { cats, leaves }
}

type Sel = { kind: 'cat'; id: string } | { kind: 'skill'; name: string } | null

export function Stack() {
  const mobile = useIsMobile()
  const [view, setView] = useState<'map' | 'list'>('map')
  const effective = mobile ? 'list' : view

  return (
    <section id="stack" data-field="lattice" aria-labelledby="stack-title" className="relative z-10 py-[22vh]">
      <SectionHeader
        id="stack-title"
        index="05"
        label="Technical stack"
        title={[{ t: 'The toolkit,' }, { t: 'as a system.', w: 125, accent: true }]}
        intro={`${skillCount} skills across ${skillGroups.length} domains, straight from the résumé — each one traced to the work where it shows up.`}
      />
      <div className="container-x mt-12">
        <div className="mb-6 hidden justify-end gap-2 md:flex" role="group" aria-label="Stack view">
          {(['map', 'list'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`mono inline-flex h-9 items-center gap-2 rounded-[3px] border px-3.5 text-[10.5px] uppercase tracking-[0.12em] transition-colors ${view === v ? 'border-fg bg-fg text-ink' : 'border-line-2 text-soft hover:text-fg'}`}
            >
              {v === 'map' ? <Orbit size={13} /> : <List size={13} />} {v === 'map' ? 'Constellation' : 'List'}
            </button>
          ))}
        </div>
        {effective === 'map' ? <Constellation /> : <StackList />}
      </div>
    </section>
  )
}

function UsedIn({ name }: { name: string }) {
  const { scrollTo } = useSite()
  const refs = usedIn[name]
  if (!refs?.length) return <p className="text-[13px] text-dim">Listed in résumé skills.</p>
  return (
    <div className="flex flex-wrap gap-2">
      {refs.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => scrollTo(refToElementId(r.id))}
          className="mono group inline-flex items-center gap-1.5 rounded-[3px] border border-signal/40 bg-signal-dim px-2.5 py-1 text-[10.5px] uppercase tracking-[0.06em] text-fg transition-colors hover:border-signal"
        >
          {r.label}
          <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      ))}
    </div>
  )
}

function Constellation() {
  const { cats, leaves } = useMemo(computeLayout, [])
  const reduced = useReducedMotionPref()
  const wrap = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const visible = useVisible(wrap)
  const [hover, setHover] = useState<Sel>(null)
  const [pinned, setPinned] = useState<Sel>(null)
  const sel = hover ?? pinned

  const catEls = useRef<(SVGGElement | null)[]>([])
  const leafEls = useRef<(SVGGElement | null)[]>([])
  const spokeEls = useRef<(SVGLineElement | null)[]>([])
  const twigEls = useRef<(SVGLineElement | null)[]>([])
  const pulseEls = useRef<(SVGCircleElement | null)[]>([])
  const pointer = useRef({ x: -9999, y: -9999 })

  useEffect(() => {
    if (!visible || reduced) return
    let raf = 0
    const t0 = performance.now()
    const catPos = cats.map((c) => ({ x: c.x, y: c.y }))
    const offset = (bx: number, by: number, seed: number, t: number, k: number) => {
      let x = bx + Math.sin(t * 0.6 + seed) * 4 * k
      let y = by + Math.cos(t * 0.5 + seed * 1.3) * 4 * k
      const dx = x - pointer.current.x,
        dy = y - pointer.current.y
      const d = Math.hypot(dx, dy)
      if (d < 140) {
        const f = (1 - d / 140) ** 2 * 22 * k
        x += (dx / (d || 1)) * f
        y += (dy / (d || 1)) * f
      }
      return { x, y }
    }
    const loop = (now: number) => {
      const t = (now - t0) / 1000
      cats.forEach((c, i) => {
        const p = offset(c.x, c.y, i * 1.7, t, 1)
        catPos[i] = p
        catEls.current[i]?.setAttribute('transform', `translate(${p.x - c.x} ${p.y - c.y})`)
        const sp = spokeEls.current[i]
        sp?.setAttribute('x2', String(p.x))
        sp?.setAttribute('y2', String(p.y))
        const pulse = pulseEls.current[i]
        if (pulse) {
          const u = (t * 0.35 + i / cats.length) % 1
          pulse.setAttribute('cx', String(CX + (p.x - CX) * u))
          pulse.setAttribute('cy', String(CY + (p.y - CY) * u))
          pulse.setAttribute('opacity', String(Math.sin(u * Math.PI) * 0.9))
        }
      })
      leaves.forEach((l, i) => {
        const p = offset(l.x, l.y, i * 0.9, t, 0.8)
        leafEls.current[i]?.setAttribute('transform', `translate(${p.x - l.x} ${p.y - l.y})`)
        const ci = cats.findIndex((c) => c.id === l.cat)
        const tw = twigEls.current[i]
        if (tw) {
          tw.setAttribute('x1', String(catPos[ci].x))
          tw.setAttribute('y1', String(catPos[ci].y))
          tw.setAttribute('x2', String(p.x))
          tw.setAttribute('y2', String(p.y))
        }
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [visible, reduced, cats, leaves])

  const onMove = (e: React.PointerEvent) => {
    const s = svg.current
    const m = s?.getScreenCTM()
    if (!s || !m) return
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    pointer.current = { x: pt.x, y: pt.y }
  }

  const activeCat = sel?.kind === 'cat' ? sel.id : sel?.kind === 'skill' ? leaves.find((l) => l.name === sel.name)?.cat : undefined
  const isOn = (catId: string, name?: string) => {
    if (!sel) return true
    if (sel.kind === 'cat') return catId === sel.id
    return name ? name === sel.name : catId === activeCat
  }
  const group = skillGroups.find((g) => g.id === activeCat)

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <Reveal className="lg:col-span-9">
        <div ref={wrap} className="relative overflow-hidden rounded-[4px] border border-line-2 bg-ink/40 backdrop-blur-[2px]">
          <svg
            ref={svg}
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full select-none"
            onPointerMove={onMove}
            onPointerLeave={() => {
              pointer.current = { x: -9999, y: -9999 }
              setHover(null)
            }}
            role="group"
            aria-label="Skills constellation"
          >
            <defs>
              <radialGradient id="core-g">
                <stop offset="0" stopColor="rgb(var(--c-accent))" stopOpacity="0.35" />
                <stop offset="1" stopColor="rgb(var(--c-accent))" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx={CX} cy={CY} rx={380} ry={262} fill="none" stroke="rgb(var(--c-fg) / 0.06)" strokeDasharray="2 6" />
            <ellipse cx={CX} cy={CY} rx={205} ry={142} fill="none" stroke="rgb(var(--c-fg) / 0.05)" />

            {cats.map((c, i) => (
              <line key={c.id} ref={(el) => void (spokeEls.current[i] = el)} x1={CX} y1={CY} x2={c.x} y2={c.y} stroke={isOn(c.id) && sel ? 'rgb(var(--c-accent))' : 'rgb(var(--c-fg) / 0.18)'} strokeWidth={1} style={{ transition: 'stroke .3s' }} />
            ))}
            {leaves.map((l, i) => {
              const c = cats.find((k) => k.id === l.cat)!
              const on = isOn(l.cat, l.name)
              return <line key={l.name} ref={(el) => void (twigEls.current[i] = el)} x1={c.x} y1={c.y} x2={l.x} y2={l.y} stroke={sel && on ? 'rgb(var(--c-accent))' : 'rgb(var(--c-fg) / 0.1)'} strokeOpacity={sel && !on ? 0.4 : 1} style={{ transition: 'stroke .3s, stroke-opacity .3s' }} />
            })}
            {cats.map((c, i) => (
              <circle key={c.id} ref={(el) => void (pulseEls.current[i] = el)} r={2.5} fill="rgb(var(--c-accent))" opacity={0} />
            ))}

            {/* core */}
            <circle cx={CX} cy={CY} r={70} fill="url(#core-g)" />
            <circle cx={CX} cy={CY} r={36} fill="rgb(var(--c-bg))" stroke="rgb(var(--c-accent))" strokeWidth={1.2} />
            <text x={CX} y={CY - 2} textAnchor="middle" className="fill-fg mono" fontSize="12" letterSpacing="2">
              STACK
            </text>
            <text x={CX} y={CY + 14} textAnchor="middle" className="fill-mute mono" fontSize="10">
              {skillCount} nodes
            </text>

            {leaves.map((l, i) => {
              const on = isOn(l.cat, l.name)
              const hot = sel?.kind === 'skill' && sel.name === l.name
              const used = !!usedIn[l.name]
              return (
                <g
                  key={l.name}
                  ref={(el) => void (leafEls.current[i] = el)}
                  opacity={on ? 1 : 0.22}
                  style={{ transition: 'opacity .35s' }}
                  onPointerEnter={() => setHover({ kind: 'skill', name: l.name })}
                  onClick={() => setPinned((p) => (p?.kind === 'skill' && p.name === l.name ? null : { kind: 'skill', name: l.name }))}
                  className="cursor-pointer"
                  data-cursor="link"
                >
                  <circle cx={l.x} cy={l.y} r={18} fill="transparent" />
                  <circle cx={l.x} cy={l.y} r={hot ? 6 : used ? 4.2 : 3.2} fill={hot || (sel && on) ? 'rgb(var(--c-accent))' : used ? 'rgb(var(--c-fg))' : 'rgb(var(--c-fg) / 0.55)'} style={{ transition: 'r .3s, fill .3s' }} />
                  <text x={l.x + l.lx} y={l.y + l.ly} textAnchor={l.anchor} className={`mono ${hot ? 'fill-fg' : 'fill-soft'}`} fontSize="13">
                    {l.name}
                  </text>
                </g>
              )
            })}

            {cats.map((c, i) => {
              const on = isOn(c.id)
              const act = activeCat === c.id
              return (
                <g
                  key={c.id}
                  ref={(el) => void (catEls.current[i] = el)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${c.label}: ${skillGroups.find((g) => g.id === c.id)!.items.join(', ')}`}
                  aria-pressed={pinned?.kind === 'cat' && pinned.id === c.id}
                  onPointerEnter={() => setHover({ kind: 'cat', id: c.id })}
                  onFocus={() => setHover({ kind: 'cat', id: c.id })}
                  onBlur={() => setHover(null)}
                  onClick={() => setPinned((p) => (p?.kind === 'cat' && p.id === c.id ? null : { kind: 'cat', id: c.id }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setPinned((p) => (p?.kind === 'cat' && p.id === c.id ? null : { kind: 'cat', id: c.id }))
                    }
                  }}
                  opacity={on ? 1 : 0.3}
                  className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-signal"
                  style={{ transition: 'opacity .35s' }}
                  data-cursor="link"
                >
                  <rect x={c.x - 64} y={c.y - 17} width={128} height={34} rx={3} fill={act ? 'rgb(var(--c-accent))' : 'rgb(var(--c-bg2))'} stroke={act ? 'rgb(var(--c-accent))' : 'rgb(var(--c-fg) / 0.3)'} strokeWidth={1.2} style={{ transition: 'fill .3s' }} />
                  <text x={c.x} y={c.y + 4} textAnchor="middle" className="mono" fontSize="11" letterSpacing="1" fill={act ? '#fff' : 'rgb(var(--c-fg))'}>
                    {c.short}
                  </text>
                </g>
              )
            })}
          </svg>
          <p className="pointer-events-none absolute bottom-3 left-4 mono text-[10px] uppercase tracking-[0.14em] text-dim">
            <span className="mr-2 inline-block size-2 rounded-full bg-fg align-middle" /> used in listed work
            <span className="ml-4 mr-2 inline-block size-1.5 rounded-full bg-fg/55 align-middle" /> listed skill
          </p>
        </div>
      </Reveal>

      {/* Detail panel */}
      <div className="lg:col-span-3">
        <div className="min-h-[260px] rounded-[4px] border border-line-2 p-6 lg:sticky lg:top-24" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div key={sel ? (sel.kind === 'cat' ? sel.id : sel.name) : 'none'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
              {!sel && (
                <>
                  <p className="label-mono">Readout</p>
                  <p className="mt-4 text-2xl font-medium tracking-[-0.03em]">{skillCount} nodes · {skillGroups.length} domains</p>
                  <p className="mt-3 text-[14px] leading-relaxed text-mute">Hover or tap a node. Bright nodes are tied to specific projects or the internship.</p>
                </>
              )}
              {sel?.kind === 'cat' && group && (
                <>
                  <p className="label-mono !text-signal">{group.items.length} skills</p>
                  <p className="mt-3 text-2xl font-medium tracking-[-0.03em]">{group.label}</p>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {group.items.map((it) => (
                      <li key={it}>
                        <Tag active={!!usedIn[it]}>{it}</Tag>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {sel?.kind === 'skill' && (
                <>
                  <p className="label-mono !text-signal">{group?.label}</p>
                  <p className="mt-3 text-2xl font-medium tracking-[-0.03em]">{sel.name}</p>
                  <p className="label-mono mt-6 mb-3">Where it shows up</p>
                  <UsedIn name={sel.name} />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function StackList() {
  const [open, setOpen] = useState<string>(skillGroups[0].id)
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {skillGroups.map((g, gi) => (
        <Reveal key={g.id} delay={gi * 0.04}>
          <div className="rounded-[4px] border border-line-2 p-5">
            <button type="button" onClick={() => setOpen(open === g.id ? '' : g.id)} className="flex w-full items-baseline justify-between text-left md:pointer-events-none" aria-expanded={open === g.id}>
              <span className="text-xl font-medium tracking-[-0.03em]">{g.label}</span>
              <span className="mono text-[11px] text-signal">{String(g.items.length).padStart(2, '0')}</span>
            </button>
            <ul className={`mt-4 flex-col divide-y divide-line ${open === g.id ? 'flex' : 'hidden md:flex'}`}>
              {g.items.map((it) => (
                <li key={it} className="flex flex-col gap-2 py-3">
                  <span className="mono text-[13px] text-fg">{it}</span>
                  {usedIn[it] && <UsedIn name={it} />}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      ))}
    </div>
  )
}
