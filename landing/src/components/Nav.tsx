import { useEffect, useState } from 'react'
import { Menu, X, ArrowUpRight } from 'lucide-react'
import { TRACKER_URL, asset } from '@/lib/site'

const LINKS = [
  { href: '#story', label: 'История' },
  { href: '#ai', label: 'AI-план' },
  { href: '#characters', label: 'Персонажи' },
  { href: '#faq', label: 'Вопросы' },
]

export function Nav() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open])

  return (
    <header className="hud">
      <div className="wrap">
        <a className="brand" href="#top" aria-label="Evil's Forge — наверх">
          <img src={asset('logo-sm.webp')} alt="" width={28} height={36} />
          <span>Evil's Forge</span>
        </a>
        <nav className="nav" aria-label="Разделы">
          {LINKS.map(l => <a key={l.href} href={l.href}>{l.label}</a>)}
        </nav>
        <a className="btn btn-primary btn-sm btn-open" href={TRACKER_URL}>Открыть трекер <ArrowUpRight aria-hidden /></a>
        <button type="button" className="menu-btn" aria-label={open ? 'Закрыть меню' : 'Меню'} aria-expanded={open} aria-controls="mnav" onClick={() => setOpen(o => !o)}>
          {open ? <X aria-hidden /> : <Menu aria-hidden />}
        </button>
      </div>
      {open && (
        <nav className="mnav" id="mnav" aria-label="Разделы">
          {LINKS.map(l => <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>)}
          <a className="btn btn-primary" href={TRACKER_URL}>Открыть трекер <ArrowUpRight aria-hidden /></a>
        </nav>
      )}
    </header>
  )
}
