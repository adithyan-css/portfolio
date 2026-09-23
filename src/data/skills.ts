/**
 * Technical skills — exactly the résumé's "Technical Skills" block.
 * `usedIn` links a skill to work where the résumé explicitly names it.
 */
export type SkillGroup = { id: string; label: string; short: string; items: string[] }

export const skillGroups: SkillGroup[] = [
  { id: 'lang', label: 'Languages', short: 'LANG', items: ['Python', 'C', 'C++', 'Java', 'JavaScript', 'Dart'] },
  { id: 'ai', label: 'AI / ML', short: 'AI/ML', items: ['PyTorch', 'TensorFlow Lite', 'scikit-learn', 'YOLOv8', 'OpenCV'] },
  {
    id: 'backend',
    label: 'Backend',
    short: 'BACKEND',
    items: ['FastAPI', 'Node.js', 'NestJS', 'Redis', 'MongoDB', 'PostgreSQL', 'MQTT', 'WebSockets'],
  },
  { id: 'frontend', label: 'Frontend / Mobile', short: 'FRONT/MOBILE', items: ['Flutter', 'React', 'Tailwind CSS'] },
  {
    id: 'embedded',
    label: 'Embedded / DSP',
    short: 'EMBEDDED/DSP',
    items: ['ALSA Audio Programming', 'Biquad IIR Filters', 'Dynamics Processing', 'Multithreading (pthreads)', 'IPC Protocol Design'],
  },
  { id: 'tools', label: 'Tools', short: 'TOOLS', items: ['Docker', 'Kubernetes', 'Linux', 'Git', 'Raspberry Pi', 'ESP32', 'Odroid N2'] },
]

export type UsageRef = { id: string; label: string }
const RS = { id: 'ridershield', label: 'RiderShield AI' }
const AP = { id: 'agriprice', label: 'AgriPrice AI' }
const RG = { id: 'roboguard', label: 'RoboGuard' }
const HX = { id: 'helix', label: 'Helix' }
const RF = { id: 'rf2', label: 'RF2 Digital' }

export const usedIn: Record<string, UsageRef[]> = {
  Python: [AP],
  'C++': [RF],
  'TensorFlow Lite': [RS],
  YOLOv8: [RG],
  FastAPI: [RS, RG],
  NestJS: [AP],
  MongoDB: [HX],
  MQTT: [RS],
  WebSockets: [RG],
  Flutter: [RS, AP],
  'ALSA Audio Programming': [RF],
  'Biquad IIR Filters': [RF],
  'Dynamics Processing': [RF],
  'Multithreading (pthreads)': [RF],
  'IPC Protocol Design': [RF],
  Linux: [RF],
  'Raspberry Pi': [RS],
  ESP32: [RS],
  'Odroid N2': [RF],
}

export const skillCount = skillGroups.reduce((n, g) => n + g.items.length, 0)
