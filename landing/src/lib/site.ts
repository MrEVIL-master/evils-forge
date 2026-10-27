// Лендинг лежит в /promo/, трекер и картинки — уровнем выше.
export const TRACKER_URL = '../'
export const asset = (file: string) => `../assets/${file}`
// сжатые арты: assets/art/<ширина>/<имя>.webp
export const artUrl = (name: string, w: 160 | 480 | 960) => `../assets/art/${w}/${name}.webp`
export const artSet = (name: string) => `${artUrl(name, 480)} 480w, ${artUrl(name, 960)} 960w`

// режим анимаций, общий с трекером (data-motion на <html> ставится до загрузки)
export const motionOff = () => document.documentElement.dataset.motion === 'off'
export function setMotion(on: boolean) {
  document.documentElement.dataset.motion = on ? 'on' : 'off'
  try { localStorage.setItem('evilsforge.motion', on ? 'on' : 'off') } catch { /* ignore */ }
}
