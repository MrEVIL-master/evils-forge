import { motion } from 'motion/react'
import { asset } from '@/lib/site'
import { ArtFrame, Shot } from '@/components/Frame'
import { Reveal, SectionHead, revealItem } from '@/components/Reveal'
import { Parallax } from '@/components/Parallax'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

// «История одного костюма»: персонаж от идеи до выхода, на каждой остановке — арт и фрагмент трекера.
// Пока нет фото процесса из мастерской — арты и снимки трекера на встроенном примере (с плашкой «Пример»).
const STOPS = [
  {
    num: '01', title: 'Заведи досье',
    text: 'Имя, фандом, конвент, дата и арт обложкой. Срок до события виден прямо в колонке.',
    tags: ['Досье', 'Отсчёт до конвента'],
    art: 'art-banner', shot: { src: 'landing/s1-dossier-640.webp', w: 592, h: 840, alt: 'Колонка «Досье»: персонажи с артами и сроками до конвента' },
  },
  {
    num: '02', title: 'Разбей на контракты',
    text: 'Кираса, парик, грим — у каждого свой срок, приоритет и тип работы. Фильтр по персонажу — один клик.',
    tags: ['Шитьё', 'Броня', 'Покраска', 'Парик', 'Грим', 'Реквизит'],
    art: 'art-spirit', wide: true, shot: { src: 'landing/s2-contracts-1100.webp', set: 's2-contracts', w: 1100, h: 418, alt: 'Контракты одного персонажа со сроками, приоритетами и суммами' },
  },
  {
    num: '03', title: 'Отмечай этапы',
    text: 'Выкройка → термоформовка → грунт → покраска. Отметил этап — прогресс пересчитался.',
    tags: ['Этапы', 'Прогресс'],
    art: 'art-ronin', shot: { src: 'landing/s3-panel-stages-800.webp', w: 768, h: 510, alt: 'Панель контракта: этапы с отметками' },
  },
  {
    num: '04', title: 'Считай материалы и бюджет',
    text: 'EVA, клей, краска, парик: сколько, почём, куплено ли. Бюджет персонажа считается сам.',
    tags: ['Материалы', 'Бюджет'],
    art: 'art-fire', shot: { src: 'landing/s4-panel-mats-800.webp', w: 768, h: 782, alt: 'Панель контракта: материалы, количество, цена и итог' },
  },
] as const

export function Story() {
  return (
    <section className="section" id="story" aria-labelledby="story-title">
      <div className="wrap">
        <div className="story-intro">
          <SectionHead num="02" label="История костюма" lead="Как один персонаж проходит путь от идеи до выхода на сцену — и что в это время делает трекер.">
            <span id="story-title">Один костюм — от идеи до дефиле</span>
          </SectionHead>
          <p className="note">Снимки трекера — на встроенном примере, чтобы показать, как всё выглядит. Цифры на них не настоящие.</p>
        </div>

        <div className="stops">
          {STOPS.map(s => (
            <Reveal key={s.num} className="stop">
              <motion.div variants={revealItem}>
                <span className="stop-num">{s.num}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <div className="stop-tags">{s.tags.map(t => <Badge key={t}>{t}</Badge>)}</div>
              </motion.div>
              <motion.div variants={revealItem} className={'wide' in s ? 'stop-visual wide' : 'stop-visual'}>
                {!('wide' in s) && <Parallax speed={0.14}><ArtFrame name={s.art} alt="" className="art" parallax={6} sizes="(max-width: 899px) 40vw, 260px" /></Parallax>}
                <Parallax speed={'wide' in s ? 0.05 : -0.06}><Shot className="shot" src={asset(s.shot.src)} width={s.shot.w} height={s.shot.h} alt={s.shot.alt}
                  srcSet={'set' in s.shot ? `${asset(`landing/${s.shot.set}-720.webp`)} 720w, ${asset(`landing/${s.shot.set}-1100.webp`)} 1100w` : undefined}
                  sizes={'wide' in s ? '(max-width: 899px) 100vw, 680px' : '(max-width: 899px) 60vw, 420px'} /></Parallax>
              </motion.div>
            </Reveal>
          ))}

          <Reveal className="stop">
            <motion.div variants={revealItem}>
              <span className="stop-num">05</span>
              <h3>Закрой досье</h3>
              <p>Последний контракт закрыт — досье получает штамп. Костюм готов к выходу.</p>
              <div className="stop-tags"><Badge variant="solid">Готово</Badge></div>
            </motion.div>
            <motion.div variants={revealItem} className="stop-visual">
              <Parallax speed={0.14}><ArtFrame name="art-spirit-jump" alt="" className="art" parallax={6} sizes="(max-width: 899px) 40vw, 260px" /></Parallax>
              <Parallax speed={-0.06}><Card className="stamp-card">
                <span className="stamp">Досье закрыто</span>
                <span className="mono-label">Готов к дефиле</span>
              </Card></Parallax>
            </motion.div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
