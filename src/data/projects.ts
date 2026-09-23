/**
 * Projects — sourced from the résumé. "built" mirrors the résumé bullets;
 * problem/solution restate them as a case-study narrative without adding claims.
 */
export type ProjectId = 'ridershield' | 'agriprice' | 'roboguard' | 'helix'

export type Readout = { value: string; label: string }

export type Project = {
  id: ProjectId
  index: string
  name: string
  kind: string
  summary: string
  problem: string
  solution: string
  built: string[]
  /** Ordered flow shown as an architecture strip. Each lane is one chain. */
  architecture: { title: string; steps: string[] }[]
  readouts: Readout[]
  stack: string[]
  links: { label: string; href: string }[]
  vizCaption: string
}

const GH = 'https://github.com/adithyan-css'

export const projects: Project[] = [
  {
    id: 'ridershield',
    index: '01',
    name: 'RiderShield AI',
    kind: 'Real-Time Collision Detection System',
    summary:
      'On-device collision detection: a quantized MobileNetV2 running on a Raspberry Pi, wired into an IoT pipeline that carries events to a dashboard.',
    problem:
      'A collision has to be recognised on the device itself, in real time. That means vision inference on constrained edge hardware under a strict latency budget, and a dependable path for events to reach people.',
    solution:
      'MobileNetV2 deployed with TensorFlow Lite and INT8-quantized for the Raspberry Pi, reaching 15 FPS within a sub-100 ms budget. An IoT pipeline moves data from ESP32 over MQTT into FastAPI and out to a Flutter dashboard.',
    built: [
      'Built on-device collision detection using MobileNetV2 (TFLite) on Raspberry Pi',
      'Achieved 15 FPS real-time inference under strict latency constraints (<100 ms)',
      'Designed IoT pipeline: ESP32 → MQTT → FastAPI → Flutter dashboard',
      'Optimized model using INT8 quantization for edge deployment efficiency',
    ],
    architecture: [
      { title: 'Inference', steps: ['Camera frames', 'MobileNetV2 · TFLite INT8', 'Raspberry Pi'] },
      { title: 'IoT pipeline', steps: ['ESP32', 'MQTT', 'FastAPI', 'Flutter dashboard'] },
    ],
    readouts: [
      { value: '15', label: 'FPS on-device' },
      { value: '<100', label: 'ms latency budget' },
      { value: 'INT8', label: 'quantized model' },
    ],
    stack: ['MobileNetV2', 'TensorFlow Lite', 'Raspberry Pi', 'ESP32', 'MQTT', 'FastAPI', 'Flutter'],
    links: [{ label: 'GitHub', href: GH }],
    vizCaption: 'Simulation of the edge loop — classify every frame inside the budget, publish events down the IoT chain.',
  },
  {
    id: 'agriprice',
    index: '02',
    name: 'AgriPrice AI',
    kind: 'Crop Price Forecasting Platform',
    summary:
      'Ensemble forecasting for agricultural prices, built to show its uncertainty instead of hiding it.',
    problem:
      'Agricultural prices are non-stationary: trends and regimes shift, so a single model’s point forecast is brittle and easy to over-trust.',
    solution:
      'An ensemble of Chronos, Prophet and regression models improves robustness on non-stationary data, and predictions carry confidence intervals — served through a full-stack Flutter + NestJS + Python platform.',
    built: [
      'Developed ensemble forecasting system using Chronos, Prophet, and regression models',
      'Improved prediction robustness for non-stationary agricultural price data',
      'Built full-stack platform (Flutter + NestJS + Python backend)',
      'Designed uncertainty-aware prediction with confidence intervals',
    ],
    architecture: [
      { title: 'Models', steps: ['Chronos', 'Prophet', 'Regression', 'Ensemble + confidence intervals'] },
      { title: 'Platform', steps: ['Python backend', 'NestJS', 'Flutter'] },
    ],
    readouts: [
      { value: '3', label: 'model families in one ensemble' },
      { value: '±CI', label: 'uncertainty-aware predictions' },
      { value: 'E2E', label: 'platform: Flutter · NestJS · Python' },
    ],
    stack: ['Chronos', 'Prophet', 'Regression models', 'Python', 'NestJS', 'Flutter'],
    links: [{ label: 'GitHub', href: GH }],
    vizCaption: 'Illustrative series (not real prices). Toggle models to see the ensemble and its interval respond.',
  },
  {
    id: 'roboguard',
    index: '03',
    name: 'RoboGuard',
    kind: 'Predictive Fault Detection System',
    summary:
      'Predicting motor faults before they happen, while watching the safety zones around the machine.',
    problem:
      'A fault that is only detected when it happens is already a failure. Safety also depends on what is happening around the machine, not just inside it.',
    solution:
      'An LSTM on motor time-series data flags anomalies 10–30 steps before failure events. YOLOv8 adds zone-based safety monitoring, and the whole system runs in real time over FastAPI + WebSockets.',
    built: [
      'Built LSTM-based model for early motor fault prediction from time-series data',
      'Detected anomalies 10–30 steps before failure events',
      'Integrated YOLOv8 for zone-based safety monitoring',
      'Developed real-time system using FastAPI + WebSockets',
    ],
    architecture: [
      { title: 'Prediction', steps: ['Motor time-series', 'LSTM', 'Early-warning anomaly'] },
      { title: 'Safety', steps: ['Camera', 'YOLOv8', 'Zone rules'] },
      { title: 'Delivery', steps: ['FastAPI', 'WebSockets', 'Live client'] },
    ],
    readouts: [
      { value: '10–30', label: 'steps of early warning' },
      { value: 'v8', label: 'YOLO zone monitoring' },
      { value: 'WS', label: 'real-time over WebSockets' },
    ],
    stack: ['LSTM', 'YOLOv8', 'FastAPI', 'WebSockets'],
    links: [{ label: 'GitHub', href: GH }],
    vizCaption: 'Simulated motor signal. The warning lands inside the 10–30 step window before failure.',
  },
  {
    id: 'helix',
    index: '04',
    name: 'Helix',
    kind: 'Autonomous Self-Healing Software System',
    summary:
      'Software with an immune system: it attacks on purpose, heals, and remembers — so a fixed vulnerability can’t quietly come back.',
    problem:
      'Vulnerabilities get patched and then return. Repair usually waits on people — and AI-driven repair breaks the moment an API hits its rate or credit limit.',
    solution:
      'Helix is organised as organs. I built the Immune System (scan → heal → patch → promote) with a red-team pipeline against a vulnerable demo app, and the Immune Memory that blocks recurrence using 1536-dim embeddings. Qwen3.6-27B via Groq is the cognition layer, with a sovereign fallback to a local open-weight endpoint; n8n reflex arcs keep the loops running.',
    built: [
      'Designed and implemented the Immune System organ (scan, heal, patch, promote), including a full red-team attack pipeline against a vulnerable demo app',
      'Built the Immune Memory organ for vulnerability recurrence blocking using 1536-dim vector embeddings with Atlas $vectorSearch and an in-memory cosine fallback',
      'Integrated Qwen3.6-27B (via Groq) as the primary cognition layer for patch synthesis, drift judgement, and causal reconstruction',
      'Implemented a sovereign fallback routing all AI operations to a local open-weight endpoint on rate/credit exhaustion',
      'Wired n8n reflex arcs for automated scan-heal loops and scheduled attack runs',
    ],
    architecture: [
      { title: 'Immune System', steps: ['Red-team attack', 'Scan', 'Heal', 'Patch', 'Promote'] },
      { title: 'Immune Memory', steps: ['1536-dim embedding', 'Atlas $vectorSearch', 'In-memory cosine fallback'] },
      { title: 'Cognition', steps: ['Qwen3.6-27B via Groq', 'Sovereign fallback · local open-weight'] },
      { title: 'Reflex arcs', steps: ['n8n', 'Scan-heal loops', 'Scheduled attack runs'] },
    ],
    readouts: [
      { value: '1536', label: 'dim vulnerability embeddings' },
      { value: '27B', label: 'Qwen3.6 cognition via Groq' },
      { value: '4', label: 'immune stages: scan · heal · patch · promote' },
    ],
    stack: ['Qwen3.6-27B', 'Groq', 'MongoDB Atlas $vectorSearch', 'Vector embeddings', 'n8n'],
    links: [{ label: 'GitHub', href: GH }],
    vizCaption: 'Run the loop: attack, heal, remember. Then replay the same exploit — or cut the API credits.',
  },
]

export const projectById = (id: string) => projects.find((p) => p.id === id)
