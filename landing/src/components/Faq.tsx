import { useState } from 'react'
import { SectionHead } from '@/components/Reveal'

const QA = [
  { q: 'Это бесплатно?', a: 'Да. Работает в браузере, для аккаунта нужны только почта и пароль.' },
  { q: 'Можно без регистрации?', a: 'Да. Нажми «Продолжить без аккаунта» — данные останутся только в этом браузере.' },
  { q: 'Кто видит мои задачи?', a: 'Только ты: сервер отдаёт данные только владельцу аккаунта.' },
  { q: 'Работает на телефоне?', a: 'Да. На телефоне — свой интерфейс: нижнее меню и крупные кнопки.' },
  { q: 'Зачем ключ Gemini и кто его видит?', a: 'Он нужен только для AI-плана. Ключ хранится в зашифрованном виде, в интерфейсе видны только последние символы. Удалить его можно в меню.' },
  { q: 'Подходит не только для косплея?', a: 'Да. Есть пространство «Личное» — для обычных дел без персонажей, материалов и бюджета.' },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section className="section" id="faq" aria-labelledby="faq-title">
      <div className="wrap">
        <SectionHead num="06" label="Вопросы"><span id="faq-title">Коротко о главном</span></SectionHead>
        <div className="faq">
          {QA.map((x, i) => (
            <div className="faq-item" key={x.q}>
              <h3 style={{ margin: 0 }}>
                <button type="button" className="faq-q" aria-expanded={open === i} aria-controls={`faq-a-${i}`} id={`faq-q-${i}`} onClick={() => setOpen(open === i ? null : i)}>
                  {x.q}<span className="pm" aria-hidden />
                </button>
              </h3>
              <div className="faq-a" id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} hidden={open !== i}>{x.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
