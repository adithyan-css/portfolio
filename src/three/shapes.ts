/**
 * Particle "targets" for the persistent field. Every shape returns exactly N
 * points so the renderer can morph between any two of them.
 *
 * hi channel per point:
 *   0 = base stipple · 1 = signal accent · 2 = carrier (animated wave) · 3 = carrier + accent
 */
import { mulberry32, noise1 } from '../utils/math'
import type { ShapeId } from './fieldBus'

export type Frame = { W: number; H: number; mobile: boolean; heroY: number }
export type Shape = {
  pos: Float32Array
  hi: Float32Array
  alpha: number
  /** spin around a vertical axis: [cx, cz, rad/s] */
  spin: [number, number, number]
  /** z-flow: [units/s, spacing] */
  flow: [number, number]
}

const TAU = Math.PI * 2

function builder(N: number, seed: number) {
  const pos = new Float32Array(N * 3)
  const hi = new Float32Array(N)
  const r = mulberry32(seed)
  let i = 0
  const gauss = () => {
    const u = Math.max(1e-6, r())
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r())
  }
  const put = (x: number, y: number, z: number, h = 0) => {
    if (i >= N) return false
    pos[i * 3] = x
    pos[i * 3 + 1] = y
    pos[i * 3 + 2] = z
    hi[i] = h
    i++
    return true
  }
  /** points spread evenly-ish along a parametric curve f(t), t ∈ [0,1] */
  const curve = (count: number, f: (t: number) => [number, number, number], h = 0, jitter = 0) => {
    for (let k = 0; k < count; k++) {
      const [x, y, z] = f(r())
      put(x + gauss() * jitter, y + gauss() * jitter, z + gauss() * jitter, h)
    }
  }
  const fill = (f: () => [number, number, number, number?]) => {
    while (i < N) {
      const [x, y, z, h] = f()
      put(x, y, z, h ?? 0)
    }
  }
  return { pos, hi, r, gauss, put, curve, fill, count: (p: number) => Math.floor(N * p), get i() { return i } }
}

/**
 * Where emblems sit: right of the copy on wide screens, above it on phones.
 * `side` emblems have no layout slot, so on phones they peek in from the right edge, out of the copy's way.
 */
export function emblem(f: Frame, side = false) {
  if (side && (f.mobile || f.W < f.H)) return { cx: f.W * 0.53, cy: f.H * 0.14, s: Math.min(f.W * 0.44, f.H * 0.2) }
  return f.mobile ? { cx: 0, cy: f.H * 0.21, s: Math.min(f.W * 0.36, f.H * 0.17) } : { cx: f.W * 0.25, cy: f.H * 0.2, s: Math.min(f.W * 0.19, f.H * 0.25) }
}

// ── signal maths shared with the loop story ──────────────────────────────────
const T0 = 1.7
const low = (x: number) => 0.4 * Math.sin(TAU * (2.1 * x - 0.16 * T0)) + 0.17 * Math.sin(TAU * (5.2 * x + 0.27 * T0) + 1.3)
const high = (x: number) => 0.12 * Math.sin(TAU * (26 * x - 1.6 * T0)) + noise1(x * 95 + T0 * 7) * 0.13
const burst = (x: number) => 1 + 0.55 * Math.max(0, Math.sin(TAU * (0.9 * x - 0.11 * T0)))
const DC = 0.3
const raw = (x: number) => DC + low(x) * burst(x) + high(x)
const clean = (x: number) => (Math.tanh(low(x) * burst(x) * 1.5) / Math.tanh(1.5)) * 0.52
const NOW = 0.64
const GAP: [number, number] = [0.42, 0.56]

function scopeFrame(f: Frame) {
  return f.mobile ? { x0: -f.W * 0.56, x1: f.W * 0.56, yc: f.H * 0.19, A: f.H * 0.1 } : { x0: -f.W * 0.1, x1: f.W * 0.54, yc: -f.H * 0.02, A: f.H * 0.17 }
}

