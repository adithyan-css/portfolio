import { useRef, type ReactNode } from 'react'
import { motion, useSpring } from 'motion/react'
import { useFinePointer, useReducedMotionPref } from '../hooks/useMedia'

/** Pulls its child gently toward the pointer. Inert on touch / reduced motion. */
export function Magnetic({ children, strength = 0.28, className = '' }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const fine = useFinePointer()
  const reduced = useReducedMotionPref()
  const cfg = { stiffness: 240, damping: 18, mass: 0.4 }
  const x = useSpring(0, cfg)
  const y = useSpring(0, cfg)
  const active = fine && !reduced

  return (
    <motion.div
      ref={ref}
      className={`inline-flex ${className}`}
      style={active ? { x, y } : undefined}
      onPointerMove={(e) => {
        if (!active || !ref.current) return
        const r = ref.current.getBoundingClientRect()
        x.set((e.clientX - (r.left + r.width / 2)) * strength)
        y.set((e.clientY - (r.top + r.height / 2)) * strength)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}
