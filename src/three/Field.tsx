import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { fieldBus, type ShapeId } from './fieldBus'
import { emblem, makeShape, type Frame, type Shape } from './shapes'

/**
 * The persistent field: one particle system that lives behind the whole site and
 * morphs into a new form for every chapter (noise → carrier → waveforms → emblems → sine).
 */

const vertex = /* glsl */ `
attribute vec3 aB;
attribute float aHiA;
attribute float aHiB;
attribute float aRand;
uniform float uMix, uTime, uSize, uPR, uLight, uJitter, uWaveAmp, uWaveK, uImpX, uImpT, uScrollVel, uRepel, uAspect;
uniform float uAlphaA, uAlphaB;
uniform vec2 uMouse;
uniform vec3 uSpinA, uSpinB;
uniform vec2 uFlowA, uFlowB;
uniform float uOffA, uOffB, uVis;
varying float vHi;
varying float vAlpha;

vec3 spin(vec3 p, vec3 s, float t) {
  if (s.z == 0.0) return p;
  float a = t * s.z;
  float c = cos(a), si = sin(a);
  vec2 d = vec2(p.x - s.x, p.z - s.y);
  return vec3(s.x + d.x * c - d.y * si, p.y, s.y + d.x * si + d.y * c);
}
vec3 flow(vec3 p, vec2 f, float t) {
  if (f.x == 0.0) return p;
  p.z += mod(t * f.x, f.y);
  return p;
}

void main() {
  vec3 a = flow(spin(position, uSpinA, uTime), uFlowA, uTime);
  vec3 b = flow(spin(aB, uSpinB, uTime), uFlowB, uTime);
  a.y += uOffA;
  b.y += uOffB;
  float mm = clamp(uMix * 1.6 - aRand * 0.6, 0.0, 1.0);
  mm = mm * mm * (3.0 - 2.0 * mm);
  vec3 p = mix(a, b, mm);
  float hi = mix(aHiA, aHiB, mm);

  // carrier behaviour
  float wave = smoothstep(1.5, 2.0, hi);
  float ph = p.x * uWaveK - uTime * 2.1;
  p.y += wave * (uWaveAmp * sin(ph) + uWaveAmp * 0.28 * sin(ph * 2.7 + 1.3));
  float age = uTime - uImpT;
  if (age > 0.0 && age < 3.5) {
    float dx = p.x - (uImpX + age * 4.0);
    p.y += wave * exp(-dx * dx * 2.5) * 0.55 * exp(-age * 1.1) * sin(dx * 7.0);
  }

  // brownian shimmer — calmer for accent / carrier points
  float calm = 1.0 - 0.75 * smoothstep(0.5, 1.0, hi);
  p += uJitter * calm * vec3(sin(uTime * 0.7 + aRand * 40.0), cos(uTime * 0.9 + aRand * 23.0), sin(uTime * 0.5 + aRand * 11.0));
  p.y += uScrollVel * (aRand - 0.5) * 0.9;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec4 clip = projectionMatrix * mv;

  // the field leans away from the pointer (screen space)
  vec2 ndc = clip.xy / clip.w;
  vec2 d = ndc - uMouse;
  d.x *= uAspect;
  float dist = length(d);
  float push = uRepel * (1.0 - smoothstep(0.0, 0.28, dist));
  vec2 dir = d / max(dist, 1e-4);
  dir.x /= uAspect;
  ndc += dir * push * 0.05;
  clip.xy = ndc * clip.w;
  gl_Position = clip;

  float accent = smoothstep(0.5, 1.0, hi) * (1.0 - smoothstep(1.5, 2.0, hi)) + smoothstep(2.5, 3.0, hi);
  gl_PointSize = max(1.0, uSize * uPR * (0.55 + aRand * 0.9) * (1.0 + accent * 0.45) * mix(1.0, 0.82, uLight) / -mv.z);
  vHi = accent;
  vAlpha = uVis * mix(uAlphaA, uAlphaB, mm) * smoothstep(-60.0, -44.0, mv.z) * (1.0 - smoothstep(-5.0, -2.0, mv.z));
}
`

