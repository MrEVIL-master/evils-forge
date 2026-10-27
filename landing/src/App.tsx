import { useState } from 'react'
import { MotionConfig } from 'motion/react'
import { Nav } from '@/components/Nav'
import { Hero } from '@/components/Hero'
import { Story } from '@/components/Story'
import { AiPlan } from '@/components/AiPlan'
import { Characters } from '@/components/Characters'
import { Gallery } from '@/components/Gallery'
import { Faq } from '@/components/Faq'
import { Cta } from '@/components/Cta'
import { motionOff } from '@/lib/site'

export default function App() {
  // «Выкл» — по настройке системы или вручную (общая настройка с трекером)
  const [off, setOff] = useState(motionOff)
  return (
    <MotionConfig reducedMotion={off ? 'always' : 'never'}>
      <Nav />
      <main>
        <Hero />
        <Story />
        <AiPlan />
        <Characters />
        <Gallery />
        <Faq />
        <Cta onMotion={on => setOff(!on)} />
      </main>
    </MotionConfig>
  )
}
