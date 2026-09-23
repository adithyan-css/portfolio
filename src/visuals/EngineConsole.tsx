import { useRef, useState } from 'react'
import { Pause, Play, Square, StepForward, TriangleAlert } from 'lucide-react'
import { useCanvas } from '../hooks/useCanvas'
import { ALARM, useAccent } from '../hooks/useAccent'
import { fgA, hexA, monoLabel } from '../utils/color'
import { play as sfx } from '../utils/sound'

type Engine = 'idle' | 'running' | 'paused' | 'stopping'
type Cmd = 'START' | 'PAUSE' | 'RESUME' | 'STOP'
type Line = { id: number; text: string; tone?: 'ack' | 'warn' | 'ok' }

const BUF = 25 // résumé: 25-buffer pre-buffer
const N = 420 // samples on screen

/** RBJ biquad high-pass — the DC blocker. */
function biquadHP(fc: number, q = 0.707) {
  const w0 = 2 * Math.PI * fc
  const cos = Math.cos(w0),
    alpha = Math.sin(w0) / (2 * q)
  const a0 = 1 + alpha
  const b0 = (1 + cos) / 2 / a0,
    b1 = -(1 + cos) / a0,
    b2 = (1 + cos) / 2 / a0,
    a1 = (-2 * cos) / a0,
    a2 = (1 - alpha) / a0
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0
  return (x: number) => {
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
    x2 = x1
    x1 = x
    y2 = y1
    y1 = y
    return y
  }
}

/** Soft-knee static curve: compressor above T, 2:1 downward expander below T−30 dB. */
export function gainComputer(x: number, T: number, R: number, W: number) {
  const Te = T - 30
  if (x < Te) return Te + (x - Te) * 2
  if (2 * (x - T) < -W) return x
  if (2 * Math.abs(x - T) <= W) return x + ((1 / R - 1) * (x - T + W / 2) ** 2) / (2 * W || 1e-6)
  return T + (x - T) / R
}

const db = (v: number) => 20 * Math.log10(Math.max(1e-5, v))