const fragment = /* glsl */ `
uniform vec3 uBase0, uBase1, uHi0, uHi1;
uniform float uLight;
varying float vHi;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float soft = mix(smoothstep(0.5, 0.0, d), smoothstep(0.5, 0.3, d), uLight);
  vec3 base = mix(uBase0, uBase1, uLight);
  vec3 hic = mix(uHi0, uHi1, uLight);
  vec3 col = mix(base, hic, vHi);
  float a = soft * vAlpha * mix(mix(0.5, 0.46, uLight), 0.95, vHi);
  gl_FragColor = vec4(col, a);
}
`

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const smooth01 = (x: number) => {
  const c = Math.min(1, Math.max(0, x))
  return c * c * (3 - 2 * c)
}

const JITTER: Partial<Record<ShapeId, number>> = { static: 0.12, hero: 0.035, sense: 0.03, arena: 0.004, out: 0.006, rest: 0.006 }

function Particles({ count, mobile }: { count: number; mobile: boolean }) {
  const { size, gl } = useThree()
  const cache = useRef(new Map<ShapeId, Shape>())
  const frameRef = useRef<Frame | null>(null)
  const state = useRef({
    cur: 'static' as ShapeId,
    t0: -100,
    spinA: [0, 0, 0] as Shape['spin'],
    flowA: [0, 1] as Shape['flow'],
    alphaA: 1,
    light: 0,
    mx: 0,
    my: 0,
    repel: 0,
    amp: 0.1,
    k: 1.6,
    jitter: 0.12,
    sv: 0,
  })

  const rand = useMemo(() => {
    const a = new Float32Array(count)
    for (let i = 0; i < count; i++) a[i] = Math.random()
    return a
  }, [count])

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aB', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aHiA', new THREE.BufferAttribute(new Float32Array(count), 1))
    g.setAttribute('aHiB', new THREE.BufferAttribute(new Float32Array(count), 1))
    g.setAttribute('aRand', new THREE.BufferAttribute(rand, 1))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4)
    return g
  }, [count, rand])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NormalBlending,
        uniforms: {
          uMix: { value: 1 },
          uTime: { value: 0 },
          uSize: { value: mobile ? 30 : 26 },
          uPR: { value: 1 },
          uLight: { value: 0 },
          uJitter: { value: 0.12 },
          uWaveAmp: { value: 0.1 },
          uWaveK: { value: 1.6 },
          uImpX: { value: 0 },
          uImpT: { value: -100 },
          uScrollVel: { value: 0 },
          uRepel: { value: 0 },
          uAspect: { value: 1 },
          uAlphaA: { value: 1 },
          uAlphaB: { value: 1 },
          uMouse: { value: new THREE.Vector2(9, 9) },
          uSpinA: { value: new THREE.Vector3() },
          uSpinB: { value: new THREE.Vector3() },
          uFlowA: { value: new THREE.Vector2(0, 1) },
          uFlowB: { value: new THREE.Vector2(0, 1) },
          uOffA: { value: 0 },
          uVis: { value: 1 },
          uOffB: { value: 0 },
          uBase0: { value: new THREE.Color('#c3c8d6') },
          uBase1: { value: new THREE.Color('#15171c') },
          uHi0: { value: new THREE.Color('#7c83ff') },
          uHi1: { value: new THREE.Color('#2632f0') },
        },
      }),
    [mobile],
  )

  useEffect(() => {
    const apply = () => {
      const scope = document.documentElement.dataset.mode === 'scope'
      material.uniforms.uHi0.value.set(scope ? '#6dffb0' : '#7c83ff')
      material.uniforms.uHi1.value.set(scope ? '#00a050' : '#2632f0')
    }
    apply()
    window.addEventListener('signal:theme', apply)
    return () => window.removeEventListener('signal:theme', apply)
  }, [material])

  useEffect(() => () => {
    geometry.dispose()
    material.dispose()
  }, [geometry, material])

  const shape = (id: ShapeId) => {
    let s = cache.current.get(id)
    if (!s) {
      s = makeShape(id, count, frameRef.current!)
      cache.current.set(id, s)
    }
    return s
  }

  const writeB = (s: Shape) => {
    ;(geometry.attributes.aB.array as Float32Array).set(s.pos)
    ;(geometry.attributes.aHiB.array as Float32Array).set(s.hi)
    geometry.attributes.aB.needsUpdate = true
    geometry.attributes.aHiB.needsUpdate = true
    const u = material.uniforms
    u.uSpinB.value.set(...s.spin)
    u.uFlowB.value.set(...s.flow)
    u.uAlphaB.value = s.alpha
  }

  const writeA = (pos: Float32Array, hi: Float32Array, spin: Shape['spin'], flowV: Shape['flow'], alpha: number) => {
    ;(geometry.attributes.position.array as Float32Array).set(pos)
    ;(geometry.attributes.aHiA.array as Float32Array).set(hi)
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.aHiA.needsUpdate = true
    const u = material.uniforms
    u.uSpinA.value.set(...spin)
    u.uFlowA.value.set(...flowV)
    u.uAlphaA.value = alpha
    state.current.spinA = spin
    state.current.flowA = flowV
    state.current.alphaA = alpha
  }

  /** Freeze the current in-between state into A (matches the shader exactly), then aim B at a new shape. */
  const retarget = (id: ShapeId, t: number) => {
    const st = state.current
    const u = material.uniforms
    const m = u.uMix.value as number
    const A = geometry.attributes.position.array as Float32Array
    const B = geometry.attributes.aB.array as Float32Array
    const hA = geometry.attributes.aHiA.array as Float32Array
    const hB = geometry.attributes.aHiB.array as Float32Array
    const sB = u.uSpinB.value as THREE.Vector3
    const fB = u.uFlowB.value as THREE.Vector2
    const oA = u.uOffA.value as number
    const oB = u.uOffB.value as number
    const pos = new Float32Array(count * 3)
    const hi = new Float32Array(count)
    const xf = (x: number, y: number, z: number, s: [number, number, number], fl: [number, number]): [number, number, number] => {
      if (s[2]) {
        const a = t * s[2],
          c = Math.cos(a),
          si = Math.sin(a)
        const dx = x - s[0],
          dz = z - s[1]
        x = s[0] + dx * c - dz * si
        z = s[1] + dx * si + dz * c
      }
      if (fl[0]) z += (t * fl[0]) % fl[1]
      return [x, y, z]
    }
    for (let i = 0; i < count; i++) {
      let mm = Math.min(1, Math.max(0, m * 1.6 - rand[i] * 0.6))
      mm = mm * mm * (3 - 2 * mm)
      const a = xf(A[i * 3], A[i * 3 + 1], A[i * 3 + 2], st.spinA, st.flowA)
      const b = xf(B[i * 3], B[i * 3 + 1], B[i * 3 + 2], [sB.x, sB.y, sB.z], [fB.x, fB.y])
      pos[i * 3] = a[0] + (b[0] - a[0]) * mm
      pos[i * 3 + 1] = a[1] + oA + (b[1] + oB - a[1] - oA) * mm
      pos[i * 3 + 2] = a[2] + (b[2] - a[2]) * mm
      hi[i] = hA[i] + (hB[i] - hA[i]) * mm
    }
    const alpha = st.alphaA + ((u.uAlphaB.value as number) - st.alphaA) * m
    writeA(pos, hi, [0, 0, 0], [0, 1], alpha)
    writeB(shape(id))
    u.uOffA.value = 0
    u.uOffB.value = anchorOffset(id)
    u.uMix.value = 0
    st.cur = id
    st.t0 = t
  }

  // (Re)build the frame whenever the viewport changes.
  useEffect(() => {
    const H = 2 * 10 * Math.tan((35 / 2) * (Math.PI / 180))
    const W = H * (size.width / Math.max(1, size.height))
    const f: Frame = { W, H, mobile, heroY: fieldBus.heroY }
    const prev = frameRef.current
    frameRef.current = f
    cache.current.clear()
    material.uniforms.uAspect.value = size.width / Math.max(1, size.height)
    const s = shape(fieldBus.target)
    if (!prev) {
      const st = shape('static')
      writeA(st.pos, st.hi, st.spin, st.flow, st.alpha)
      writeB(s)
      material.uniforms.uMix.value = fieldBus.target === 'static' ? 1 : 0
      state.current.cur = fieldBus.target
      state.current.t0 = -100
    } else {
      writeA(s.pos, s.hi, s.spin, s.flow, s.alpha)
      writeB(s)
      material.uniforms.uMix.value = 1
      state.current.cur = fieldBus.target
    }
    fieldBus.ready = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, mobile])

  /** How far to shift a shape so an emblem sits in its chapter's layout slot (world units). */
  const anchorOffset = (id: ShapeId) => {
    const f = frameRef.current
    const a = fieldBus.anchor
    if (!f || !a || a.shape !== id) return 0
    const y = a.y * (f.H / 2) - emblem(f).cy
    return Math.max(-f.H * 1.4, Math.min(f.H * 1.4, y))
  }

  // hero anchor changes (fonts load, resize) → regenerate hero shape in place
  const heroY = useRef(fieldBus.heroY)

  useFrame((three, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const st = state.current
    const u = material.uniforms
    const t = three.clock.elapsedTime
    fieldBus.now = t
    u.uTime.value = t
    u.uPR.value = gl.getPixelRatio()
    const reduced = fieldBus.reduced

    if (Math.abs(heroY.current - fieldBus.heroY) > 0.01 && frameRef.current) {
      heroY.current = fieldBus.heroY
      frameRef.current = { ...frameRef.current, heroY: fieldBus.heroY }
      cache.current.delete('hero')
      if (st.cur === 'hero') writeB(shape('hero'))
    }

    if (fieldBus.target !== st.cur) retarget(fieldBus.target, t)
    {
      const want = anchorOffset(st.cur)
      const cur = u.uOffB.value as number
      u.uOffB.value = cur + (want - cur) * (1 - Math.exp(-dt * 14))
      // an emblem whose slot has scrolled away leaves with it (perspective would otherwise drag
      // its far end back over the copy)
      const a = fieldBus.anchor
      const vis = a && a.shape === st.cur ? 1 - smooth01((Math.abs(a.y) - 0.9) / 0.55) : 1
      u.uVis.value += (vis - (u.uVis.value as number)) * (1 - Math.exp(-dt * 8))
    }
    const dur = reduced ? 0.5 : 1.9
    u.uMix.value = st.t0 < 0 ? 1 : easeInOut(Math.min(1, (t - st.t0) / dur))

    const k = 1 - Math.exp(-dt * 3.5)
    st.light += (fieldBus.light - st.light) * (1 - Math.exp(-dt * 8))
    u.uLight.value = st.light
    st.mx += (fieldBus.mx - st.mx) * k
    st.my += (fieldBus.my - st.my) * k
    u.uMouse.value.set(st.mx, st.my)
    st.repel += ((fieldBus.pointerActive && !reduced ? 1 : 0) - st.repel) * k
    u.uRepel.value = st.repel

    const H = frameRef.current?.H ?? 6.3
    let amp = H * 0.028,
      kk = 1.6
    if (st.cur === 'hero') {
      const prox = smooth01(1 - Math.abs(st.my - fieldBus.heroY) / 0.9)
      amp = H * (0.022 + 0.085 * prox * (fieldBus.pointerActive ? 1 : 0.4))
      kk = 1.2 + (st.mx + 1) * 0.9
    } else if (st.cur === 'out') {
      amp = H * 0.05
      kk = 1.5
    }
    if (reduced) amp *= 0.4
    st.amp += (amp - st.amp) * k
    st.k += (kk - st.k) * k
    u.uWaveAmp.value = st.amp
    u.uWaveK.value = st.k
    fieldBus.amp = st.amp / H
    fieldBus.k = st.k
    u.uImpX.value = fieldBus.impulse.x * ((frameRef.current?.W ?? 10) / 2)
    u.uImpT.value = fieldBus.impulse.t

    const jit = reduced ? 0 : (JITTER[st.cur] ?? 0.012)
    st.jitter += (jit - st.jitter) * k
    u.uJitter.value = st.jitter
    st.sv += (Math.max(-1, Math.min(1, fieldBus.scrollVel)) * (reduced ? 0 : 0.25) - st.sv) * k
    u.uScrollVel.value = st.sv

    // gentle parallax
    const cam = three.camera
    const par = reduced ? 0 : 1
    cam.position.x += (st.mx * 0.35 * par - cam.position.x) * k
    cam.position.y += (st.my * 0.2 * par - cam.position.y) * k
    cam.lookAt(0, 0, 0)
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}

export default function Field({ onReady }: { onReady?: () => void }) {
  const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  const lowEnd = typeof navigator !== 'undefined' && (navigator.hardwareConcurrency ?? 8) <= 4
  const count = mobile ? 5200 : lowEnd ? 9000 : 14000
  return (
    <Canvas
      className="!fixed inset-0"
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      dpr={[1, mobile ? 1.35 : 1.6]}
      camera={{ position: [0, 0, 10], fov: 35, near: 0.1, far: 100 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance', stencil: false, depth: false }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0)
        onReady?.()
      }}
      aria-hidden
    >
      <Particles count={count} mobile={mobile} />
    </Canvas>
  )
}
