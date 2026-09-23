import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { ArrowDownToLine, SquareTerminal, Volume2, VolumeX, X } from 'lucide-react'
import { useSite } from './SiteProvider'
import { useActiveSection } from '../hooks/useActiveSection'
import { profile } from '../data'
import { play } from '../utils/sound'
import { GithubIcon, LinkedinIcon } from './Icons'

export const SECTIONS = [
  { id: 'top', label: 'Input' },
  { id: 'loop', label: 'The loop' },
  { id: 'work', label: 'Systems' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'stack', label: 'Stack' },
  { id: 'play', label: 'Play' },
  { id: 'contact', label: 'Contact' },
]

function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 28 14" className="h-3.5 w-7 text-signal" aria-hidden>
        <path d="M1 7c2.2 0 2.2-5 4.4-5s2.2 10 4.4 10 2.2-10 4.4-10 2.2 10 4.4 10 2.2-5 4.4-5h3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className="wd-x whitespace-nowrap text-[13px] font-[750] tracking-[0.02em]">
        ADITHYAN <span className="tracking-[0.12em]">C S S</span>
      </span>
    </span>
  )
}

export function Nav({ visible }: { visible: boolean }) {
  const { scrollTo, sound, toggleSound, setTerminalOpen, terminalOpen } = useSite()
  const ids = useMemo(() => SECTIONS.map((s) => s.id), [])
  const active = useActiveSection(ids) || 'top'
  const [menu, setMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { scrollY, scrollYProgress } = useScroll()
  const strip = useRef<HTMLUListElement>(null)

  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 30))

  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menu])

  // keep the active chip in view on the phone strip (horizontal only — never moves the page)
  useEffect(() => {
    const ul = strip.current
    const chip = ul?.querySelector<HTMLElement>(`[data-id="${active}"]`)
    if (!ul || !chip) return
    ul.scrollTo({ left: chip.offsetLeft - ul.clientWidth / 2 + chip.offsetWidth / 2, behavior: 'smooth' })
  }, [active])

  const go = (id: string) => {
    play('click')
    setMenu(false)
    scrollTo(id)
  }

  const iconBtn = 'grid size-10 place-items-center rounded-[3px] border border-line text-soft transition-colors hover:border-line-2 hover:text-fg'
  const link = (id: string) => ({
    href: `#${id}`,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault()
      go(id)
    },
    'aria-current': id === active ? ('location' as const) : undefined,
  })

  return (
    <>
      <motion.header
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: visible ? 0 : -110, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: visible ? 0.5 : 0 }}
        className={`fixed inset-x-0 top-0 z-[70] pt-[env(safe-area-inset-top,0px)] transition-[background-color,backdrop-filter] duration-500 ${scrolled ? 'bg-ink/75 backdrop-blur-md' : ''}`}
      >
        <nav aria-label="Primary" className="container-x flex h-16 items-center gap-4">
          <button type="button" onClick={() => go('top')} aria-label={`${profile.name} — back to top`} data-cursor="link" className="shrink-0">
            <Wordmark />
          </button>

          {/* every section, one click away */}
          <ul className="mx-auto hidden items-center min-[900px]:flex">
            {SECTIONS.map((s, i) => {
              const on = s.id === active
              return (
                <li key={s.id}>
                  <a
                    {...link(s.id)}
                    className={`relative flex h-10 items-center gap-1.5 px-2 font-mono text-[10.5px] uppercase tracking-[0.08em] [font-stretch:78%] transition-colors lg:px-2.5 xl:px-3 ${on ? 'text-fg' : 'text-mute hover:text-fg'}`}
                    data-cursor="link"
                  >
                    <span aria-hidden className={`tabular-nums max-xl:hidden ${on ? 'text-signal' : 'text-dim'}`}>{String(i).padStart(2, '0')}</span>
                    {s.label}
                    {on && (
                      <motion.span
                        layoutId="nav-active"
                        aria-hidden
                        className="absolute inset-x-2 bottom-1 h-[2px] rounded-full bg-signal lg:inset-x-2.5 xl:inset-x-3"
                        transition={{ type: 'spring', stiffness: 520, damping: 42 }}
                      />
                    )}
                  </a>
                </li>
              )
            })}
          </ul>

          <div className="ml-auto flex shrink-0 items-center gap-2 min-[900px]:ml-0">
            <button type="button" className={`${iconBtn} max-sm:hidden`} onClick={() => setTerminalOpen(!terminalOpen)} aria-label="Open terminal (shortcut: backtick)" title="Terminal ( ` )">
              <SquareTerminal size={15} />
            </button>
            <button type="button" className={`${iconBtn} max-sm:hidden`} onClick={toggleSound} aria-pressed={sound} aria-label={sound ? 'Turn interface sound off' : 'Turn interface sound on'} title="Interface sound">
              {sound ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
            <a
              href={profile.resume.href}
              download={profile.resume.downloadName}
              className="mono hidden h-10 items-center gap-2 rounded-[3px] border border-line-2 px-3.5 text-[10.5px] uppercase tracking-[0.12em] transition-colors hover:border-fg md:max-[899px]:inline-flex lg:inline-flex"
              data-cursor="open"
            >
              Résumé <ArrowDownToLine size={13} />
            </a>
            <button
              type="button"
              onClick={() => setMenu(true)}
              className="mono inline-flex h-10 items-center gap-2.5 rounded-[3px] bg-fg px-3.5 text-[10.5px] uppercase tracking-[0.12em] text-ink transition-colors hover:bg-signal hover:text-on-signal min-[900px]:hidden"
              aria-expanded={menu}
              aria-controls="site-index"
            >
              <span className="flex flex-col gap-[3px]" aria-hidden>
                <span className="h-px w-3.5 bg-current" />
                <span className="h-px w-2.5 bg-current" />
              </span>
              Index
            </button>
          </div>
        </nav>

        {/* phones & small tablets: a swipeable section strip under the bar */}
        <nav aria-label="Sections" className="border-t border-line min-[900px]:hidden">
          <ul ref={strip} className="no-scrollbar container-x flex h-10 items-center gap-1 overflow-x-auto overscroll-x-contain">
            {SECTIONS.map((s) => {
              const on = s.id === active
              return (
                <li key={s.id} data-id={s.id} className="shrink-0">
                  <a
                    {...link(s.id)}
                    className={`block rounded-[3px] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] [font-stretch:78%] transition-colors ${on ? 'bg-fg text-ink' : 'text-mute active:text-fg'}`}
                  >
                    {s.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* how far down the page you are */}
        <motion.span aria-hidden className="absolute inset-x-0 bottom-0 h-px origin-left bg-signal" style={{ scaleX: scrollYProgress }} />
      </motion.header>

      <AnimatePresence>
        {menu && (
          <motion.div
            id="site-index"
            role="dialog"
            aria-modal="true"
            aria-label="Site index"
            className="noise fixed inset-0 z-[85] flex flex-col overflow-y-auto bg-ink/95 text-fg backdrop-blur-xl"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.75, ease: [0.76, 0, 0.24, 1] }}
            data-lenis-prevent
          >
            <div className="container-x flex h-16 shrink-0 items-center justify-between pt-[env(safe-area-inset-top,0px)]">
              <Wordmark />
              <button type="button" className={iconBtn} onClick={() => setMenu(false)} aria-label="Close index" autoFocus>
                <X size={16} />
              </button>
            </div>
            <div className="container-x grid flex-1 gap-10 pb-10 pt-6 md:grid-cols-12 md:pt-10">
              <ol className="md:col-span-8">
                {SECTIONS.map((s, i) => (
                  <motion.li
                    key={s.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.045, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="border-b border-line"
                  >
                    <a
                      href={`#${s.id}`}
                      onClick={(e) => {
                        e.preventDefault()
                        go(s.id)
                      }}
                      className="group flex items-baseline gap-4 py-2 md:gap-6"
                      onMouseEnter={() => play('tick')}
                    >
                      <span className="mono w-10 shrink-0 text-[10.5px] text-signal">{String(i).padStart(2, '0')}</span>
                      <span
                        className={`display text-[clamp(2.1rem,6.4vw,5.4rem)] leading-[1] transition-[font-variation-settings,color] duration-700 ease-[var(--ease-expo)] [font-variation-settings:'wdth'_70] group-hover:[font-variation-settings:'wdth'_125] group-focus-visible:[font-variation-settings:'wdth'_125] ${
                          s.id === active ? 'text-fg' : 'text-soft group-hover:text-fg'
                        }`}
                      >
                        {s.label}
                      </span>
                      {s.id === active && <span className="mono ml-auto text-[10px] uppercase tracking-[0.12em] text-mute max-sm:hidden">● you are here</span>}
                    </a>
                  </motion.li>
                ))}
              </ol>
              <motion.aside initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-col gap-8 md:col-span-4 md:pt-4">
                <div>
                  <p className="label-mono">Signal out</p>
                  <a href={`mailto:${profile.email}`} className="link-u mt-3 inline-block break-all text-lg">
                    {profile.email}
                  </a>
                </div>
                <div className="flex gap-2">
                  <a href={profile.links.github} target="_blank" rel="noreferrer noopener" className={iconBtn} aria-label="GitHub (opens in a new tab)">
                    <GithubIcon className="size-4" />
                  </a>
                  <a href={profile.links.linkedin} target="_blank" rel="noreferrer noopener" className={iconBtn} aria-label="LinkedIn (opens in a new tab)">
                    <LinkedinIcon className="size-4" />
                  </a>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={profile.resume.href} download={profile.resume.downloadName} className="mono inline-flex h-11 items-center gap-2 rounded-[3px] bg-fg px-4 text-[10.5px] uppercase tracking-[0.12em] text-ink">
                    Résumé <ArrowDownToLine size={13} />
                  </a>
                  <button
                    type="button"
                    className="mono inline-flex h-11 items-center gap-2 rounded-[3px] border border-line-2 px-4 text-[10.5px] uppercase tracking-[0.12em]"
                    onClick={() => {
                      setMenu(false)
                      setTerminalOpen(true)
                    }}
                  >
                    <SquareTerminal size={13} /> Terminal
                  </button>
                  <button type="button" className="mono inline-flex h-11 items-center gap-2 rounded-[3px] border border-line-2 px-4 text-[10.5px] uppercase tracking-[0.12em]" onClick={toggleSound} aria-pressed={sound}>
                    {sound ? <Volume2 size={13} /> : <VolumeX size={13} />} Sound {sound ? 'on' : 'off'}
                  </button>
                </div>
                <p className="label-mono mt-auto leading-relaxed">
                  Press <span className="text-fg">`</span> anywhere for a terminal.
                  <br />
                  There are other things to find.
                </p>
              </motion.aside>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
