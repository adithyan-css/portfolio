import { education, internship, positions, profile, projects, skillGroups, loop } from '../data'
import type { ProjectId } from '../data'

export type Tone = 'fg' | 'mute' | 'accent' | 'dim'
export type Out = { text: string; tone?: Tone }[]

export type Ctx = {
  openCase: (id: ProjectId) => void
  scrollTo: (id: string) => void
  close: () => void
  clear: () => void
  history: () => string[]
  toggleScope: () => boolean
}

const o = (text: string, tone?: Tone) => ({ text, tone })
/** Real anchor click: more reliable than window.open inside sandboxed or embedded frames. */
const openExternal = (href: string) => {
  const a = document.createElement('a')
  a.href = href
  a.target = '_blank'
  a.rel = 'noreferrer noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
const SECTIONS: Record<string, string> = {
  top: 'top',
  home: 'top',
  loop: 'loop',
  about: 'loop',
  work: 'work',
  projects: 'work',
  experience: 'experience',
  education: 'education',
  stack: 'stack',
  skills: 'stack',
  play: 'play',
  game: 'play',
  drive: 'play',
  contact: 'contact',
}

const projectIds = projects.map((p) => p.id)

export const COMMANDS: Record<string, { help: string; run: (args: string[], ctx: Ctx) => Out | void }> = {
  help: {
    help: 'list commands',
    run: () => [
      o('available commands', 'accent'),
      ...Object.entries(COMMANDS)
        .filter(([k]) => !HIDDEN.has(k))
        .map(([k, v]) => o(`  ${k.padEnd(12)} ${v.help}`)),
      o(''),
      o('tip: tab completes, ↑/↓ walks history, esc closes', 'dim'),
    ],
  },
  whoami: {
    help: 'who built this',
    run: () => [o(`${profile.name}`, 'fg'), o(`${profile.role} · ${education[0].institution}`, 'mute')],
  },
  about: {
    help: 'the short version',
    run: () => [o(profile.positioning, 'fg'), o(''), ...loop.map((s) => o(`  ${s.index} ${s.title.toLowerCase().padEnd(8)} ${s.headline}`, 'mute'))],
  },
  ls: {
    help: 'list files · ls projects',
    run: (args) => {
      const dir = (args[0] ?? '').replace(/\/$/, '')
      if (dir === 'projects') return projects.map((p) => o(`  ${p.id.padEnd(13)} ${p.kind}`, 'fg'))
      if (dir) return [o(`ls: ${dir}: no such directory`, 'accent')]
      return [o('about.txt  projects/  experience.txt  education.txt  skills.txt  contact.txt  resume.pdf', 'fg')]
    },
  },
  cat: {
    help: 'read a file · cat projects/helix',
    run: (args, ctx) => {
      const f = (args[0] ?? '').replace(/^\.\//, '')
      if (!f) return [o('usage: cat <file>', 'mute')]
      if (f === 'about.txt') return COMMANDS.about.run([], ctx)
      if (f === 'experience.txt') return COMMANDS.experience.run([], ctx)
      if (f === 'education.txt') return COMMANDS.education.run([], ctx)
      if (f === 'skills.txt') return COMMANDS.skills.run([], ctx)
      if (f === 'contact.txt') return COMMANDS.contact.run([], ctx)
      if (f === 'resume.pdf') return [o('binary file — try `resume` to download it', 'mute')]
      const m = f.match(/^projects\/(.+)$/)
      if (m) return COMMANDS.project.run([m[1]], ctx)
      return [o(`cat: ${f}: no such file`, 'accent')]
    },
  },
  project: {
    help: 'details · project ridershield',
    run: (args) => {
      const p = projects.find((x) => x.id === args[0])
      if (!p) return [o(`usage: project <${projectIds.join('|')}>`, 'mute')]
      return [
        o(`${p.name} — ${p.kind}`, 'accent'),
        o(p.summary, 'fg'),
        o(''),
        ...p.built.map((b) => o(`  • ${b}`, 'mute')),
        o(''),
        o(`  stack: ${p.stack.join(', ')}`, 'dim'),
        o(`  → open ${p.id}  for the full case study`, 'dim'),
      ]
    },
  },
  open: {
    help: 'open a case study · open helix',
    run: (args, ctx) => {
      const id = args[0] as ProjectId
      if (!projectIds.includes(id)) return [o(`usage: open <${projectIds.join('|')}>`, 'mute')]
      ctx.close()
      ctx.openCase(id)
      return [o(`opening ${id}…`, 'accent')]
    },
  },
  experience: {
    help: 'internship + positions',
    run: () => [
      o(`${internship.role} · ${internship.org}, ${internship.location} · ${internship.period}`, 'accent'),
      ...internship.points.map((p) => o(`  • ${p}`, 'mute')),
      o(''),
      ...positions.flatMap((p) => [o(`${p.role} · ${p.org}${p.period ? ' · ' + p.period : ''}`, 'fg'), ...p.points.map((x) => o(`  • ${x}`, 'mute'))]),
    ],
  },
  education: {
    help: 'where I study',
    run: () => education.map((e) => o(`${e.degree} · ${e.institution} · ${e.period} · CGPA ${e.cgpa}/${e.scale}`, 'fg')),
  },
  skills: {
    help: 'technical skills · skills backend',
    run: (args) => {
      const q = (args[0] ?? '').toLowerCase()
      const groups = q ? skillGroups.filter((g) => g.id.includes(q) || g.label.toLowerCase().includes(q)) : skillGroups
      if (!groups.length) return [o(`no group matches "${q}" — try: ${skillGroups.map((g) => g.id).join(', ')}`, 'mute')]
      return groups.map((g) => o(`${g.label.padEnd(18)} ${g.items.join(', ')}`, 'fg'))
    },
  },
  contact: {
    help: 'how to reach me',
    run: () => [o(`email     ${profile.email}`, 'fg'), o(`github    ${profile.links.github}`, 'fg'), o(`linkedin  ${profile.links.linkedin}`, 'fg'), o('→ try: email, github, linkedin', 'dim')],
  },
  email: {
    help: 'compose an email',
    run: () => {
      window.location.href = `mailto:${profile.email}`
      return [o('opening your mail app…', 'accent')]
    },
  },
  github: {
    help: 'open GitHub',
    run: () => {
      openExternal(profile.links.github)
      return [o('opening github.com/adithyan-css…', 'accent')]
    },
  },
  linkedin: {
    help: 'open LinkedIn',
    run: () => {
      openExternal(profile.links.linkedin)
      return [o('opening linkedin…', 'accent')]
    },
  },
  resume: {
    help: 'download my résumé (PDF)',
    run: () => {
      const a = document.createElement('a')
      a.href = profile.resume.href
      a.download = profile.resume.downloadName
      document.body.appendChild(a)
      a.click()
      a.remove()
      return [o(`downloading ${profile.resume.downloadName}…`, 'accent')]
    },
  },
  cd: {
    help: 'jump to a section · cd work',
    run: (args, ctx) => {
      const id = SECTIONS[(args[0] ?? '').replace(/^\//, '').toLowerCase()]
      if (!id) return [o(`cd: sections are ${Object.keys(SECTIONS).filter((k, i, a) => a.findIndex((x) => SECTIONS[x] === SECTIONS[k]) === i).join(', ')}`, 'mute')]
      ctx.close()
      ctx.scrollTo(id)
      return [o(`→ ${id}`, 'accent')]
    },
  },
  play: {
    help: 'go to the game',
    run: (_a, ctx) => {
      ctx.close()
      ctx.scrollTo('play')
      return [o('→ play', 'accent')]
    },
  },
  drive: {
    help: 'take the wheel — Night Run, the 3D game',
    run: (_a, ctx) => {
      ctx.close()
      ctx.scrollTo('play')
      return [o('→ ignition', 'accent')]
    },
  },
  neofetch: {
    help: 'system info',
    run: () => {
      const art = ['  .-------.  ', '  | ~/\\/~ |  ', '  |  ___  |  ', "  '---+---'  ", '      |      ', '    --+--    ', '             ']
      const info = [
        `adithyan@signal`,
        `os        CSE · ${education[0].short} (${education[0].period})`,
        `cgpa      ${education[0].cgpa} / ${education[0].scale}`,
        `last job  ${internship.role}, ${internship.org.replace(' Inc.', '')}`,
        `langs     ${skillGroups[0].items.join(' ')}`,
        `projects  ${projects.map((p) => p.name).join(' · ')}`,
        `shell     signal-sh`,
      ]
      return info.map((l, i) => ({ text: `${art[i] ?? '             '} ${l}`, tone: i === 0 ? 'accent' : 'fg' }) as { text: string; tone: Tone })
    },
  },
  history: { help: 'command history', run: (_a, ctx) => ctx.history().map((h, i) => o(`  ${String(i + 1).padStart(3)}  ${h}`, 'mute')) },
  clear: { help: 'clear the screen', run: (_a, ctx) => ctx.clear() },
  exit: { help: 'close the terminal', run: (_a, ctx) => ctx.close() },
  // hidden
  sudo: {
    help: '',
    run: (args) => (args.join(' ').includes('hire') ? [o('[sudo] password for recruiter: ••••••••', 'dim'), o('access granted. run `contact` — I reply fast.', 'accent')] : [o('adithyan is not in the sudoers file. this incident will be reported… to nobody. try `sudo hire adithyan`.', 'mute')]),
  },
  pwd: { help: '', run: () => [o('/home/adithyan/portfolio', 'fg')] },
  date: { help: '', run: () => [o(new Date().toString(), 'fg')] },
  echo: { help: '', run: (args) => [o(args.join(' '), 'fg')] },
  scope: {
    help: '',
    run: (_a, ctx) => [o(ctx.toggleScope() ? 'oscilloscope mode: on' : 'oscilloscope mode: off', 'accent')],
  },
  hint: {
    help: '',
    run: () => [o('three easter eggs: click the hero six times · the konami code · `sudo hire adithyan`', 'mute')],
  },
  rm: { help: '', run: () => [o('rm: permission denied — this system heals itself anyway.', 'accent')] },
}

const HIDDEN = new Set(['sudo', 'pwd', 'date', 'echo', 'scope', 'hint', 'rm'])

export const completions = (input: string): string[] => {
  const parts = input.split(/\s+/)
  if (parts.length <= 1) return Object.keys(COMMANDS).filter((c) => !HIDDEN.has(c) && c.startsWith(parts[0] ?? ''))
  const [cmd, arg = ''] = parts
  let pool: string[] = []
  if (cmd === 'open' || cmd === 'project') pool = projectIds
  if (cmd === 'cat') pool = ['about.txt', 'experience.txt', 'education.txt', 'skills.txt', 'contact.txt', ...projectIds.map((p) => `projects/${p}`)]
  if (cmd === 'ls') pool = ['projects']
  if (cmd === 'cd') pool = Object.keys(SECTIONS)
  if (cmd === 'skills') pool = skillGroups.map((g) => g.id)
  return pool.filter((p) => p.startsWith(arg)).map((p) => `${cmd} ${p}`)
}