export function makeShape(id: ShapeId, N: number, f: Frame): Shape {
  const b = builder(N, id.length * 7919 + id.charCodeAt(0) * 31)
  const { r, gauss, curve, fill, count } = b
  const { W, H } = f
  let alpha = 1
  let spin: Shape['spin'] = [0, 0, 0]
  let flow: Shape['flow'] = [0, 1]
  const box = (zMin = -5, zMax = 1.5): [number, number, number, number] => [(r() - 0.5) * W * 1.25, (r() - 0.5) * H * 1.2, zMin + r() * (zMax - zMin), r() < 0.02 ? 1 : 0]

  switch (id) {
    case 'static': {
      alpha = 0.85
      fill(() => box())
      break
    }
    case 'hero': {
      const yb = f.heroY * (H / 2)
      curve(
        count(0.46),
        (t) => [(t - 0.5) * W * 1.3, yb, 0],
        2,
        0,
      )
      // give the carrier a little thickness and depth, promote some to accent
      for (let k = 0; k < b.i; k++) {
        b.pos[k * 3 + 1] += gauss() * H * 0.009
        b.pos[k * 3 + 2] = gauss() * 0.22
        if (r() < 0.16) b.hi[k] = 3
      }
      fill(() => box(-6, 1))
      break
    }
    case 'sense':
    case 'process':
    case 'predict':
    case 'recover': {
      const { x0, x1, yc, A } = scopeFrame(f)
      const X = (u: number) => x0 + u * (x1 - x0)
      const Z = (u: number) => (u - 0.5) * -1.3
      if (id === 'sense') {
        curve(count(0.7), (u) => [X(u), yc + raw(u) * A, Z(u)], 0, H * 0.012)
        // the DC offset guide, dashed, in accent
        curve(count(0.08), (u) => [X(u - (u % 0.02 < 0.012 ? 0 : 0.008)), yc + DC * A, Z(u)], 1)
        fill(() => [X(r() * 1.2 - 0.1), yc + (r() - 0.5) * H * 0.75, -2 + r() * 3, 0])
      } else if (id === 'process') {
        curve(count(0.68), (u) => [X(u), yc + clean(u) * A, Z(u)], 1, H * 0.0025)
        curve(count(0.14), (u) => [X(u), yc + (r() < 0.5 ? 0.42 : -0.42) * A, Z(u)], 0)
        fill(() => {
          const u = r()
          return [X(u), yc, Z(u), 0]
        })
      } else if (id === 'predict') {
        curve(count(0.44), (u) => [X(u * NOW), yc + clean(u * NOW) * A, Z(u * NOW)], 0, H * 0.002)
        const fc = (u: number) => clean(NOW) * (1 - (u - NOW) * 1.2) + low(u) * 0.55 * ((u - NOW) / (1 - NOW))
        const band = (u: number) => 0.04 + ((u - NOW) / (1 - NOW)) * 0.28
        curve(count(0.14), (t) => {
          const u = NOW + t * (1 - NOW)
          return [X(u), yc + fc(u) * A, Z(u)]
        }, 1)
        curve(count(0.32), (t) => {
          const u = NOW + t * (1 - NOW)
          return [X(u), yc + (fc(u) + gauss() * band(u) * 0.5) * A, Z(u) + gauss() * 0.3 * t]
        }, 0)
        fill(() => [X(NOW), yc + (r() - 0.5) * A * 2.4, Z(NOW), 0])
      } else {
        curve(count(0.6), (t) => {
          const u = t < GAP[0] / (1 - (GAP[1] - GAP[0])) ? t * (1 - (GAP[1] - GAP[0])) : t * (1 - (GAP[1] - GAP[0])) + (GAP[1] - GAP[0])
          return [X(u), yc + clean(u) * A, Z(u)]
        }, 0, H * 0.002)
        curve(count(0.2), (t) => {
          const u = GAP[0] + t * (GAP[1] - GAP[0])
          return [X(u), yc + clean(u) * A, Z(u)]
        }, 1, H * 0.002)
        curve(count(0.1), (t) => {
          const u = GAP[0] + t * (GAP[1] - GAP[0])
          return [X(u), yc + noise1(u * 400) * A * 0.06, Z(u)]
        }, 0)
        fill(() => {
          const u = r() < 0.5 ? GAP[0] : GAP[1]
          return [X(u), yc + (r() - 0.5) * A * 2.2, Z(u), 0]
        })
      }
      break
    }
    case 'ridershield': {
      const { cx, cy, s } = emblem(f)
      alpha = f.mobile ? 0.45 : 0.8
      const w = s * 0.95,
        h = s * 0.72
      const per = (t: number): [number, number] => {
        // floor → right wall → arch → left wall
        const floor = w,
          wall = h * 0.45,
          arch = (Math.PI * w) / 2
        const L = floor + wall * 2 + arch
        let d = t * L
        if (d < floor) return [-w / 2 + d, -h / 2]
        d -= floor
        if (d < wall) return [w / 2, -h / 2 + d]
        d -= wall
        if (d < arch) {
          const a = (d / arch) * Math.PI
          return [Math.cos(a) * (w / 2), -h / 2 + wall + Math.sin(a) * (w / 2) * 0.9]
        }
        d -= arch
        return [-w / 2, -h / 2 + wall - d]
      }
      const SP = 1.6
      curve(count(0.8), () => {
        const k = Math.floor(r() * 22)
        const [x, y] = per(r())
        return [cx + x, cy + y, 3 - k * SP]
      })
      curve(count(0.14), () => {
        const z = 3 - r() * 22 * SP
        return [cx, cy - h / 2, z - (((z % SP) + SP) % SP > SP / 2 ? SP / 2 : 0)]
      }, 1)
      fill(() => [cx + (r() - 0.5) * w * 0.3, cy - h / 2 + r() * h * 0.22, -7.5, 0])
      flow = [2.2, SP]
      break
    }
    case 'agriprice': {
      const { cx, cy, s } = emblem(f)
      alpha = f.mobile ? 0.45 : 0.85
      const walk = (u: number) => 0.18 * Math.sin(u * 9) + 0.1 * Math.sin(u * 23 + 1) + (u > 0.55 ? (u - 0.55) * 0.9 : 0)
      const hx = (u: number) => cx - s * 0.95 + u * s * 0.95
      const y0 = walk(1)
      curve(count(0.26), (u) => [hx(u), cy + (walk(u) - y0) * s * 0.9, 0], 0, s * 0.006)
      const PATHS = 44
      curve(count(0.52), (t) => {
        const j = Math.floor(r() * PATHS)
        const rr = mulberry32(j * 97 + 3)
        const drift = (rr() - 0.5) * 1.1
        const wig = rr() * TAU
        const x = t * s * 0.95
        return [cx + x, cy + (drift * (x / s) + 0.05 * Math.sin((x / s) * 7 + wig) * (x / s)) * s, ((j / (PATHS - 1)) - 0.5) * s * 1.1 * (x / s)]
      })
      curve(count(0.14), (t) => [cx + t * s * 0.95, cy + 0.02 * Math.sin(t * 5) * s, 0], 1, s * 0.004)
      fill(() => {
        const t = r()
        const sgn = r() < 0.5 ? -1 : 1
        return [cx + t * s * 0.95, cy + sgn * 0.62 * t * s, 0, 0]
      })
      break
    }
    case 'roboguard': {
      const { cx, cy, s } = emblem(f)
      alpha = f.mobile ? 0.45 : 0.85
      const R = s * 0.9
      const tiltX = -0.55,
        tiltY = 0.35
      const place = (x: number, y: number, z: number): [number, number, number] => {
        const y1 = y * Math.cos(tiltX) - z * Math.sin(tiltX)
        const z1 = y * Math.sin(tiltX) + z * Math.cos(tiltX)
        const x2 = x * Math.cos(tiltY) + z1 * Math.sin(tiltY)
        const z2 = -x * Math.sin(tiltY) + z1 * Math.cos(tiltY)
        return [cx + x2, cy + y1, z2]
      }
      const ring = (rad: number, z: number) => (t: number) => place(Math.cos(t * TAU) * rad, Math.sin(t * TAU) * rad, z)
      curve(count(0.12), ring(R, 0))
      curve(count(0.1), ring(R * 0.93, 0))
      curve(count(0.12), ring(R, -R * 0.28))
      // stator teeth
      curve(count(0.2), () => {
        const k = Math.floor(r() * 12)
        const a = (k / 12) * TAU
        const along = 0.72 + r() * 0.21
        const side = (r() < 0.5 ? -1 : 1) * 0.06
        const x = Math.cos(a) * along * R - Math.sin(a) * side * R
        const y = Math.sin(a) * along * R + Math.cos(a) * side * R
        return place(x, y, 0)
      })
      curve(count(0.1), ring(R * 0.6, 0.02))
      // rotor blades in accent
      curve(count(0.16), () => {
        const k = Math.floor(r() * 4)
        const a = (k / 4) * TAU + 0.4
        const d = (0.12 + r() * 0.46) * R
        return place(Math.cos(a) * d, Math.sin(a) * d, 0.04)
      }, 1)
      curve(count(0.06), ring(R * 0.1, 0.05), 1)
      fill(() => {
        const a = r() * TAU,
          d = R * (0.62 + r() * 0.1)
        return [...place(Math.cos(a) * d, Math.sin(a) * d, -r() * R * 0.28), 0] as [number, number, number, number]
      })
      break
    }
    case 'helix': {
      const { cx, cy, s } = emblem(f)
      alpha = f.mobile ? 0.5 : 0.9
      const L = s * 2.05,
        rad = s * 0.34,
        turns = 2.3
      const strand = (off: number) => (t: number): [number, number, number] => {
        const a = t * TAU * turns + off
        return [cx + Math.cos(a) * rad, cy + (t - 0.5) * L, Math.sin(a) * rad]
      }
      curve(count(0.29), strand(0), 0, s * 0.006)
      curve(count(0.29), strand(Math.PI), 0, s * 0.006)
      const RUNGS = 26
      curve(count(0.26), () => {
        const k = Math.floor(r() * RUNGS)
        const t = (k + 0.5) / RUNGS
        const a = t * TAU * turns
        const m = r() * 2 - 1
        return [cx + Math.cos(a) * rad * m, cy + (t - 0.5) * L, Math.sin(a) * rad * m]
      }, 1)
      fill(() => {
        const a = r() * TAU,
          d = rad * (1.3 + r() * 0.8)
        return [cx + Math.cos(a) * d, cy + (r() - 0.5) * L * 1.05, Math.sin(a) * d, 0]
      })
      spin = [cx, 0, 0.32]
      break
    }
    case 'audio': {
      const { cx, cy, s } = emblem(f, true)
      alpha = f.mobile ? 0.3 : f.W < f.H ? 0.55 : 0.85
      const ty = 0.55
      const place = (x: number, y: number, z: number): [number, number, number] => [cx + x * Math.cos(ty) + z * Math.sin(ty), cy + y, -x * Math.sin(ty) + z * Math.cos(ty)]
      const RINGS = 12
      curve(count(0.66), () => {
        const k = Math.floor(r() * RINGS)
        const rad = s * (0.1 + (k / (RINGS - 1)) * 0.8)
        const a = r() * TAU
        const depth = -(1 - rad / (s * 0.9)) * s * 0.55
        return place(Math.cos(a) * rad, Math.sin(a) * rad, depth)
      })
      curve(count(0.22), () => {
        const k = Math.floor(r() * 3)
        const rad = s * (1.1 + k * 0.28)
        const a = (r() - 0.5) * 1.3
        return place(Math.cos(a) * rad, Math.sin(a) * rad, 0.1)
      }, 1)
      fill(() => {
        const a = r() * TAU,
          d = r() * s * 0.1
        return [...place(Math.cos(a) * d, Math.sin(a) * d, -s * 0.55), 1] as [number, number, number, number]
      })
      break
    }
    case 'dial': {
      const { cx, cy, s } = emblem(f, true)
      alpha = f.mobile ? 0.3 : f.W < f.H ? 0.55 : 0.85
      const R = s * 0.85
      const a0 = Math.PI * 1.25,
        sweep = -Math.PI * 1.5
      const ang = (v: number) => a0 + sweep * v
      const value = 9.14 / 10
      curve(count(0.3), () => {
        const k = Math.floor(r() * 51)
        const major = k % 5 === 0
        const a = ang(k / 50)
        const d = R * (1 - r() * (major ? 0.12 : 0.05))
        return [cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0]
      })
      curve(count(0.18), (t) => [cx + Math.cos(ang(t)) * R * 1.02, cy + Math.sin(ang(t)) * R * 1.02, 0])
      curve(count(0.26), (t) => [cx + Math.cos(ang(t * value)) * R * 0.8, cy + Math.sin(ang(t * value)) * R * 0.8, 0], 1, s * 0.01)
      curve(count(0.14), (t) => [cx + Math.cos(ang(value)) * R * 0.72 * t, cy + Math.sin(ang(value)) * R * 0.72 * t, 0.05], 1)
      fill(() => {
        const a = r() * TAU,
          d = r() * R * 0.07
        return [cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0, 0]
      })
      break
    }
    case 'lattice': {
      const cx = f.mobile ? W * 0.42 : W * 0.02,
        cy = f.mobile ? H * 0.12 : -H * 0.02
      const R = Math.min(W, H) * (f.mobile ? 0.42 : 0.42)
      alpha = f.mobile ? 0.26 : 0.32
      const golden = Math.PI * (3 - Math.sqrt(5))
      const M = count(0.7)
      for (let k = 0; k < M; k++) {
        const y = 1 - (k / (M - 1)) * 2
        const rr = Math.sqrt(1 - y * y)
        const th = golden * k
        b.put(cx + Math.cos(th) * rr * R, cy + y * R, Math.sin(th) * rr * R, r() < 0.04 ? 1 : 0)
      }
      fill(() => {
        const ring = Math.floor(r() * 6)
        const a = r() * TAU
        const tilt = (ring / 6) * Math.PI
        const x = Math.cos(a) * R,
          y = Math.sin(a) * R
        return [cx + x * Math.cos(tilt), cy + y, x * Math.sin(tilt), 0]
      })
      spin = [cx, 0, 0.08]
      break
    }
    case 'arena': {
      alpha = 0.5
      const y = -H * 0.46
      const SP = 1.2
      fill(() => {
        const alongX = r() < 0.5
        if (alongX) {
          const k = Math.floor(r() * 18)
          return [(r() - 0.5) * W * 1.8, y, 4 - k * SP, r() < 0.03 ? 1 : 0]
        }
        const m = Math.floor(r() * 25) - 12
        return [m * W * 0.07, y, 4 - r() * 18 * SP, 0]
      })
      flow = [0.9, SP]
      break
    }
    case 'rest': {
      // the field idles as a flat trace along the bottom of the view
      alpha = 0.45
      curve(count(0.85), (t) => [(t - 0.5) * W * 1.3, -H * 0.472, 0], 0, H * 0.0025)
      fill(() => [(r() - 0.5) * W * 1.3, -H * 0.472 + (r() - 0.5) * H * 0.014, 0, r() < 0.1 ? 1 : 0])
      break
    }
    case 'out': {
      curve(count(0.72), (t) => [(t - 0.5) * W * 1.3, H * 0.02, 0], 3, H * 0.004)
      curve(count(0.18), (t) => [(t - 0.5) * W * 1.3, H * 0.02, 0], 2, H * 0.004)
      fill(() => [(r() - 0.5) * W * 1.3, H * 0.02 + (r() - 0.5) * H * 0.1, -1 + r(), 0])
      break
    }
  }
  return { pos: b.pos, hi: b.hi, alpha, spin, flow }
}
