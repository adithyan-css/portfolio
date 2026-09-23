import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, ChevronsDown, ChevronsUp, Keyboard, Pause, Play, Pointer, RotateCcw } from 'lucide-react'
import { Drive, SYSTEMS, XMAX, type Hud, type Status } from './drive'
import { DriveScene, type Detection } from './scene'
import { ALARM, useAccent } from '../hooks/useAccent'
import { useVisible } from '../hooks/useVisible'
import { useFinePointer, useReducedMotionPref } from '../hooks/useMedia'
import { useSite } from '../components/SiteProvider'
import { play as sfx } from '../utils/sound'

const BEST_KEY = 'signal:best-run'
const readBest = () => {
  try {
    const v = Number(localStorage.getItem(BEST_KEY))
    return Number.isFinite(v) && v > 0 ? v : null
  } catch {
    return null
  }
}
const fmt = (s: number) => {
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`
}

const STEER: Record<string, number> = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1 }
const THROTTLE: Record<string, number> = { ArrowUp: 1, KeyW: 1, ArrowDown: -1, KeyS: -1, Space: -1 }
const MONO = '"Martian Mono Variable", ui-monospace, monospace'
/** The co-pilot overlay refreshes at the rate RiderShield runs at on the Pi. */
const EDGE_FPS = 15

type Flash = { key: number; kicker: string; title: string; alarm?: boolean }

function drawDetections(ctx: CanvasRenderingContext2D, dets: Detection[], w: number, h: number, accent: string) {
  ctx.clearRect(0, 0, w, h)
  ctx.font = `600 9.5px ${MONO}`
  ctx.textBaseline = 'middle'
  for (const d of dets) {
    const col = d.threat ? ALARM : d.blink ? accent : 'rgba(232,234,240,0.85)'
    const L = Math.max(5, Math.min(16, d.w * 0.28, d.h * 0.28))
    ctx.strokeStyle = col
    ctx.lineWidth = d.threat ? 2 : 1.25
    if (d.threat) {
      ctx.fillStyle = 'rgba(255,106,61,0.08)'
      ctx.fillRect(d.x, d.y, d.w, d.h)
    }
    ctx.beginPath()
    for (const [cx, cy, sx, sy] of [
      [d.x, d.y, 1, 1],
      [d.x + d.w, d.y, -1, 1],
      [d.x, d.y + d.h, 1, -1],
      [d.x + d.w, d.y + d.h, -1, -1],
    ]) {
      ctx.moveTo(cx + sx * L, cy)
      ctx.lineTo(cx, cy)
      ctx.lineTo(cx, cy + sy * L)
    }
    ctx.stroke()
    if (d.w < 18) continue
    const txt = `${d.label} ${d.conf.toFixed(2)}${d.ttc < 6 ? ` · TTC ${d.ttc.toFixed(1)}s` : ''}`
    const tw = ctx.measureText(txt).width + 10
    const ty = Math.max(9, d.y - 10)
    ctx.fillStyle = d.threat ? ALARM : 'rgba(10,11,16,0.78)'
    ctx.fillRect(d.x, ty - 7.5, tw, 15)
    ctx.fillStyle = d.threat ? '#0a0b10' : col
    ctx.fillText(txt, d.x + 5, ty + 0.5)
  }
}

export default function GameCanvas() {
  const { scrollTo } = useSite()
  const accent = useAccent()
  const reduced = useReducedMotionPref()
  const fine = useFinePointer()
  const wrap = useRef<HTMLDivElement>(null)
  const glHost = useRef<HTMLDivElement>(null)
  const hudCanvas = useRef<HTMLCanvasElement>(null)
  const visible = useVisible(wrap, '0px')
  const drive = useRef<Drive>(null as unknown as Drive)
  if (!drive.current) drive.current = new Drive()
  // Dev-only handle for automated play-testing; stripped from production builds.
  if (import.meta.env.DEV) (window as unknown as { __game: Drive }).__game = drive.current
  const scene = useRef<DriveScene | null>(null)
  const size = useRef({ w: 1, h: 1 })
  const keys = useRef(new Set<string>())
  const pointerX = useRef<number | null>(null)
  const touchThrottle = useRef(0)
  const [status, setStatus] = useState<Status>('ready')
  const [hud, setHud] = useState<Hud>(() => drive.current.hud())
  const [warn, setWarn] = useState(false)
  const [objects, setObjects] = useState(0)
  const [flash, setFlash] = useState<Flash | null>(null)
  const [best, setBest] = useState<number | null>(readBest)
  const [newBest, setNewBest] = useState(false)
  const [glFailed, setGlFailed] = useState(false)
  const [sceneId, setSceneId] = useState(0)
  const statusRef = useRef<Status>('ready')
  const detCount = useRef(0)

  const sync = useCallback(() => {
    const d = drive.current
    if (statusRef.current !== d.status) {
      statusRef.current = d.status
      setStatus(d.status)
    }
    setHud(d.hud())
    setWarn(d.status === 'playing' && d.ttc < 1.25)
    setObjects(detCount.current)
  }, [])

  // Game events → sound + in-screen banners.
  useEffect(() => {
    const d = drive.current
    let flashKey = 0
    let timer = 0
    const show = (f: Omit<Flash, 'key'>) => {
      setFlash({ ...f, key: ++flashKey })
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setFlash(null), 1600)
    }
    d.onEvent = (e) => {
      if (e.type === 'pickup') {
        sfx('collect')
        show({ kicker: `Module · ${e.mod.project}`, title: `+ ${e.mod.label}` })
      }
      if (e.type === 'gate') {
        sfx('collect')
        show({ kicker: `SYS0${e.index} online`, title: e.name })
      }
      if (e.type === 'warn') sfx('tick')
      if (e.type === 'hit') {
        sfx('hit')
        show({ kicker: 'Impact', title: 'Self-healing…', alarm: true })
      }
      if (e.type === 'crash') sfx('hit')
      if (e.type === 'win') {
        sfx('success')
        const prev = readBest()
        if (prev === null || d.time < prev) {
          try {
            localStorage.setItem(BEST_KEY, String(d.time))
          } catch {
            /* storage unavailable */
          }
          setBest(d.time)
          setNewBest(true)
        } else setNewBest(false)
      }
      sync()
    }
    return () => window.clearTimeout(timer)
  }, [sync])

  // Build the world once; tear it all down on unmount.
  useEffect(() => {
    const host = glHost.current
    const o = hudCanvas.current
    if (!host || !o) return
    // a fresh canvas per mount: a disposed renderer leaves its canvas with a lost context
    const c = document.createElement('canvas')
    c.className = 'absolute inset-0 h-full w-full'
    host.appendChild(c)
    let s: DriveScene
    try {
      s = new DriveScene(c, accent.current, !fine)
    } catch (err) {
      console.warn('[night-run] WebGL unavailable', err)
      c.remove()
      setGlFailed(true)
      return
    }
    scene.current = s
    setSceneId((n) => n + 1)
    const ro = new ResizeObserver(() => {
      const r = c.getBoundingClientRect()
      if (!r.width || !r.height) return
      const dpr = Math.min(window.devicePixelRatio || 1, fine ? 1.75 : 1.5)
      size.current = { w: r.width, h: r.height }
      s.resize(r.width, r.height, dpr)
      o.width = Math.round(r.width * dpr)
      o.height = Math.round(r.height * dpr)
      o.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0)
      s.render(drive.current, 0, true)
    })
    ro.observe(c)
    return () => {
      ro.disconnect()
      s.dispose()
      c.remove()
      scene.current = null
    }
  }, [accent, fine])

  // Loop — runs only while on screen. Off screen, a live run pauses itself.
  useEffect(() => {
    const s = scene.current
    const octx = hudCanvas.current?.getContext('2d')
    if (!s || !octx) return
    if (!visible) {
      if (drive.current.status === 'playing') {
        drive.current.status = 'paused'
        sync()
      }
      return
    }
    let raf = 0
    let last = performance.now()
    let hudT = 0
    let edgeT = 1
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const d = drive.current
      let steer = 0
      let throttle = touchThrottle.current
      keys.current.forEach((k) => {
        steer += STEER[k] ?? 0
        throttle += THROTTLE[k] ?? 0
      })
      steer = Math.max(-1, Math.min(1, steer))
      throttle = Math.max(-1, Math.min(1, throttle))
      // reduced motion: the attract drive holds still; a run you start still plays
      const step = reduced && d.status !== 'playing' ? 0 : dt
      d.update(step, { steer, throttle, targetX: pointerX.current })
      s.setAccent(accent.current)
      s.render(d, step, reduced)
      edgeT += dt
      if (edgeT >= 1 / EDGE_FPS) {
        edgeT = 0
        const { w, h } = size.current
        const dets = s.detections(d, w, h)
        detCount.current = dets.length
        drawDetections(octx, dets, w, h, accent.current)
      }
      hudT += dt
      if (hudT > 0.1) {
        hudT = 0
        sync()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [visible, reduced, accent, sync, sceneId])

  const start = useCallback(() => {
    sfx('click')
    keys.current.clear()
    drive.current.start()
    setNewBest(false)
    setFlash(null)
    sync()
    wrap.current?.focus({ preventScroll: true })
  }, [sync])

  const pause = useCallback(() => {
    const d = drive.current
    if (d.status === 'playing') d.status = 'paused'
    else if (d.status === 'paused') d.status = 'playing'
    keys.current.clear()
    sync()
  }, [sync])

  // Keyboard — only captured while the game is live, never from text inputs.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const st = drive.current.status
      if (st === 'playing' && (e.code in STEER || e.code in THROTTLE)) {
        e.preventDefault()
        keys.current.add(e.code)
      }
      if ((e.code === 'Escape' || e.code === 'KeyP') && (st === 'playing' || st === 'paused')) {
        e.preventDefault()
        pause()
      }
      if (e.code === 'Enter' && document.activeElement === wrap.current && st !== 'playing') {
        e.preventDefault()
        if (st === 'paused') pause()
        else start()
      }
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.code)
    const blur = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [pause, start])

  // Pointer / touch: the car follows your finger across the road.
  const toRoad = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    const n = ((e.clientX - r.left) / r.width) * 2 - 1
    return Math.max(-1, Math.min(1, n * 1.3)) * XMAX
  }

  const playing = status === 'playing'
  const integrity = Math.round(hud.integrity)
  const hold = (v: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.stopPropagation()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      touchThrottle.current = v
    },
    onPointerUp: () => (touchThrottle.current = 0),
    onPointerCancel: () => (touchThrottle.current = 0),
  })

  return (
    <div
      ref={wrap}
      tabIndex={0}
      role="application"
      aria-roledescription="game"
      aria-label="Night Run, a 3D driving game. Steer with the arrow keys or A and D, boost with up or W, brake with down, S or Space. On touch, drag to steer. Clear four checkpoints. Press Enter to start and Escape to pause."
      className="screen relative aspect-[3/4] w-full overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-signal/70 sm:aspect-[16/10] lg:aspect-[16/9]"
      data-cursor={playing ? 'none' : 'play'}
    >
      <div
        className={`absolute inset-0 transition-[filter,opacity] duration-700 ${playing ? '' : 'opacity-70 blur-[1.5px]'}`}
        style={{ touchAction: playing ? 'none' : 'pan-y' }}
        onPointerDown={(e) => {
          if (!playing) return
          e.currentTarget.setPointerCapture(e.pointerId)
          pointerX.current = toRoad(e)
        }}
        onPointerMove={(e) => {
          if (pointerX.current !== null) pointerX.current = toRoad(e)
        }}
        onPointerUp={() => (pointerX.current = null)}
        onPointerCancel={() => (pointerX.current = null)}
        aria-hidden
      >
        <div ref={glHost} className="absolute inset-0" />
        <canvas ref={hudCanvas} className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>
      {glFailed && <p className="absolute inset-0 grid place-items-center p-6 text-center text-soft">This game needs WebGL, which isn’t available in this browser.</p>}

      {/* collision warning frame */}
      <div aria-hidden className={`pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_2px_rgb(255_106_61/0.9),inset_0_0_60px_rgb(255_106_61/0.35)] transition-opacity duration-150 ${warn ? 'opacity-100' : 'opacity-0'}`} />

      {/* HUD */}
      <div className={`pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-3 mono text-[10.5px] uppercase tracking-[0.12em] transition-opacity sm:p-4 ${status === 'ready' ? 'opacity-0' : 'opacity-100'}`}>
        <div className="rounded-[3px] border border-line bg-ink/70 px-3 py-2 backdrop-blur">
          <div className="flex items-baseline gap-2">
            <span className="display text-[26px] leading-none tabular-nums text-fg [font-variation-settings:'wdth'_112] sm:text-[32px]">{hud.speed}</span>
            <span className="text-dim">km/h</span>
          </div>
          <div className="mt-1.5 flex gap-3 text-[9.5px]">
            <span>
              <span className="text-dim">T </span>
              <span className="tabular-nums text-fg">{fmt(hud.time)}</span>
            </span>
            <span>
              <span className="text-dim">Score </span>
              <span className="tabular-nums text-fg">{hud.score}</span>
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-3 rounded-[3px] border border-line bg-ink/70 px-3 py-2 backdrop-blur">
            <span className="text-dim max-sm:hidden">Integrity</span>
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line-2 sm:w-24">
              <span className={`block h-full rounded-full transition-[width] duration-200 ${integrity < 40 ? 'bg-alarm' : 'bg-fg'}`} style={{ width: `${integrity}%` }} />
            </span>
            <span className="w-8 text-right tabular-nums text-fg">{integrity}%</span>
            {(playing || status === 'paused') && (
              <button type="button" onClick={pause} className="pointer-events-auto -my-1 grid size-6 place-items-center rounded-[3px] border border-line-2 text-soft hover:text-fg" aria-label={playing ? 'Pause' : 'Resume'}>
                {playing ? <Pause size={11} /> : <Play size={11} />}
              </button>
            )}
          </div>
          <span className="rounded-[3px] bg-ink/60 px-2 py-1 text-[9px] text-dim backdrop-blur">
            RS-edge · {EDGE_FPS} fps · <span className="text-soft tabular-nums">{objects}</span> obj
          </span>
        </div>
      </div>

      {/* checkpoints */}
      <div className={`pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-3 mono text-[10px] uppercase tracking-[0.12em] transition-opacity ${status === 'ready' ? 'opacity-0' : 'opacity-100'}`}>
        {hud.gates < hud.total && (
          <span className="rounded-[3px] bg-ink/60 px-2 py-1 text-dim backdrop-blur">
            Next gate <span className="tabular-nums text-fg">{hud.toGate} m</span>
          </span>
        )}
        <div className="flex flex-wrap justify-center gap-1.5">
          {SYSTEMS.map((s, i) => {
            const done = i < hud.gates
            return (
              <span key={s} className={`rounded-[3px] border px-2 py-1 backdrop-blur ${done ? 'border-signal/60 bg-signal-dim text-fg' : i === hud.gates ? 'border-line-2 bg-ink/70 text-soft' : 'border-line bg-ink/60 text-dim'}`}>
                {done ? '✓' : `0${i + 1}`} {s}
                <span className="ml-1.5 text-dim">{hud.modules[s] ?? 0}/2</span>
              </span>
            )
          })}
        </div>
      </div>

      {/* touch pedals */}
      {playing && !fine && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[5.2rem] flex justify-between px-3">
          <button type="button" {...hold(-1)} className="mono pointer-events-auto flex h-14 w-20 flex-col items-center justify-center rounded-[6px] border border-line-2 bg-ink/70 text-[9px] uppercase tracking-[0.14em] text-soft backdrop-blur active:bg-alarm/20" aria-label="Brake (hold)">
            <ChevronsDown size={16} /> Brake
          </button>
          <button type="button" {...hold(1)} className="mono pointer-events-auto flex h-14 w-20 flex-col items-center justify-center rounded-[6px] border border-line-2 bg-ink/70 text-[9px] uppercase tracking-[0.14em] text-soft backdrop-blur active:bg-signal/25" aria-label="Boost (hold)">
            <ChevronsUp size={16} /> Boost
          </button>
        </div>
      )}

      {/* in-run banners */}
      <AnimatePresence>
        {flash && playing && (
          <motion.div
            key={flash.key}
            initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute inset-x-0 top-[26%] flex flex-col items-center text-center"
          >
            <span className={`label-mono ${flash.alarm ? '!text-alarm' : '!text-signal'}`}>{flash.kicker}</span>
            <span className={`display mt-2 text-[clamp(1.8rem,5vw,3.6rem)] [font-variation-settings:'wdth'_118] ${flash.alarm ? 'text-alarm' : 'text-fg'}`}>{flash.title}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays */}
      <AnimatePresence mode="wait">
        {status !== 'playing' && (
          <motion.div
            key={status}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 grid place-items-center overflow-y-auto bg-ink/45 p-5 text-center"
          >
            {status === 'ready' && (
              <div className="flex max-w-xl flex-col items-center">
                <p className="label-mono !text-signal">Mission · Night run</p>
                <p className="display mt-4 text-[clamp(2.1rem,5.6vw,4.2rem)] [font-variation-settings:'wdth'_112]">Four gates. One per system.</p>
                <ol className="mt-6 max-w-lg space-y-1.5 text-left text-[14px] text-soft">
                  <li>
                    <span className="mono text-signal">01</span> Weave through traffic. The co-pilot boxes every car and counts down time to collision.
                  </li>
                  <li>
                    <span className="mono text-signal">02</span> Grab the modules behind each project. They repair the car.
                  </li>
                  <li>
                    <span className="mono text-signal">03</span> Clear all four checkpoints.
                  </li>
                </ol>
                <button type="button" onClick={start} className="mono group mt-8 inline-flex h-14 items-center gap-5 rounded-[3px] bg-signal pl-5 pr-4 text-[11px] uppercase tracking-[0.16em] text-on-signal transition-colors hover:bg-fg hover:text-ink" data-cursor="play">
                  <span aria-hidden className="size-1.5 rounded-[1px] bg-on-signal group-hover:bg-signal" />
                  Start engine
                  <Play size={14} />
                </button>
                <p className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
                  {fine ? (
                    <>
                      <span className="flex items-center gap-2">
                        <Keyboard size={13} /> ← → steer · ↑ boost · ↓ brake
                      </span>
                      <span className="flex items-center gap-2">
                        <Pointer size={13} /> or drag to steer
                      </span>
                      <span>Esc pause</span>
                    </>
                  ) : (
                    <>
                      <span className="flex items-center gap-2">
                        <Pointer size={13} /> Drag to steer
                      </span>
                      <span>Hold brake · boost</span>
                    </>
                  )}
                </p>
                {best !== null && <p className="mt-3 mono text-[11px] text-dim">Best run · {fmt(best)}</p>}
              </div>
            )}

            {status === 'paused' && (
              <div className="flex flex-col items-center">
                <p className="label-mono">Paused</p>
                <button type="button" onClick={pause} className="mono mt-5 inline-flex h-12 items-center gap-2 rounded-[3px] bg-fg px-5 text-[11px] uppercase tracking-[0.14em] text-ink hover:bg-signal hover:text-on-signal" data-cursor="play">
                  <Play size={14} /> Resume
                </button>
              </div>
            )}

            {status === 'crashed' && (
              <div className="flex max-w-sm flex-col items-center">
                <p className="label-mono !text-alarm">Integrity 0%</p>
                <p className="display mt-4 text-[clamp(2.2rem,6vw,3.6rem)] text-alarm [font-variation-settings:'wdth'_112]">Wrecked.</p>
                <p className="mt-4 text-soft">
                  {hud.gates}/{hud.total} checkpoints cleared. Even self-healing systems need a restart sometimes.
                </p>
                <button type="button" onClick={start} className="mono mt-7 inline-flex h-12 items-center gap-2 rounded-[3px] bg-fg px-5 text-[11px] uppercase tracking-[0.14em] text-ink hover:bg-signal hover:text-on-signal" data-cursor="play">
                  <RotateCcw size={14} /> Restart
                </button>
              </div>
            )}

            {status === 'won' && (
              <div className="flex max-w-xl flex-col items-center">
                <p className="label-mono !text-signal">Mission complete</p>
                <p className="display mt-4 text-[clamp(1.9rem,5.2vw,3.8rem)]">
                  You found the engineer <span className="text-signal [font-variation-settings:'wdth'_125]">behind the system.</span>
                </p>
                <dl className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2 mono text-[12px] uppercase tracking-[0.1em]">
                  <div className="flex gap-2">
                    <dt className="text-dim">Time</dt>
                    <dd className="tabular-nums">{fmt(hud.time)}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-dim">Score</dt>
                    <dd className="tabular-nums">{hud.score}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-dim">Overtakes</dt>
                    <dd className="tabular-nums">{hud.overtakes}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-dim">Best</dt>
                    <dd className="tabular-nums">{best !== null ? fmt(best) : '—'}</dd>
                  </div>
                </dl>
                {newBest && <p className="mt-2 mono text-[11px] uppercase tracking-[0.14em] text-signal">New best run</p>}
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={() => scrollTo('work')} className="mono group inline-flex h-12 items-center gap-3 rounded-[3px] bg-signal px-5 text-[11px] uppercase tracking-[0.14em] text-on-signal" data-cursor="view">
                    Explore my projects <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </button>
                  <button type="button" onClick={start} className="mono inline-flex h-12 items-center gap-2 rounded-[3px] border border-line-2 px-5 text-[11px] uppercase tracking-[0.14em] hover:border-fg/60" data-cursor="play">
                    <RotateCcw size={15} /> Drive again
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <p className="sr-only" aria-live="polite">
        {status === 'won'
          ? 'Mission complete. You found the engineer behind the system.'
          : status === 'crashed'
            ? 'Wrecked. Integrity zero.'
            : status === 'playing'
              ? `${hud.gates} of ${hud.total} checkpoints cleared.${warn ? ' Collision warning.' : ''}`
              : ''}
      </p>
    </div>
  )
}
