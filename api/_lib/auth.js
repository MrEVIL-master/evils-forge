// Сессии: подписанный JWT в httpOnly-cookie (JavaScript страницы его не видит)
import { SignJWT, jwtVerify } from 'jose'
import { HttpError } from './http.js'
import { sql } from './db.js'

const COOKIE = 'ef_session'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 дней

function secret() {
  const s = process.env.JWT_SECRET
  if (!s || s.length < 32) throw new Error('JWT_SECRET is not set')
  return new TextEncoder().encode(s)
}

export async function setSession(res, userId) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret())
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`)
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`)
}

function readCookie(req) {
  const raw = String(req.headers.cookie || '')
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === COOKIE) return v.join('=')
  }
  return null
}

// пользователь из cookie или null
export async function currentUser(req) {
  const token = readCookie(req)
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] })
    const rows = await sql`select id, email, name from users where id = ${payload.sub}`
    return rows[0] || null
  } catch {
    return null
  }
}

export async function requireUser(req) {
  const user = await currentUser(req)
  if (!user) throw new HttpError(401, 'unauthorized')
  return user
}

export const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name || '' })

export function normalizeEmail(v) {
  const email = String(v || '').trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'invalid_email')
  return email
}

export function checkPassword(v) {
  const p = String(v || '')
  if (p.length < 6) throw new HttpError(400, 'weak_password')
  if (p.length > 200) throw new HttpError(400, 'password_too_long')
  return p
}
