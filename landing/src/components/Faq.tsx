import { SectionHead } from '@/components/Reveal'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

const QA = [
  { q: 'Это бесплатно?', a: 'Да. Работает в браузере, для аккаунта нужны только почта и пароль.' },
  { q: 'Можно без регистрации?', a: 'Да. Нажми «Продолжить без аккаунта» — данные останутся только в этом браузере.' },
  { q: 'Кто видит мои задачи?', a: 'Только ты: сервер отдаёт данные только владельцу аккаунта.' },
  { q: 'Работает на телефоне?', a: 'Да. На телефоне — свой интерфейс: нижнее меню и крупные кнопки.' },
  { q: 'Зачем ключ Gemini и кто его видит?', a: 'С ним трекер сам расставляет задачи по SPEC. Ключ вводится при входе, хранится в зашифрованном виде, в интерфейсе видны только последние символы. Заменить или удалить — в меню профиля.' },
  { q: 'Подходит не только для косплея?', a: 'Да. Есть пространство «Личное» — для обычных дел без персонажей, материалов и бюджета.' },
]

export function Faq() {
  return (
    <section className="section" id="faq" aria-labelledby="faq-title">
      <div className="wrap">
        <SectionHead num="06" label="Вопросы"><span id="faq-title">Коротко о главном</span></SectionHead>
        <Accordion type="single" collapsible defaultValue="q0">
          {QA.map((x, i) => (
            <AccordionItem key={x.q} value={`q${i}`}>
              <AccordionTrigger>{x.q}</AccordionTrigger>
              <AccordionContent>{x.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
