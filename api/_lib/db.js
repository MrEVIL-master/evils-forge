// Подключение к Neon (Postgres) через serverless-драйвер — работает по HTTPS из Vercel Functions
import { neon } from '@neondatabase/serverless'

let client = null

export function sql(strings, ...values) {
  if (!client) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
    client = neon(process.env.DATABASE_URL)
  }
  return client(strings, ...values)
}
