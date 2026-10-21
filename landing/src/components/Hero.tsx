import { useRef } from 'react'
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { ArrowDown, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ARTS, TRACKER_URL, art } from '@/lib/site'

const EASE = [0.22, 1, 0.36, 1] as const

// слой, который едет при прокрутке на `distance` px и ещё чуть-чуть за курсором
function useLayer(progress: MotionValue<number>, distance: number, mx: MotionValue<number>, my: MotionValue<number>, depth: number) {
  const reduce = useReducedMotion()
  const scrollY = useTransform(progress, [0, 1], [0, reduce ? 0 : distance])
  const x = useTransform(mx, (v) => (reduce ? 0 : v * depth))
  const yMouse = useTransform(my, (v) => (reduce ? 0 : v * depth))
  const y = useTransform([scrollY, yMouse], ([a, b]) => (a as number) + (b as number))
  return { x, y }
}

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })

  const mxRaw = useMotionValue(0)
  const myRaw = useMotionValue(0)
  const mx = useSpring(mxRaw, { stiffness: 60, damping: 18 })
  const my = useSpring(myRaw, { stiffness: 60, damping: 18 })

  const panels = useLayer(scrollYProgress, 160, mx, my, -10)
  const kanji = useLayer(scrollYProgress, 380, mx, my, 24)
  const left = useLayer(scrollYProgress, -220, mx, my, -34)
  const right = useLayer(scrollYProgress, 300, mx, my, 40)
  const small = useLayer(scrollYProgress, -420, mx, my, 56)
  const center = useLayer(scrollYProgress, 140, mx, my, 12)

  const kanjiRotate = useTransform(scrollYProgress, [0, 1], [-8, 6])
  const logoScale = useTransform(scrollYProgress, [0, 1], [1, 0.82])
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, 0])

  return (
    <section
      id="top"
      ref={ref}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        mxRaw.set((e.clientX - r.left) / r.width - 0.5)
        myRaw.set((e.clientY - r.top) / r.height - 0.5)
      }}
      className="relative flex min-h-[110svh] items-center justify-center overflow-hidden px-4 pt-28 pb-24"
    >
      {/* фон: наклонённые цветные панели, как за персонажами на артах */}
      <motion.div style={panels} className="pointer-events-none absolute inset-0">
        <div className="grain absolute -top-[12%] right-[6%] h-[85%] w-[34%] rotate-[5deg] bg-gradient-to-b from-navy via-violet to-magenta opacity-70" />
        <div className="grain absolute -bottom-[14%] -left-[8%] h-[50%] w-[46%] -rotate-[4deg] bg-gradient-to-br from-violet via-magenta to-magenta-hot opacity-60" />
        <div className="absolute top-[10%] left-[30%] h-[48%] w-[30%] bg-gradient-to-b from-[#16807f] via-navy to-violet opacity-30 [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
        <div className="halftone absolute -left-10 top-1/4 size-[34rem] [mask-image:radial-gradient(circle,black,transparent_65%)]" />
      </motion.div>

      <motion.span
        style={{ ...kanji, rotate: kanjiRotate }}
        className="outline-kanji pointer-events-none absolute -bottom-[8%] right-[2%] text-[58vh]"
        aria-hidden
      >
        鍛
      </motion.span>

      {/* бирюзовые дымки духа */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {[
          'M-40 240 C 120 120, 220 340, 380 240 S 600 80, 720 210 S 900 360, 1000 270',
          'M1480 190 C 1320 270, 1250 80, 1110 170 S 950 330, 850 250',
          'M-60 660 C 160 540, 260 780, 480 650 S 760 430, 920 570 S 1180 780, 1500 540',
        ].map((d, i) => (
          <motion.path
            key={i}
            d={d}
            fill="none"
            stroke="#2ff0e6"
            strokeWidth={i === 2 ? 2 : 3}
            strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 6px #2ff0e6)' }}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.75 }}
            transition={{ duration: 2.6, delay: 0.4 + i * 0.35, ease: EASE }}
          />
        ))}
      </svg>

      {/* арты-принты по краям, каждый со своей скоростью */}
      <motion.div style={left} className="pointer-events-none absolute top-[18%] left-[3%] hidden w-[17vw] min-w-44 lg:block">
        <motion.div
          initial={{ opacity: 0, x: -80, rotate: -14 }}
          animate={{ opacity: 1, x: 0, rotate: -6 }}
          transition={{ duration: 1.1, delay: 0.5, ease: EASE }}
          className="print aspect-[4/5] [--sc:var(--color-magenta)]"
        >
          <img src={art(ARTS.banner)} alt="" />
        </motion.div>
      </motion.div>
      <motion.div style={right} className="pointer-events-none absolute top-[12%] right-[4%] hidden w-[16vw] min-w-40 lg:block">
        <motion.div
          initial={{ opacity: 0, x: 80, rotate: 14 }}
          animate={{ opacity: 1, x: 0, rotate: 5 }}
          transition={{ duration: 1.1, delay: 0.65, ease: EASE }}
          className="print aspect-[4/5] [--sc:var(--color-cyan)]"
        >
          <img src={art(ARTS.geisha)} alt="" />
        </motion.div>
      </motion.div>
      <motion.div style={small} className="pointer-events-none absolute right-[5%] bottom-[6%] hidden w-[9vw] min-w-28 xl:block">
        <motion.div
          initial={{ opacity: 0, y: 60, rotate: 10 }}
          animate={{ opacity: 1, y: 0, rotate: -4 }}
          transition={{ duration: 1.1, delay: 0.8, ease: EASE }}
          className="print aspect-[3/4] [--sc:var(--color-sun)]"
        >
          <img src={art(ARTS.spiritJump)} alt="" />
        </motion.div>
      </motion.div>

      {/* центр: логотип и заголовок */}
      <motion.div style={{ ...center, opacity: fade }} className="relative z-10 flex max-w-3xl flex-col items-center text-center">
        <motion.div style={{ scale: logoScale }} className="relative">
          <div className="absolute inset-[-25%] -z-10 animate-pulse rounded-full bg-[radial-gradient(closest-side,rgba(255,47,125,.55),rgba(106,58,162,.35)_55%,transparent)] blur-xl" />
          <motion.img
            src={art('logo.webp')}
            alt="Evil's Forge"
            className="logo-glow w-44 sm:w-56"
            initial={{ opacity: 0, scale: 0.6, rotate: -8, filter: 'blur(12px)' }}
            animate={{ opacity: 1, scale: 1, rotate: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.1, ease: EASE }}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7, ease: EASE }}>
          <Badge className="mt-6 -skew-x-6 border-2 border-ink bg-cyan px-3 py-1 font-heading text-xs tracking-wider text-ink uppercase shadow-[3px_3px_0_#0b0a14]">
            <Sparkles /> трекер косплей-мастерской
          </Badge>
        </motion.div>

        <motion.h1
          className="comic-title mt-6 text-5xl leading-[1.05] sm:text-7xl"
          initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.45, duration: 0.9, ease: EASE }}
        >
          Куй костюмы,
          <br />а не хаос
        </motion.h1>

        <motion.p
          className="mt-8 max-w-xl text-lg text-muted-foreground sm:text-xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.8, ease: EASE }}
        >
          Персонажи, этапы крафта, материалы и бюджет — в одной кузнице. Открывай с ноутбука в мастерской и с телефона на конвенте.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-wrap items-center justify-center gap-5"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.8, ease: EASE }}
        >
          <Button asChild className="btn-comic bg-magenta text-white [--bs:var(--color-navy)] hover:bg-magenta">
            <a href={TRACKER_URL}>
              <span>Начать бесплатно</span>
            </a>
          </Button>
          <Button asChild variant="outline" className="btn-comic bg-night/60 text-foreground hover:bg-night">
            <a href="#features">
              <span className="inline-flex items-center gap-2">
                Что внутри <ArrowDown className="size-4" />
              </span>
            </a>
          </Button>
        </motion.div>
      </motion.div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-night" />
    </section>
  )
}
