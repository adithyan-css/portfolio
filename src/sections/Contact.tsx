import { useState } from 'react'
import { ArrowDownToLine, ArrowUpRight, Check, Copy, Send } from 'lucide-react'
import { Reveal, Scramble, WidthText } from '../components/Reveal'
import { Magnetic } from '../components/Magnetic'
import { GithubIcon, LinkedinIcon } from '../components/Icons'
import { useSite } from '../components/SiteProvider'
import { profile } from '../data'
import { play } from '../utils/sound'

const INTENTS = ['Internship', 'Research', 'Hackathon team', 'Just saying hi']

/** SIGNAL OUT — the field resolves into one clean sine; the page ends in the clear. */
export function Contact() {
  const { toast } = useSite()
  const [copied, setCopied] = useState(false)
  const [intent, setIntent] = useState(INTENTS[0])
  const [msg, setMsg] = useState('')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email)
      setCopied(true)
      play('success')
      toast('Email copied to clipboard.')
      setTimeout(() => setCopied(false), 2200)
    } catch {
      const el = document.getElementById('contact-email')
      if (el) {
        const range = document.createRange()
        range.selectNodeContents(el)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
      toast('Address selected — press Ctrl/⌘ + C to copy.')
    }
  }

  const mailto = `mailto:${profile.email}?subject=${encodeURIComponent(`${intent} — via your portfolio`)}&body=${encodeURIComponent(msg || 'Hi Adithyan,\n\n')}`

  const links = [
    { label: 'GitHub', sub: 'adithyan-css', href: profile.links.github, icon: <GithubIcon className="size-[18px]" />, download: false },
    { label: 'LinkedIn', sub: 'adithyan-c-s-s', href: profile.links.linkedin, icon: <LinkedinIcon className="size-[18px]" />, download: false },
    { label: 'Résumé', sub: 'PDF · 2 pages', href: profile.resume.href, icon: <ArrowDownToLine className="size-[18px]" />, download: true },
  ]

  return (
    <section id="contact" aria-labelledby="contact-title" className="relative z-10 pb-16 pt-[24vh]">
      {/* The carrier rides through the headline, then flatlines under the details: end of transmission. */}
      <div data-field="out" aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[calc(24vh+min(34vw,30rem))]" />
      <div data-field="rest" aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 top-[calc(24vh+min(34vw,30rem))]" />
      <div className="container-x">
        <Reveal>
          <div className="flex items-end gap-4">
            <span className="mono text-[11px] text-signal">CH07</span>
            <Scramble text="SIGNAL OUT" className="label-mono !text-fg" />
            <span aria-hidden className="ticks-major mb-[3px] h-[9px] flex-1" />
          </div>
        </Reveal>

        <h2 id="contact-title" className="display mt-10 text-[clamp(3.4rem,12.5vw,13.5rem)] uppercase leading-[0.82]">
          <WidthText parts={[{ t: 'Let’s build', w: 125 }, { t: '\n' }, { t: 'something.', w: 64, accent: true }]} />
        </h2>

        <div className="mt-[14vh] grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Reveal>
              <p className="max-w-[36ch] text-xl leading-snug text-soft md:text-2xl">Open to internships, research collaborations and hackathon teams. Email is the fastest line in.</p>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <a id="contact-email" href={`mailto:${profile.email}`} className="link-u break-all text-[clamp(1.25rem,2.6vw,2.1rem)] font-[560] tracking-[-0.02em]" data-cursor="open">
                  {profile.email}
                </a>
                <Magnetic strength={0.2}>
                  <button
                    type="button"
                    onClick={copy}
                    className="mono inline-flex h-10 items-center gap-2 rounded-[3px] border border-line-2 px-3.5 text-[10.5px] uppercase tracking-[0.12em] text-soft transition-colors hover:border-fg hover:text-fg"
                    data-cursor="copy"
                    aria-label="Copy email address"
                  >
                    {copied ? <Check size={13} className="text-signal" /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </Magnetic>
              </div>
              {profile.showPhone && (
                <a href={`tel:${profile.phone.replace(/\s/g, '')}`} className="link-u mono mt-3 inline-block text-soft">
                  {profile.phone}
                </a>
              )}
            </Reveal>

            <Reveal delay={0.12}>
              <ul className="mt-12 border-t border-line-2">
                {links.map((l) => (
                  <li key={l.label} className="border-b border-line">
                    <a
                      href={l.href}
                      {...(l.download ? { download: profile.resume.downloadName } : { target: '_blank', rel: 'noreferrer noopener' })}
                      className="group flex items-center gap-5 py-4 transition-colors"
                      data-cursor="open"
                    >
                      <span className="text-mute transition-colors group-hover:text-signal">{l.icon}</span>
                      <span className="display text-[clamp(1.5rem,2.6vw,2.2rem)] leading-none transition-[font-variation-settings] duration-700 ease-[var(--ease-expo)] [font-variation-settings:'wdth'_90] group-hover:[font-variation-settings:'wdth'_125]">
                        {l.label}
                      </span>
                      <span className="mono ml-auto text-[10.5px] uppercase tracking-[0.1em] text-mute">{l.sub}</span>
                      <ArrowUpRight size={16} className="text-mute transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-signal" />
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <Reveal delay={0.1} className="lg:col-span-5">
            <form
              className="screen p-6 md:p-7"
              onSubmit={(e) => {
                e.preventDefault()
                play('click')
                window.location.href = mailto
              }}
              aria-labelledby="compose-title"
            >
              <p id="compose-title" className="label-mono flex items-center gap-2">
                <span className="live-dot size-1.5 rounded-full bg-signal" aria-hidden /> Compose a signal
              </p>
              <fieldset className="mt-5">
                <legend className="sr-only">What is this about?</legend>
                <div className="flex flex-wrap gap-1.5">
                  {INTENTS.map((i) => (
                    <label
                      key={i}
                      className={`mono cursor-pointer rounded-[3px] border px-2.5 py-1.5 text-[10.5px] uppercase tracking-[0.08em] transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal ${
                        intent === i ? 'border-signal bg-signal-dim text-fg' : 'border-line-2 text-soft hover:text-fg'
                      }`}
                    >
                      <input type="radio" name="intent" value={i} checked={intent === i} onChange={() => setIntent(i)} className="sr-only" />
                      {i}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="mt-5 block">
                <span className="sr-only">Message</span>
                <textarea
                  id="contact-message"
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  rows={5}
                  placeholder="A line or two about what you’re building…"
                  className="w-full resize-none rounded-[3px] border border-line-2 bg-transparent p-4 text-[15px] leading-relaxed text-fg placeholder:text-mute focus:border-signal focus:outline-none"
                />
              </label>
              <button type="submit" className="mono group mt-4 inline-flex h-12 w-full items-center justify-center gap-3 rounded-[3px] bg-signal text-[11px] uppercase tracking-[0.14em] text-on-signal transition-colors hover:bg-fg hover:text-ink" data-cursor="open">
                <Send size={14} /> Open in your email app
              </button>
              <p className="mono mt-3 text-center text-[10px] text-mute">Opens a pre-filled draft. Nothing is sent from this page.</p>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  const { scrollTo, setTerminalOpen } = useSite()
  return (
    <footer className="relative z-10 border-t border-line-2 bg-ink">
      <div className="container-x mono flex flex-col gap-5 py-7 text-[10px] uppercase tracking-[0.12em] text-mute md:flex-row md:items-center md:justify-between">
        <p>
          © {new Date().getFullYear()} {profile.name}
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <button type="button" className="link-u uppercase hover:text-fg" onClick={() => setTerminalOpen(true)}>
            ` Terminal
          </button>
          <span className="max-sm:hidden" title="Try it on your keyboard">
            ↑↑↓↓←→←→BA
          </span>
          <button type="button" className="link-u uppercase text-fg" onClick={() => scrollTo('top')}>
            Back to input ↑
          </button>
        </div>
      </div>
    </footer>
  )
}
