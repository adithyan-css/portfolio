import { profile, projects, skillGroups } from '../data'

/** A note for the engineers who open DevTools. */
export function installConsoleEasterEgg() {
  if (typeof window === 'undefined') return
  const orange = 'color:#ff6b2c;font-weight:600'
  const dim = 'color:#93908a'
  console.log(
    `%c\n  ▗▄▖  ▗▄▄▄  ▗▄▄▄▖▗▄▄▄▖▗▖ ▗▖\n ▐▌ ▐▌ ▐▌  █   █    █  ▐▌ ▐▌\n ▐▛▀▜▌ ▐▌  █   █    █  ▐▛▀▜▌\n ▐▌ ▐▌ ▐▙▄▄▀ ▗▄█▄▖  █  ▐▌ ▐▌\n`,
    orange,
  )
  console.log(`%cHey — you opened the console. That's where I'd look too.\n%cType %cadithyan.help()%c to explore this portfolio from here.`, 'color:#edebe6', dim, orange, dim)

  const api = {
    help() {
      console.table({
        'adithyan.whoami()': 'who built this',
        'adithyan.projects()': 'list the systems',
        'adithyan.stack()': 'technical skills',
        'adithyan.contact()': 'how to reach me',
        'adithyan.terminal()': 'open the in-page terminal',
      })
    },
    whoami: () => `${profile.name} — ${profile.role}, ${profile.institution}. ${profile.positioning}`,
    projects: () => console.table(projects.map((p) => ({ name: p.name, what: p.kind, stack: p.stack.join(', ') }))),
    stack: () => console.table(Object.fromEntries(skillGroups.map((g) => [g.label, g.items.join(', ')]))),
    contact: () => ({ email: profile.email, github: profile.links.github, linkedin: profile.links.linkedin }),
    terminal: () => {
      window.dispatchEvent(new CustomEvent('terminal:open'))
      return 'opening terminal…'
    },
  }
  ;(window as unknown as { adithyan: typeof api }).adithyan = api
}
