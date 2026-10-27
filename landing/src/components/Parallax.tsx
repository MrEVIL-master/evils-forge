import { motion, useReducedMotionConfig, useScroll, useSpring, useTransform } from 'motion/react'
import { useRef, type ReactNode } from 'react'

// Параллакс при прокрутке. Только transform: прокрутку не перехватывает, вёрстку не двигает.
// При «Анимации: Выкл» (или системной настройке) все слои стоят на месте.
const useOff = () => useReducedMotionConfig() === true

// Слой двигается быстрее или медленнее страницы: speed > 0 — отстаёт (уходит вглубь), < 0 — обгоняет
export function Parallax({ children, speed = 0.15, className }: { children: ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const off = useOff()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const d = speed * 240
  const y = useTransform(scrollYProgress, [0, 1], [d, -d])
  return <motion.div ref={ref} className={className} style={{ y: off ? 0 : y }}>{children}</motion.div>
}

// Картинка внутри рамки: чуть больше рамки и смещается при прокрутке — рамка стоит, арт «плывёт»
export function useInnerParallax(amount = 7) {
  const ref = useRef<HTMLImageElement>(null)
  const off = useOff()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [`-${amount}%`, `${amount}%`])
  return { ref, style: off ? undefined : { y, scale: 1 + (amount * 2.4) / 100 } }
}

// Hero: сетка уходит вглубь, текст чуть поднимается и гаснет, снимок отстаёт — три плана глубины
export function useHeroParallax() {
  const ref = useRef<HTMLElement>(null)
  const off = useOff()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const grid = useTransform(scrollYProgress, [0, 1], [0, 180])
  const text = useTransform(scrollYProgress, [0, 1], [0, -60])
  const fade = useTransform(scrollYProgress, [0, 1], [1, 0.35])
  const shot = useTransform(scrollYProgress, [0, 1], [0, 90])
  const art = useTransform(scrollYProgress, [0, 1], [0, -140])
  if (off) return { ref, grid: undefined, text: undefined, shot: undefined, art: undefined }
  return { ref, grid: { y: grid }, text: { y: text, opacity: fade }, shot: { y: shot }, art: { y: art } }
}

// Полоса прогресса чтения под шапкой
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const off = useOff()
  const smooth = useSpring(scrollYProgress, { stiffness: 220, damping: 32, mass: 0.3 })
  return <motion.div className="progress" aria-hidden style={{ scaleX: off ? scrollYProgress : smooth }} />
}
