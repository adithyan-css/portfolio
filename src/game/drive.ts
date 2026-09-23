/**
 * NIGHT RUN — game logic for the 3D driving game. No three.js, no React: plain state + update().
 *
 * World: the player's car sits at z = 0; everything else is stored as distance AHEAD of it (metres).
 * Traffic moves at its own speed, so it closes at (speed − car.speed). Pickups and checkpoints are
 * static in the world and close at the full speed.
 */
import { mulberry32 } from '../utils/math'

export type Status = 'ready' | 'playing' | 'paused' | 'won' | 'crashed'
export type Kind = 'sedan' | 'van' | 'truck'

export const KIND: Record<Kind, { w: number; len: number; h: number; label: string }> = {
  sedan: { w: 1.8, len: 4.3, h: 1.35, label: 'CAR' },
  van: { w: 2.0, len: 5.2, h: 2.1, label: 'VAN' },
  truck: { w: 2.4, len: 8.6, h: 3.0, label: 'TRUCK' },
}
export const LANES = [-3.4, 0, 3.4]
export const ROAD_HALF = 5.4
export const XMAX = 4.35
export const CAR = { w: 1.8, len: 4.4 }
/** Distance between checkpoints. */
export const SEG = 520
export const SPAWN_Z = 175

export type ModuleDef = { id: string; label: string; project: string }
/** Two modules per system — each is technology named on the résumé for that project. */
export const MODULES: ModuleDef[] = [
  { id: 'tflite', label: 'TFLite · INT8', project: 'RiderShield AI' },
  { id: 'mqtt', label: 'MQTT', project: 'RiderShield AI' },
  { id: 'chronos', label: 'Chronos', project: 'AgriPrice AI' },
  { id: 'nestjs', label: 'NestJS', project: 'AgriPrice AI' },
  { id: 'lstm', label: 'LSTM', project: 'RoboGuard' },
  { id: 'yolo', label: 'YOLOv8', project: 'RoboGuard' },
  { id: 'memory', label: 'Immune memory', project: 'Helix' },
  { id: 'n8n', label: 'n8n reflex', project: 'Helix' },
]
export const SYSTEMS = ['RiderShield AI', 'AgriPrice AI', 'RoboGuard', 'Helix']

export type Car = {
  id: number
  kind: Kind
  lane: number
  toLane: number
  x: number
  z: number
  speed: number
  conf: number
  blink: number
  passed: boolean
  shade: number
}
export type Pickup = { id: number; x: number; z: number; mod: ModuleDef; taken: boolean }

export type Input = { steer: number; throttle: number; targetX: number | null }
export type DriveEvent =
  | { type: 'pickup'; mod: ModuleDef }
  | { type: 'gate'; index: number; name: string }
  | { type: 'hit' }
  | { type: 'crash' }
  | { type: 'warn' }
  | { type: 'win' }

