import { motion, type Variants } from 'motion/react'
import type { ReactNode } from 'react'
import { motionOff } from '@/lib/site'

const EASE = [0.2, 0.8, 0.2, 1] as const

// блок появляется один раз, когда входит в экран: подъём на 16 px и проявление
export const revealItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
}

export function Reveal({ children, className, stagger = 0.06, as = 'div' }: { children: ReactNode; className?: string; stagger?: number; as?: 'div' | 'ul' | 'section' }) {
  const Tag = motion[as]
  return (
    <Tag
      className={className}
      initial={motionOff() ? false : 'hidden'}
      whileInView="show"
      viewport={{ once: true, amount: 0.15, margin: '0px 0px -10% 0px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </Tag>
  )
}

// заголовок секции «печатается» слева направо, метка над ним — на 100 мс раньше.
// Наблюдение за появлением — на обёртке: у самого заголовка clip-path, и браузер считает его невидимым.
export function SectionHead({ num, label, children, lead }: { num: string; label: string; children: ReactNode; lead?: ReactNode }) {
  const off = motionOff()
  return (
    <motion.div initial={off ? false : 'hidden'} whileInView="show" viewport={{ once: true, amount: 0.4 }}>
      <motion.span className="kicker" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.2 } } }}>
        <b>//&nbsp;{num}</b>{label}
      </motion.span>
      <motion.h2
        className="h2"
        variants={{ hidden: { clipPath: 'inset(0 100% 0 0)' }, show: { clipPath: 'inset(0 0% 0 0)', transition: { duration: 0.45, delay: 0.1, ease: 'linear' } } }}
      >
        {children}
      </motion.h2>
      {lead && <motion.p className="lead" variants={revealItem}>{lead}</motion.p>}
    </motion.div>
  )
}
