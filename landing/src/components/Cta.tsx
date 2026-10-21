import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ARTS, TRACKER_URL, art } from '@/lib/site'

export function Cta() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [0.86, 1])
  const rotate = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-3, 0])
  const artY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [140, 0])

  return (
    <section ref={ref} className="relative px-4 pt-16 pb-10">
      <motion.div
        style={{ scale, rotate }}
        className="grain relative mx-auto max-w-5xl overflow-hidden rounded-2xl border-[3px] border-ink bg-gradient-to-br from-navy via-violet to-magenta px-6 py-16 shadow-[10px_10px_0_#2ff0e6] sm:px-14"
      >
        <motion.img
          src={art(ARTS.spirit)}
          alt=""
          style={{ y: artY }}
          className="pointer-events-none absolute -right-10 -bottom-10 hidden h-[120%] mix-blend-multiply md:block"
        />
        <div className="relative max-w-xl">
          <img src={art('logo-sm.webp')} alt="" className="logo-glow mb-6 h-20 w-auto" />
          <h2 className="comic-title text-4xl leading-tight sm:text-6xl [text-shadow:3px_3px_0_var(--color-ink),6px_6px_0_var(--color-navy)]">
            Разожги горн
          </h2>
          <p className="mt-5 text-lg text-white/85">
            Заведи аккаунт и перенеси свой следующий костюм в кузницу. Данные будут с тобой — на ноутбуке, телефоне и конвенте.
          </p>
          <Button asChild className="btn-comic mt-9 bg-paper text-ink [--bs:var(--color-ink)] hover:bg-white">
            <a href={TRACKER_URL}>
              <span className="inline-flex items-center gap-2">
                Открыть трекер <ArrowUpRight className="size-5" />
              </span>
            </a>
          </Button>
        </div>
      </motion.div>

      <footer className="mx-auto mt-20 max-w-6xl">
        <Separator className="bg-white/10" />
        <div className="flex flex-wrap items-center justify-between gap-4 py-8 text-sm font-bold text-muted-foreground">
          <span className="flex items-center gap-3">
            <img src={art('logo-sm.webp')} alt="" className="h-8 w-auto" /> Evil's Forge — кузница косплея
          </span>
          <a href={TRACKER_URL} className="hover:text-cyan">Трекер</a>
        </div>
      </footer>
    </section>
  )
}
