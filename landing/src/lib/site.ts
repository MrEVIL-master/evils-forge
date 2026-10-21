// Лендинг лежит в /promo/, трекер и картинки — уровнем выше.
export const TRACKER_URL = '../'
export const art = (file: string) => `../assets/${file}`

export const ARTS = {
  banner: 'art-banner.jpg',
  fire: 'art-fire.jpg',
  geisha: 'art-geisha.jpg',
  spirit: 'art-spirit.jpg',
  spiritJump: 'art-spirit-jump.jpg',
  ronin: 'art-ronin.jpg',
  profile: 'art-profile.jpg',
  flame: 'art-flame.jpg',
  mask: 'art-mask.jpg',
  hello: 'art-hello.jpg',
  squad: 'art-squad.jpg',
} as const
