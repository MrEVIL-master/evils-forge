import bcrypt from 'bcryptjs'
import { sql } from '../_lib/db.js'
import { body, route, send, HttpError } from '../_lib/http.js'
import { checkPassword, normalizeEmail, publicUser, setSession } from '../_lib/auth.js'

export default route(['POST'], async (req, res) => {
  const b = body(req)
  const email = normalizeEmail(b.email)
  const password = checkPassword(b.password)
  const name = String(b.name || '').trim().slice(0, 40)

  const hash = await bcrypt.hash(password, 10)
  const rows = await sql`
    insert into users (email, name, password_hash) values (${email}, ${name}, ${hash})
    on conflict (email) do nothing
    returning id, email, name`
  if (!rows.length) throw new HttpError(409, 'email_taken')

  await setSession(res, rows[0].id)
  send(res, 201, { user: publicUser(rows[0]) })
})
