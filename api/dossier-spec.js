// SPEC досье: Gemini (личным ключом пользователя) разбирает одного персонажа —
// цель, критерии «готово», порядок контрактов, чего не хватает, риски.
// Ключ берётся из базы (api/_lib/aikey.js), общего ключа сайта нет.
// Цифры (бюджет, сроки, этапы) трекер считает сам — AI их не придумывает.
import { body, route, send, HttpError } from './_lib/http.js'
import { requireUser } from './_lib/auth.js'
import { loadKey } from './_lib/aikey.js'

const MODELS = [process.env.GEMINI_MODEL, 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash'].filter(Boolean)
const MAX_TASKS = 80
const PRIORITIES = ['critical', 'high', 'medium', 'low']
const WORK = ['sewing', 'armor', 'paint', 'wig', 'makeup', 'props', 'photo', 'con', 'other']

const clip = (v, n) => (typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, n) : '')
const int = (v, max) => (Number.isFinite(+v) && +v >= 0 ? Math.min(Math.round(+v), max) : 0)
const day = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 16) : null)
const strs = (a, n, len) => (Array.isArray(a) ? a : []).map((s) => clip(s, len)).filter(Boolean).slice(0, n)

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    goal: { type: 'STRING' },
    focus: { type: 'STRING' },
    done_criteria: { type: 'ARRAY', items: { type: 'STRING' } },
    order: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          priority: { type: 'STRING', enum: PRIORITIES },
          reason: { type: 'STRING' },
          done_when: { type: 'STRING' }
        },
        required: ['id', 'priority', 'reason', 'done_when']
      }
    },
    missing: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          work_type: { type: 'STRING', enum: WORK },
          why: { type: 'STRING' }
        },
        required: ['title', 'why']
      }
    },
    risks: { type: 'ARRAY', items: { type: 'STRING' } }
  },
  required: ['goal', 'focus', 'done_criteria', 'order', 'missing', 'risks']
}

function prompt(project, tasks, context, now) {
  return `Ты — технолог косплей-мастерской Evil's Forge. Составь SPEC (спецификацию) одного костюма-персонажа: что значит «готово», в каком порядке делать открытые контракты, каких контрактов не хватает и что может сорвать срок.

Сейчас: ${now}.
Персонаж: ${JSON.stringify(project)}.
Пожелания владельца: ${context || 'нет'}.

Приоритеты: critical (P0) — горит, сегодня; high (P1) — на этой неделе; medium (P2) — в плановом порядке; low (P3) — можно отложить.

Как решать:
- Срок события персонажа (event_date) — главный ориентир. Просроченное и близкое к сроку — выше.
- Логика крафта: выкройка и закупка материалов → шитьё/броня → грунт и покраска → парик, грим, реквизит → примерка → фотосет/конвент. От чего зависят другие — раньше.
- Некупленные материалы (to_buy) тормозят работу — закупку поднимай.
- Контракты «в работе» лучше доводить.
- order — только открытые контракты (status не done), все, от самого важного. id копируй в точности.
- missing — 0–5 контрактов, которых явно не хватает для готового костюма (например, нет примерки, нет парика при наличии персонажа с волосами в описании, нет заявки на конвент). Не повторяй существующие. Если всё есть — пустой список.
- Не придумывай цифры, цены и даты — их считает трекер.

Поля (всё по-русски, коротко):
- goal — цель одним предложением (что и к какому событию).
- focus — 1–2 предложения: что делать прямо сейчас.
- done_criteria — 3–6 проверяемых критериев «костюм готов».
- reason — почему контракт на этом месте (до 110 символов).
- done_when — проверяемый критерий готовности контракта (до 110 символов).
- why — зачем нужен недостающий контракт (до 110 символов).
- risks — 0–4 риска, по одной фразе.

Контракты (JSON):
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
  const user = await requireUser(req)
  const key = await loadKey(user.id)
  if (!key) throw new HttpError(400, 'no_user_key')

  const b = body(req)
  const p = b.project && typeof b.project === 'object' ? b.project : {}
  const project = {
    name: clip(p.name, 80) || 'Персонаж',
    fandom: clip(p.fandom, 80) || null,
    event: clip(p.convention, 80) || null,
    event_date: day(p.conventionDate)
  }
  const raw = Array.isArray(b.tasks) ? b.tasks.slice(0, MAX_TASKS) : []
  const tasks = raw.map((t) => ({
    id: clip(String(t.id ?? ''), 40),
    title: clip(t.title, 120),
    description: clip(t.description, 300),
    status: ['todo', 'progress', 'done'].includes(t.status) ? t.status : 'todo',
    current_priority: PRIORITIES.includes(t.priority) ? t.priority : 'medium',
    deadline: day(t.deadline),
    overdue: !!t.overdue,
    work_type: clip(t.workType, 30) || null,
    steps: strs(t.steps, 20, 80),
    steps_done: int(t.stepsDone, 999),
    to_buy: strs(t.toBuy, 15, 60)
  })).filter((t) => t.id && t.title)
  if (!tasks.length) throw new HttpError(400, 'no_tasks')

  const context = clip(b.context, 400)
  const now = clip(b.now, 40) || new Date().toISOString().slice(0, 16)
  const text = prompt(project, tasks, context, now)

  let last = 'unknown'
  for (const model of MODELS) {
    let out
    try { out = await ask(model, key, text) } catch (e) { last = e.message; continue }
    if (!out.ok) {
      last = out.data?.error?.message || `http_${out.status}`
      if (out.status === 404) continue
      if (out.status === 400 && /model/i.test(last) && !/api key/i.test(last)) continue
      console.error('gemini', model, out.status, last)
      if (out.status === 429) throw new HttpError(429, 'ai_rate_limited')
      if (out.status === 400 || out.status === 401 || out.status === 403) throw new HttpError(400, 'invalid_key')
      throw new HttpError(502, 'ai_failed')
    }
    let parsed
    try {
      parsed = JSON.parse((out.data?.candidates?.[0]?.content?.parts || []).map((x) => x.text || '').join(''))
    } catch { last = 'bad_json'; continue }

    const open = new Map(tasks.filter((t) => t.status !== 'done').map((t) => [t.id, t]))
    const seen = new Set()
    const order = []
    for (const it of Array.isArray(parsed.order) ? parsed.order : []) {
      const id = String(it.id)
      if (!open.has(id) || seen.has(id)) continue
      seen.add(id)
      order.push({
        id,
        priority: PRIORITIES.includes(it.priority) ? it.priority : open.get(id).current_priority,
        reason: clip(it.reason, 200),
        doneWhen: clip(it.done_when, 200)
      })
    }
    for (const t of open.values()) if (!seen.has(t.id)) order.push({ id: t.id, priority: t.current_priority, reason: '', doneWhen: '' })

    const titles = new Set(tasks.map((t) => t.title.toLowerCase()))
    const missing = (Array.isArray(parsed.missing) ? parsed.missing : [])
      .map((m) => ({ title: clip(m.title, 120), workType: WORK.includes(m.work_type) ? m.work_type : null, why: clip(m.why, 200) }))
      .filter((m) => m.title && !titles.has(m.title.toLowerCase()))
      .slice(0, 5)

    return send(res, 200, {
      model,
      goal: clip(parsed.goal, 300),
      focus: clip(parsed.focus, 400),
      doneCriteria: strs(parsed.done_criteria, 6, 200),
      order,
      missing,
      risks: strs(parsed.risks, 4, 200)
    })
  }
  console.error('gemini all models failed', last)
  throw new HttpError(502, 'ai_failed')
})
