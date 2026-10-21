// Данные трекера пользователя: одна JSON-строка на аккаунт (задачи и проекты)
import { sql } from './_lib/db.js'
import { body, route, send, HttpError } from './_lib/http.js'
import { requireUser } from './_lib/auth.js'

const MAX_BYTES = 2 * 1024 * 1024

export default route(['GET', 'PUT'], async (req, res) => {
  const user = await requireUser(req)

  if (req.method === 'GET') {
    const rows = await sql`select data, updated_at from forge_data where user_id = ${user.id}`
    return send(res, 200, rows[0] ? { data: rows[0].data, updated_at: rows[0].updated_at } : { data: null, updated_at: null })
  }

  const b = body(req)
  const data = b.data
  if (!data || typeof data !== 'object' || !Array.isArray(data.tasks) || !Array.isArray(data.projects)) {
    throw new HttpError(400, 'bad_data')
  }
  const json = JSON.stringify(data)
  if (json.length > MAX_BYTES) throw new HttpError(413, 'too_large')
  const ts = new Date(b.updated_at || Date.now())
  if (Number.isNaN(ts.getTime())) throw new HttpError(400, 'bad_timestamp')

  const rows = await sql`
    insert into forge_data (user_id, data, updated_at) values (${user.id}, ${json}::jsonb, ${ts.toISOString()})
    on conflict (user_id) do update set data = excluded.data, updated_at = excluded.updated_at
    returning updated_at`
  send(res, 200, { updated_at: rows[0].updated_at })
})