export function EngineConsole() {
  const accent = useAccent()
  const [engine, setEngine] = useState<Engine>('idle')
  const [params, setParams] = useState({ T: -14, R: 4, W: 6 })
  const [lines, setLines] = useState<Line[]>([{ id: 0, text: 'engine idle · waiting for IPC command' }])
  const [xrunBusy, setXrunBusy] = useState(false)
  const lineId = useRef(1)
  const dot = useRef<SVGCircleElement>(null)
  const grText = useRef<HTMLSpanElement>(null)

  const sim = useRef({
    engine: 'idle' as Engine,
    params: { T: -14, R: 4, W: 6 },
    n: 0,
    inBuf: new Float32Array(N),
    outBuf: new Float32Array(N),
    hp: biquadHP(0.006),
    env: 0,
    gain: 1,
    hold: 0,
    queue: 0,
    xrun: 0 as 0 | 1 | 2, // 0 none, 1 draining/detected, 2 recovering
    lastLevel: -60,
    gr: 0,
  })
  sim.current.params = params

  const log = (text: string, tone?: Line['tone']) => setLines((l) => [...l.slice(-5), { id: lineId.current++, text, tone }])

  const send = (cmd: Cmd) => {
    sfx('click')
    log(`→ ${cmd}  · AlphaNexus IPC dispatch`)
    const next: Engine = cmd === 'START' || cmd === 'RESUME' ? 'running' : cmd === 'PAUSE' ? 'paused' : 'stopping'
    setTimeout(() => {
      log(`← ACK ${cmd}`, 'ack')
      sim.current.engine = next
      setEngine(next)
      if (next === 'stopping') {
        setTimeout(() => {
          sim.current.engine = 'idle'
          setEngine('idle')
          log('engine idle')
        }, 900)
      }
    }, 160)
  }

  const injectXrun = () => {
    const s = sim.current
    if (s.engine !== 'running' || s.xrun) return
    setXrunBusy(true)
    s.xrun = 1
    sfx('hit')
    log('producer stalled · queue draining')
    setTimeout(() => {
      log('XRUN detected · underrun on ALSA playback', 'warn')
      s.xrun = 2
    }, 700)
    setTimeout(() => {
      log('recovered · playback resumed', 'ok')
      s.xrun = 0
      setXrunBusy(false)
    }, 1900)
  }

  const { canvasRef } = useCanvas((ctx, w, h, t, dt) => {
    const s = sim.current
    const acc = accent.current
    const { T, R, W } = s.params

    // queue model
    if (s.engine === 'running') {
      if (s.xrun === 1) s.queue = Math.max(0, s.queue - dt * 55)
      else if (s.xrun === 2) s.queue = Math.min(BUF, s.queue + dt * 30)
      else s.queue = Math.min(BUF, s.queue + dt * 40) - (s.queue >= BUF - 0.1 ? Math.random() * 0.8 : 0)
    } else if (s.engine === 'stopping' || s.engine === 'idle') {
      s.queue = Math.max(0, s.queue - dt * 40)
    }
    const starved = s.xrun === 1 && s.queue < 1

    // produce samples
    if (s.engine === 'running') {
      const k = Math.max(1, Math.round(dt * 300))
      for (let j = 0; j < k; j++) {
        const n = s.n++
        const env = 0.08 + 0.85 * Math.pow(0.5 + 0.5 * Math.sin((2 * Math.PI * n) / 760), 2.2) + (Math.sin(n / 97) > 0.93 ? 0.35 : 0)
        const x = 0.34 + env * Math.sin((2 * Math.PI * n) / 34) // DC offset + carrier
        const y = s.hp(x) // DC blocker
        // envelope with attack / hold / release
        const a = Math.abs(y)
        if (a > s.env) {
          s.env += (a - s.env) * 0.35
          s.hold = 40
        } else if (s.hold > 0) s.hold--
        else s.env += (a - s.env) * 0.02
        const lvl = db(s.env)
        const target = Math.pow(10, (gainComputer(lvl, T, R, W) - lvl) / 20)
        s.gain += (target - s.gain) * (target < s.gain ? 0.3 : 0.03)
        const out = starved || s.xrun === 2 ? 0 : y * s.gain
        s.inBuf.copyWithin(0, 1)
        s.outBuf.copyWithin(0, 1)
        s.inBuf[N - 1] = x
        s.outBuf[N - 1] = out
        s.lastLevel = lvl
        s.gr = db(s.gain)
      }
    } else if (s.engine === 'stopping' || s.engine === 'idle') {
      for (let i = 0; i < N; i++) {
        s.inBuf[i] *= 0.9
        s.outBuf[i] *= 0.9
      }
    }

    ctx.clearRect(0, 0, w, h)
    const qH = 34
    const laneH = (h - qH - 18) / 2
    const lanes = [
      { y: 4, label: 'IN · RAW WITH DC OFFSET', buf: s.inBuf, color: fgA(0.75), center: 0 },
      { y: 8 + laneH, label: 'OUT · DC BLOCKED + DYNAMICS', buf: s.outBuf, color: acc, center: 0 },
    ]
    lanes.forEach((ln) => {
      ctx.strokeStyle = fgA(0.07)
      ctx.strokeRect(0.5, ln.y + 0.5, w - 1, laneH - 4)
      const mid = ln.y + laneH / 2 - 2
      ctx.strokeStyle = fgA(0.14)
      ctx.beginPath()
      ctx.moveTo(0, mid)
      ctx.lineTo(w, mid)
      ctx.stroke()
      ctx.strokeStyle = ln.color
      ctx.lineWidth = 1.4
      ctx.beginPath()
      for (let i = 0; i < N; i++) {
        const x = (i / (N - 1)) * w
        const y = mid - ln.buf[i] * (laneH / 2 - 8) * 0.78
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.lineWidth = 1
      monoLabel(ctx, ln.label, 10, ln.y + 16, fgA(0.5), 9)
    })
    // DC offset marker on the input lane
    const inMid = 4 + laneH / 2 - 2
    const dcY = inMid - 0.34 * (laneH / 2 - 8) * 0.78
    ctx.setLineDash([3, 4])
    ctx.strokeStyle = hexA(acc, 0.55)
    ctx.beginPath()
    ctx.moveTo(0, dcY)
    ctx.lineTo(w, dcY)
    ctx.stroke()
    ctx.setLineDash([])
    monoLabel(ctx, 'DC', w - 10, dcY - 5, hexA(acc, 0.9), 9, 'right')

    if (s.xrun) monoLabel(ctx, s.xrun === 1 ? (starved ? 'XRUN · UNDERRUN' : 'QUEUE DRAINING') : 'RECOVERING', w - 10, 8 + laneH + 16, s.xrun === 1 ? ALARM : acc, 10, 'right')
    else if (s.engine === 'paused') monoLabel(ctx, 'PAUSED', w - 10, 8 + laneH + 16, fgA(0.8), 10, 'right')

    // queue strip
    const qy = h - qH + 4
    monoLabel(ctx, `QUEUE ${Math.round(s.queue).toString().padStart(2, '0')}/${BUF}`, 10, qy + 17, fgA(0.6), 9)
    const x0 = 96,
      cw = (w - x0 - 10) / BUF
    for (let i = 0; i < BUF; i++) {
      const filled = i < Math.round(s.queue)
      ctx.fillStyle = filled ? (s.xrun ? ALARM : fgA(0.8)) : fgA(0.08)
      ctx.fillRect(x0 + i * cw + 1, qy + 6, Math.max(2, cw - 3), 14)
    }

    // transfer-curve live dot + GR readout (direct DOM writes, no re-render)
    if (dot.current) {
      const lv = Math.max(-60, Math.min(0, s.lastLevel))
      const out = gainComputer(lv, T, R, W)
      dot.current.setAttribute('cx', String(((lv + 60) / 60) * 200 + 10))
      dot.current.setAttribute('cy', String(210 - ((Math.max(-60, out) + 60) / 60) * 200))
      dot.current.style.opacity = s.engine === 'running' ? '1' : '0.25'
    }
    if (grText.current) grText.current.textContent = s.engine === 'running' ? `${s.gr.toFixed(1)} dB` : '— dB'
    void t
  })

  const curve = (() => {
    const pts: string[] = []
    for (let i = 0; i <= 120; i++) {
      const x = -60 + i * 0.5
      const y = Math.max(-60, gainComputer(x, params.T, params.R, params.W))
      pts.push(`${i ? 'L' : 'M'}${(((x + 60) / 60) * 200 + 10).toFixed(1)},${(210 - ((y + 60) / 60) * 200).toFixed(1)}`)
    }
    return pts.join('')
  })()
  const tx = ((params.T + 60) / 60) * 200 + 10
  const tex = ((params.T - 30 + 60) / 60) * 200 + 10

  const can = {
    START: engine === 'idle',
    PAUSE: engine === 'running',
    RESUME: engine === 'paused',
    STOP: engine === 'running' || engine === 'paused',
  }
  const icons = { START: Play, PAUSE: Pause, RESUME: StepForward, STOP: Square }

  const slider = (key: 'T' | 'R' | 'W', label: string, min: number, max: number, step: number, fmt: (v: number) => string) => (
    <label className="block">
      <span className="flex justify-between mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
        <span>{label}</span>
        <span className="text-fg">{fmt(params[key])}</span>
      </span>
      <input
        type="range"
        className="range mt-1"
        min={min}
        max={max}
        step={step}
        value={params[key]}
        style={{ ['--fill' as string]: `${((params[key] - min) / (max - min)) * 100}%` }}
        onChange={(e) => setParams((p) => ({ ...p, [key]: Number(e.target.value) }))}
      />
    </label>
  )

  return (
    <div className="screen overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 mono text-[10px] uppercase tracking-[0.16em]">
        <span className="flex items-center gap-2 text-mute">
          <span className={`size-1.5 rounded-full ${engine === 'running' ? 'live-dot bg-signal' : engine === 'paused' ? 'bg-fg' : 'bg-dim'}`} aria-hidden />
          Interactive model
        </span>
        <span className="text-dim max-sm:hidden">/ DSP engine · Odroid N2 · ALSA 48 kHz stereo</span>
        <span className="ml-auto text-soft" aria-live="polite">
          Engine: <span className={engine === 'running' ? 'text-signal' : 'text-fg'}>{engine}</span>
        </span>
      </div>

      {/* gPipeline */}
      <ol className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 mono text-[11px] text-soft" aria-label="gPipeline processing chain">
        {['Queue · 25 pre-buffer', 'DC blocker · biquad IIR', 'Comp / Exp · attack · hold · release · knee', 'ALSA · 48 kHz stereo'].map((b, k, arr) => (
          <li key={b} className="flex shrink-0 items-center gap-2">
            <span className={`rounded-[3px] border px-2.5 py-1 ${engine === 'running' ? 'border-signal/50 text-fg' : 'border-line-2'}`}>{b}</span>
            {k < arr.length - 1 && <span className={engine === 'running' ? 'text-signal' : 'text-dim'}>→</span>}
          </li>
        ))}
      </ol>

      <div className="grid md:grid-cols-12">
        <div className="border-line md:col-span-8 md:border-r">
          <canvas ref={canvasRef} className="h-[300px] w-full md:h-[340px]" role="img" aria-label="Oscilloscope: raw input with a DC offset above, processed output below, and the 25-slot audio queue." />
        </div>
        <div className="flex flex-col gap-4 border-t border-line p-4 md:col-span-4 md:border-t-0">
          <div className="flex items-start gap-4">
            <svg viewBox="0 0 220 220" className="size-[150px] shrink-0 md:size-[132px] xl:size-[150px]" role="img" aria-label={`Compressor/expander transfer curve: threshold ${params.T} dB, ratio ${params.R}:1, knee ${params.W} dB, 2:1 expander below ${params.T - 30} dB.`}>
              <rect x="10" y="10" width="200" height="200" fill="none" stroke="rgb(var(--c-fg) / 0.12)" />
              <rect x="10" y="10" width={Math.max(0, tex - 10)} height="200" fill="rgb(var(--c-fg) / 0.04)" />
              <line x1="10" y1="210" x2="210" y2="10" stroke="rgb(var(--c-fg) / 0.25)" strokeDasharray="3 4" />
              <line x1={tx} x2={tx} y1="10" y2="210" stroke="rgb(var(--c-accent))" strokeOpacity="0.35" />
              <path d={curve} fill="none" stroke="rgb(var(--c-accent))" strokeWidth="2.2" />
              <circle ref={dot} r="4.5" fill="rgb(var(--c-fg))" cx="10" cy="210" />
              <text x="14" y="24" fontSize="10" className="fill-mute mono">OUT dB</text>
              <text x="206" y="204" fontSize="10" textAnchor="end" className="fill-mute mono">IN dB</text>
              <text x={Math.max(14, tex - 4)} y="200" fontSize="9" textAnchor={tex > 60 ? 'end' : 'start'} className="fill-dim mono">EXP</text>
            </svg>
            <div className="min-w-0 mono text-[10.5px] uppercase leading-relaxed tracking-[0.12em] text-mute">
              <p>Gain reduction</p>
              <p className="mt-1 text-lg normal-case tracking-normal text-fg">
                <span ref={grText}>— dB</span>
              </p>
              <p className="mt-3 normal-case tracking-normal text-dim">Soft knee above the threshold, 2:1 expansion 30 dB below it.</p>
            </div>
          </div>
          {slider('T', 'Threshold', -40, -3, 1, (v) => `${v} dB`)}
          {slider('R', 'Ratio', 1, 12, 0.5, (v) => `${v}:1`)}
          {slider('W', 'Knee', 0, 18, 1, (v) => `${v} dB`)}
        </div>
      </div>

      <div className="grid border-t border-line md:grid-cols-12">
        <div className="flex flex-wrap items-center gap-2 p-4 md:col-span-8 md:border-r md:border-line">
          <span className="mr-1 mono text-[10px] uppercase tracking-[0.16em] text-dim">IPC</span>
          {(Object.keys(can) as Cmd[]).map((c) => {
            const Icon = icons[c]
            return (
              <button
                key={c}
                type="button"
                onClick={() => send(c)}
                disabled={!can[c]}
                className={`mono inline-flex h-9 items-center gap-2 rounded-[3px] border px-3.5 text-[10.5px] tracking-[0.1em] transition-colors disabled:opacity-30 ${
                  c === 'START' && can.START ? 'border-signal bg-signal text-on-signal hover:bg-signal/90' : 'border-line-2 text-fg enabled:hover:border-signal'
                }`}
              >
                <Icon size={12} /> {c}
              </button>
            )
          })}
          <button
            type="button"
            onClick={injectXrun}
            disabled={engine !== 'running' || xrunBusy}
            className="mono inline-flex h-9 items-center gap-2 rounded-[3px] border border-alarm/60 px-3.5 text-[10.5px] tracking-[0.1em] text-alarm transition-colors hover:bg-alarm/10 disabled:opacity-30 md:ml-auto"
          >
            <TriangleAlert size={12} /> Force underrun
          </button>
        </div>
        <div className="h-[132px] overflow-hidden border-t border-line px-4 py-3 mono text-[11px] leading-[1.75] md:col-span-4 md:border-t-0" role="log" aria-live="polite" aria-label="IPC log">
          {lines.map((l) => (
            <div key={l.id} className={`truncate ${l.tone === 'ack' ? 'text-fg' : l.tone === 'warn' ? 'text-alarm' : l.tone === 'ok' ? 'text-signal' : 'text-mute'}`}>
              {l.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
