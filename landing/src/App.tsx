import { MotionConfig } from 'motion/react'
import { Nav } from '@/components/Nav'
import { Hero } from '@/components/Hero'
import { Marquee } from '@/components/Marquee'
import { Features } from '@/components/Features'
import { Showcase } from '@/components/Showcase'
import { Steps } from '@/components/Steps'
import { Gallery } from '@/components/Gallery'
import { Faq } from '@/components/Faq'
import { Cta } from '@/components/Cta'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-svh overflow-x-clip bg-night">
        <div className="pointer-events-none fixed inset-0 z-0 bg-[var(--noise)] opacity-[0.07] mix-blend-overlay" aria-hidden />
        <Nav />
        <main className="relative z-10">
          <Hero />
          <Marquee />
          <Features />
          <Showcase />
          <Steps />
          <Gallery />
          <Faq />
          <Cta />
        </main>
      </div>
    </MotionConfig>
  )
}
