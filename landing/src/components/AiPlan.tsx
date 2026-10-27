import { motion } from 'motion/react'
import { Reveal, SectionHead, revealItem } from '@/components/Reveal'

const ROWS = [
  { n: '01', t: 'Заявка на дефиле', why: 'Регистрация закрывается раньше остального', from: 'P2', to: 'P0', pc: 'var(--p0)' },
  { n: '02', t: 'Склеить наплечники', why: 'Без них нельзя грунтовать броню', from: 'P2', to: 'P1', pc: 'var(--p1)' },
  { n: '03', t: 'Купить акрил', why: 'Покраска встанет, пока краски нет', from: 'P3', to: 'P1', pc: 'var(--p1)' },
]

export function AiPlan() {
  return (
    <section className="section" id="ai" aria-labelledby="ai-title">
      <div className="wrap">
        <SectionHead num="03" label="AI-план" lead="Gemini на твоём ключе сам расставляет порядок и приоритеты по SPEC — после входа и после каждого изменения. Без кнопок.">
          <span id="ai-title">Расставит приоритеты за тебя</span>
        </SectionHead>
        <Reveal className="ai-grid">
          <motion.ul variants={revealItem} className="ai-points">
            <li><span>01</span><span><b>Сам, без кнопок</b>Добавила контракт, сдвинула срок, отметила этап — порядок и приоритеты пересчитаются сами.</span></li>
            <li><span>02</span><span><b>SPEC на каждое досье</b>Цель, «готово, когда», сроки, материалы, бюджет и каких контрактов не хватает.</span></li>
            <li><span>03</span><span><b>Твой приоритет главнее</b>Поставила приоритет руками — AI его не трогает, пока не вернёшь.</span></li>
            <li><span>04</span><span><b>Твой ключ Gemini</b>Вводится при входе в аккаунт. Хранится на сервере в зашифрованном виде, в интерфейсе видны только последние символы.</span></li>
          </motion.ul>
          <motion.div variants={revealItem} className="ai-demo">
            <span className="sample">Пример</span>
            {ROWS.map(r => (
              <div className="ai-row" key={r.n} style={{ ['--pc' as string]: r.pc }}>
                <span className="n">{r.n}</span>
                <span className="t">{r.t}</span>
                <span className="pchg"><i>{r.from}</i>→<i className={r.to === 'P0' ? 'p0' : 'p1'}>{r.to}</i></span>
                <span className="why">{r.why}</span>
              </div>
            ))}
            <pre className="spec" aria-label="Фрагмент SPEC.md"><span className="h"># SPEC · Призрачный самурай</span>{'\n'}<span className="k">## Цель</span>{'\n'}Сдать броню к фестивалю и не сорвать заявку.{'\n'}<span className="k">## Порядок</span>{'\n'}- [ ] P0 Заявка на дефиле{'\n'}- [ ] P1 Склеить наплечники{'\n'}- [ ] P1 Купить акрил</pre>
          </motion.div>
        </Reveal>
      </div>
    </section>
  )
}
