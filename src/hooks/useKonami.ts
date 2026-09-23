import { useEffect, useRef } from 'react'

const SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

/** Fires when the last ten keys match the Konami code (rolling window, so stray keys never break it). */
export function useKonami(cb: () => void) {
  const recent = useRef<string[]>([])
  const cbRef = useRef(cb)
  cbRef.current = cb
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA') return
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const r = recent.current
      r.push(k)
      if (r.length > SEQ.length) r.shift()
      if (r.length === SEQ.length && r.every((x, i) => x === SEQ[i])) {
        recent.current = []
        cbRef.current()
      }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])
}
