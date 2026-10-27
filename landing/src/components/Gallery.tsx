import { motion } from 'motion/react'
import { ArtFrame } from '@/components/Frame'
import { Reveal, SectionHead, revealItem } from '@/components/Reveal'

const ITEMS = [
  { art: 'art-hello', title: 'Hello, my name is', wide: true },
  { art: 'art-profile', title: 'Профиль', wide: false },
  { art: 'art-flame', title: 'Голубое пламя', wide: false },
  { art: 'art-mask', title: 'Маска и дым', wide: true },
  { art: 'art-squad', title: 'Отряд', wide: true },
]

export function Gallery() {
  return (
    <section className="section" id="gallery" aria-labelledby="gallery-title">
      <div className="wrap">
        <SectionHead num="05" label="Галерея">
          <span id="gallery-title">Арты мастерской</span>
        </SectionHead>
        <Reveal className="gallery">
          {ITEMS.map(i => (
            <motion.figure key={i.art} variants={revealItem} className={i.wide ? 'g-wide' : ''} style={{ margin: 0, position: 'relative' }}>
              <ArtFrame name={i.art} alt={`${i.title} — арт`} parallax={8} sizes={i.wide ? '(max-width: 899px) 100vw, 600px' : '(max-width: 899px) 50vw, 300px'}>
                <figcaption>{i.title}</figcaption>
              </ArtFrame>
            </motion.figure>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
