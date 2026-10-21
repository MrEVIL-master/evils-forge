import { motion, useMotionValueEvent, useScroll, useSpring } from 'motion/react'
import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TRACKER_URL, art } from '@/lib/site'

const LINKS = [
  { href: '#features', label: 'Возможности' },
  { href: '#showcase', label: 'Персонажи' },
  { href: '#how', label: 'Как работает' },
  { href: '#faq', label: 'Вопросы' },
]

export function Nav() {
  const { scrollY, scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 })
  const [hidden, setHidden] = useState(false)
  const [solid, setSolid] = useState(false)

  // прячем шапку при прокрутке вниз, показываем при прокрутке вверх
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setHidden(y > prev && y > 240)
    setSolid(y > 40)
  })

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6"
      animate={{ y: hidden ? -110 : 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center gap-4 rounded-xl px-3 py-2 transition-[background,box-shadow] duration-500 sm:px-4 ${
          solid ? 'ink-glass [--sc:var(--color-magenta)]' : 'border-2 border-transparent'
        }`}
      >
        <a href="#top" className="flex items-center gap-3">
          <img src={art('logo-sm.webp')} alt="" className="logo-glow h-11 w-auto" />
          <span className="comic-title hidden text-lg [-webkit-text-stroke:1.2px_var(--color-ink)] [text-shadow:2px_2px_0_var(--color-ink),4px_4px_0_var(--color-magenta)] sm:inline">
            EVIL'S FORGE
          </span>
        </a>
        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <Button asChild className="btn-comic ml-auto h-10 bg-magenta px-4 text-sm text-white hover:bg-magenta md:ml-2">
          <a href={TRACKER_URL}>
            <span className="inline-flex items-center gap-1.5">
              Открыть трекер <ArrowUpRight className="size-4" />
            </span>
          </a>
        </Button>
      </div>
      <motion.div
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 h-1 origin-left bg-gradient-to-r from-magenta via-violet to-cyan"
      />
    </motion.header>
  )
}