export type Hud = {
  score: number
  time: number
  integrity: number
  speed: number
  gates: number
  total: number
  toGate: number
  overtakes: number
  collected: number
  modules: Record<string, number>
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export class Drive {
  status: Status = 'ready'
  x = 0
  vx = 0
  lean = 0
  speed = 24
  dist = 0
  time = 0
  clock = 0
  integrity = 100
  score = 0
  overtakes = 0
  collected = 0
  gates = 0
  inv = 0
  shake = 0
  braking = false
  boosting = false
  /** Lowest time-to-collision in the car's path (s); Infinity when clear. */
  ttc = Infinity
  traffic: Car[] = []
  pickups: Pickup[] = []
  modules: Record<string, number> = {}
  /** Seconds since the last gate — drives the gate flash. */
  sinceGate = 99
  sinceHit = 99
  private uid = 0
  private nextRow = 0
  private pickupsSpawned = 0
  private warnCd = 0
  private rng = mulberry32(7)
  onEvent: (e: DriveEvent) => void = () => {}

  constructor() {
    this.reset()
  }

  reset() {
    this.rng = mulberry32((Date.now() & 0xffff) + 11)
    this.x = 0
    this.vx = 0
    this.lean = 0
    this.speed = 24
    this.dist = 0
    this.time = 0
    this.integrity = 100
    this.score = 0
    this.overtakes = 0
    this.collected = 0
    this.gates = 0
    this.inv = 0
    this.shake = 0
    this.sinceGate = 99
    this.sinceHit = 99
    this.traffic = []
    this.pickups = []
    this.pickupsSpawned = 0
    this.modules = Object.fromEntries(SYSTEMS.map((s) => [s, 0]))
    // pre-fill the road so there is something to read from the first frame
    for (const z of [62, 96, 132]) this.spawnRow(z)
    this.nextRow = 26
  }

  start() {
    this.reset()
    this.status = 'playing'
  }

  /** Distance from the car to the next checkpoint. */
  get gateZ() {
    return (this.gates + 1) * SEG - this.dist
  }

  update(dt: number, input: Input) {
    if (this.status === 'paused') return
    const live = this.status === 'playing'
    this.clock += dt
    if (live) this.time += dt
    const inp = live ? input : this.autopilot()

    // ── longitudinal ──────────────────────────────────────────────────────
    const base = 30 + this.gates * 4.5
    this.boosting = inp.throttle > 0
    this.braking = inp.throttle < 0
    const target = this.boosting ? base + 16 : this.braking ? base * 0.34 : base
    const acc = target > this.speed ? (this.boosting ? 20 : 13) : this.braking ? 44 : 16
    this.speed += Math.sign(target - this.speed) * Math.min(Math.abs(target - this.speed), acc * dt)

    // ── lateral ───────────────────────────────────────────────────────────
    if (inp.targetX !== null) {
      this.vx = clamp((clamp(inp.targetX, -XMAX, XMAX) - this.x) * 7, -13, 13)
    } else {
      this.vx += inp.steer * 72 * dt
      this.vx *= Math.pow(inp.steer ? 0.25 : 0.003, dt)
      this.vx = clamp(this.vx, -12.5, 12.5)
    }
    this.x += this.vx * dt
    if (Math.abs(this.x) > XMAX) {
      this.x = clamp(this.x, -XMAX, XMAX)
      this.vx = 0
      if (live) {
        this.speed *= 1 - 0.9 * dt // guard-rail scrape
        this.shake = Math.max(this.shake, 0.18)
      }
    }
    this.lean += (this.vx / 12.5 - this.lean) * Math.min(1, dt * 8)

    const d = this.speed * dt
    this.dist += d

    // ── traffic ───────────────────────────────────────────────────────────
    const aggression = 0.35 + this.gates * 0.28
    for (const c of this.traffic) {
      if (c.toLane !== c.lane) {
        const tx = LANES[c.toLane]
        const step = Math.min(Math.abs(tx - c.x), 2.3 * dt)
        c.x += Math.sign(tx - c.x) * step
        c.blink += dt
        if (Math.abs(tx - c.x) < 0.001) {
          c.lane = c.toLane
          c.blink = 0
        }
      } else if (c.z > 28 && c.z < 105 && this.rng() < 0.2 * aggression * dt) {
        const opts = [c.lane - 1, c.lane + 1].filter((l) => l >= 0 && l < 3 && this.laneFree(l, c.z, 14, c.id))
        if (opts.length) {
          c.toLane = opts[(this.rng() * opts.length) | 0]
          c.blink = 0.001
        }
      }
      c.z -= (this.speed - c.speed) * dt
      if (!c.passed && c.z < -(KIND[c.kind].len + CAR.len) / 2) {
        c.passed = true
        if (live) {
          this.overtakes++
          this.score += 25
        }
      }
    }
    this.traffic = this.traffic.filter((c) => c.z > -34 && c.z < SPAWN_Z + 60)
    if (this.dist >= this.nextRow) {
      this.spawnRow(SPAWN_Z + this.rng() * 8)
      const g = Math.min(3, this.gates)
      this.nextRow = this.dist + (34 - g * 4.5) + this.rng() * 12
    }

    // ── pickups (static in the world) ─────────────────────────────────────
    for (const p of this.pickups) p.z -= d
    this.pickups = this.pickups.filter((p) => p.z > -12 && !p.taken)
    if (live && this.gates < SYSTEMS.length) {
      const segStart = this.gates * SEG
      const marks = [0.28, 0.6]
      const due = this.pickupsSpawned - this.gates * 2
      if (due < 2 && this.dist - segStart > marks[due] * SEG) this.spawnPickup()
    }

    // ── checkpoints ───────────────────────────────────────────────────────
    this.sinceGate += dt
    this.sinceHit += dt
    if (live && this.gateZ <= 0) {
      const name = SYSTEMS[this.gates]
      this.gates++
      this.sinceGate = 0
      this.score += 500
      this.onEvent({ type: 'gate', index: this.gates, name })
      if (this.gates >= SYSTEMS.length) {
        this.score += Math.round(this.integrity * 10)
        this.status = 'won'
        this.onEvent({ type: 'win' })
        return
      }
    }

    // ── collision + time-to-collision ─────────────────────────────────────
    this.inv = Math.max(0, this.inv - dt)
    this.shake = Math.max(0, this.shake - dt * 2.4)
    this.warnCd = Math.max(0, this.warnCd - dt)
    let ttc = Infinity
    for (const c of this.traffic) {
      const k = KIND[c.kind]
      const dx = c.x - this.x
      const reachX = (k.w + CAR.w) / 2
      const reachZ = (k.len + CAR.len) / 2
      if (Math.abs(dx) < reachX + 0.25 && c.z > 0) {
        const closing = this.speed - c.speed
        if (closing > 0.4) ttc = Math.min(ttc, Math.max(0, c.z - reachZ) / closing)
      }
      if (!live) continue
      const ox = reachX * 0.94 - Math.abs(dx)
      const oz = reachZ * 0.92 - Math.abs(c.z)
      if (ox > 0 && oz > 0 && this.inv <= 0) {
        const side = ox < oz * 0.45
        if (side) {
          this.x = clamp(this.x - Math.sign(dx || 1) * (ox + 0.25), -XMAX, XMAX)
          this.vx = -Math.sign(dx || 1) * 6
          this.integrity -= 20
        } else {
          c.z = Math.max(c.z, reachZ + 0.6)
          this.speed = Math.min(this.speed, c.speed * 0.85)
          this.integrity -= 34
        }
        this.inv = 1.4
        this.shake = 1
        this.sinceHit = 0
        this.onEvent({ type: 'hit' })
        if (this.integrity <= 0) {
          this.integrity = 0
          this.status = 'crashed'
          this.onEvent({ type: 'crash' })
          return
        }
      }
    }
    this.ttc = ttc
    if (live && ttc < 1.25 && this.warnCd <= 0) {
      this.warnCd = 0.45
      this.onEvent({ type: 'warn' })
    }

    // ── self-healing ──────────────────────────────────────────────────────
    if (live && this.sinceHit > 2.2 && this.integrity < 100) this.integrity = Math.min(100, this.integrity + 6 * dt)

    // pickups collide
    if (live)
      for (const p of this.pickups) {
        if (!p.taken && Math.abs(p.x - this.x) < 1.45 && Math.abs(p.z) < 2.3) {
          p.taken = true
          this.collected++
          this.modules[p.mod.project] = (this.modules[p.mod.project] ?? 0) + 1
          this.integrity = Math.min(100, this.integrity + 12)
          this.score += 150
          this.onEvent({ type: 'pickup', mod: p.mod })
        }
      }
  }

  hud(): Hud {
    return {
      score: this.score,
      time: this.time,
      integrity: this.integrity,
      speed: Math.round(this.speed * 3.6),
      gates: this.gates,
      total: SYSTEMS.length,
      toGate: Math.max(0, Math.round(this.gateZ)),
      overtakes: this.overtakes,
      collected: this.collected,
      modules: { ...this.modules },
    }
  }

  /** Dev/test helper: jump to just before checkpoint `i` (0-based). */
  warp(i: number) {
    this.gates = clamp(i, 0, SYSTEMS.length - 1)
    this.pickupsSpawned = this.gates * 2
    this.dist = (this.gates + 1) * SEG - 40
    this.nextRow = this.dist + 30
    this.traffic = []
    this.pickups = []
  }

  private laneFree(lane: number, z: number, span: number, except = -1) {
    return !this.traffic.some((c) => c.id !== except && (c.lane === lane || c.toLane === lane) && Math.abs(c.z - z) < span + KIND[c.kind].len / 2)
  }

  private spawnRow(z: number) {
    const g = Math.min(3, this.gates)
    const n = this.rng() < 0.26 + g * 0.13 ? 2 : 1
    const lanes = [0, 1, 2].sort(() => this.rng() - 0.5).slice(0, n)
    for (const lane of lanes) {
      if (!this.laneFree(lane, z, 12)) continue
      // never close all three lanes inside one braking window
      const occ = new Set<number>([lane])
      for (const c of this.traffic) if (Math.abs(c.z - z) < 26) occ.add(c.lane).add(c.toLane)
      if (occ.size >= 3) continue
      const roll = this.rng()
      const kind: Kind = roll < 0.6 ? 'sedan' : roll < 0.85 ? 'van' : 'truck'
      this.traffic.push({
        id: ++this.uid,
        kind,
        lane,
        toLane: lane,
        x: LANES[lane],
        z,
        speed: (kind === 'truck' ? 11 : 13) + this.rng() * 8,
        conf: 0.86 + this.rng() * 0.13,
        blink: 0,
        passed: z < 0,
        shade: this.rng(),
      })
    }
  }

  private spawnPickup() {
    const sys = SYSTEMS[this.gates]
    const defs = MODULES.filter((m) => m.project === sys)
    const def = defs[this.pickupsSpawned % 2]
    this.pickupsSpawned++
    const z = SPAWN_Z
    const lanes = [0, 1, 2].filter((l) => this.laneFree(l, z, 18))
    const lane = lanes.length ? lanes[(this.rng() * lanes.length) | 0] : 1
    this.pickups.push({ id: ++this.uid, x: LANES[lane], z, mod: def, taken: false })
  }

  /** Attract-mode driver: pick the lane with the most room and keep a safe gap. */
  private autopilot(): Input {
    const room = [0, 1, 2].map((l) => {
      let near = 400
      for (const c of this.traffic) if ((c.lane === l || c.toLane === l) && c.z > -3) near = Math.min(near, c.z - KIND[c.kind].len / 2)
      return near
    })
    const cur = LANES.reduce((best, lx, i) => (Math.abs(lx - this.x) < Math.abs(LANES[best] - this.x) ? i : best), 0)
    let pick = cur
    if (room[cur] < 55) pick = room.indexOf(Math.max(...room))
    return { steer: 0, throttle: room[pick] < 16 ? -1 : 0, targetX: LANES[pick] }
  }
}
