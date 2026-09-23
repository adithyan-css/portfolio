/**
 * NIGHT RUN — the three.js world. A point-cloud canyon at night, an engineering-drawing car
 * (dark body, lit edges), traffic, checkpoint gantries named after each system, and pickups.
 * Everything is pooled and built once; dispose() frees it all.
 */
import * as THREE from 'three'
import { CAR, KIND, LANES, ROAD_HALF, SEG, SYSTEMS, type Car, type Drive, type Kind } from './drive'

export type Detection = { x: number; y: number; w: number; h: number; label: string; conf: number; ttc: number; threat: boolean; blink: boolean }

const BG = 0x0a0b10
const ALARM = 0xff6a3d
const TAIL = 0xff2e45
const ROAD_W = ROAD_HALF * 2
const ROAD_LEN = 260
const TILE = 12
const MONO = '"Martian Mono Variable", ui-monospace, monospace'

function extrude(pts: [number, number][], width: number) {
  const shape = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)))
  const g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false })
  g.deleteAttribute('uv')
  g.translate(0, 0, -width / 2)
  g.rotateY(Math.PI / 2) // profile +x (front) → world −z
  return g
}

/** Side profiles in metres (front at +L): a full-width lower body and a narrower glasshouse. */
function carParts(len: number, w: number, style: 'coupe' | 'sedan') {
  const L = len / 2
  const lower: [number, number][] =
    style === 'coupe'
      ? [
          [-L, 0.26],
          [-L, 0.8],
          [-L * 0.72, 0.86],
          [L * 0.4, 0.8],
          [L * 0.93, 0.64],
          [L, 0.46],
          [L * 0.97, 0.26],
        ]
      : [
          [-L, 0.3],
          [-L, 0.84],
          [-L * 0.72, 0.9],
          [L * 0.45, 0.86],
          [L * 0.96, 0.76],
          [L, 0.5],
          [L, 0.3],
        ]
  const cabin: [number, number][] =
    style === 'coupe'
      ? [
          [-L * 0.68, 0.84],
          [-L * 0.3, 1.2],
          [L * 0.1, 1.22],
          [L * 0.44, 0.8],
        ]
      : [
          [-L * 0.62, 0.88],
          [-L * 0.42, 1.32],
          [L * 0.2, 1.34],
          [L * 0.46, 0.86],
        ]
  return { lower: extrude(lower, w), cabin: extrude(cabin, w * 0.76) }
}

function boxAt(w: number, h: number, l: number, x: number, y: number, z: number) {
  const g = new THREE.BoxGeometry(w, h, l)
  g.translate(x, y, z)
  return g
}

function mergeGeos(geos: THREE.BufferGeometry[]) {
  // tiny non-indexed merge (keeps us off three/examples)
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g))
  const count = parts.reduce((n, g) => n + g.attributes.position.count, 0)
  const pos = new Float32Array(count * 3)
  const nor = new Float32Array(count * 3)
  let o = 0
  for (const g of parts) {
    pos.set(g.attributes.position.array as Float32Array, o * 3)
    nor.set(g.attributes.normal.array as Float32Array, o * 3)
    o += g.attributes.position.count
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  geos.forEach((g) => g.dispose())
  parts.forEach((g) => g.dispose())
  return out
}

function roadTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const x = c.getContext('2d')!
  const px = (u: number) => ((u + ROAD_HALF) / ROAD_W) * c.width
  x.fillStyle = '#0d0e14'
  x.fillRect(0, 0, c.width, c.height)
  // grain
  for (let i = 0; i < 2600; i++) {
    x.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`
    x.fillRect(Math.random() * c.width, Math.random() * c.height, 1, 1)
  }
  // edge lines
  x.fillStyle = 'rgba(214,218,232,0.85)'
  for (const u of [-ROAD_HALF + 0.35, ROAD_HALF - 0.5]) x.fillRect(px(u), 0, (0.15 / ROAD_W) * c.width, c.height)
  // lane dashes (one dash per tile)
  x.fillStyle = 'rgba(214,218,232,0.7)'
  for (const u of [-1.7, 1.7]) x.fillRect(px(u) - 1.5, c.height * 0.1, 3, c.height * 0.36)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.ClampToEdgeWrapping
  t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1, ROAD_LEN / TILE)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function glowTexture(inner: string) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const x = c.getContext('2d')!
  x.translate(64, 128)
  x.scale(1, 2)
  const g = x.createRadialGradient(0, 0, 0, 0, 0, 62)
  g.addColorStop(0, inner)
  g.addColorStop(0.45, inner.replace(/[\d.]+\)$/, '0.22)'))
  g.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = g
  x.fillRect(-64, -64, 128, 64)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function signTexture(index: number, name: string, accent: string) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 128
  const x = c.getContext('2d')!
  x.fillStyle = '#07080b'
  x.fillRect(0, 0, c.width, c.height)
  x.strokeStyle = accent
  x.lineWidth = 4
  x.strokeRect(6, 6, c.width - 12, c.height - 12)
  x.fillStyle = accent
  x.fillRect(6, 6, 170, c.height - 12)
  x.fillStyle = '#07080b'
  x.font = `600 44px ${MONO}`
  x.textBaseline = 'middle'
  x.fillText(`SYS0${index + 1}`, 24, 66)
  x.fillStyle = '#e8eaf0'
  x.font = `600 50px ${MONO}`
  x.fillText(name.toUpperCase(), 206, 66)
  x.fillStyle = accent
  x.textAlign = 'right'
  x.font = `500 26px ${MONO}`
  x.fillText(index === SYSTEMS.length - 1 ? 'FINAL GATE' : 'CHECKPOINT', c.width - 30, 66)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

const groundVert = /* glsl */ `
  uniform float uDist; uniform float uSpan; uniform float uPx;
  attribute float aRand;
  varying float vA; varying float vH;
  void main() {
    vec3 p = position;
    float z = mod(p.z + uDist, uSpan) - uSpan + 18.0;
    float wz = z - uDist;
    float ax = abs(p.x);
    float rise = pow(max(0.0, ax - 8.5) / 52.0, 1.45) * 17.0;
    float hills = (sin(wz * 0.043 + p.x * 0.09) * 0.5 + 0.5) * smoothstep(12.0, 42.0, ax) * 7.0;
    p.y = rise + hills + aRand * 0.25 - 0.05;
    p.z = z;
    vH = clamp((rise + hills) / 22.0, 0.0, 1.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPx * (1.1 + aRand) * (30.0 / -mv.z);
    vA = smoothstep(210.0, 50.0, -mv.z) * smoothstep(1.5, 9.0, -mv.z);
  }
`
const groundFrag = /* glsl */ `
  uniform vec3 uColor; uniform vec3 uAccent;
  varying float vA; varying float vH;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (dot(c, c) > 0.25) discard;
    vec3 col = mix(uColor, uAccent, vH * 0.85);
    gl_FragColor = vec4(col, vA * (0.55 + vH * 0.45));
  }
`

type Slot = { obj: THREE.Group; tails: THREE.MeshBasicMaterial; blinkL: THREE.Mesh; blinkR: THREE.Mesh; body: THREE.MeshLambertMaterial; edges: THREE.LineBasicMaterial; kind: Kind }

export class DriveScene {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(56, 16 / 9, 0.1, 420)
  private accent = new THREE.Color('#7c83ff')
  private accentHex = '#7c83ff'
  private disposables: { dispose(): void }[] = []
  private roadTex: THREE.CanvasTexture
  private ground: THREE.Points
  private groundMat: THREE.ShaderMaterial
  private carrier: THREE.Line
  private carrierPos: Float32Array
  private player = new THREE.Group()
  private playerEdges: THREE.LineBasicMaterial
  private playerBar: THREE.MeshBasicMaterial
  private wheels: THREE.Mesh[] = []
  private beams: THREE.Mesh
  private posts: THREE.InstancedMesh
  private caps: THREE.InstancedMesh
  private rails: THREE.MeshBasicMaterial
  private pools: Record<Kind, Slot[]> = { sedan: [], van: [], truck: [] }
  private assigned = new Map<number, Slot>()
  private gate = new THREE.Group()
  private gateSign: THREE.MeshBasicMaterial
  private gateLine: THREE.MeshBasicMaterial
  private gateGlow: THREE.MeshBasicMaterial[] = []
  private signs: THREE.CanvasTexture[] = []
  private pickupObjs: THREE.Group[] = []
  private sparks: THREE.Points
  private sparkVel: Float32Array
  private sparkLife: Float32Array
  private sparkHead = 0
  private lastHit = 99
  private signIdx = -1
  private portrait = false
  private camX = 0
  private tmp = new THREE.Vector3()
  private dummy = new THREE.Object3D()

  constructor(canvas: HTMLCanvasElement, accent: string, mobile: boolean) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' })
    this.renderer.setClearColor(BG, 1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.scene.fog = new THREE.Fog(BG, 55, 215)
    this.accentHex = accent
    this.accent.set(accent)
    const T = <T extends { dispose(): void }>(d: T) => (this.disposables.push(d), d)

    // light
    this.scene.add(new THREE.HemisphereLight(0x9aa0ff, 0x05060a, 1.1))
    const key = new THREE.DirectionalLight(0xffffff, 1.1)
    key.position.set(-6, 10, 6)
    this.scene.add(key)

    // road
    this.roadTex = T(roadTexture())
    this.roadTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
    const road = new THREE.Mesh(T(new THREE.PlaneGeometry(ROAD_W, ROAD_LEN)), T(new THREE.MeshBasicMaterial({ map: this.roadTex })))
    road.rotation.x = -Math.PI / 2
    road.position.z = -ROAD_LEN / 2 + 22
    this.scene.add(road)

    // guard rails — thin lit strips
    this.rails = T(new THREE.MeshBasicMaterial({ color: this.accent, transparent: true, opacity: 0.75 }))
    const railGeo = T(new THREE.BoxGeometry(0.06, 0.06, ROAD_LEN))
    for (const s of [-1, 1]) {
      const r = new THREE.Mesh(railGeo, this.rails)
      r.position.set(s * (ROAD_HALF + 0.35), 0.72, -ROAD_LEN / 2 + 22)
      this.scene.add(r)
    }

    // posts every 10 m, recycled by modulo
    const postGeo = T(new THREE.BoxGeometry(0.12, 0.9, 0.12))
    postGeo.translate(0, 0.45, 0)
    this.posts = new THREE.InstancedMesh(postGeo, T(new THREE.MeshLambertMaterial({ color: 0x2a2d38 })), 48)
    const capGeo = T(new THREE.BoxGeometry(0.16, 0.08, 0.16))
    this.caps = new THREE.InstancedMesh(capGeo, T(new THREE.MeshBasicMaterial({ color: 0xffffff })), 48)
    this.scene.add(this.posts, this.caps)

    // point-cloud canyon
    const cols: number[] = []
    const rnd: number[] = []
    for (const s of [-1, 1])
      for (let x = 7.5; x < 74; x += x < 20 ? 1.6 : 2.4)
        for (let z = -220; z < 18; z += 2.2) {
          cols.push(s * (x + (Math.random() - 0.5) * 0.6), 0, z)
          rnd.push(Math.random())
        }
    const gg = T(new THREE.BufferGeometry())
    gg.setAttribute('position', new THREE.Float32BufferAttribute(cols, 3))
    gg.setAttribute('aRand', new THREE.Float32BufferAttribute(rnd, 1))
    this.groundMat = T(
      new THREE.ShaderMaterial({
        vertexShader: groundVert,
        fragmentShader: groundFrag,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uDist: { value: 0 },
          uSpan: { value: 238 },
          uPx: { value: 1 },
          uColor: { value: new THREE.Color(0x8a90a6) },
          uAccent: { value: this.accent.clone() },
        },
      }),
    )
    this.ground = new THREE.Points(gg, this.groundMat)
    this.ground.frustumCulled = false
    this.scene.add(this.ground)

    // stars
    const sp: number[] = []
    for (let i = 0; i < 420; i++) {
      const a = Math.random() * Math.PI - Math.PI
      sp.push(Math.cos(a) * 300 * (0.6 + Math.random()), 30 + Math.random() * 120, -150 - Math.random() * 180)
    }
    const sg = T(new THREE.BufferGeometry())
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3))
    this.scene.add(new THREE.Points(sg, T(new THREE.PointsMaterial({ color: 0x8c92a6, size: 1.4, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.6 }))))

    // the carrier on the horizon — the site's motif
    this.carrierPos = new Float32Array(240 * 3)
    const cg = T(new THREE.BufferGeometry())
    cg.setAttribute('position', new THREE.BufferAttribute(this.carrierPos, 3))
    this.carrier = new THREE.Line(cg, T(new THREE.LineBasicMaterial({ color: this.accent, fog: false, transparent: true, opacity: 0.85 })))
    this.carrier.frustumCulled = false
    this.scene.add(this.carrier)

    // player car: dark body, lit edges, a bracket-shaped light signature
    const pc = carParts(CAR.len, CAR.w, 'coupe')
    T(pc.lower)
    T(pc.cabin)
    const body = new THREE.Mesh(pc.lower, T(new THREE.MeshStandardMaterial({ color: 0x1b1f2c, metalness: 0.45, roughness: 0.42 })))
    const glass = new THREE.Mesh(pc.cabin, T(new THREE.MeshStandardMaterial({ color: 0x07080d, metalness: 0.9, roughness: 0.12 })))
    this.playerEdges = T(new THREE.LineBasicMaterial({ color: this.accent }))
    const cabinEdges = T(new THREE.LineBasicMaterial({ color: this.accent, transparent: true, opacity: 0.55 }))
    const pEdges = new THREE.LineSegments(T(new THREE.EdgesGeometry(pc.lower, 22)), this.playerEdges)
    const cEdges = new THREE.LineSegments(T(new THREE.EdgesGeometry(pc.cabin, 22)), cabinEdges)
    this.playerBar = T(new THREE.MeshBasicMaterial({ color: this.accent }))
    const rear = CAR.len / 2 + 0.012
    const bar = new THREE.Mesh(T(new THREE.BoxGeometry(CAR.w * 0.84, 0.06, 0.03)), this.playerBar)
    bar.position.set(0, 0.72, rear)
    const brG = T(new THREE.BoxGeometry(0.06, 0.26, 0.03))
    for (const sx of [-1, 1]) {
      const b = new THREE.Mesh(brG, this.playerBar)
      b.position.set(sx * CAR.w * 0.42, 0.62, rear)
      this.player.add(b)
    }
    const trim = T(new THREE.MeshLambertMaterial({ color: 0x0c0d12 }))
    const diffuser = new THREE.Mesh(T(new THREE.BoxGeometry(1.3, 0.14, 0.08)), trim)
    diffuser.position.set(0, 0.32, rear)
    const wing = new THREE.Mesh(T(new THREE.BoxGeometry(1.66, 0.05, 0.34)), trim)
    wing.position.set(0, 1.0, CAR.len / 2 - 0.22)
    const wingEdge = new THREE.LineSegments(T(new THREE.EdgesGeometry(wing.geometry)), cabinEdges)
    wingEdge.position.copy(wing.position)
    const postGeo2 = T(new THREE.BoxGeometry(0.05, 0.16, 0.08))
    for (const sx of [-1, 1]) {
      const p = new THREE.Mesh(postGeo2, trim)
      p.position.set(sx * 0.5, 0.9, CAR.len / 2 - 0.22)
      this.player.add(p)
    }
    this.player.add(glass, cEdges, diffuser, wing, wingEdge)
    const headMat = T(new THREE.MeshBasicMaterial({ color: 0xf2f4ff }))
    const headGeo = T(new THREE.BoxGeometry(0.42, 0.06, 0.05))
    for (const s of [-1, 1]) {
      const h = new THREE.Mesh(headGeo, headMat)
      h.position.set(s * 0.58, 0.64, -CAR.len / 2 - 0.02)
      this.player.add(h)
    }
    const wGeo = T(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 16))
    wGeo.rotateZ(Math.PI / 2)
    const wMat = T(new THREE.MeshLambertMaterial({ color: 0x0b0c10 }))
    const wEdge = T(new THREE.EdgesGeometry(wGeo, 30))
    const wEdgeMat = T(new THREE.LineBasicMaterial({ color: 0x3a3e4c }))
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const w = new THREE.Mesh(wGeo, wMat)
      w.add(new THREE.LineSegments(wEdge, wEdgeMat))
      w.position.set(sx * 0.86, 0.36, sz * 1.36)
      this.wheels.push(w)
      this.player.add(w)
    }
    this.beams = new THREE.Mesh(
      T(new THREE.PlaneGeometry(7.5, 30)),
      T(new THREE.MeshBasicMaterial({ map: T(glowTexture('rgba(210,215,255,0.55)')), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })),
    )
    this.beams.rotation.x = -Math.PI / 2
    this.beams.position.set(0, 0.03, -CAR.len / 2 - 15)
    this.player.add(body, pEdges, bar, this.beams)
    this.scene.add(this.player)

    // traffic pools
    const tailGeo = T(new THREE.BoxGeometry(0.34, 0.12, 0.05))
    const blinkGeo = T(new THREE.BoxGeometry(0.14, 0.12, 0.05))
    const geos: Record<Kind, THREE.BufferGeometry> = {
      sedan: T(mergeGeos(Object.values(carParts(KIND.sedan.len, KIND.sedan.w, 'sedan')))),
      van: T(mergeGeos([boxAt(KIND.van.w, 1.55, KIND.van.len * 0.78, 0, 1.1, KIND.van.len * 0.11), boxAt(KIND.van.w, 1.0, KIND.van.len * 0.24, 0, 0.82, -KIND.van.len * 0.38)])),
      truck: T(mergeGeos([boxAt(KIND.truck.w, 2.65, KIND.truck.len * 0.74, 0, 1.75, KIND.truck.len * 0.13), boxAt(KIND.truck.w * 0.94, 2.0, KIND.truck.len * 0.22, 0, 1.3, -KIND.truck.len * 0.38)])),
    }
    const edgeGeos = { sedan: T(new THREE.EdgesGeometry(geos.sedan, 22)), van: T(new THREE.EdgesGeometry(geos.van, 22)), truck: T(new THREE.EdgesGeometry(geos.truck, 22)) }
    const counts: Record<Kind, number> = { sedan: 12, van: 6, truck: 4 }
    const blinkMat = T(new THREE.MeshBasicMaterial({ color: ALARM }))
    for (const kind of Object.keys(counts) as Kind[]) {
      const k = KIND[kind]
      for (let i = 0; i < counts[kind]; i++) {
        const g = new THREE.Group()
        const bodyMat = T(new THREE.MeshLambertMaterial({ color: 0x1b1e28 }))
        const edges = T(new THREE.LineBasicMaterial({ color: 0x9ea4b8, transparent: true, opacity: 0.55 }))
        g.add(new THREE.Mesh(geos[kind], bodyMat), new THREE.LineSegments(edgeGeos[kind], edges))
        const tails = T(new THREE.MeshBasicMaterial({ color: TAIL }))
        const ty = kind === 'sedan' ? 0.7 : kind === 'van' ? 0.95 : 1.0
        for (const s of [-1, 1]) {
          const t = new THREE.Mesh(tailGeo, tails)
          t.position.set(s * (k.w / 2 - 0.26), ty, k.len / 2 + 0.03)
          g.add(t)
        }
        const blinkL = new THREE.Mesh(blinkGeo, blinkMat)
        const blinkR = new THREE.Mesh(blinkGeo, blinkMat)
        blinkL.position.set(-(k.w / 2 - 0.05), ty, k.len / 2 + 0.03)
        blinkR.position.set(k.w / 2 - 0.05, ty, k.len / 2 + 0.03)
        g.add(blinkL, blinkR)
        for (const s of [-1, 1])
          for (const z of kind === 'truck' ? [-0.36, 0.12, 0.34] : [-0.32, 0.32]) {
            const w = new THREE.Mesh(wGeo, wMat)
            w.position.set(s * (k.w / 2 - 0.12), 0.36, z * k.len)
            g.add(w)
          }
        g.visible = false
        this.scene.add(g)
        this.pools[kind].push({ obj: g, tails, blinkL, blinkR, body: bodyMat, edges, kind })
      }
    }

    // checkpoint gantry
    const postG = T(new THREE.BoxGeometry(0.34, 6.4, 0.34))
    const beamG = T(new THREE.BoxGeometry(ROAD_W + 2.4, 0.3, 0.3))
    const gMat = T(new THREE.MeshLambertMaterial({ color: 0x1d202b }))
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(postG, gMat)
      p.position.set(s * (ROAD_HALF + 1.2), 3.2, 0)
      const glow = T(new THREE.MeshBasicMaterial({ color: this.accent }))
      const strip = new THREE.Mesh(T(new THREE.BoxGeometry(0.06, 5.6, 0.06)), glow)
      strip.position.set(s * (ROAD_HALF + 1.2) - s * 0.2, 3.1, 0.2)
      this.gateGlow.push(glow)
      this.gate.add(p, strip)
    }
    const beam = new THREE.Mesh(beamG, gMat)
    beam.position.y = 6.4
    this.gateSign = T(new THREE.MeshBasicMaterial({ transparent: true }))
    const sign = new THREE.Mesh(T(new THREE.PlaneGeometry(9.6, 1.2)), this.gateSign)
    sign.position.set(0, 5.55, 0.2)
    this.gateLine = T(new THREE.MeshBasicMaterial({ color: this.accent, transparent: true, opacity: 0.9 }))
    const line = new THREE.Mesh(T(new THREE.PlaneGeometry(ROAD_W, 0.35)), this.gateLine)
    line.rotation.x = -Math.PI / 2
    line.position.y = 0.02
    this.gate.add(beam, sign, line)
    this.gate.visible = false
    this.scene.add(this.gate)
    this.buildSigns()

    // module pickups
    const octa = T(new THREE.OctahedronGeometry(0.62))
    const octaEdges = T(new THREE.EdgesGeometry(octa))
    const inner = T(new THREE.OctahedronGeometry(0.26))
    const ringG = T(new THREE.RingGeometry(0.9, 1.0, 40))
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group()
      const edge = new THREE.LineSegments(octaEdges, T(new THREE.LineBasicMaterial({ color: this.accent })))
      const core = new THREE.Mesh(inner, T(new THREE.MeshBasicMaterial({ color: 0xffffff })))
      const shell = new THREE.Mesh(octa, T(new THREE.MeshBasicMaterial({ color: this.accent, transparent: true, opacity: 0.14, depthWrite: false })))
      const ring = new THREE.Mesh(ringG, T(new THREE.MeshBasicMaterial({ color: this.accent, transparent: true, opacity: 0.6, side: THREE.DoubleSide })))
      ring.rotation.x = -Math.PI / 2
      ring.position.y = -1.08
      g.add(edge, core, shell, ring)
      g.visible = false
      this.pickupObjs.push(g)
      this.scene.add(g)
    }

    // impact sparks
    const SP = 90
    const spPos = new Float32Array(SP * 3).fill(-999)
    this.sparkVel = new Float32Array(SP * 3)
    this.sparkLife = new Float32Array(SP)
    const spg = T(new THREE.BufferGeometry())
    spg.setAttribute('position', new THREE.BufferAttribute(spPos, 3))
    this.sparks = new THREE.Points(spg, T(new THREE.PointsMaterial({ color: ALARM, size: 3, sizeAttenuation: false, transparent: true })))
    this.sparks.frustumCulled = false
    this.scene.add(this.sparks)
  }

  private buildSigns() {
    this.signs.forEach((s) => s.dispose())
    this.signs = SYSTEMS.map((n, i) => signTexture(i, n, this.accentHex))
    this.signIdx = -1
  }

  setAccent(hex: string) {
    if (hex === this.accentHex) return
    this.accentHex = hex
    this.accent.set(hex)
    for (const m of [this.rails, this.playerEdges, this.playerBar, this.gateLine, ...this.gateGlow]) m.color.set(hex)
    ;(this.carrier.material as THREE.LineBasicMaterial).color.set(hex)
    this.groundMat.uniforms.uAccent.value.set(hex)
    for (const g of this.pickupObjs) {
      ;((g.children[0] as THREE.LineSegments).material as THREE.LineBasicMaterial).color.set(hex)
      ;((g.children[2] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(hex)
      ;((g.children[3] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(hex)
    }
    this.buildSigns()
  }

  resize(w: number, h: number, dpr: number) {
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.portrait = w / h < 1
    this.groundMat.uniforms.uPx.value = dpr * (this.portrait ? 1.6 : 2)
    this.camera.updateProjectionMatrix()
  }

  render(d: Drive, dt: number, reduced: boolean) {
    const t = d.clock
    // camera — chase view, wider when fast
    const fovBase = this.portrait ? 72 : 52
    const fov = fovBase + (reduced ? 0 : Math.max(0, d.speed - 30) * 0.32)
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 3)
      this.camera.updateProjectionMatrix()
    }
    this.camX += (d.x * (this.portrait ? 0.4 : 0.55) - this.camX) * Math.min(1, dt * 4)
    const sh = reduced ? 0 : d.shake * d.shake * 0.35
    const [cy, cz, ly, lz] = this.portrait ? [5.3, 11.2, 0.2, -22] : [3.45, 8.9, 0.85, -22]
    this.camera.position.set(this.camX + (Math.random() - 0.5) * sh, cy + (Math.random() - 0.5) * sh, cz)
    this.camera.lookAt(this.camX * 1.25, ly, lz)

    // scrolling world
    this.roadTex.offset.y = (d.dist / TILE) % 1
    this.groundMat.uniforms.uDist.value = d.dist
    const off = d.dist % 10
    for (let i = 0; i < 24; i++) {
      for (const s of [-1, 1]) {
        const idx = i * 2 + (s > 0 ? 1 : 0)
        this.dummy.position.set(s * (ROAD_HALF + 0.35), 0, 16 - i * 10 + off)
        this.dummy.updateMatrix()
        this.posts.setMatrixAt(idx, this.dummy.matrix)
        this.dummy.position.y = 0.94
        this.dummy.updateMatrix()
        this.caps.setMatrixAt(idx, this.dummy.matrix)
      }
    }
    this.posts.instanceMatrix.needsUpdate = true
    this.caps.instanceMatrix.needsUpdate = true

    for (let i = 0; i < 240; i++) {
      const u = i / 239
      const x = (u - 0.5) * 520
      const env = Math.sin(u * Math.PI)
      this.carrierPos[i * 3] = x
      this.carrierPos[i * 3 + 1] = 24 + env * (Math.sin(u * 38 - t * 1.6) * 4.5 + Math.sin(u * 91 + t * 2.3) * 1.2)
      this.carrierPos[i * 3 + 2] = -300
    }
    this.carrier.geometry.attributes.position.needsUpdate = true

    // player
    const p = this.player
    p.position.set(d.x, 0.02 + (reduced ? 0 : Math.sin(t * 17) * 0.012 * (d.speed / 30)), 0)
    p.rotation.y = -d.lean * 0.16
    p.rotation.z = -d.lean * 0.05
    p.visible = d.inv <= 0 || Math.floor(d.inv * 12) % 2 === 0
    const spin = (d.speed * dt) / 0.36
    for (const w of this.wheels) w.rotation.x -= spin
    this.playerBar.color.set(d.braking ? 0xffffff : this.accentHex)
    ;(this.beams.material as THREE.MeshBasicMaterial).opacity = 0.9 + Math.sin(t * 3) * 0.05

    // traffic
    const live = new Set<number>()
    for (const c of d.traffic) {
      live.add(c.id)
      let slot = this.assigned.get(c.id)
      if (!slot) {
        slot = this.take(c.kind)
        if (!slot) continue
        this.assigned.set(c.id, slot)
        slot.body.color.setHSL(0.64, 0.12, 0.09 + c.shade * 0.07)
      }
      const o = slot.obj
      o.visible = true
      o.position.set(c.x, 0, -c.z)
      o.rotation.y = c.toLane !== c.lane ? -Math.sign(LANES[c.toLane] - c.x) * 0.05 : 0
      const on = c.blink > 0 && Math.floor(c.blink * 3.2) % 2 === 0
      const dir = Math.sign(LANES[c.toLane] - LANES[c.lane])
      slot.blinkL.visible = on && dir < 0
      slot.blinkR.visible = on && dir > 0
      const threat = this.threat(d, c) < 1.6
      slot.edges.color.set(threat ? ALARM : 0x9ea4b8)
      slot.edges.opacity = threat ? 1 : 0.55
    }
    for (const [id, slot] of this.assigned)
      if (!live.has(id)) {
        slot.obj.visible = false
        this.assigned.delete(id)
        this.pools[slot.kind].push(slot)
      }

    // gate
    const gz = (d.gates + 1) * SEG - d.dist
    const showGate = d.status === 'playing' || d.status === 'paused'
    this.gate.visible = showGate && gz < 240 && d.gates < SYSTEMS.length
    if (this.gate.visible) {
      this.gate.position.z = -gz
      if (this.signIdx !== d.gates) {
        this.signIdx = d.gates
        this.gateSign.map = this.signs[d.gates]
        this.gateSign.needsUpdate = true
      }
      this.gateLine.opacity = 0.55 + Math.sin(t * 6) * 0.35
    }

    // pickups
    this.pickupObjs.forEach((g, i) => {
      const pk = d.pickups[i]
      g.visible = !!pk && !pk.taken
      if (!pk) return
      g.position.set(pk.x, 1.15 + Math.sin(t * 3 + i) * 0.14, -pk.z)
      g.rotation.y = t * 1.8
      g.children[3].rotation.z = -t * 1.8
    })

    // sparks
    if (d.sinceHit < this.lastHit) this.burst(d)
    this.lastHit = d.sinceHit
    const sp = this.sparks.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < this.sparkLife.length; i++) {
      if (this.sparkLife[i] <= 0) continue
      this.sparkLife[i] -= dt
      this.sparkVel[i * 3 + 1] -= 14 * dt
      sp[i * 3] += this.sparkVel[i * 3] * dt
      sp[i * 3 + 1] = Math.max(0.05, sp[i * 3 + 1] + this.sparkVel[i * 3 + 1] * dt)
      sp[i * 3 + 2] += this.sparkVel[i * 3 + 2] * dt
      if (this.sparkLife[i] <= 0) sp[i * 3 + 1] = -999
    }
    this.sparks.geometry.attributes.position.needsUpdate = true

    this.renderer.render(this.scene, this.camera)
  }

  /** Screen-space boxes for the RiderShield-style overlay (CSS pixels). */
  detections(d: Drive, w: number, h: number): Detection[] {
    const out: Detection[] = []
    for (const c of d.traffic) {
      if (c.z < 3 || c.z > 110) continue
      const k = KIND[c.kind]
      let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity
      for (const sx of [-1, 1])
        for (const sy of [0, 1])
          for (const sz of [-1, 1]) {
            this.tmp.set(c.x + (sx * k.w) / 2, sy * k.h, -c.z + (sz * k.len) / 2).project(this.camera)
            if (this.tmp.z > 1) continue
            const px = (this.tmp.x * 0.5 + 0.5) * w
            const py = (-this.tmp.y * 0.5 + 0.5) * h
            x0 = Math.min(x0, px)
            x1 = Math.max(x1, px)
            y0 = Math.min(y0, py)
            y1 = Math.max(y1, py)
          }
      if (!Number.isFinite(x0) || x1 < 0 || x0 > w || y1 < 0 || y0 > h) continue
      const ttc = this.threat(d, c)
      out.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, label: k.label, conf: c.conf, ttc, threat: ttc < 1.6, blink: c.toLane !== c.lane })
    }
    return out
  }

  private threat(d: Drive, c: Car) {
    const k = KIND[c.kind]
    if (c.z <= 0 || Math.abs(c.x - d.x) > (k.w + CAR.w) / 2 + 0.25) return Infinity
    const closing = d.speed - c.speed
    return closing > 0.4 ? Math.max(0, c.z - (k.len + CAR.len) / 2) / closing : Infinity
  }

  private take(kind: Kind): Slot | undefined {
    return this.pools[kind].pop() ?? this.pools.sedan.pop() ?? this.pools.van.pop()
  }

  private burst(d: Drive) {
    const sp = this.sparks.geometry.attributes.position.array as Float32Array
    for (let n = 0; n < 36; n++) {
      const i = this.sparkHead++ % this.sparkLife.length
      sp[i * 3] = d.x + (Math.random() - 0.5) * 1.4
      sp[i * 3 + 1] = 0.5 + Math.random() * 0.6
      sp[i * 3 + 2] = -CAR.len / 2
      this.sparkVel[i * 3] = (Math.random() - 0.5) * 12
      this.sparkVel[i * 3 + 1] = 3 + Math.random() * 6
      this.sparkVel[i * 3 + 2] = 4 + Math.random() * 10
      this.sparkLife[i] = 0.5 + Math.random() * 0.5
    }
  }

  dispose() {
    this.signs.forEach((s) => s.dispose())
    this.disposables.forEach((d) => d.dispose())
    this.posts.dispose()
    this.caps.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }
}
