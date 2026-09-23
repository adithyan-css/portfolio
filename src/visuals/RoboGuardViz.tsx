import { useRef } from 'react'
import { useCanvas } from '../hooks/useCanvas'
import { ALARM, useAccent } from '../hooks/useAccent'
import { fgA, hexA, monoLabel } from '../utils/color'
import { mulberry32 } from '../utils/math'
import { roundRect } from './RiderShieldViz'
import { VizFrame } from './VizFrame'

type Sample = { v: number; score: number; mark?: 'warn' | 'fail'; lead?: number }

const STEPS_PER_SEC = 14
const WINDOW = 170
const THRESH = 0.6

/**
 * Motor signal with an LSTM-style anomaly score. Each simulated failure is preceded
 * by an early warning 10–30 steps earlier (the résumé's range). Inset: YOLOv8 zones.
 */
export function RoboGuardViz({ caption }: { caption?: string }) {
  const accent = useAccent()
  const sim = useRef({
    rand: mulberry32(11),
    buf: [] as Sample[],
    step: 0,
    acc: 0,
    cycleStart: 0,
    degStart: 0,
    warnAt: 0,
    failAt: 0,
    lead: 0,
    downUntil: -1,
  })

  const newCycle = (from: number) => {
    const s = sim.current
    const normal = 70 + Math.floor(s.rand() * 50)
    s.cycleStart = from
    s.failAt = from + normal + 42
    s.degStart = s.failAt - 42
    s.lead = 10 + Math.floor(s.rand() * 21)
    s.warnAt = s.failAt - s.lead
  }

  const nextSample = (): Sample => {
    const s = sim.current
    const k = s.step
    const r = s.rand
    if (s.failAt === 0) newCycle(k)
    if (k <= s.downUntil) return { v: 0, score: 0.08 }
    if (k === s.failAt) {
      s.downUntil = k + 8
      newCycle(k + 9)
      return { v: 1.15, score: 1, mark: 'fail' }
    }
    const deg = k >= s.degStart ? (k - s.degStart) / (s.failAt - s.degStart) : 0
    const v = Math.sin(k * 0.34) * 0.34 * (1 + deg * 1.3) + Math.sin(k * 1.27) * 0.28 * deg + (r() - 0.5) * (0.12 + deg * 0.35)
    let score = 0.12 + r() * 0.1
    if (k >= s.degStart && k < s.warnAt) score = 0.2 + ((k - s.degStart) / Math.max(1, s.warnAt - s.degStart)) * (THRESH - 0.22) + r() * 0.04
    if (k >= s.warnAt) score = THRESH + 0.02 + ((k - s.warnAt) / Math.max(1, s.failAt - s.warnAt)) * 0.33
    const sample: Sample = { v, score: Math.min(1, score) }
    if (k === s.warnAt) {
      sample.mark = 'warn'
      sample.lead = s.lead
    }
    return sample
  }

  const { canvasRef } = useCanvas((ctx, w, h, t, dt) => {
    const s = sim.current
    const acc = accent.current
    // prime the buffer so the first frame is already populated
    if (s.buf.length === 0) {
      for (let i = 0; i < WINDOW - 40; i++) {
        s.buf.push(nextSample())
        s.step++
      }
    }
    s.acc += dt * STEPS_PER_SEC
    while (s.acc >= 1) {
      s.buf.push(nextSample())
      s.step++
      s.acc -= 1
      if (s.buf.length > WINDOW) s.buf.shift()
    }

    ctx.clearRect(0, 0, w, h)
    const wide = w >= 620
    const zoneW = wide ? Math.min(250, w * 0.33) : w - 28
    const zoneH = wide ? h - 28 : Math.min(170, h * 0.36)
    const plotW = wide ? w - zoneW - 42 : w - 28
    const plotH = wide ? h - 28 : h - zoneH - 42
    const px = 14,
      py = 14

    // plot frames
    const sigH = plotH * 0.62
    const scoreTop = py + sigH + 14
    const scoreH = plotH - sigH - 14
    const X = (i: number) => px + (i / (WINDOW - 1)) * plotW
    const Ys = (v: number) => py + sigH / 2 - v * (sigH / 2) * 0.78
    const Ya = (v: number) => scoreTop + scoreH - v * scoreH

    ctx.strokeStyle = fgA(0.08)
    ctx.strokeRect(px + 0.5, py + 0.5, plotW, sigH)
    ctx.strokeRect(px + 0.5, scoreTop + 0.5, plotW, scoreH)
    monoLabel(ctx, 'MOTOR TIME-SERIES', px + 8, py + 16, fgA(0.5), 9)
    monoLabel(ctx, 'LSTM ANOMALY SCORE', px + 8, scoreTop + 14, fgA(0.5), 9)

    // threshold
    ctx.setLineDash([3, 4])
    ctx.strokeStyle = hexA(acc, 0.6)
    ctx.beginPath()
    ctx.moveTo(px, Ya(THRESH))
    ctx.lineTo(px + plotW, Ya(THRESH))
    ctx.stroke()
    ctx.setLineDash([])

    // markers
    const buf = s.buf
    const off = WINDOW - buf.length
    let warnX: number | null = null,
      failX: number | null = null,
      lead = 0
    buf.forEach((smp, i) => {
      if (!smp.mark) return
      const x = X(i + off)
      if (smp.mark === 'warn') {
        warnX = x
        lead = smp.lead ?? 0
        ctx.setLineDash([4, 4])
        ctx.strokeStyle = acc
        ctx.beginPath()
        ctx.moveTo(x, py)
        ctx.lineTo(x, scoreTop + scoreH)
        ctx.stroke()
        ctx.setLineDash([])
        monoLabel(ctx, 'EARLY WARNING', x + 6, py + 32, acc, 9)
      } else {
        failX = x
        ctx.strokeStyle = ALARM
        ctx.beginPath()
        ctx.moveTo(x, py)
        ctx.lineTo(x, scoreTop + scoreH)
        ctx.stroke()
        const right = x > px + plotW - 60
        monoLabel(ctx, 'FAILURE', right ? x - 6 : x + 6, py + 48, ALARM, 9, right ? 'right' : 'left')
      }
    })
    if (warnX !== null && failX !== null && (failX as number) > (warnX as number)) {
      const a = warnX as number,
        b = failX as number
      ctx.fillStyle = hexA(acc, 0.08)
      ctx.fillRect(a, py, b - a, sigH)
      ctx.strokeStyle = acc
      ctx.beginPath()
      const yb = py + sigH - 12
      ctx.moveTo(a, yb - 4)
      ctx.lineTo(a, yb)
      ctx.lineTo(b, yb)
      ctx.lineTo(b, yb - 4)
      ctx.stroke()
      if (b - a > 60) monoLabel(ctx, `LEAD ${lead} STEPS`, (a + b) / 2, yb - 6, acc, 9, 'center')
    }

    // signal
    ctx.lineWidth = 1.4
    ctx.strokeStyle = '#e8eaf0'
    ctx.beginPath()
    buf.forEach((smp, i) => {
      const x = X(i + off),
        y = Ys(smp.v)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
    // score
    ctx.lineWidth = 1.6
    buf.forEach((smp, i) => {
      if (i === 0) return
      const prev = buf[i - 1]
      ctx.strokeStyle = smp.score >= THRESH ? acc : fgA(0.6)
      ctx.beginPath()
      ctx.moveTo(X(i - 1 + off), Ya(prev.score))
      ctx.lineTo(X(i + off), Ya(smp.score))
      ctx.stroke()
    })
    ctx.lineWidth = 1

    // live head
    const last = buf[buf.length - 1]
    ctx.fillStyle = last.score >= THRESH ? acc : '#e8eaf0'
    ctx.beginPath()
    ctx.arc(X(WINDOW - 1), Ys(last.v), 3, 0, Math.PI * 2)
    ctx.fill()

    // ── Zone monitor ──
    const zx = wide ? px + plotW + 14 : px
    const zy = wide ? py : py + plotH + 14
    ctx.strokeStyle = fgA(0.12)
    ctx.strokeRect(zx + 0.5, zy + 0.5, zoneW, zoneH)
    monoLabel(ctx, 'YOLOV8 · SAFETY ZONES', zx + 8, zy + 16, fgA(0.5), 9)
    const cx = zx + zoneW / 2,
      cy = zy + zoneH / 2 + 8
    const R = Math.min(zoneW, zoneH - 30) / 2 - 8
    const person = {
      x: cx + Math.sin(t * 0.55) * R * 0.95,
      y: cy + Math.sin(t * 0.83 + 1.1) * R * 0.8,
    }
    const dist = Math.hypot((person.x - cx) / R, (person.y - cy) / R)
    const inRestricted = dist < 0.42
    const inCaution = !inRestricted && dist < 0.75
    // zones
    ctx.fillStyle = inCaution ? fgA(0.07) : 'transparent'
    roundRect(ctx, cx - R * 0.75, cy - R * 0.75, R * 1.5, R * 1.5, 10)
    ctx.fill()
    ctx.setLineDash([3, 4])
    ctx.strokeStyle = fgA(0.3)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = inRestricted ? hexA(ALARM, 0.3) : hexA(ALARM, 0.05)
    roundRect(ctx, cx - R * 0.42, cy - R * 0.42, R * 0.84, R * 0.84, 8)
    ctx.fill()
    ctx.strokeStyle = hexA(ALARM, 0.75)
    ctx.stroke()
    // machine
    ctx.strokeStyle = fgA(0.8)
    ctx.strokeRect(cx - R * 0.14, cy - R * 0.14, R * 0.28, R * 0.28)
    ctx.beginPath()
    ctx.arc(cx, cy, R * 0.07, 0, Math.PI * 2)
    ctx.stroke()
    // person + detection box
    const bw = 16,
      bh = 22
    ctx.strokeStyle = inRestricted ? ALARM : fgA(0.9)
    ctx.strokeRect(person.x - bw / 2, person.y - bh / 2, bw, bh)
    ctx.fillStyle = inRestricted ? ALARM : '#e8eaf0'
    ctx.beginPath()
    ctx.arc(person.x, person.y - 3, 3, 0, Math.PI * 2)
    ctx.fill()
    monoLabel(ctx, 'person', person.x + bw / 2 + 4, person.y - bh / 2 + 7, inRestricted ? ALARM : fgA(0.7), 9)
    const status = inRestricted ? 'ZONE BREACH · RESTRICTED' : inCaution ? 'CAUTION ZONE' : 'CLEAR'
    monoLabel(ctx, status, zx + 8, zy + zoneH - 10, inRestricted ? ALARM : fgA(0.6), 9)
  })

  return (
    <VizFrame
      title="Early warning + zones"
      caption={caption}
      controls={
        <span className="flex items-center gap-2 mono text-[10px] uppercase tracking-[0.14em] text-mute">
          FastAPI <span className="text-signal">⇄</span> WebSockets
        </span>
      }
      minH="min-h-[400px] md:min-h-[380px]"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Simulation: a motor signal whose LSTM anomaly score crosses the threshold 10 to 30 steps before each failure event, plus a YOLOv8 safety-zone monitor flagging a person entering the restricted zone."
      />
    </VizFrame>
  )
}
