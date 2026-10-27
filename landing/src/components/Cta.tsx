import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { TRACKER_URL, asset, motionOff, setMotion } from '@/lib/site'

export function Cta({ onMotion }: { onMotion: (on: boolean) => void }) {
  const [on, setOn] = useState(() => !motionOff())
  return (
    <>
      <section className="wrap" style={{ paddingTop: 96 }} aria-labelledby="cta-title">
        <div className="cta shape">
          <div>
            <h2 id="cta-title">Возьми первый контракт</h2>
            <p>Бесплатно. Нужна только почта — или вообще ничего, если без аккаунта.</p>
          </div>
          <a className="btn btn-primary" href={TRACKER_URL}>Открыть трекер <ArrowUpRight aria-hidden /></a>
        </div>
      </section>
      <footer className="foot">
        <div className="wrap">
          <a className="brand" href="#top"><img src={asset('logo-sm.webp')} alt="" width={22} height={28} style={{ width: 22, height: 28, viewTransitionName: 'none' }} /><span>Evil's Forge</span></a>
          <a href={TRACKER_URL}>Трекер</a>
          <span>Арты и логотип — Evil's Forge</span>
          <label className="motion-switch">
            Анимации
            <input type="checkbox" checked={on} onChange={e => { setOn(e.target.checked); setMotion(e.target.checked); onMotion(e.target.checked) }} />
          </label>
        </div>
      </footer>
    </>
  )
}
