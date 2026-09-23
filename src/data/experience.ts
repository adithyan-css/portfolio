/**
 * Experience + positions of responsibility — from the résumé.
 */
export type Milestone = {
  id: string
  type: 'Internship' | 'Leadership' | 'Event' | 'Engineering team'
  role: string
  org: string
  location?: string
  period?: string
  headline: string
  points: string[]
  tech?: string[]
  outcome?: { value: string; label: string }
}

export const internship: Milestone = {
  id: 'rf2',
  type: 'Internship',
  role: 'Technical Intern',
  org: 'RF2 Digital Inc.',
  location: 'Chennai',
  period: 'May 2026 – Jul 2026',
  headline: 'A real-time audio DSP engine on embedded Linux.',
  points: [
    'Designed, developed, and tested a C++ DSP backend engine on the Odroid N2 embedded Linux platform for a real-time audio Control Software Toolbox',
    'Implemented core DSP blocks including a stereo biquad IIR DC Blocker and a Compressor/Expander module with attack, hold, release, and knee-based gain reduction',
    'Built a dynamic gPipeline processing chain and a thread-safe audio queue (pthreads, mutex locking, 25-buffer pre-buffer) for glitch-free playback',
    'Integrated ALSA-based audio playback at 48 kHz stereo with underrun (XRUN) detection and recovery',
    'Developed the backend side of the AlphaNexus IPC framework, including command dispatch and ACK-based responses for Start/Stop/Pause/Resume',
  ],
  tech: ['C++', 'Embedded Linux', 'Odroid N2', 'ALSA', 'Biquad IIR', 'Compressor / Expander', 'pthreads', 'IPC'],
  outcome: { value: '48 kHz', label: 'stereo playback with XRUN detection and recovery' },
}

export const positions: Milestone[] = [
  {
    id: 'iac',
    type: 'Event',
    role: 'Organizing Partner',
    org: 'Industrial Academia Conclave 2026',
    headline: 'Put industry and faculty in the same room.',
    points: [
      'Coordinated faculty-industry discussions on applied research',
      'Facilitated networking sessions between 30+ industry experts and faculty members',
      'Managed event logistics, scheduling, and documentation for the conclave',
    ],
    outcome: { value: '30+', label: 'industry experts networking with faculty' },
  },
  {
    id: 'isgf',
    type: 'Leadership',
    role: 'Chairperson',
    org: 'ISGF VIT Chapter',
    period: '2025 – Present',
    headline: 'Leading a student chapter.',
    points: [
      'Led student initiatives, industry collaboration, and research activities',
      'Organized tech quizzes, workshops, and outreach programs for 500+ students',
      'Mentored juniors on open-source contribution and competitive programming',
    ],
    outcome: { value: '500+', label: 'students reached by quizzes, workshops and outreach' },
  },
  {
    id: 'csed',
    type: 'Engineering team',
    role: 'Core Member',
    org: 'Backend Team, CSED VIT',
    period: '2025 – Present',
    headline: 'Backends for large-scale student tech events.',
    points: [
      'Built backend systems for large-scale student tech events',
      'Developed RESTful APIs and real-time features serving 1000+ concurrent users',
      'Collaborated with frontend and DevOps teams for seamless deployment pipelines',
    ],
    tech: ['REST APIs', 'Real-time features'],
    outcome: { value: '1000+', label: 'concurrent users served' },
  },
]
