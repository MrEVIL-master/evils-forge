import { useRef } from 'react'
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react'

const WORDS = ['Крафт брони', 'Шитьё', 'Покраска', 'Парик', 'Грим', 'Реквизит', 'Фотосет', 'Конвент']

const wrap = (min: number, max: number, v: number) => {
  const r = max - min
  return ((((v - min) % r) + r) % r) + min
}

// Бегущая лента: скорость и направление зависят от скорости прокрутки
function Row({ baseVelocity, className }: { baseVelocity: number; className: string }) {
  const reduce = useReducedMotion()
  const base = useMotionValue(0)
  const { scrollY } = useScroll()
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 })
  const factor = useTransform(velocity, [0, 1000], [0, 5], { clamp: false })
  const x = useTransform(base, (v) => `${wrap(-50, 0, v)}%`)
  const dir = useRef(1)

  useAnimationFrame((_, delta) => {
    if (reduce) return
    let move = dir.current * baseVelocity * (delta / 1000)
    if (factor.get() < 0) dir.current = -1
    else if (factor.get() > 0) dir.current = 1
    move += dir.current * move * factor.get()
    base.set(base.get() + move)
  })

  const items = [...WORDS, ...WORDS]
  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`}>
      <motion.div style={{ x }} className="flex w-max">
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0">
            {items.map((w, i) => (
              <span key={`${k}-${i}`} className="flex items-center gap-6 px-6 font-display text-3xl uppercase sm:text-5xl">
                {w}
                <span className="inline-block size-4 rotate-45 border-2 border-ink bg-current" />
              </span>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  )
}

export function Marquee() {
  return (
    <div className="relative z-10 -my-6 py-10" aria-hidden>
      <div className="-rotate-2 border-y-[3px] border-ink bg-magenta py-4 text-white shadow-[0_8px_0_#1d3a8a]">
        <Row baseVelocity={-3} className="" />
      </div>
      <div className="mt-6 rotate-1 border-y-[3px] border-ink bg-cyan py-3 text-ink">
        <Row baseVelocity={2} className="[&_span]:text-2xl sm:[&_span]:text-3xl" />
      </div>
    </div>
  )
}
