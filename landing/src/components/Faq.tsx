import { motion } from 'motion/react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { SectionTitle } from '@/components/SectionTitle'

const QA = [
  { q: 'Это бесплатно?', a: 'Да. Трекер работает в браузере, аккаунт создаётся по почте за минуту, платить ничего не нужно.' },
  { q: 'Можно без регистрации?', a: 'Можно: нажми «Без аккаунта» — задачи сохранятся только в этом браузере. Аккаунт нужен, чтобы видеть свои данные на телефоне и ноутбуке.' },
  { q: 'Кто видит мои задачи?', a: 'Только ты. Каждый аккаунт видит лишь свою запись в базе — это закреплено правилами доступа на сервере.' },
  { q: 'Работает на телефоне?', a: 'Да, интерфейс адаптирован под мобильный экран: колонки складываются, кнопки крупные, карточки можно отмечать одним касанием.' },
  { q: 'Подходит не только для косплея?', a: 'Конечно. Есть пространство «Личное» — для обычных дел без персонажей, материалов и бюджета.' },
]

export function Faq() {
  return (
    <section id="faq" className="relative mx-auto max-w-3xl scroll-mt-24 px-4 py-28">
      <SectionTitle kicker="Вопросы" kanji="問">
        Частые вопросы
      </SectionTitle>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="ink-glass mt-12 rounded-xl px-6 py-2 [--sc:var(--color-cyan)]"
      >
        <Accordion type="single" collapsible defaultValue="item-0">
          {QA.map((x, i) => (
            <AccordionItem key={x.q} value={`item-${i}`} className="border-white/10">
              <AccordionTrigger className="py-5 font-heading text-lg font-normal hover:no-underline hover:text-cyan">{x.q}</AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">{x.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </section>
  )
}
