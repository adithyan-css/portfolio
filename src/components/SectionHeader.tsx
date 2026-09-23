import type { ReactNode } from 'react'
import { Reveal, Scramble, WidthText, type Part } from './Reveal'

/**
 * Chapter header: an instrument channel strip (index · label · ruler · readout)
 * over a headline whose words carry emphasis through width, not italics.
 */
export function SectionHeader({ id, index, label, readout, title, intro }: { id: string; index: string; label: string; readout?: string; title: Part[]; intro?: ReactNode }) {
  return (
    <header className="container-x relative z-10">
      <Reveal>
        <div className="flex items-end gap-4">
          <span className="mono text-[11px] text-signal">CH{index}</span>
          <Scramble text={label.toUpperCase()} className="label-mono !text-fg" />
          <span aria-hidden className="ticks-major mb-[3px] h-[9px] flex-1" />
          {readout && <span className="label-mono hidden md:inline">{readout}</span>}
        </div>
      </Reveal>
      <h2 id={id} className="display mt-8 max-w-[18ch] text-[clamp(2.7rem,6.8vw,7rem)]">
        <WidthText parts={title} />
      </h2>
      {intro && (
        <Reveal delay={0.15}>
          <div className="mt-8 max-w-[54ch] text-[17px] leading-relaxed text-mute md:text-[19px]">{intro}</div>
        </Reveal>
      )}
    </header>
  )
}

export function Tag({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <span
      className={`mono inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-[5px] text-[10.5px] uppercase tracking-[0.06em] transition-colors ${
        active ? 'border-signal/70 bg-signal-dim text-fg' : 'border-line-2 text-soft'
      }`}
    >
      {children}
    </span>
  )
}
