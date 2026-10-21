import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { Reveal, revealItem } from '@/components/Reveal'
import { SectionTitle } from '@/components/SectionTitle'
import { ARTS, art } from '@/lib/site'

const STEPS = [
  { n: '01', title: 'Создай персонажа', text: 'Имя, фандом, конвент и дата. Выбери арт обложкой — и у костюма появится свой постер.', color: '#e8175d' },
  { n: '02', title: 'Разбей на задачи', text: 'Кираса, парик, грим. В каждой задаче — этапы и список закупок с ценами.', color: '#2ff0e6' },
  { n: '03', title: 'Куй и отмечай', text: 'Перетаскивай карточки между колонками, отмечай этапы. Прогресс и бюджет считаются сами.', color: '#f5e11a' },
]

export function Steps() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 60%'] })
  const line = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })
  const artY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [120, -160])
  const artRotate = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [6, -6])

  return (
    <section id="how" ref={ref} className="relative mx-auto grid max-w-6xl scroll-mt-24 gap-14 px-4 py-28 lg:grid-cols-[1.1fr_.9fr]">
      <div>
        <SectionTitle kicker="Как работает" kanji="三">
          Три шага до дефиле
        </SectionTitle>

        <div className="relative mt-14 pl-10">
          {/* линия прогресса рисуется по мере прокрутки */}
          <div className="absolute top-2 bottom-2 left-3 w-1.5 rounded-full border border-ink bg-white/10" />
          <motion.div style={{ scaleY: line }} className="absolute top-2 bottom-2 left-3 w-1.5 origin-top rounded-full bg-gradient-to-b from-magenta via-cyan to-sun" />

          <Reveal className="space-y-12" stagger={0.18}>
            {STEPS.map((s) => (
              <motion.div key={s.n} variants={revealItem} className="relative">
                <span
                  className="absolute top-1 -left-[2.35rem] size-5 rotate-45 rounded-sm border-2 border-ink"
                  style={{ background: s.color }}
                />
                <p className="font-display text-5xl text-transparent [-webkit-text-stroke:2px_var(--color-paper)]" style={{ textShadow: `4px 4px 0 ${s.color}` }}>
                  {s.n}
                </p>
                <h3 className="mt-2 font-heading text-2xl">{s.title}</h3>
                <p className="mt-2 max-w-md text-lg text-muted-foreground">{s.text}</p>
              </motion.div>
            ))}
          </Reveal>
        </div>
      </div>

      <div className="relative hidden lg:block">
        <motion.div style={{ y: artY, rotate: artRotate }} className="sticky top-28">
          <div className="print aspect-[3/4] [--sc:var(--color-cyan)]">
            <img src={art(ARTS.spirit)} alt="" loading="lazy" />
          </div>
          <div className="print absolute -bottom-16 -left-16 aspect-square w-48 -rotate-6 [--sc:var(--color-magenta)]">
            <img src={art(ARTS.mask)} alt="" loading="lazy" className="object-[70%_center]" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
