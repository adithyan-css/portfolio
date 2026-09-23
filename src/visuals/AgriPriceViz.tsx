import { useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { mulberry32 } from '../utils/math'
import { useSize } from '../hooks/useSize'
import { VizButton, VizFrame } from './VizFrame'

type ModelId = 'chronos' | 'prophet' | 'regression'
const MODELS: { id: ModelId; label: string; dash: string }[] = [
  { id: 'chronos', label: 'Chronos', dash: '2 4' },
  { id: 'prophet', label: 'Prophet', dash: '6 4' },
  { id: 'regression', label: 'Regression', dash: '1 3' },
]

const HIST = 72
const HORIZON = 24
const SHIFT = 44 // regime shift index — non-stationary data

/** Illustrative, seeded series. Not real prices. */
function useSeries() {
  return useMemo(() => {
    const r = mulberry32(7)
    const hist: number[] = []
    let v = 42
    for (let i = 0; i < HIST; i++) {
      const drift = i < SHIFT ? 0.05 : 0.42
      v += drift + (r() - 0.5) * 2.4
      const season = Math.sin((i / 12) * Math.PI * 2) * 2.6
      hist.push(v + season)
    }
    const last = hist[HIST - 1]
    const lastSeasonFree = v
    const fc: Record<ModelId, number[]> = { chronos: [], prophet: [], regression: [] }
    // slope from the post-shift regime for the regression-style extrapolation
    const recent = hist.slice(SHIFT)
    const n = recent.length
    const mx = (n - 1) / 2
    const my = recent.reduce((a, b) => a + b, 0) / n
    let num = 0,
      den = 0
    recent.forEach((y, i) => {
      num += (i - mx) * (y - my)
      den += (i - mx) ** 2
    })
    const slope = num / den
    for (let h = 1; h <= HORIZON; h++) {
      const i = HIST - 1 + h
      const season = Math.sin((i / 12) * Math.PI * 2) * 2.6
      fc.regression.push(last + slope * h)
      fc.prophet.push(lastSeasonFree + 0.3 * h + season)
      fc.chronos.push(last + 0.26 * h + season * 0.55 + Math.sin(h * 0.9) * 0.6)
    }
    return { hist, fc }
  }, [])
}

export function AgriPriceViz({ caption }: { caption?: string }) {
  const { hist, fc } = useSeries()
  const reduced = useReducedMotion()
  const [on, setOn] = useState<Record<ModelId, boolean>>({ chronos: true, prophet: true, regression: true })
  const [hover, setHover] = useState<number | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const [box, size] = useSize<HTMLDivElement>()

  const W = Math.max(320, size.w),
    H = Math.max(260, size.h),
    padL = 16,
    padR = 16,
    padT = 36,
    padB = 44
  const total = HIST + HORIZON
  const x = (i: number) => padL + (i / (total - 1)) * (W - padL - padR)

  const active = MODELS.filter((m) => on[m.id]).map((m) => m.id)
  const ens = Array.from({ length: HORIZON }, (_, h) => active.reduce((a, id) => a + fc[id][h], 0) / active.length)
  const spread = Array.from({ length: HORIZON }, (_, h) => {
    const vals = active.map((id) => fc[id][h])
    return Math.max(...vals) - Math.min(...vals)
  })
  // interval grows with horizon; a lone model gets a wider band (less agreement information)
  const half = ens.map((_, h) => 1.2 + (h + 1) * 0.22 + spread[h] * 0.5 + (active.length === 1 ? (h + 1) * 0.12 : 0))

  const all = [...hist, ...ens.map((e, h) => e + half[h]), ...ens.map((e, h) => e - half[h]), ...MODELS.flatMap((m) => fc[m.id])]
  const lo = Math.min(...all) - 2,
    hi = Math.max(...all) + 2
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB)

  const line = (pts: [number, number][]) => pts.map((p, k) => `${k ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('')
  const histPath = line(hist.map((v, i) => [x(i), y(v)]))
  const joinPt: [number, number] = [x(HIST - 1), y(hist[HIST - 1])]
  const ensPath = line([joinPt, ...ens.map((v, h) => [x(HIST + h), y(v)] as [number, number])])
  const bandPath =
    line([joinPt, ...ens.map((v, h) => [x(HIST + h), y(v + half[h])] as [number, number])]) +
    ens
      .map((v, h) => [x(HIST + h), y(v - half[h])] as [number, number])
      .reverse()
      .map((p) => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`)
      .join('') +
    'Z'

  const onMove = (e: React.PointerEvent) => {
    const r = svg.current?.getBoundingClientRect()
    if (!r) return
    const u = ((e.clientX - r.left) / r.width) * W
    const i = Math.round(((u - padL) / (W - padL - padR)) * (total - 1))
    setHover(Math.max(0, Math.min(total - 1, i)))
  }

  const hv = hover
  const tip =
    hv === null
      ? null
      : hv < HIST
        ? { title: `t−${HIST - 1 - hv}`, lines: [`observed ${hist[hv].toFixed(1)}`] }
        : { title: `h+${hv - HIST + 1}`, lines: [`ensemble ${ens[hv - HIST].toFixed(1)}`, `interval ±${half[hv - HIST].toFixed(1)}`] }

  const draw = (d: number) => ({
    initial: reduced ? { opacity: 0 } : { pathLength: 0, opacity: 0 },
    whileInView: { pathLength: 1, opacity: 1 },
    viewport: { once: true },
    transition: { duration: reduced ? 0.2 : 1.6, delay: d, ease: [0.16, 1, 0.3, 1] as const },
  })

  return (
    <VizFrame
      title="Ensemble forecast"
      badge="Illustrative data"
      caption={caption}
      controls={MODELS.map((m) => (
        <VizButton
          key={m.id}
          active={on[m.id]}
          ariaPressed={on[m.id]}
          onClick={() => setOn((s) => (s[m.id] && active.length === 1 ? s : { ...s, [m.id]: !s[m.id] }))}
        >
          {m.label}
        </VizButton>
      ))}
    >
      <div ref={box} className="absolute inset-0">
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 h-full w-full touch-pan-y"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Illustrative forecast: history, a regime shift, then an ensemble of ${active.join(', ')} with a widening confidence interval.`}
        data-cursor="drag"
      >
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} x2={W} y1={padT + g * (H - padT - padB)} y2={padT + g * (H - padT - padB)} stroke="rgb(var(--c-fg) / 0.05)" />
        ))}
        <rect x={x(HIST - 1)} y={padT - 12} width={W - padR - x(HIST - 1)} height={H - padT - padB + 12} fill="rgb(var(--c-fg) / 0.025)" />
        <line x1={x(SHIFT)} x2={x(SHIFT)} y1={padT - 10} y2={H - padB} stroke="rgb(var(--c-fg) / 0.25)" strokeDasharray="3 4" />
        <text x={x(SHIFT) + 6} y={padT} className="fill-mute mono" fontSize="10">
          REGIME SHIFT
        </text>
        <line x1={x(HIST - 1)} x2={x(HIST - 1)} y1={padT - 10} y2={H - padB} stroke="rgb(var(--c-fg) / 0.45)" />
        <text x={x(HIST - 1) + 6} y={padT} className="fill-soft mono" fontSize="10">
          FORECAST →
        </text>

        <motion.path initial={{ opacity: 0, d: bandPath }} animate={{ d: bandPath }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ opacity: { delay: 1.2, duration: 0.8 }, d: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }} fill="rgb(var(--c-accent))" fillOpacity={0.13} />
        <motion.path d={histPath} fill="none" stroke="rgb(var(--c-fg))" strokeWidth={1.6} {...draw(0)} />
        {MODELS.map((m) => (
          <motion.path
            key={m.id}
            d={line([joinPt, ...fc[m.id].map((v, h) => [x(HIST + h), y(v)] as [number, number])])}
            fill="none"
            stroke="rgb(var(--c-fg))"
            strokeOpacity={on[m.id] ? 0.45 : 0.08}
            strokeDasharray={m.dash}
            strokeWidth={1.2}
            style={{ transition: 'stroke-opacity .4s' }}
          />
        ))}
        <motion.path initial={false} animate={{ d: ensPath }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} fill="none" stroke="rgb(var(--c-accent))" strokeWidth={2.4} />

        {hv !== null && (
          <g pointerEvents="none">
            <line x1={x(hv)} x2={x(hv)} y1={padT - 10} y2={H - padB} stroke="rgb(var(--c-fg))" strokeOpacity={0.5} />
            <circle cx={x(hv)} cy={y(hv < HIST ? hist[hv] : ens[hv - HIST])} r={4} fill={hv < HIST ? 'rgb(var(--c-fg))' : 'rgb(var(--c-accent))'} />
          </g>
        )}
        <g className="mono" fontSize="10">
          <text x={padL} y={H - 16} className="fill-dim">
            HISTORY · {HIST} STEPS
          </text>
          <text x={W - padR} y={H - 16} textAnchor="end" className="fill-dim">
            HORIZON · {HORIZON} STEPS
          </text>
        </g>
      </svg>
      </div>
      {tip && hv !== null && (
        <div
          className="pointer-events-none absolute top-3 rounded-md border border-line-2 bg-ink/90 px-3 py-2 mono text-[11px] text-soft backdrop-blur"
          style={{ left: `clamp(8px, calc(${(x(hv) / W) * 100}% + 10px), calc(100% - 150px))` }}
        >
          <div className="text-fg">{tip.title}</div>
          {tip.lines.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
      )}
      <div className="pointer-events-none absolute bottom-10 right-4 flex flex-col items-end gap-1 mono text-[10px] uppercase tracking-[0.12em] text-mute">
        <span className="flex items-center gap-2">
          <span className="h-[2px] w-5 bg-signal" /> Ensemble
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-5 bg-signal/20" /> Confidence interval
        </span>
      </div>
    </VizFrame>
  )
}
