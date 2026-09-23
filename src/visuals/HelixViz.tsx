import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Play, RotateCcw, Zap } from 'lucide-react'
import { VizButton, VizFrame } from './VizFrame'
import { useReducedMotionPref } from '../hooks/useMedia'

type NodeId = 'reflex' | 'red' | 'app' | 'scan' | 'heal' | 'patch' | 'promote' | 'cog' | 'sov' | 'mem'
type NodeState = 'idle' | 'active' | 'alert' | 'ok'

const RING = { x: 470, y: 225, r: 92 }
const N: Record<NodeId, { x: number; y: number; label: string; sub?: string; lx: number; ly: number; anchor: 'start' | 'middle' | 'end' }> = {
  reflex: { x: 80, y: 78, label: 'REFLEX ARC', sub: 'n8n', lx: 0, ly: -18, anchor: 'middle' },
  red: { x: 80, y: 225, label: 'RED TEAM', sub: 'attack pipeline', lx: 0, ly: 30, anchor: 'middle' },
  app: { x: 262, y: 225, label: 'DEMO APP', sub: 'vulnerable target', lx: 0, ly: 30, anchor: 'middle' },
  scan: { x: RING.x, y: RING.y - RING.r, label: 'SCAN', lx: 0, ly: -16, anchor: 'middle' },
  heal: { x: RING.x + RING.r, y: RING.y, label: 'HEAL', lx: 14, ly: 4, anchor: 'start' },
  patch: { x: RING.x, y: RING.y + RING.r, label: 'PATCH', lx: 0, ly: 24, anchor: 'middle' },
  promote: { x: RING.x - RING.r, y: RING.y, label: 'PROMOTE', lx: -14, ly: 4, anchor: 'end' },
  cog: { x: 700, y: 80, label: 'COGNITION', sub: 'Qwen3.6-27B · Groq', lx: 0, ly: -18, anchor: 'middle' },
  sov: { x: 700, y: 190, label: 'SOVEREIGN FALLBACK', sub: 'local open-weight', lx: 0, ly: 30, anchor: 'middle' },
  mem: { x: 700, y: 360, label: 'IMMUNE MEMORY', sub: '1536-d · $vectorSearch', lx: 0, ly: 30, anchor: 'middle' },
}

const arc = (a: NodeId, b: NodeId) => `M${N[a].x},${N[a].y} A${RING.r},${RING.r} 0 0 1 ${N[b].x},${N[b].y}`
const straight = (a: NodeId, b: NodeId) => `M${N[a].x},${N[a].y} L${N[b].x},${N[b].y}`

const EDGES: Record<string, string> = {
  'reflex-red': straight('reflex', 'red'),
  'red-app': straight('red', 'app'),
  'app-scan': `M${N.app.x},${N.app.y} C${N.app.x + 80},${N.app.y} ${N.scan.x - 90},${N.scan.y} ${N.scan.x},${N.scan.y}`,
  'scan-mem': `M${N.scan.x},${N.scan.y} C${N.scan.x + 150},${N.scan.y} ${N.mem.x - 160},${N.mem.y} ${N.mem.x},${N.mem.y}`,
  'scan-cog': `M${N.scan.x},${N.scan.y} C${N.scan.x + 90},${N.scan.y} ${N.cog.x - 120},${N.cog.y} ${N.cog.x},${N.cog.y}`,
  'scan-sov': `M${N.scan.x},${N.scan.y} C${N.scan.x + 110},${N.scan.y} ${N.sov.x - 120},${N.sov.y} ${N.sov.x},${N.sov.y}`,
  'cog-heal': `M${N.cog.x},${N.cog.y} C${N.cog.x - 20},${N.cog.y + 110} ${N.heal.x + 90},${N.heal.y} ${N.heal.x},${N.heal.y}`,
  'sov-heal': `M${N.sov.x},${N.sov.y} C${N.sov.x - 40},${N.sov.y + 30} ${N.heal.x + 60},${N.heal.y} ${N.heal.x},${N.heal.y}`,
  'heal-patch': arc('heal', 'patch'),
  'patch-promote': arc('patch', 'promote'),
  'patch-mem': `M${N.patch.x},${N.patch.y} C${N.patch.x + 100},${N.patch.y + 40} ${N.mem.x - 120},${N.mem.y} ${N.mem.x},${N.mem.y}`,
  'promote-app': straight('promote', 'app'),
  'scan-heal-idle': arc('promote', 'scan'),
}

