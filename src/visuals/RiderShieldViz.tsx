import { useRef } from 'react'
import { Zap } from 'lucide-react'
import { useCanvas } from '../hooks/useCanvas'
import { ALARM, useAccent } from '../hooks/useAccent'
import { fgA, hexA, monoLabel } from '../utils/color'
import { clamp } from '../utils/math'
import { VizButton, VizFrame } from './VizFrame'

const NODES = ['ESP32', 'MQTT', 'FastAPI', 'Flutter']
const FPS = 15

type Packet = { x: number; alert: boolean }

/**
 * Edge loop simulation: a camera view classified at 15 FPS inside a <100 ms budget,
 * and the IoT chain (ESP32 → MQTT → FastAPI → Flutter) carrying events.
 */
export function RiderShieldViz({ caption }: { caption?: string }) {
  const accent = useAccent()
  const sim = useRef({
    event: -100, // time of last impact trigger
    auto: 4.5,
    packets: [] as Packet[],
    lastTele: 0,
    alertAt: -100,
    now: 0,
    spawned: false,
  })

  const trigger = () => {
    const s = sim.current
    if (s.now - s.event > 2.2) {
      s.event = s.now
      s.spawned = false
    }
  }

  const { canvasRef } = useCanvas((ctx, w, h, t, dt) => {
    const s = sim.current
    s.now = t
    const acc = accent.current
    if (t > s.auto && t - s.event > 6) {
      s.event = t
      s.spawned = false
      s.auto = t + 7.5
    }

    const since = t - s.event
    const approaching = since >= 0 && since < 0.75
    const impact = since >= 0.75 && since < 2.4
    if (impact && !s.spawned) {
      s.packets.push({ x: 0, alert: true })
      s.spawned = true
    }
    const shake = since >= 0.75 && since < 1.15 ? (1 - (since - 0.75) / 0.4) * 5 : 0

    ctx.clearRect(0, 0, w, h)
    const camH = Math.round(h * 0.68)

    // ── Camera view ──
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, w, camH)
    ctx.clip()
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake)
    const vp = { x: w * 0.5, y: camH * 0.4 }
    const groundY = (d: number) => vp.y + (camH - vp.y) * (1 / d)

    ctx.strokeStyle = fgA(0.1)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, vp.y)
    ctx.lineTo(w, vp.y)
    ctx.stroke()
    // road edges
    ctx.strokeStyle = fgA(0.28)
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(vp.x, vp.y)
      ctx.lineTo(vp.x + side * w * 0.62, camH)
      ctx.stroke()
    }
    // lane dashes + roadside posts moving toward the camera
    const speed = approaching || impact ? 3 : 5
    for (let k = 0; k < 14; k++) {
      const d = 1 + ((k * 1.6 - t * speed) % 22 + 22) % 22
      const d2 = d + 0.7
      const a = clamp(1 - d / 22) * 0.7
      ctx.strokeStyle = fgA(a)
      ctx.lineWidth = Math.max(1, 3 / d)
      ctx.beginPath()
      ctx.moveTo(vp.x, groundY(d))
      ctx.lineTo(vp.x, groundY(d2))
      ctx.stroke()
      for (const side of [-1, 1]) {
        const x = vp.x + side * w * 0.8 * (1 / d)
        const y = groundY(d)
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x, y - (w * 0.22) / d)
        ctx.stroke()
      }
    }
    // vehicle ahead
    let dObj = 5 + Math.sin(t * 0.7) * 0.6
    if (approaching) dObj = 5 - (since / 0.75) ** 2 * 3.7
    if (impact) dObj = 1.3
    const ow = (w * 0.55) / dObj
    const oh = ow * 0.62
    const oy = groundY(dObj)
    ctx.strokeStyle = impact ? ALARM : fgA(0.85)
    ctx.lineWidth = 1.4
    ctx.strokeRect(vp.x - ow / 2, oy - oh, ow, oh)
    ctx.strokeRect(vp.x - ow * 0.36, oy - oh * 0.9, ow * 0.72, oh * 0.38)
    ctx.fillStyle = ALARM
    const tl = Math.max(2, ow * 0.08)
    ctx.fillRect(vp.x - ow / 2 + tl * 0.6, oy - oh * 0.42, tl, tl * 0.6)
    ctx.fillRect(vp.x + ow / 2 - tl * 1.6, oy - oh * 0.42, tl, tl * 0.6)
    ctx.restore()

    if (impact) {
      const f = clamp(1 - (since - 0.75) / 0.5)
      ctx.fillStyle = hexA(ALARM, 0.18 * f)
      ctx.fillRect(0, 0, w, camH)
    }

    // HUD
    const frame = Math.floor(t * FPS)
    monoLabel(ctx, `FRAME ${String(frame).padStart(6, '0')}`, 14, 22, fgA(0.7))
    monoLabel(ctx, 'MOBILENETV2 · TFLITE · INT8', w - 14, 22, fgA(0.7), 10, 'right')
    // frame interval sweep vs budget (15 FPS → 66.7 ms per frame; budget 100 ms)
    const bw = Math.min(170, w * 0.32)
    const bx = w - 14 - bw
    const by = 34
    const scale = 120 // ms full width
    const phase = (t * FPS) % 1
    ctx.fillStyle = fgA(0.1)
    ctx.fillRect(bx, by, bw, 3)
    ctx.fillStyle = fgA(0.8)
    ctx.fillRect(bx, by, bw * ((phase * (1000 / FPS)) / scale), 3)
    ctx.fillStyle = acc
    ctx.fillRect(bx + bw * (100 / scale), by - 4, 1.5, 11)
    monoLabel(ctx, '100 ms budget', bx + bw * (100 / scale), by + 20, acc, 9, 'right')

    const label = impact ? 'COLLISION' : 'NORMAL'
    ctx.font = '600 11px "Martian Mono Variable", monospace'
    const lw = ctx.measureText(label).width + 22
    ctx.fillStyle = impact ? ALARM : 'rgba(10,11,16,0.85)'
    ctx.strokeStyle = impact ? ALARM : fgA(0.3)
    roundRect(ctx, 14, camH - 38, lw, 24, 12)
    ctx.fill()
    ctx.stroke()
    monoLabel(ctx, label, 25, camH - 22, impact ? 'rgb(var(--c-bg))' : fgA(0.9), 11)
    // frame ticks
    for (let k = 0; k < FPS; k++) {
      const on = k === frame % FPS
      ctx.fillStyle = on ? acc : fgA(0.18)
      ctx.fillRect(w - 14 - (FPS - k) * 7, camH - 24, 4, on ? 8 : 4)
    }
    monoLabel(ctx, `${FPS} FPS`, w - 14 - FPS * 7 - 8, camH - 17, fgA(0.6), 9, 'right')

    ctx.strokeStyle = fgA(0.1)
    ctx.beginPath()
    ctx.moveTo(0, camH + 0.5)
    ctx.lineTo(w, camH + 0.5)
    ctx.stroke()

    // ── IoT pipeline ──
    const py = camH + (h - camH) * 0.56
    const xs = NODES.map((_, k) => w * (0.12 + k * 0.253))
    ctx.strokeStyle = fgA(0.22)
    ctx.beginPath()
    ctx.moveTo(xs[0], py)
    ctx.lineTo(xs[3], py)
    ctx.stroke()

    if (t - s.lastTele > 0.9) {
      s.packets.push({ x: 0, alert: false })
      s.lastTele = t
    }
    const span = xs[3] - xs[0]
    s.packets = s.packets.filter((p) => {
      p.x += dt * (p.alert ? 0.55 : 0.32)
      const px = xs[0] + p.x * span
      if (p.alert) {
        ctx.fillStyle = ALARM
        ctx.shadowColor = ALARM
        ctx.shadowBlur = 14
        ctx.beginPath()
        ctx.arc(px, py, 4.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      } else {
        ctx.fillStyle = fgA(0.55)
        ctx.beginPath()
        ctx.arc(px, py, 2, 0, Math.PI * 2)
        ctx.fill()
      }
      if (p.x >= 1) {
        if (p.alert) s.alertAt = t
        return false
      }
      return true
    })
    const alertOn = t - s.alertAt < 1.6
    NODES.forEach((n, k) => {
      const hot = k === 3 && alertOn
      ctx.font = '500 10.5px "Martian Mono Variable", monospace'
      const tw = ctx.measureText(n).width + 20
      ctx.fillStyle = hot ? ALARM : '#13141c'
      ctx.strokeStyle = hot ? ALARM : fgA(0.3)
      roundRect(ctx, xs[k] - tw / 2, py - 13, tw, 26, 6)
      ctx.fill()
      ctx.stroke()
      monoLabel(ctx, n, xs[k], py + 4, hot ? 'rgb(var(--c-bg))' : fgA(0.9), 10.5, 'center')
    })
    if (alertOn) monoLabel(ctx, 'ALERT RECEIVED', xs[3], py + 30, ALARM, 9, 'center')
    monoLabel(ctx, 'IOT PIPELINE', 14, camH + 18, fgA(0.45), 9)
  })

  return (
    <VizFrame
      title="Edge inference + IoT"
      caption={caption}
      controls={
        <VizButton onClick={trigger} label="Simulate an impact event">
          <Zap size={11} /> Simulate impact
        </VizButton>
      }
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label="Simulation: a road camera view classified frame by frame at 15 FPS within a 100 millisecond budget; on a collision, an alert travels ESP32 to MQTT to FastAPI to the Flutter dashboard." />
    </VizFrame>
  )
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
