// AI-план: приоритезация задач через Google Gemini личным ключом пользователя.
// Ключ пользователя хранится зашифрованным в базе (api/_lib/aikey.js) и в браузер не возвращается.
// Ответ: порядок задач + SPEC-документ в Markdown.
import { body, route, send, HttpError } from './_lib/http.js'
import { requireUser } from './_lib/auth.js'
import { loadKey } from './_lib/aikey.js'

const MODELS = [process.env.GEMINI_MODEL, 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash'].filter(Boolean)
const MAX_TASKS = 120
const PRIORITIES = ['critical', 'high', 'medium', 'low']
const P_LABEL = { critical: 'P0', high: 'P1', medium: 'P2', low: 'P3' }
const P_TITLE = {
  critical: 'P0 — Критично, сегодня',
  high: 'P1 — Важно, на этой неделе',
  medium: 'P2 — В плановом порядке',
  low: 'P3 — Можно отложить'
}

const clip = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '')
const int = (v, max) => (Number.isFinite(+v) && +v >= 0 ? Math.min(Math.round(+v), max) : 0)
const day = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 16) : null)
// безопасный текст для Markdown: без переводов строк и вертикальных черт таблиц
const md = (s) => String(s || '').replace(/[\r\n]+/g, ' ').replace(/\|/g, '/').trim()
const when = (d) => (d ? d.replace('T', ' ') : '—')

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    goal: { type: 'STRING' },
    focus: { type: 'STRING' },
    risks: { type: 'ARRAY', items: { type: 'STRING' } },
    items: {
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
    }
  },
  required: ['goal', 'focus', 'risks', 'items']
}

function prompt(tasks, context, now) {
  return `Ты — планировщик косплей-мастерской Evil's Forge. Составь SPEC — спецификацию плана работ: упорядочи открытые задачи, поставь каждой приоритет и критерий готовности.

Сейчас: ${now}.
Пожелания владельца: ${context || 'нет'}.

Приоритеты: critical (P0) — горит, сегодня; high (P1) — на этой неделе; medium (P2) — в плановом порядке; low (P3) — можно отложить.

Как решать:
- Просроченные задачи и задачи с близким конвентом/съёмкой проекта (convention_date) — выше.
- Логика крафта: выкройка и закупка материалов → шитьё/крафт брони → грунт и покраска → парик, грим, реквизит → фотосет/конвент. Задача, от которой зависят другие, идёт раньше.
- Незакупленные материалы (materials_to_buy > 0) тормозят крафт — закупку поднимай.
- Задачи «В работе» (status: progress) лучше доводить, а не бросать.
- Мастерская (space: workshop) обычно важнее личного, если пожелания не говорят иначе.
- current_priority — текущий приоритет; меняй, только если есть причина.
- Верни ВСЕ задачи, от самой важной к наименее важной. id копируй в точности.

Поля (всё по-русски, коротко):
- goal — цель плана на ближайший период, одно предложение.
- focus — 1–2 предложения: на чём сосредоточиться сегодня.
- risks — 0–4 риска или блокера (что может сорвать сроки), по одной фразе.
- reason — почему задача на этом месте (до 110 символов).
- done_when — проверяемый критерий готовности задачи (до 110 символов).

Задачи (JSON):
${JSON.stringify(tasks)}`
}