type Log = { id: number; tag: string; text: string; tone?: 'accent' | 'ok' }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function HelixViz({ caption }: { caption?: string }) {
  const reduced = useReducedMotionPref()
  const [states, setStates] = useState<Partial<Record<NodeId, NodeState>>>({})
  const [lit, setLit] = useState<string[]>([])
  const [logs, setLogs] = useState<Log[]>([{ id: 0, tag: 'helix', text: 'idle — press Run attack' }])
  const [running, setRunning] = useState(false)
  const [memory, setMemory] = useState(false)
  const [creditsOut, setCreditsOut] = useState(false)
  const run = useRef(0)
  const logId = useRef(1)
  const box = useRef<HTMLDivElement>(null)
  const autoplayed = useRef(false)
  const memRef = useRef(false)
  const creditsRef = useRef(false)
  memRef.current = memory
  creditsRef.current = creditsOut

  const STEP = reduced ? 120 : 620

  const log = (tag: string, text: string, tone?: Log['tone']) => setLogs((l) => [...l.slice(-6), { id: logId.current++, tag, text, tone }])
  const node = (id: NodeId, st: NodeState) => setStates((s) => ({ ...s, [id]: st }))
  const edge = (k: string) => setLit((l) => [...l, k])

  const start = async () => {
    if (running) return
    const my = ++run.current
    const alive = () => run.current === my
    setRunning(true)
    setStates({})
    setLit([])
    const replay = memRef.current
    const brain: NodeId = creditsRef.current ? 'sov' : 'cog'

    node('reflex', 'active')
    log('reflex', 'n8n: scheduled attack run')
    await sleep(STEP)
    if (!alive()) return
    edge('reflex-red')
    node('red', 'alert')
    log('red-team', replay ? 'replaying the same exploit' : 'exploit launched at demo app', 'accent')
    await sleep(STEP)
    if (!alive()) return
    edge('red-app')
    node('app', 'alert')
    await sleep(STEP)
    if (!alive()) return
    edge('app-scan')
    node('scan', 'active')
    log('immune', 'scan: vulnerability detected')
    await sleep(STEP)
    if (!alive()) return
    edge('scan-mem')
    node('mem', 'active')
    log('memory', '$vectorSearch over 1536-d embeddings')
    await sleep(STEP)
    if (!alive()) return

    if (replay) {
      node('mem', 'ok')
      node('app', 'ok')
      node('red', 'idle')
      log('memory', 'match — recurrence blocked', 'ok')
      setRunning(false)
      return
    }
    log('memory', 'no match — new vulnerability')
    if (brain === 'sov') {
      node('cog', 'alert')
      log('cognition', 'Groq rate/credit exhausted → sovereign fallback', 'accent')
      await sleep(STEP)
      if (!alive()) return
    }
    edge(brain === 'cog' ? 'scan-cog' : 'scan-sov')
    node(brain, 'active')
    log(brain === 'cog' ? 'cognition' : 'sovereign', brain === 'cog' ? 'Qwen3.6-27B via Groq: patch synthesis' : 'local open-weight endpoint: patch synthesis')
    await sleep(STEP * 1.2)
    if (!alive()) return
    edge(brain === 'cog' ? 'cog-heal' : 'sov-heal')
    node('heal', 'active')
    log('immune', 'heal')
    await sleep(STEP)
    if (!alive()) return
    edge('heal-patch')
    node('patch', 'active')
    log('immune', 'patch applied')
    await sleep(STEP)
    if (!alive()) return
    edge('patch-mem')
    node('mem', 'ok')
    setMemory(true)
    log('memory', 'vulnerability embedded · stored', 'ok')
    edge('patch-promote')
    node('promote', 'active')
    await sleep(STEP)
    if (!alive()) return
    edge('promote-app')
    node('app', 'ok')
    node('red', 'idle')
    log('immune', 'promote: patched build live', 'ok')
    setRunning(false)
  }

  const reset = () => {
    run.current++
    setRunning(false)
    setMemory(false)
    setStates({})
    setLit([])
    setLogs([{ id: logId.current++, tag: 'helix', text: 'memory cleared — idle' }])
  }

  // Play the loop once, the first time it scrolls into view.
  useEffect(() => {
    const el = box.current
    if (!el || reduced) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !autoplayed.current) {
          autoplayed.current = true
          setTimeout(() => void start(), 500)
        }
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  useEffect(() => () => void run.current++, [])

  return (
    <VizFrame
      title="Immune loop"
      badge="Interactive model"
      caption={caption}
      controls={
        <>
          <VizButton onClick={() => void start()} disabled={running} label={memory ? 'Replay the same exploit' : 'Run a red-team attack'}>
            <Play size={10} /> {memory ? 'Replay exploit' : 'Run attack'}
          </VizButton>
          <VizButton onClick={() => setCreditsOut((c) => !c)} active={creditsOut} ariaPressed={creditsOut} disabled={running}>
            <Zap size={10} /> Cut API credits
          </VizButton>
          <VizButton onClick={reset} label="Reset memory">
            <RotateCcw size={10} />
          </VizButton>
        </>
      }
      minH="min-h-[460px]"
    >
      <div ref={box} className="absolute inset-0 flex flex-col">
        <p className="pointer-events-none absolute right-3 top-2 z-10 mono text-[10px] uppercase tracking-[0.14em] text-dim sm:hidden">swipe →</p>
        <div className="no-scrollbar relative flex-1 overflow-x-auto" data-lenis-prevent-horizontal>
          <svg viewBox="0 0 800 430" className="h-full min-w-[620px] w-full" role="img" aria-label="Helix immune loop: a red-team attack hits the demo app, the Immune System scans, checks Immune Memory, synthesises a patch through cognition or the sovereign fallback, heals, patches, promotes, and stores the vulnerability so a replay is blocked.">
            {/* ring */}
            <circle cx={RING.x} cy={RING.y} r={RING.r} fill="none" stroke="rgb(var(--c-fg) / 0.14)" strokeDasharray="2 5" />
            <text x={RING.x} y={RING.y - 4} textAnchor="middle" className="fill-soft mono" fontSize="12" letterSpacing="1.5">
              IMMUNE SYSTEM
            </text>
            <text x={RING.x} y={RING.y + 14} textAnchor="middle" className="fill-dim mono" fontSize="10.5">
              organ
            </text>

            {/* base edges */}
            {Object.entries(EDGES).map(([k, d]) => (
              <path key={k} d={d} fill="none" stroke="rgb(var(--c-fg) / 0.13)" strokeWidth={1.2} strokeDasharray={k.includes('sov') ? '3 4' : undefined} />
            ))}
            {/* lit edges */}
            {lit.map((k) => (
              <motion.path
                key={`${run.current}-${k}`}
                d={EDGES[k]}
                fill="none"
                stroke="rgb(var(--c-accent))"
                strokeWidth={2}
                initial={{ pathLength: 0, opacity: 1 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: STEP / 1000, ease: 'easeInOut' }}
                style={{ filter: 'drop-shadow(0 0 4px rgb(var(--c-accent) / 0.8))' }}
              />
            ))}

            {(Object.keys(N) as NodeId[]).map((id) => {
              const n = N[id]
              const st = states[id] ?? 'idle'
              const dim = id === 'sov' && !creditsOut && st === 'idle'
              const small = ['scan', 'heal', 'patch', 'promote'].includes(id)
              const fill = st === 'active' ? 'rgb(var(--c-accent))' : st === 'ok' ? 'rgb(var(--c-fg))' : 'rgb(var(--c-bg))'
              const stroke = st === 'alert' ? 'rgb(var(--c-alarm))' : st === 'active' ? 'rgb(var(--c-accent))' : st === 'ok' ? 'rgb(var(--c-fg))' : 'rgb(var(--c-fg) / 0.5)'
              return (
                <g key={id} opacity={dim ? 0.38 : 1} style={{ transition: 'opacity .4s' }}>
                  {st === 'alert' && (
                    <circle cx={n.x} cy={n.y} r={small ? 12 : 16} fill="none" stroke="rgb(var(--c-alarm))" strokeOpacity={0.6}>
                      <animate attributeName="r" values={small ? '9;18;9' : '12;24;12'} dur="1.2s" repeatCount="indefinite" />
                      <animate attributeName="stroke-opacity" values="0.7;0;0.7" dur="1.2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={n.x} cy={n.y} r={small ? 6.5 : 9} fill={fill} stroke={stroke} strokeWidth={1.6} style={{ transition: 'fill .3s, stroke .3s' }} />
                  <text x={n.x + n.lx} y={n.y + n.ly} textAnchor={n.anchor} className="mono" fontSize="12" letterSpacing="1" fill={st === 'idle' ? 'rgb(var(--c-fg) / 0.85)' : st === 'ok' ? 'rgb(var(--c-fg))' : st === 'alert' ? 'rgb(var(--c-alarm))' : 'rgb(var(--c-accent))'}>
                    {n.label}
                  </text>
                  {n.sub && (
                    <text x={n.x + n.lx} y={n.y + n.ly + 15} textAnchor={n.anchor} className="fill-mute mono" fontSize="10.5">
                      {id === 'cog' && creditsOut ? 'credits exhausted' : n.sub}
                    </text>
                  )}
                  {id === 'app' && st === 'ok' && (
                    <text x={n.x} y={n.y - 18} textAnchor="middle" className="mono" fontSize="10.5" fill="rgb(var(--c-accent))">
                      PROTECTED
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
        <div className="border-t border-line bg-ink/40 px-4 py-3 mono text-[11px] leading-[1.7]" role="log" aria-live="polite" aria-label="Helix event log">
          {logs.slice(-4).map((l) => (
            <div key={l.id} className="flex gap-3 truncate">
              <span className="w-20 shrink-0 text-dim">[{l.tag}]</span>
              <span className={l.tone === 'accent' ? 'text-alarm' : l.tone === 'ok' ? 'text-signal' : 'text-mute'}>{l.text}</span>
            </div>
          ))}
        </div>
      </div>
    </VizFrame>
  )
}
