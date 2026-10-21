import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react'
import { ARTS, art } from '@/lib/site'

const CHARACTERS = [
  { file: ARTS.banner, name: 'Призрачный самурай', meta: 'Animate Fest · 21 день', progress: 46, color: '#e8175d' },
  { file: ARTS.geisha, name: 'Гейша-они', meta: 'Starcon · 45 дней', progress: 28, color: '#6a3aa2' },
  { file: ARTS.spiritJump, name: 'Дух-хранитель', meta: 'Фотосет · 60 дней', progress: 12, color: '#2ff0e6' },
  { file: ARTS.ronin, name: 'Ронин с катаной', meta: 'Идея · без даты', progress: 5, color: '#2f62d6' },
  { file: ARTS.fire, name: 'Огненный самурай', meta: 'Дефиле · 90 дней', progress: 64, color: '#ff3b4e' },
  { file: ARTS.flame, name: 'Голубое пламя', meta: 'Сольник · 120 дней', progress: 80, color: '#3ff2b0' },
]

function Poster({ c, i, progress }: { c: (typeof CHARACTERS)[number]; i: number; progress: MotionValue<number> }) {
  const reduce = useReducedMotion()
  // внутри рамки арт сдвигается в обратную сторону — эффект глубины
  const imgX = useTransform(progress, [0, 1], reduce ? ['0%', '0%'] : ['-8%', '8%'])
  const tilt = i % 2 ? 2.5 : -2.5
  return (
    <motion.article
      className="relative w-[78vw] shrink-0 sm:w-[44vw] lg:w-[30vw]"
      style={{ rotate: tilt }}
      whileHover={{ rotate: 0, y: -10, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
    >
      <div className="print aspect-[4/5] overflow-hidden" style={{ ['--sc' as string]: c.color }}>
        <div className="h-full overflow-hidden">
          <motion.img src={art(c.file)} alt={c.name} loading="lazy" style={{ x: imgX, scale: 1.18 }} className="h-full w-full object-cover object-top" />
        </div>
      </div>
      <div className="ink-glass -mt-10 ml-6 mr-10 rounded-lg p-4" style={{ ['--sc' as string]: c.color }}>
        <p className="font-heading text-xl">{c.name}</p>
        <p className="text-sm font-bold text-muted-foreground">{c.meta}</p>
        <div className="mt-3 h-3 overflow-hidden rounded-sm border-2 border-ink bg-white/10">
          <motion.div
            className="h-full"
            style={{ background: `repeating-linear-gradient(-45deg, ${c.color} 0 6px, #fff8 6px 9px)` }}
            initial={{ width: 0 }}
            whileInView={{ width: `${c.progress}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
    </motion.article>
  )
}

// Горизонтальная витрина: вертикальная прокрутка двигает ленту вбок
export function Showcase() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 })
  const x = useTransform(smooth, [0, 1], reduce ? ['0%', '0%'] : ['4%', '-72%'])
  const kanjiX = useTransform(smooth, [0, 1], reduce ? ['0%', '0%'] : ['10%', '-40%'])

  return (
    <section id="showcase" ref={ref} className={`relative scroll-mt-0 ${reduce ? '' : 'h-[320vh]'}`}>
      <div className={`${reduce ? '' : 'sticky top-0 h-svh'} flex flex-col justify-center overflow-hidden py-24`}>
        <motion.span style={{ x: kanjiX }} className="outline-kanji pointer-events-none absolute top-1/2 -translate-y-1/2 text-[40vh] whitespace-nowrap opacity-40" aria-hidden>
          人物 · 衣装 · 鍛冶
        </motion.span>
        <div className="relative mx-auto mb-10 w-full max-w-6xl px-4">
          <p className="font-display text-sm text-cyan uppercase">Персонажи</p>
          <h2 className="comic-title mt-2 text-4xl sm:text-6xl [text-shadow:3px_3px_0_var(--color-ink),6px_6px_0_var(--color-cyan)]">
            Каждый костюм — своя история
          </h2>
        </div>
        <motion.div style={{ x }} className={`flex gap-10 px-[6vw] ${reduce ? 'flex-wrap justify-center' : ''}`}>
          {CHARACTERS.map((c, i) => (
            <Poster key={c.name} c={c} i={i} progress={smooth} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
