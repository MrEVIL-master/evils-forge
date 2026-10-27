// AI-приоритезация задач через Google Gemini.
// Ключ хранится только на сервере: переменная окружения GEMINI_API_KEY в Vercel.
// Доступно только вошедшим пользователям, чтобы чужие не тратили квоту ключа.
import { body, route, send, HttpError } from './_lib/http.js'
import { requireUser } from './_lib/auth.js'

const MODELS = [process.env.GEMINI_MODEL, 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash'].filter(Boolean)
const MAX_TASKS = 120
const PRIORITIES = ['critical', 'high', 'medium', 'low']

const clip = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '')
const int = (v, max) => (Number.isFinite(+v) && +v >= 0 ? Math.min(Math.round(+v), max) : 0)
const day = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 16) : null)

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    focus: { type: 'STRING' },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          priority: { type: 'STRING', enum: PRIORITIES },
          reason: { type: 'STRING' }
        },
        required: ['id', 'priority', 'reason']
      }
    }
  },
  required: ['focus', 'items']
}

function prompt(tasks, context, now) {
  return `Ты — планировщик косплей-мастерской Evil's Forge. Составь список дел (ToDo) на ближайшее время: упорядочи открытые задачи и поставь каждой приоритет.

Сейчас: ${now}.
Пожелания владельца: ${context || 'нет'}.

Как решать:
- critical — горит, делать сегодня; high — на этой неделе; medium — в плановом порядке; low — можно отложить.
- Просроченные задачи и задачи с близким конвентом/съёмкой проекта (convention_date) — выше.
- Учитывай логику крафта: выкройка и закупка материалов → шитьё/крафт брони → грунт и покраска → парик, грим, реквизит → фотосет/конвент. Задача, от которой зависят другие, идёт раньше.
- Незакупленные материалы (materials_to_buy > 0) тормозят крафт — закупку поднимай.
- Задачи «В работе» (status: progress) лучше доводить, а не бросать.
- Мастерская (space: workshop, заказы и проекты) обычно важнее личного, если пожелания не говорят иначе.
- current_priority — то, что стоит сейчас; меняй его, только если есть причина.
- Верни ВСЕ задачи, от самой важной к наименее важной. id копируй в точности.
- reason — одна короткая фраза по-русски (до 110 символов): почему здесь и что сделать.
- focus — 1–2 предложения по-русски: на чём сосредоточиться сегодня.

Задачи (JSON):
${JSON.stringify(tasks)}`
}

async function ask(model, key, text) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: SCHEMA }
    })
  })
  const data = await r.json().catch(() => ({}))
  return { ok: r.ok, status: r.status, data }
}

export default route(['POST'], async (req, res) => {
  await requireUser(req)
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new HttpError(503, 'ai_not_configured')

  const b = body(req)
  const raw = Array.isArray(b.tasks) ? b.tasks.slice(0, MAX_TASKS) : []
  const tasks = raw.map(t => ({
    id: clip(String(t.id ?? ''), 40),
    title: clip(t.title, 120),
    description: clip(t.description, 300),
    status: t.status === 'progress' ? 'progress' : 'todo',
    current_priority: PRIORITIES.includes(t.priority) ? t.priority : 'medium',
    deadline: day(t.deadline),
    overdue: !!t.overdue,
    space: t.space === 'workshop' ? 'workshop' : 'personal',
    work_type: clip(t.workType, 30) || null,
    project: clip(t.project, 60) || null,
    convention: clip(t.convention, 60) || null,
    convention_date: day(t.conventionDate),
    steps_done: int(t.stepsDone, 999),
    steps_total: int(t.stepsTotal, 999),
    materials_to_buy: int(t.materialsToBuy, 999)
  })).filter(t => t.id && t.title)
  if (!tasks.length) throw new HttpError(400, 'no_tasks')

  const text = prompt(tasks, clip(b.context, 400), clip(b.now, 40) || new Date().toISOString())

  let last = 'unknown'
  for (const model of MODELS) {
    let out
    try { out = await ask(model, key, text) } catch (e) { last = e.message; continue }
    if (!out.ok) {
      last = out.data?.error?.message || `http_${out.status}`
      if (out.status === 404 || out.status === 400) continue // модель недоступна — следующая
      console.error('gemini', model, last)
      throw new HttpError(out.status === 429 ? 429 : 502, out.status === 429 ? 'ai_rate_limited' : 'ai_failed')
    }
    let parsed
    try {
      parsed = JSON.parse((out.data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join(''))
    } catch { last = 'bad_json'; continue }

    const known = new Map(tasks.map(t => [t.id, t]))
    const seen = new Set()
    const items = []
    for (const it of parsed.items || []) {
      const id = String(it.id)
      if (!known.has(id) || seen.has(id)) continue
      seen.add(id)
      items.push({ id, priority: PRIORITIES.includes(it.priority) ? it.priority : known.get(id).current_priority, reason: clip(it.reason, 200) })
    }
    for (const t of tasks) if (!seen.has(t.id)) items.push({ id: t.id, priority: t.current_priority, reason: '' })

    return send(res, 200, { model, focus: clip(parsed.focus, 400), items })
  }
  console.error('gemini all models failed', last)
  throw new HttpError(502, 'ai_failed')
})
