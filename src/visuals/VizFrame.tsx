import { useRef, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

/**
 * An instrument screen set into the page. It powers on the first time it's seen:
 * a single trace line, then the display opens vertically — like a scope warming up.
 */
export function VizFrame({ title, badge = 'Simulation', controls, caption, children, minH = 'min-h-[380px]' }: { title: string; badge?: string; controls?: ReactNode; caption?: string; children: ReactNode; minH?: string }) {
  const ref = useRef<HTMLElement>(null)
  const seen = useInView(ref, { once: true, margin: '0px 0px -15% 0px' })
  const reduced = useReducedMotion()

  return (
    <figure ref={ref} className="screen flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-2.5">
        <span className="mono flex items-center gap-2 text-[9.5px] uppercase tracking-[0.14em] text-mute">
          <span className={`size-1.5 rounded-full ${seen ? 'live-dot bg-signal' : 'bg-dim'}`} aria-hidden />
          {badge}
        </span>
        <span className="mono text-[9.5px] uppercase tracking-[0.14em] text-dim">/ {title}</span>
        {controls && <div className="ml-auto flex flex-wrap items-center gap-1.5">{controls}</div>}
      </div>
      <motion.div
        className={`relative flex-1 ${minH}`}
        initial={reduced ? false : { clipPath: 'inset(49.6% 0 49.6% 0)', opacity: 0.4 }}
        animate={seen || reduced ? { clipPath: 'inset(0% 0 0% 0)', opacity: 1 } : undefined}
        transition={{ clipPath: { duration: 0.9, ease: [0.76, 0, 0.24, 1], delay: 0.35 }, opacity: { duration: 0.3 } }}
      >
        {!reduced && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px bg-signal shadow-[0_0_14px_rgb(var(--c-accent))]"
            initial={{ scaleX: 0, opacity: 1 }}
            animate={seen ? { scaleX: [0, 1, 1], opacity: [1, 1, 0] } : undefined}
            transition={{ duration: 1.1, times: [0, 0.35, 1], ease: 'easeOut' }}
          />
        )}
        {children}
      </motion.div>
      {caption && <figcaption className="border-t border-line px-4 py-2.5 text-[12.5px] leading-relaxed text-mute">{caption}</figcaption>}
    </figure>
  )
}

export function VizButton({ children, onClick, active, disabled, ariaPressed, label }: { children: ReactNode; onClick: () => void; active?: boolean; disabled?: boolean; ariaPressed?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={ariaPressed}
      aria-label={label}
      className={`mono inline-flex h-7 items-center gap-1.5 rounded-[3px] border px-2.5 text-[9.5px] uppercase tracking-[0.1em] transition-colors disabled:opacity-35 ${
        active ? 'border-signal/70 bg-signal-dim text-fg' : 'border-line-2 text-soft hover:border-fg/60 hover:text-fg'
      }`}
    >
      {children}
    </button>
  )
}