function buildSpec({ tasks, items, goal, focus, risks, context, now, scope, model }) {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const L = []
  L.push("# SPEC · План задач Evil's Forge", '')
  L.push(`> Сформировано: ${when(now)} · Пространство: ${md(scope) || 'всё'} · Задач: ${items.length} · Модель: ${model}`, '')
  L.push('## 1. Цель', '', md(goal) || '—', '')
  L.push('## 2. Фокус на сегодня', '', md(focus) || '—', '')
  L.push('## 3. Контекст', '', context ? `- Пожелания: ${md(context)}` : '- Пожелания: нет', '- Шкала: P0 — сегодня · P1 — неделя · P2 — план · P3 — отложить', '')

  L.push('## 4. Порядок выполнения', '')
  L.push('| # | Задача | Приоритет | Дедлайн | Проект |')
  L.push('|---|---|---|---|---|')
  items.forEach((it, i) => {
    const t = byId.get(it.id)
    L.push(`| ${i + 1} | ${md(t.title)} | ${P_LABEL[it.priority]} | ${when(t.deadline)}${t.overdue ? ' ⚠' : ''} | ${md(t.project) || '—'} |`)
  })
  L.push('')

  L.push('## 5. Задачи по приоритетам', '')
  for (const p of PRIORITIES) {
    const group = items.filter((it) => it.priority === p)
    if (!group.length) continue
    L.push(`### ${P_TITLE[p]}`, '')
    for (const it of group) {
      const t = byId.get(it.id)
      L.push(`- [ ] **${md(t.title)}**`)
      if (it.reason) L.push(`  - Почему: ${md(it.reason)}`)
      if (it.done_when) L.push(`  - Готово, когда: ${md(it.done_when)}`)
      const meta = []
      if (t.deadline) meta.push(`дедлайн ${when(t.deadline)}${t.overdue ? ' (просрочено)' : ''}`)
      if (t.project) meta.push(`проект «${md(t.project)}»`)
      if (t.work_type) meta.push(md(t.work_type))
      if (t.steps_total) meta.push(`этапы ${t.steps_done}/${t.steps_total}`)
      if (t.materials_to_buy) meta.push(`купить материалов: ${t.materials_to_buy}`)
      if (t.status === 'progress') meta.push('в работе')
      if (meta.length) L.push(`  - ${meta.join(' · ')}`)
    }
    L.push('')
  }

  L.push('## 6. Риски и блокеры', '')
  if (risks.length) risks.forEach((r) => L.push(`- ${md(r)}`))
  else L.push('- Не выявлено')
  L.push('')
  return L.join('\n')
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
  const raw = Array.isArray(b.tasks) ? b.tasks.slice(0, MAX_TASKS) : []
  const tasks = raw.map((t) => ({
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
  })).filter((t) => t.id && t.title)
  if (!tasks.length) throw new HttpError(400, 'no_tasks')

  const context = clip(b.context, 400)
  const now = clip(b.now, 40) || new Date().toISOString().slice(0, 16)
  const text = prompt(tasks, context, now)

  let last = 'unknown'
  for (const model of MODELS) {
    let out
    try { out = await ask(model, key, text) } catch (e) { last = e.message; continue }
    if (!out.ok) {
      last = out.data?.error?.message || `http_${out.status}`
      if (out.status === 404) continue // модель недоступна этому ключу — следующая
      if (out.status === 400 && /model/i.test(last) && !/api key/i.test(last)) continue
      console.error('gemini', model, out.status, last)
      if (out.status === 429) throw new HttpError(429, 'ai_rate_limited')
      if (out.status === 400 || out.status === 401 || out.status === 403) throw new HttpError(400, 'invalid_key')
      throw new HttpError(502, 'ai_failed')
    }
    let parsed
    try {
      parsed = JSON.parse((out.data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join(''))
    } catch { last = 'bad_json'; continue }

    const known = new Map(tasks.map((t) => [t.id, t]))
    const seen = new Set()
    const items = []
    for (const it of parsed.items || []) {
      const id = String(it.id)
      if (!known.has(id) || seen.has(id)) continue
      seen.add(id)
      items.push({
        id,
        priority: PRIORITIES.includes(it.priority) ? it.priority : known.get(id).current_priority,
        reason: clip(it.reason, 200),
        doneWhen: clip(it.done_when, 200)
      })
    }
    for (const t of tasks) if (!seen.has(t.id)) items.push({ id: t.id, priority: t.current_priority, reason: '', doneWhen: '' })

    const goal = clip(parsed.goal, 300)
    const focus = clip(parsed.focus, 400)
    const risks = (Array.isArray(parsed.risks) ? parsed.risks : []).map((r) => clip(r, 200)).filter(Boolean).slice(0, 4)
    const spec = buildSpec({
      tasks, goal, focus, risks, context, now, model,
      scope: clip(b.scope, 30),
      items: items.map((it) => ({ ...it, done_when: it.doneWhen }))
    })
    return send(res, 200, { model, goal, focus, risks, items, spec })
  }
  console.error('gemini all models failed', last)
  throw new HttpError(502, 'ai_failed')
})
