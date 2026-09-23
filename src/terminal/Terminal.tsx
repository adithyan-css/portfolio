import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useSite } from '../components/SiteProvider'
import { COMMANDS, completions, type Out, type Tone } from './commands'

type Entry = { id: number; cmd?: string; out: Out }

const TONE: Record<Tone, string> = { fg: 'text-fg', mute: 'text-mute', accent: 'text-signal', dim: 'text-dim' }
const PROMPT = 'adithyan@signal:~$'

const WELCOME: Out = [
  { text: 'signal-sh 1.0 — an interactive résumé', tone: 'accent' },
  { text: 'type `help` to list commands. try `whoami`, `ls projects`, `neofetch`.', tone: 'mute' },
]

export default function Terminal() {
  const { terminalOpen, setTerminalOpen, openCase, scrollTo, toggleScope, scope } = useSite()
  const [entries, setEntries] = useState<Entry[]>([{ id: 0, out: WELCOME }])
  const [value, setValue] = useState('')
  const hist = useRef<string[]>([])
  const cursor = useRef(-1)
  const nextId = useRef(1)
  const input = useRef<HTMLInputElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const scopeRef = useRef(scope)
  scopeRef.current = scope

  useEffect(() => {
    if (terminalOpen) setTimeout(() => input.current?.focus(), 50)
  }, [terminalOpen])

  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight })
  }, [entries])

  const run = (raw: string) => {
    const line = raw.trim()
    if (line) {
      hist.current.push(line)
      cursor.current = -1
    }
    const [name, ...args] = line.split(/\s+/)
    let cleared = false
    const ctx = {
      openCase,
      scrollTo,
      close: () => setTerminalOpen(false),
      clear: () => {
        cleared = true
      },
      history: () => hist.current,
      toggleScope: () => {
        toggleScope()
        return !scopeRef.current
      },
    }
    let out: Out = []
    if (!line) out = []
    else if (COMMANDS[name.toLowerCase()]) out = COMMANDS[name.toLowerCase()].run(args, ctx) ?? []
    else out = [{ text: `command not found: ${name}. type \`help\`.`, tone: 'accent' }]
    if (cleared) setEntries([])
    else setEntries((e) => [...e.slice(-60), { id: nextId.current++, cmd: line, out }])
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      run(value)
      setValue('')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const h = hist.current
      if (!h.length) return
      cursor.current = cursor.current < 0 ? h.length - 1 : Math.max(0, cursor.current - 1)
      setValue(h[cursor.current])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const h = hist.current
      if (cursor.current < 0) return
      cursor.current = cursor.current + 1
      if (cursor.current >= h.length) {
        cursor.current = -1
        setValue('')
      } else setValue(h[cursor.current])
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const c = completions(value)
      if (c.length === 1) setValue(c[0] + ' ')
      else if (c.length > 1) {
        setEntries((en) => [...en, { id: nextId.current++, cmd: value, out: [{ text: c.map((x) => x.split(' ').pop()).join('   '), tone: 'mute' }] }])
        const common = c.reduce((a, b) => {
          let i = 0
          while (i < a.length && a[i] === b[i]) i++
          return a.slice(0, i)
        })
        if (common.length > value.length) setValue(common)
      }
    } else if (e.key === 'Escape') {
      setTerminalOpen(false)
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setEntries([])
    }
  }

  return (
    <AnimatePresence>
      {terminalOpen && (
        <motion.div
          role="dialog"
          aria-label="Terminal"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="screen fixed inset-x-3 bottom-3 z-[86] flex h-[min(70svh,460px)] flex-col overflow-hidden sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[600px]"
          data-lenis-prevent
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="mono text-[11px] uppercase tracking-[0.14em] text-mute">
              <span className="text-signal">●</span> signal-sh — {PROMPT.split(':')[0]}
            </span>
            <button type="button" onClick={() => setTerminalOpen(false)} className="grid size-7 place-items-center rounded-[3px] text-mute hover:bg-line hover:text-fg" aria-label="Close terminal">
              <X size={14} />
            </button>
          </div>
          <div ref={body} className="flex-1 overflow-y-auto px-4 py-3 mono text-[12.5px] leading-[1.65]" onClick={() => input.current?.focus()} role="log" aria-live="polite">
            {entries.map((en) => (
              <div key={en.id} className="mb-1.5">
                {en.cmd !== undefined && (
                  <div className="text-soft">
                    <span className="text-signal">{PROMPT}</span> {en.cmd}
                  </div>
                )}
                {en.out.map((l, i) => (
                  <div key={i} className={`whitespace-pre-wrap break-words ${TONE[l.tone ?? 'fg']}`}>
                    {l.text || ' '}
                  </div>
                ))}
              </div>
            ))}
            <label className="flex items-center gap-2">
              <span className="shrink-0 text-signal">{PROMPT}</span>
              <span className="sr-only">Command</span>
              <input
                ref={input}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onKey}
                className="min-w-0 flex-1 bg-transparent text-fg caret-[rgb(var(--c-accent))] outline-none"
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Terminal command"
              />
            </label>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
