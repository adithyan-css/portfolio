import { useEffect, useRef, type RefObject } from 'react'
import { useVisible } from './useVisible'
import { useReducedMotionPref } from './useMedia'

export type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => void

/**
 * DPR-aware 2D canvas loop that only runs while visible.
 * With reduced motion it renders a single still frame (and re-renders on resize).
 */
export function useCanvas(draw: DrawFn, opts: { maxDpr?: number; staticTime?: number } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)
  drawRef.current = draw
  const visible = useVisible(canvasRef as RefObject<HTMLCanvasElement | null>)
  const reduced = useReducedMotionPref()
  const size = useRef({ w: 0, h: 0, dpr: 1 })
  const tRef = useRef(0)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const maxDpr = opts.maxDpr ?? 2

    const resize = () => {
      const r = c.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr)
      size.current = { w: r.width, h: r.height, dpr }
      c.width = Math.max(1, Math.round(r.width * dpr))
      c.height = Math.max(1, Math.round(r.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (reduced || !visible) drawRef.current(ctx, r.width, r.height, opts.staticTime ?? tRef.current, 0)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(c)
    resize()

    if (reduced || !visible) return () => ro.disconnect()

    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      tRef.current += dt
      const { w, h } = size.current
      drawRef.current(ctx, w, h, tRef.current, dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduced])

  return { canvasRef, visible, reduced }
}
