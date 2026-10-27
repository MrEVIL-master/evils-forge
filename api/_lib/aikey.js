// Личный ключ Gemini пользователя: хранится в базе зашифрованным (AES-256-GCM).
// Ключ шифрования выводится из JWT_SECRET — в базе лежит только шифротекст.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { sql } from './db.js'
import { HttpError } from './http.js'

let schemaReady = null
// колонка добавляется сама при первом обращении — отдельная миграция не нужна
export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = sql`alter table users add column if not exists gemini_key text`.catch((e) => {
      schemaReady = null
      throw e
    })
  }
  return schemaReady
}

function encKey() {
  const s = process.env.JWT_SECRET
  if (!s || s.length < 32) throw new Error('JWT_SECRET is not set')
  return createHash('sha256').update(`${s}:gemini-key:v1`).digest()
}

export function encrypt(plain) {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', encKey(), iv)
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), ct.toString('base64')].join(':')
}

export function decrypt(stored) {
  const [v, iv, tag, ct] = String(stored || '').split(':')
  if (v !== 'v1' || !iv || !tag || !ct) return null
  try {
    const d = createDecipheriv('aes-256-gcm', encKey(), Buffer.from(iv, 'base64'))
    d.setAuthTag(Buffer.from(tag, 'base64'))
    return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8')
  } catch {
    return null
  }
}

// убираем пробелы, кавычки и случайно вставленное «GEMINI_API_KEY=»
export function cleanKey(v) {
  let k = String(v || '').trim().replace(/^["'`]+|["'`]+$/g, '')
  k = k.replace(/^[A-Z_]*KEY\s*[:=]\s*/i, '').trim().replace(/^["'`]+|["'`]+$/g, '')
  if (!k) return ''
  if (k.length < 20 || k.length > 200 || !/^[A-Za-z0-9_\-.]+$/.test(k)) throw new HttpError(400, 'bad_key_format')
  return k
}

// ключ рабочий? — дешёвый запрос списка моделей
export async function verifyKey(key) {
  let r
  try {
    r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', {
      headers: { 'x-goog-api-key': key }
    })
  } catch {
    return 'unknown' // нет связи с Google — не мешаем сохранить
  }
  if (r.ok) return 'ok'
  if (r.status === 400 || r.status === 401 || r.status === 403) return 'invalid'
  return 'unknown'
}

export async function saveKey(userId, key) {
  await ensureSchema()
  await sql`update users set gemini_key = ${key ? encrypt(key) : null} where id = ${userId}`
}

export async function loadKey(userId) {
  await ensureSchema()
  const rows = await sql`select gemini_key from users where id = ${userId}`
  return rows[0] && rows[0].gemini_key ? decrypt(rows[0].gemini_key) : null
}

export const keyHint = (key) => (key ? `…${key.slice(-4)}` : null)
