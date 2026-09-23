import { useEffect } from 'react'
import { fieldBus, setFieldTarget, type ShapeId } from '../three/fieldBus'
import { useReducedMotionPref } from '../hooks/useMedia'

/**
 * One scroll listener that runs the whole show:
 *  - picks the field shape from whichever [data-field] element crosses the viewport's centre line
 *  - filters the page from NOISE (dark) to LAB (light) across the end of the loop section
 *  - feeds pointer + scroll velocity to the field
 */
type RGB = [number, number, number]
const NOISE: Record<string, RGB> = {
  bg: [7, 8, 11],
  bg2: [15, 16, 22],
  fg: [232, 234, 240],
  soft: [184, 189, 201],
  mute: [142, 147, 160],
  dim: [122, 127, 140],
  accent: [124, 131, 255],
}
const LAB: Record<string, RGB> = {
  bg: [231, 232, 228],
  bg2: [221, 222, 217],
  fg: [12, 13, 16],
  soft: [40, 42, 48],
  mute: [86, 89, 97],
  dim: [92, 95, 103],
  accent: [38, 50, 240],
}
const SCOPE_ACCENT: [RGB, RGB] = [
  [109, 255, 176],
  [0, 150, 80],
]

const mix = (a: RGB, b: RGB, t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(' ')
const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function SceneDirector({ entered }: { entered: boolean }) {
  const reduced = useReducedMotionPref()

  useEffect(() => {
    fieldBus.reduced = reduced
  }, [reduced])

  useEffect(() => {
    const root = document.documentElement
    let raf = 0
    let lastY = window.scrollY
    let lastP = -1
    let pending = false

    const paint = (p: number) => {
      if (Math.abs(p - lastP) < 0.002 && lastP !== -1) return
      lastP = p
      const scope = root.dataset.mode === 'scope'
      for (const k of Object.keys(NOISE)) {
        if (k === 'accent') continue
        root.style.setProperty(`--c-${k}`, mix(NOISE[k], LAB[k], p))
      }
      root.style.setProperty('--c-accent', scope ? mix(SCOPE_ACCENT[0], SCOPE_ACCENT[1], p) : mix(NOISE.accent, LAB.accent, p))
      // text on accent fills flips (not blends) so it never passes through an unreadable grey
      root.style.setProperty('--c-on-accent', p > 0.5 ? '255 255 255' : '7 8 11')
      root.style.setProperty('--grain', String(0.06 - p * 0.03))
      root.style.colorScheme = p > 0.5 ? 'light' : 'dark'
      root.dataset.phase = p > 0.5 ? 'lab' : 'noise'
      fieldBus.light = p
    }

    const update = () => {
      pending = false
      const vh = window.innerHeight
      // 1) theme phase from the loop track
      const track = document.getElementById('loop-track')
      let p = 0
      if (track) {
        const r = track.getBoundingClientRect()
        const prog = -r.top / Math.max(1, r.height - vh)
        p = smooth(0.7, 0.93, prog)
      }
      paint(p)

      // 2) field target from the element on the centre line
      if (entered) {
        // the zone under the centre line wins; otherwise the most recent zone that started above it
        const mid = vh / 2
        const els = document.querySelectorAll<HTMLElement>('[data-field]')
        let inside: HTMLElement | undefined
        let above: HTMLElement | undefined
        let aboveTop = -Infinity
        for (const el of els) {
          const r = el.getBoundingClientRect()
          if (r.top <= mid && r.bottom >= mid) inside = el
          if (r.top <= mid && r.top > aboveTop) {
            aboveTop = r.top
            above = el
          }
        }
        const zone = inside ?? above
        const chosen = zone?.dataset.field as ShapeId | undefined
        if (chosen) setFieldTarget(chosen)
        // emblems ride in a layout slot, so they scroll with their chapter instead of floating over copy
        const slot = zone?.querySelector<HTMLElement>('[data-field-anchor]')
        if (slot && chosen) {
          const r = slot.getBoundingClientRect()
          fieldBus.anchor = { shape: chosen, y: 1 - ((r.top + r.height / 2) / vh) * 2 }
        } else fieldBus.anchor = null
      } else setFieldTarget('static')

      // 3) scroll velocity (decays in the renderer)
      const y = window.scrollY
      fieldBus.scrollVel = (y - lastY) / 40
      lastY = y
    }

    const onScroll = () => {
      if (pending) return
      pending = true
      raf = requestAnimationFrame(update)
    }
    const decay = window.setInterval(() => {
      fieldBus.scrollVel *= 0.6
    }, 80)

    const onMove = (e: PointerEvent) => {
      fieldBus.mx = (e.clientX / window.innerWidth) * 2 - 1
      fieldBus.my = -((e.clientY / window.innerHeight) * 2 - 1)
      fieldBus.pointerActive = e.pointerType === 'mouse'
    }
    const onLeave = () => (fieldBus.pointerActive = false)

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    const onTheme = () => {
      lastP = -1
      onScroll()
    }
    window.addEventListener('signal:theme', onTheme)
    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(decay)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('signal:theme', onTheme)
    }
  }, [entered])

  return null
}
