import { lazy, Suspense } from 'react'
import { SectionHeader } from '../components/SectionHeader'
import { Reveal } from '../components/Reveal'
import { LazyMount } from '../components/LazyMount'

const GameCanvas = lazy(() => import('../game/GameCanvas'))
const placeholder = <div className="screen aspect-[3/4] w-full sm:aspect-[16/10] lg:aspect-[16/9]" />

export function Lab() {
  return (
    <section id="play" data-field="arena" aria-labelledby="play-title" className="relative z-10 py-[22vh]">
      <SectionHeader
        id="play-title"
        index="06"
        label="Play"
        readout="≈ 75 s · keyboard · touch"
        title={[{ t: 'Take the' }, { t: 'wheel.', w: 125, accent: true }]}
        intro="An Easter egg you can win. A night run with a RiderShield-style co-pilot that boxes every car ahead and counts down the time to collision. Clear four gates, one for each system I’ve built. Damage heals itself, like everything else here."
      />
      <Reveal className="container-x mt-14">
        <LazyMount placeholder={placeholder}>
          <Suspense fallback={placeholder}>
            <GameCanvas />
          </Suspense>
        </LazyMount>
      </Reveal>
    </section>
  )
}
