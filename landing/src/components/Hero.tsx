import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowDown } from 'lucide-react'
import { TRACKER_URL, asset, motionOff } from '@/lib/site'
import { Shot } from '@/components/Frame'

// «Вау» №1: при первом открытии за сессию hero «загружается» ~0,7 с — линии сетки, заголовок, снимок трекера.
// Пропускается кликом, клавишей или прокруткой. В трекере такой загрузки нет.
function firstVisit() {
  try {
    const seen = sessionStorage.getItem('evilsforge.booted') === '1'
    sessionStorage.setItem('evilsforge.booted', '1')
    return !seen
  } catch { return false }
}

export function Hero() {
  const [boot] = useState(() => firstVisit() && !motionOff())
  const [skip, setSkip] = useState(false)
  useEffect(() => {
    if (!boot) return
    const s = () => setSkip(true)
    const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    evs.forEach(e => window.addEventListener(e, s, { once: true, passive: true }))
    return () => evs.forEach(e => window.removeEventListener(e, s))
  }, [boot])
  const t = (delay: number, duration: number) => (skip ? { duration: 0 } : { delay, duration, ease: 'linear' as const })

  return (
    <section className="hero" id="top">
      {boot && (
        <div className="boot-lines" aria-hidden>
          {[22, 58].map((top, i) => (
            <motion.span key={'h' + i} className="bh" style={{ top: `${top}%` }}
              initial={{ scaleX: 0, opacity: 1 }} animate={{ scaleX: 1, opacity: 0 }} transition={skip ? { duration: 0 } : { duration: 0.7, times: [0, 1], ease: 'easeOut' }} />
          ))}
          {[42].map((left, i) => (
            <motion.span key={'v' + i} className="bv" style={{ left: `${left}%` }}
              initial={{ scaleY: 0, opacity: 1 }} animate={{ scaleY: 1, opacity: 0 }} transition={skip ? { duration: 0 } : { duration: 0.7, ease: 'easeOut' }} />
          ))}
        </div>
      )}
      <div className="wrap hero-grid">
        <div>
          <span className="hero-badge">Трекер для косплееров и мастерских</span>
          <motion.h1 initial={boot ? { clipPath: 'inset(0 100% 0 0)' } : false} animate={{ clipPath: 'inset(0 0% 0 0)' }} transition={t(0.2, 0.25)}>
            Куй костюмы,<br />а <span className="y">не хаос</span>
          </motion.h1>
          <p className="lead">Этапы, материалы, бюджет и отсчёт до конвента — по каждому костюму. С ноутбука в мастерской, с телефона в зале.</p>
          <div className="hero-cta">
            <a className="btn btn-primary" href={TRACKER_URL}>Начать бесплатно</a>
            <a className="btn btn-ghost" href="#story">Что внутри <ArrowDown aria-hidden /></a>
          </div>
          <div className="hero-facts">
            <span>Бесплатно</span><span>В браузере, без установки</span><span>Можно без аккаунта</span>
          </div>
        </div>
        <motion.div initial={boot ? { clipPath: 'inset(0 0 100% 0)' } : false} animate={{ clipPath: 'inset(-16px 0 0% 0)' }} transition={t(0.45, 0.25)}>
          <Shot
            className="hero-shot"
            src={asset('landing/hero-960.webp')}
            srcSet={`${asset('landing/hero-960.webp')} 960w, ${asset('landing/hero-1440.webp')} 1440w`}
            sizes="(max-width: 999px) 100vw, 680px"
            width={1440} height={900} priority
            alt="Трекер Evil's Forge: колонка «Досье» с персонажами, список контрактов со сроками и панель открытого контракта"
          />
        </motion.div>
      </div>
    </section>
  )
}
