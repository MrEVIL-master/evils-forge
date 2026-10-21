import { motion, useReducedMotion, type Variants } from 'motion/react'
import type { ReactNode } from 'react'

const EASE = [0.22, 1, 0.36, 1] as const

export const revealItem: Variants = {
  hidden: { opacity: 0, y: 36, rotate: -1.5, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, rotate: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease: EASE } },
}

// Появление при прокрутке: дети с variants={revealItem} выезжают каскадом
export function Reveal({ children, className, stagger = 0.09 }: { children: ReactNode; className?: string; stagger?: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : 'hidden'}
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </motion.div>
  )
}
