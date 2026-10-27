// Личный ключ Gemini: узнать, есть ли он (без самого ключа), сохранить/заменить, удалить
import { body, route, send, HttpError } from './_lib/http.js'
import { requireUser } from './_lib/auth.js'
import { cleanKey, keyHint, loadKey, saveKey, verifyKey } from './_lib/aikey.js'

export default route(['GET', 'PUT', 'DELETE'], async (req, res) => {
  const user = await requireUser(req)

  if (req.method === 'GET') {
    const key = await loadKey(user.id)
    return send(res, 200, { hasKey: !!key, hint: keyHint(key) })
  }

  if (req.method === 'DELETE') {
    await saveKey(user.id, null)
    return send(res, 200, { hasKey: false, hint: null })
  }

  const key = cleanKey(body(req).key)
  if (!key) throw new HttpError(400, 'bad_key_format')
  if ((await verifyKey(key)) === 'invalid') throw new HttpError(400, 'invalid_key')
  await saveKey(user.id, key)
  send(res, 200, { hasKey: true, hint: keyHint(key) })
})
