/**
 * Identity + links. Everything here comes straight from the résumé.
 * Edit this file (and the others in /data) to update the site.
 */
export const profile = {
  name: 'Adithyan C S S',
  firstName: 'Adithyan',
  initials: 'C S S',
  handle: 'ADITH',
  role: 'Computer Science Undergraduate',
  label: 'Computer Science Engineer',
  institution: 'VIT Vellore',
  positioning:
    'I build real-time systems — C++ DSP engines on embedded Linux, edge-AI pipelines, and software that heals itself.',
  email: 'adithyan.css2024@vitstudent.ac.in',
  /** Phone is on the résumé but hidden on the public site by default. Flip to show it in Contact. */
  phone: '+91 9894478407',
  showPhone: false,
  links: {
    github: 'https://github.com/adithyan-css',
    linkedin: 'https://linkedin.com/in/adithyan-c-s-s',
  },
  resume: {
    /** Lives in /public, so it ships with the build untouched. */
    href: './Adithyan_C_S_S_Resume.pdf',
    downloadName: 'Adithyan_C_S_S_Resume.pdf',
  },
} as const

export const education = [
  {
    institution: 'Vellore Institute of Technology, Vellore',
    short: 'VIT Vellore',
    degree: 'B.Tech in Computer Science and Engineering',
    period: '2024 – Present',
    startYear: 2024,
    cgpa: 9.14,
    scale: 10,
  },
] as const

/** The loop that ties the work together — each stage cites real résumé entries. */
export type LoopStage = {
  id: string
  index: string
  title: string
  headline: string
  body: string
  evidence: { label: string; target: string }[]
}

export const loop: LoopStage[] = [
  {
    id: 'sense',
    index: '01',
    title: 'Sense',
    headline: 'Signals from the physical world.',
    body: '48 kHz stereo audio streams on an Odroid N2. Camera frames on a Raspberry Pi. ESP32 data over MQTT. Motor time-series.',
    evidence: [
      { label: 'RF2 Digital', target: 'rf2' },
      { label: 'RiderShield AI', target: 'ridershield' },
      { label: 'RoboGuard', target: 'roboguard' },
    ],
  },
  {
    id: 'process',
    index: '02',
    title: 'Process',
    headline: 'Real-time, or it doesn’t count.',
    body: 'A biquad IIR DC blocker and a compressor/expander in a dynamic C++ pipeline. A thread-safe 25-buffer queue. MQTT and WebSocket plumbing around FastAPI.',
    evidence: [
      { label: 'RF2 Digital', target: 'rf2' },
      { label: 'RiderShield AI', target: 'ridershield' },
      { label: 'RoboGuard', target: 'roboguard' },
    ],
  },
  {
    id: 'predict',
    index: '03',
    title: 'Predict',
    headline: 'Models that fit where they run.',
    body: 'INT8-quantized MobileNetV2 at 15 FPS on the edge. An LSTM that flags motor faults 10–30 steps early. Chronos + Prophet + regression, with confidence intervals.',
    evidence: [
      { label: 'RiderShield AI', target: 'ridershield' },
      { label: 'RoboGuard', target: 'roboguard' },
      { label: 'AgriPrice AI', target: 'agriprice' },
    ],
  },
  {
    id: 'recover',
    index: '04',
    title: 'Recover',
    headline: 'Designed for the failure case.',
    body: 'XRUN detection and recovery in the audio path. A sovereign fallback when the LLM API runs out of credits. Software that scans, patches and remembers its own vulnerabilities.',
    evidence: [
      { label: 'RF2 Digital', target: 'rf2' },
      { label: 'Helix', target: 'helix' },
    ],
  },
]
