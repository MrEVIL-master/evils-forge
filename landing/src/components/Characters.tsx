import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ArtFrame } from '@/components/Frame'
import { Reveal, SectionHead, revealItem } from '@/components/Reveal'
import { motionOff } from '@/lib/site'

// Персонажи — арты мастерской. Без выдуманных фестивалей, дней и процентов.
const CHARS = [
  { art: 'art-banner', name: 'Призрачный самурай' },
  { art: 'art-geisha', name: 'Гейша-они' },
  { art: 'art-spirit-jump', name: 'Дух-хранитель' },
  { art: 'art-ronin', name: 'Ронин с катаной' },
  { art: 'art-fire', name: 'Огненный самурай' },
  { art: 'art-spirit', name: 'Дух в доспехах' },
]

export function Characters() {
  const strip = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ start: true, end: false })
  const update = () => {
    const s = strip.current
    if (!s) return
    setEdge({ start: s.scrollLeft < 8, end: s.scrollLeft + s.clientWidth > s.scrollWidth - 8 })
  }
  useEffect(update, [])
  const go = (dir: 1 | -1) => {
    const s = strip.current
    if (!s) return
    s.scrollBy({ left: dir * Math.min(s.clientWidth * 0.8, 640), behavior: motionOff() ? 'auto' : 'smooth' })
  }

  return (
    <section className="section" id="characters" aria-labelledby="chars-title">
      <div className="wrap">
        <div className="strip-head">
          <SectionHead num="04" label="Персонажи" lead="Арты мастерской. Любой можно поставить обложкой досье.">
            <span id="chars-title">Каждый костюм — своё досье</span>
          </SectionHead>
          <div className="strip-nav">
            <button type="button" aria-label="Назад" onClick={() => go(-1)} disabled={edge.start}><ChevronLeft aria-hidden /></button>
            <button type="button" aria-label="Дальше" onClick={() => go(1)} disabled={edge.end}><ChevronRight aria-hidden /></button>
          </div>
        </div>
        <Reveal>
          <div className="strip" ref={strip} onScroll={update} tabIndex={0} aria-label="Персонажи — листай вбок">
            {CHARS.map(c => (
              <motion.figure key={c.art} variants={revealItem} className="card" style={{ margin: 0 }}>
                <ArtFrame name={c.art} alt={`${c.name} — арт`} sizes="300px" parallax={6} />
                <figcaption><h3>{c.name}</h3><p>Ориджинал · Evil's Forge</p></figcaption>
              </motion.figure>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
