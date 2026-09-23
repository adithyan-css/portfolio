/**
 * Tiny synthesized UI sounds (no audio files). Off by default; only plays
 * after the visitor explicitly turns sound on.
 */
type Cue = 'tick' | 'click' | 'collect' | 'hit' | 'success' | 'open' | 'close'

let ctx: AudioContext | null = null
let enabled = false
let master: GainNode | null = null

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function setSoundEnabled(on: boolean) {
  enabled = on
  if (on) ensure()
}

function blip(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number) {
  const c = ensure()
  if (!c || !master) return
  const t = c.currentTime + delay
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + dur + 0.02)
}

export function play(cue: Cue) {
  if (!enabled) return
  switch (cue) {
    case 'tick':
      return blip(2400, 0.03, 'sine', 0.025)
    case 'click':
      return blip(880, 0.06, 'triangle', 0.05, 0, 660)
    case 'open':
      return blip(440, 0.12, 'sine', 0.05, 0, 880)
    case 'close':
      return blip(880, 0.12, 'sine', 0.045, 0, 440)
    case 'collect':
      blip(988, 0.08, 'triangle', 0.06)
      return blip(1480, 0.1, 'triangle', 0.05, 0.06)
    case 'hit':
      return blip(160, 0.22, 'sawtooth', 0.05, 0, 60)
    case 'success':
      ;[523, 659, 784, 1046].forEach((f, i) => blip(f, 0.22, 'triangle', 0.05, i * 0.09))
      return
  }
}
