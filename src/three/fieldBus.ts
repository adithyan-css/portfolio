/**
 * Shared, mutable state between the DOM and the persistent WebGL field.
 * Written by sections / hooks, read every frame by the renderer — no React re-renders.
 */
export type ShapeId =
  | 'static'
  | 'hero'
  | 'sense'
  | 'process'
  | 'predict'
  | 'recover'
  | 'ridershield'
  | 'agriprice'
  | 'roboguard'
  | 'helix'
  | 'audio'
  | 'dial'
  | 'lattice'
  | 'arena'
  | 'rest'
  | 'out'

export const fieldBus = {
  /** pointer in NDC (-1..1) */
  mx: 0,
  my: 0,
  pointerActive: false,
  target: 'static' as ShapeId,
  /** 0 = noise (dark) … 1 = lab (light) */
  light: 0,
  scrollVel: 0,
  reduced: false,
  /** hero carrier anchor: NDC y of the name's centre line */
  heroY: -0.2,
  /** layout slot an emblem should sit in (NDC y of the slot centre), set per zone */
  anchor: null as { shape: ShapeId; y: number } | null,
  impulse: { x: 0, t: -100 },
  /** set by the renderer: seconds on the field clock */
  now: 0,
  /** live carrier readout (amplitude as a fraction of view height, spatial frequency) */
  amp: 0,
  k: 0,
  ready: false,
}

export function setFieldTarget(s: ShapeId) {
  fieldBus.target = s
}

/** Fire an impulse along the carrier at NDC x. */
export function fieldImpulse(ndcX: number) {
  fieldBus.impulse = { x: ndcX, t: fieldBus.now }
}
