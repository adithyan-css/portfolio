# Adithyan C S S — Signal → System

An interactive portfolio for **Adithyan C S S**. Everything on it comes from the résumé. The whole site is one idea, told as a signal chain:

> **sense** a signal → **process** it in real time → **predict** what comes next → **recover** when something breaks.

The page opens as **noise**: dark, static, a tuner hunting for a station. Locking the signal pulls a persistent 3D particle field into a carrier wave that runs through the name. As you scroll, that one field keeps re-forming into each chapter's instrument. Once the loop reaches *recover*, the whole page filters from dark to a light **lab** state.

## What's inside

| Section | What it does |
| --- | --- |
| **Loader** | A radio tuner sweeping 87.5 → 108.0 MHz while the fonts and the 3D chunk load (capped at 2.5 s). Pressing **Enter · lock signal** turns the static into the hero carrier. Repeat visits in the same session skip it. |
| **Hero · CH1 Input** | "ADITHYAN C S S" set as an equaliser: each letter's width (the variable `wdth` axis) reacts to the cursor, to impulses and to scroll. Click anywhere to send an impulse down the carrier. |
| **01 · The loop** | A pinned, scroll-driven oscilloscope. The field morphs through Sense → Process → Predict → Recover, and each stage links to the résumé evidence behind it. |
| **02 · Systems** | Four chapters. Each has its own field emblem that sits in a slot in the layout and scrolls with the chapter: a road tunnel (RiderShield AI), a forecast fan (AgriPrice AI), a motor rotor (RoboGuard) and a double helix (Helix). Each chapter also has an interactive model and a full case-study report (Esc closes it, ← → switch projects). |
| **03 · Experience** | An animated timeline. The RF2 Digital internship includes a working **DSP engine console**: IPC START/PAUSE/RESUME/STOP with ACKs, a biquad DC blocker, a compressor/expander, the 25-slot queue, and a forced-underrun XRUN recovery. |
| **04 · Education** | VIT Vellore with the CGPA shown on a ruled 0–10 gauge. The field draws the matching dial. A credentials block appears automatically once `src/data/achievements.ts` has entries. |
| **05 · Stack** | A skills constellation. Hover or tap a node to see where each skill shows up in the work. There's also a list view, which is the default on phones. |
| **06 · Play** | **Night Run**, a 3D driving game (three.js). A RiderShield-style co-pilot boxes every car ahead at 15 FPS and counts down time-to-collision. Collect the modules behind each project (they repair the car) and clear four checkpoint gantries, one per system. Winning shows **MISSION COMPLETE · YOU FOUND THE ENGINEER BEHIND THE SYSTEM** and an **Explore my projects** button. Controls: keyboard (← → steer, ↑ boost, ↓/Space brake, Esc pause) or touch (drag to steer, hold Brake/Boost). It keeps your best run. |
| **07 · Signal out** | Copy-email button, links, résumé download, and a compose form that opens a pre-filled `mailto:` draft (there's no backend). The carrier resolves into one clean sine, then flatlines under the footer. |

**Easter eggs:**

- Press <kbd>`</kbd> for a working terminal: `help`, `ls projects`, `open helix`, `neofetch`, `drive`, `sudo hire adithyan`, …
- The Konami code switches the site to oscilloscope-green.
- Click the hero six times.
- Run `adithyan.help()` in DevTools.

## Design system

- **Type:** Archivo Variable, using its width axis (62–125%) to carry emphasis, plus Martian Mono for instrument labels. Both are self-hosted through Fontsource.
- **Colour:**
  - Tokens are RGB triplets on `:root`. `SceneDirector` interpolates them from noise to lab as you scroll.
  - Use `.noise`, `.lab` or `.screen` to pin one of those palettes on an element.
  - Accent: ultramarine `#7c83ff` in the dark phase, `#2632f0` in the light phase.
  - Alarm orange `#ff6a3d` is used only for faults: collisions, XRUN, red-team events and warnings.
- **Surfaces:** `.screen` is an always-dark instrument panel with a "power-on" reveal. Buttons are hardware keys with an LED dot.
- **Cursor:** a reticle with corner brackets. It shows labels (VIEW / PLAY / OPEN / SCRUB / IMPULSE / COPY) and inverts over screens.
- **Navigation:** every section is linked in the header with a sliding active marker. On phones and small tablets the links become a swipeable strip under the bar, and a full-screen index is one tap away. A hairline under the header shows how far down the page you are.

## Stack

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · three.js + React Three Fiber · Motion · Lenis · Lucide · Fontsource (Archivo, Martian Mono).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build → dist/
npm run preview    # serve the production build locally
```

Requires Node 20+ (tested on Node 22).

## Update the content

All copy and data live in `src/data/`:

```
src/data/
  profile.ts        name, initials, links, résumé file, positioning, "the loop"
  projects.ts       the four case studies (problem, solution, what I built, architecture, numbers)
  experience.ts     internship + positions of responsibility
  skills.ts         skill groups + which skills map to which work
  achievements.ts   awards / certifications (empty → section hidden)
```

- **Résumé:** replace `public/Adithyan_C_S_S_Resume.pdf`. Keep the same name, or update `profile.resume` to match.
- **Phone number:** it's on the résumé but hidden on the site. Set `showPhone: true` in `profile.ts` to show it.
- **Project links:** all four currently point to the GitHub profile, as the résumé does. Replace them with repo or demo URLs in `projects.ts`.
- **Game checkpoints and modules:** edit `SYSTEMS` and `MODULES` in `src/game/drive.ts`.

## Deploy

The build is fully static and uses relative asset paths, so it works at a domain root or under a sub-path.

- **GitHub Pages (workflow included).** Push to a repo and enable *Settings → Pages → Source: GitHub Actions*. `.github/workflows/deploy.yml` then builds and publishes on every push to `main`. To serve it at `https://adithyan-css.github.io/`, name the repo `adithyan-css.github.io`.
- **Vercel.** Import the repo; it auto-detects the Vite preset (build `npm run build`, output `dist`).
- **Netlify.** Build command `npm run build`, publish directory `dist`.

Set `VITE_SITE_URL` in `.env`, or in your host's environment variables, to the final URL. It feeds the canonical link, `og:url` and the absolute `og:image` path. If you deploy somewhere other than `adithyan-css.github.io`, also update `public/robots.txt` and `public/sitemap.xml`.

## Structure

```
src/
  components/   SceneDirector (scroll → theme + field target), Nav, Cursor, Loader, Cta, Reveal/WidthText/Scramble,
                SectionHeader, SiteProvider (sound, smooth scroll, toasts, overlays)
  sections/     Hero, SignalChain, Work, CaseStudy, Experience, Education, Stack, Lab, Contact/Footer
  three/        Field.tsx (the persistent particle field + GLSL), shapes.ts (every shape the field can take), fieldBus.ts
  game/         drive.ts (pure game logic), scene.ts (three.js world), GameCanvas.tsx (React shell, HUD, overlays)
  visuals/      per-project interactive models + the DSP engine console
  terminal/     command set + terminal UI
  hooks/        visibility-gated loops, media queries, active section, Konami, accent colour
  utils/        synthesized UI sounds, math, colour helpers, console easter egg
  data/         everything résumé-derived
public/         résumé PDF, og.png, favicon.svg, apple-touch-icon.png, robots.txt, sitemap.xml
```

## Performance notes

- **One WebGL field for the whole site.**
  - It uses 14k points on desktop, 9k on low-core machines and 5.2k on phones.
  - Shapes are morphed on the GPU. Each shape is built once and cached.
  - `SceneDirector` swaps the target when a new chapter crosses the centre of the viewport.
- **three.js lives in its own chunk.** The field and the game share it. It loads while the tuner screen is up and never blocks first paint.
- **Lazy-loaded pieces.** The game (~14 kB gzip, excluding three) and the terminal (~4 kB gzip) load only when you get near them.
  - The game builds its world once and pools every car and pickup.
  - It renders only while on screen, and a live run pauses when you scroll away.
  - On unmount it disposes every geometry, material and texture and releases the WebGL context.
- **Frame loops stop when idle.** Every canvas loop runs only while it's on screen and the tab is visible.
- **Capped rendering cost.** Device pixel ratio is capped (1.35–1.75), there's no post-processing, and there's no antialiasing on phones.
- **Reduced motion (`prefers-reduced-motion`):**
  - Smooth scroll is off and reveals are opacity-only.
  - Field jitter and parallax stop, and morphs are short.
  - The game's attract mode holds still. A run you start yourself still plays.

## Accessibility

- Semantic landmarks and heading order, a skip link, and visible focus rings.
- Dialogs trap focus and close with Esc.
- Canvases have text alternatives. The game announces checkpoints and collision warnings through a live region.
- The constellation has a list view.
- Text on accent fills switches colour with the theme so it always meets contrast.
- An axe-core audit reports 0 violations in both the dark and the light phase.
