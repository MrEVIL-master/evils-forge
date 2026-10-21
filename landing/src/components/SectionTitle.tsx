import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'

// Заголовок секции: иероглиф на фоне плывёт с другой скоростью (parallax)
export function SectionTitle({ kicker, kanji, children }: { kicker: string; kanji: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [80, -80])
  const x = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-30, 30])

  return (
    <div ref={ref} className="relative">
      <motion.span style={{ y, x }} className="outline-kanji pointer-events-none absolute -top-16 right-0 text-[9rem] opacity-60 sm:text-[12rem]" aria-hidden>
        {kanji}
      </motion.span>
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <Badge className="-rotate-2 -skew-x-6 border-2 border-ink bg-magenta px-3 py-1 font-display text-xs text-white shadow-[3px_3px_0_#0b0a14]">
          {kicker}
        </Badge>
        <h2 className="comic-title mt-5 max-w-2xl text-4xl leading-tight sm:text-6xl [text-shadow:3px_3px_0_var(--color-ink),6px_6px_0_var(--color-magenta)]">
          {children}
        </h2>
        <div className="stitch mt-6 w-48 text-magenta/70" />
      </motion.div>
    </div>
  )
}
