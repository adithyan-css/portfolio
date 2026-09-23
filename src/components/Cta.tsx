import type { ReactNode, MouseEventHandler } from 'react'
import { Magnetic } from './Magnetic'
import { useScramble } from './Reveal'
import { play } from '../utils/sound'

type Props = {
  children: string
  href?: string
  onClick?: MouseEventHandler<HTMLElement>
  variant?: 'solid' | 'ghost'
  icon?: ReactNode
  download?: string
  external?: boolean
  cursor?: string
  size?: 'md' | 'lg'
  className?: string
  ariaLabel?: string
}

/**
 * A hardware "key": square-shouldered, silkscreen label, status LED that lights on
 * hover, label that re-decodes on hover. Solid keys fill with the signal colour.
 */
export function Cta({ children, href, onClick, variant = 'solid', icon, download, external, cursor = 'open', size = 'md', className = '', ariaLabel }: Props) {
  const [label, scramble] = useScramble(children.toUpperCase())
  const pad = size === 'lg' ? 'h-14 pl-5 pr-4 gap-5' : 'h-12 pl-4 pr-3.5 gap-4'
  const skin =
    variant === 'solid'
      ? 'bg-fg text-ink hover:bg-signal hover:text-on-signal focus-visible:bg-signal focus-visible:text-on-signal'
      : 'border border-line-2 text-fg hover:border-fg hover:bg-fg/5'
  const inner = (
    <>
      <span aria-hidden className={`size-1.5 rounded-[1px] transition-colors duration-300 ${variant === 'solid' ? 'bg-ink/40 group-hover:bg-on-signal' : 'bg-fg/30 group-hover:bg-signal'}`} />
      <span className="mono relative text-[11px] font-medium tracking-[0.12em]">
        <span className="sr-only">{children}</span>
        <span aria-hidden className="whitespace-pre">
          {label}
        </span>
      </span>
      {icon && (
        <span aria-hidden className="grid size-5 place-items-center transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-0.5">
          {icon}
        </span>
      )}
    </>
  )
  const common = {
    className: `group relative inline-flex items-center rounded-[3px] transition-[background-color,color,border-color] duration-300 ${pad} ${skin} ${className}`,
    'data-cursor': cursor,
    'aria-label': ariaLabel,
    onMouseEnter: () => {
      play('tick')
      scramble()
    },
  }
  return (
    <Magnetic strength={0.2}>
      {href ? (
        <a
          {...common}
          href={href}
          download={download}
          target={external ? '_blank' : undefined}
          rel={external ? 'noreferrer noopener' : undefined}
          onClick={(e) => {
            play('click')
            onClick?.(e)
          }}
        >
          {inner}
        </a>
      ) : (
        <button
          {...common}
          type="button"
          onClick={(e) => {
            play('click')
            onClick?.(e)
          }}
        >
          {inner}
        </button>
      )}
    </Magnetic>
  )
}
