import { motion } from 'motion/react'
import { Boxes, Coins, Hammer, ListChecks, MoonStar, RefreshCw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Reveal, revealItem } from '@/components/Reveal'
import { SectionTitle } from '@/components/SectionTitle'

type Feature = { icon: LucideIcon; title: string; text: string; color: string; ink?: boolean }

const FEATURES: Feature[] = [
  { icon: Boxes, title: 'Проекты-персонажи', text: 'Каждый костюм — отдельная карточка с артом, фандомом, конвентом и обратным отсчётом до даты.', color: '#e8175d' },
  { icon: ListChecks, title: 'Этапы крафта', text: 'Выкройка → термоформовка → грунт → покраска. Отмечай этапы прямо на карточке и смотри прогресс.', color: '#2ff0e6', ink: true },
  { icon: Coins, title: 'Материалы и бюджет', text: 'EVA, клей, краски, парики: количество, цена, «куплено». Бюджет персонажа считается сам.', color: '#f5e11a', ink: true },
  { icon: Hammer, title: 'Типы работ', text: 'Шитьё, броня, покраска, парик, грим, реквизит, фотосет, конвент — фильтр в один клик.', color: '#2f62d6' },
  { icon: RefreshCw, title: 'Любое устройство', text: 'Аккаунт хранит данные в облаке: правка с телефона сразу появляется на ноутбуке.', color: '#3ff2b0', ink: true },
  { icon: MoonStar, title: 'Две темы', text: 'Ночная кузница и бумажный день: комикс-контур, зерно и жидкое стекло в обеих.', color: '#6a3aa2' },
]

export function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-6xl scroll-mt-24 px-4 py-28">
      <SectionTitle kicker="Возможности" kanji="道具">
        Всё, что нужно мастерской
      </SectionTitle>

      <Reveal className="mt-14 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <motion.div
            key={f.title}
            variants={revealItem}
            whileHover={{ x: -4, y: -4, transition: { type: 'spring', stiffness: 400, damping: 18 } }}
            style={{ ['--sc' as string]: f.color }}
          >
            <Card className="ink-glass grain h-full gap-3 rounded-xl py-6 ring-0 transition-shadow duration-300 hover:shadow-[10px_10px_0_var(--sc)]">
              <CardHeader>
                <span
                  className="mb-3 grid size-12 rotate-45 place-items-center rounded-md border-2 border-ink shadow-[3px_3px_0_#0b0a14]"
                  style={{ background: f.color, color: f.ink ? '#0b0a14' : '#fff' }}
                >
                  <f.icon className="size-5 -rotate-45" strokeWidth={2.4} />
                </span>
                <CardTitle className="font-heading text-xl font-normal">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">{f.text}</CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </Reveal>
    </section>
  )
}
