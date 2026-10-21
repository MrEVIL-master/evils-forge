import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { SectionTitle } from '@/components/SectionTitle'
import { ARTS, art } from '@/lib/site'

const COLUMNS: { files: string[]; distance: number; color: string }[] = [
  { files: [ARTS.squad, ARTS.profile, ARTS.fire], distance: -180, color: '#e8175d' },
  { files: [ARTS.flame, ARTS.hello, ARTS.geisha], distance: 160, color: '#2ff0e6' },
  { files: [ARTS.ronin, ARTS.spiritJump, ARTS.banner], distance: -320, color: '#f5e11a' },
]

function Column({ files, distance, color, progress, offset }: (typeof COLUMNS)[number] & { progress: MotionValue<number>; offset: string }) {
  const reduce = useReducedMotion()
  const y = useTransform(progress, [0, 1], reduce ? [0, 0] : [0, distance])
  return (
    <motion.div style={{ y }} className={`flex flex-col gap-8 ${offset}`}>
      {files.map((f, i) => (
        <motion.div
          key={f}
          className="print"
          style={{ ['--sc' as string]: color, rotate: i % 2 ? 2 : -2 }}
          whileHover={{ rotate: 0, scale: 1.03, transition: { type: 'spring', stiffness: 300, damping: 18 } }}
        >
          <img src={art(f)} alt="" loading="lazy" className="!h-auto" />
        </motion.div>
      ))}
    </motion.div>
  )
}

// Галерея артов: три колонки едут с разной скоростью
export function Gallery() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })

  return (
    <section ref={ref} className="relative mx-auto max-w-6xl overflow-hidden px-4 py-28">
      <SectionTitle kicker="Галерея" kanji="絵">
        Нарисовано в кузнице
      </SectionTitle>
      <p className="mt-6 max-w-xl text-lg text-muted-foreground">
        Арты — не просто украшение: любой можно поставить обложкой персонажа, и он появится на его постере в трекере.
      </p>
      <div className="mt-16 grid grid-cols-2 gap-6 md:grid-cols-3 md:gap-8">
        <Column {...COLUMNS[0]} progress={scrollYProgress} offset="" />
        <Column {...COLUMNS[1]} progress={scrollYProgress} offset="pt-24" />
        <Column {...COLUMNS[2]} progress={scrollYProgress} offset="hidden md:flex pt-10" />
      </div>
    </section>
  )
}
