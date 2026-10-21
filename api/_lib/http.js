// Общие помощники для API: ответы, разбор тела, обработка ошибок

export function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message || code)
    this.status = status
    this.code = code
  }
}

export function body(req) {
  // принимаем только JSON: это заодно защищает от подделки запросов с чужих сайтов
  const type = String(req.headers['content-type'] || '')
  if (!type.includes('application/json')) throw new HttpError(415, 'json_required')
  const b = req.body
  if (b && typeof b === 'object') return b
  try {
    return JSON.parse(b || '{}')
  } catch {
    throw new HttpError(400, 'bad_json')
  }
}

// обёртка: разрешённые методы + единый формат ошибок
export function route(methods, handler) {
  return async (req, res) => {
    try {
      if (!methods.includes(req.method)) {
        res.setHeader('Allow', methods.join(', '))
        throw new HttpError(405, 'method_not_allowed')
      }
      await handler(req, res)
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.code })
      console.error(err)
      send(res, 500, { error: 'server_error' })
    }
  }
}
