import { useEffect, useRef } from 'react'
import { readCssVar } from '../utils/math'

/** Instrument-screen accent (hex) as a ref for canvas loops; follows oscilloscope mode. */
export function useAccent() {
  const ref = useRef(readCssVar('--screen-accent', '#7c83ff'))
  useEffect(() => {
    const on = () => (ref.current = readCssVar('--screen-accent', '#7c83ff'))
    on()
    window.addEventListener('signal:theme', on)
    return () => window.removeEventListener('signal:theme', on)
  }, [])
  return ref
}

/** Semantic fault colour inside screens (collisions, XRUN, breaches). */
export const ALARM = '#ff6a3d'
