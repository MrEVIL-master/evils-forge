import type { CSSProperties, ReactNode } from 'react'
import { artSet, artUrl } from '@/lib/site'

// Арт в рамке-скане: уголки, скан-линии, сканирование при наведении
export function ArtFrame({ name, alt, className = '', sizes = '300px', priority = false, children }: {
  name: string; alt: string; className?: string; sizes?: string; priority?: boolean; children?: ReactNode
}) {
  return (
    <span className={`frame ${className}`} style={{ '--art': `url('${new URL(artUrl(name, 480), document.baseURI).href}')` } as CSSProperties}>
      <img src={artUrl(name, 480)} srcSet={artSet(name)} sizes={sizes} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" />
      <span className="scan" aria-hidden><i /></span>
      {children}
    </span>
  )
}

// Снимок трекера с плашкой «Пример»: данные на нём — встроенный пример, а не чьи-то настоящие
export function Shot({ src, srcSet, sizes, alt, width, height, className = '', priority = false }: {
  src: string; srcSet?: string; sizes?: string; alt: string; width: number; height: number; className?: string; priority?: boolean
}) {
  return (
    <span className={`frame shot ${className}`}>
      <img src={src} srcSet={srcSet} sizes={sizes} alt={alt} width={width} height={height} loading={priority ? 'eager' : 'lazy'} decoding="async" fetchPriority={priority ? 'high' : 'auto'} />
      <span className="sample">Пример</span>
    </span>
  )
}
