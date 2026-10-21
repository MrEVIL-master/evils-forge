import bcrypt from 'bcryptjs'
import { sql } from '../_lib/db.js'
import { body, route, send, HttpError } from '../_lib/http.js'
import { normalizeEmail, publicUser, setSession } from '../_lib/auth.js'

const MAX_FAILS = 8          // неудачных попыток
const WINDOW = '15 minutes'  // за это время — потом пауза

export default route(['POST'], async (req, res) => {
  const b = body(req)
  const email = normalizeEmail(b.email)
  const password = String(b.password || '')

  // защита от перебора пароля
  const [{ fails }] = await sql`
    select count(*)::int as fails from login_attempts
    where email = ${email} and at > now() - ${WINDOW}::interval`
  if (fails >= MAX_FAILS) throw new HttpError(429, 'too_many_attempts')

  const rows = await sql`select id, email, name, password_hash from users where email = ${email}`
  const user = rows[0]
  const ok = user ? await bcrypt.compare(password, user.password_hash) : false
  if (!ok) {
    await sql`insert into login_attempts (email) values (${email})`
    throw new HttpError(401, 'invalid_credentials')
  }

  await sql`delete from login_attempts where email = ${email}`
  await setSession(res, user.id)
  send(res, 200, { user: publicUser(user) })
})
