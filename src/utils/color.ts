/** '#rrggbb' + alpha → 'rgba(...)' */
export function hexA(hex: string, a: number) {
  const m = hex.replace('#', '')
  const n = parseInt(m.length === 3 ? m.split('').map((c) => c + c).join('') : m, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export const FG = "#e8eaf0"
export const fgA = (a: number) => `rgba(232,234,240,${a})`

export function monoLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size = 10, align: CanvasTextAlign = 'left') {
  ctx.font = `500 ${size}px "Martian Mono Variable", ui-monospace, monospace`
  ;(ctx as CanvasRenderingContext2D & { fontStretch?: string }).fontStretch = 'semi-condensed'
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.fillText(text, x, y)
  ctx.textAlign = 'left'
}
