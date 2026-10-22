/* =========================================================
   EVIL'S FORGE — кузница косплея (CRUD)
   задачи · проекты-персонажи · этапы · материалы и бюджет
   аккаунты и синхронизация между устройствами
   =========================================================

   Аккаунты и данные хранятся в Neon (Postgres), доступ к ним —
   через наш API на Vercel (папка api/): регистрация, вход, выход
   и чтение/запись данных. Сессия — защищённая httpOnly-cookie.
   Если сайт открыт без сервера (файлом или на другом хостинге),
   трекер работает локально, без аккаунта.
   ========================================================= */
(function () {
  'use strict';

  const API = 'api';           // относительный путь: работает на любом адресе Vercel
  const POLL_MS = 20000;       // как часто проверять правки с других устройств

  const KEYS = {
    tasks: 'evilsforge.tasks',
    projects: 'evilsforge.projects',
    theme: 'evilsforge.theme',
    space: 'evilsforge.space',
    arts: 'evilsforge.arts',
    mode: 'evilsforge.mode',
    userCache: id => `evilsforge.u.${id}`
  };

  const ARTS = [
    { file: 'art-banner.jpg', title: 'Самурай со знаменем' },
    { file: 'art-fire.jpg', title: 'Огненный самурай' },
    { file: 'art-geisha.jpg', title: 'Гейша-они' },
    { file: 'art-spirit.jpg', title: 'Дух в доспехах' },
    { file: 'art-spirit-jump.jpg', title: 'Дух в прыжке' },
    { file: 'art-ronin.jpg', title: 'Ронин с катаной' },
    { file: 'art-profile.jpg', title: 'Профиль' },
    { file: 'art-flame.jpg', title: 'Голубое пламя' },
    { file: 'art-mask.jpg', title: 'Маска и дым' },
    { file: 'art-hello.jpg', title: 'Hello, my name is' },
    { file: 'art-squad.jpg', title: 'Отряд' }
  ];
  const DEMO_ART = { 'Призрачный самурай': 'art-banner.jpg', 'Гейша-они': 'art-geisha.jpg', 'Дух-хранитель': 'art-spirit-jump.jpg' };
  const RING_LEN = 301.6;   // 2π·48
  const MINI_LEN = 100.53;  // 2π·16
  const EASE = 'cubic-bezier(.22, 1, .36, 1)';
  const DAY = 864e5;
  const INK = '#0b0a14';

  const STATUSES = ['todo', 'progress', 'done'];
  const PRIORITY = {
    low: { label: 'Низкий', weight: 1 },
    medium: { label: 'Средний', weight: 2 },
    high: { label: 'Высокий', weight: 3 },
    critical: { label: 'Критический', weight: 4 }
  };
  const WORK = {
    sewing: { label: 'Шитьё', icon: 'sew', color: '#e8175d' },
    armor: { label: 'Крафт брони', icon: 'armor', color: '#2f62d6' },
    paint: { label: 'Покраска', icon: 'paint', color: '#f5e11a' },
    wig: { label: 'Парик', icon: 'wig', color: '#ff7ab6' },
    makeup: { label: 'Грим', icon: 'makeup', color: '#9b6bff' },
    props: { label: 'Реквизит', icon: 'props', color: '#2ff0e6' },
    photo: { label: 'Фотосет', icon: 'photo', color: '#3ff2b0' },
    con: { label: 'Конвент', icon: 'con', color: '#ff3b4e' },
    other: { label: 'Другое', icon: 'other', color: '#a59cc4' }
  };
  const PROJECT_COLORS = ['#e8175d', '#6a3aa2', '#2f62d6', '#2ff0e6', '#3ff2b0', '#f5e11a', '#ff7ab6', '#ff3b4e'];
  const EMPTY_KANJI = { todo: '待', progress: '鍛', done: '完' };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const el = {
    bg: $('.bg'),
    board: $('#board'),
    search: $('#search'),
    themeToggle: $('#themeToggle'),
    addBtn: $('#addBtn'),
    addProjectBtn: $('#addProjectBtn'),
    spaceSwitch: $('#spaceSwitch'),
    statusFilter: $('#statusFilter'),
    workFilter: $('#workFilter'),
    priorityFilter: $('#priorityFilter'),
    sortSelect: $('#sortSelect'),
    projectChip: $('#projectChip'),
    projectsTrack: $('#projectsTrack'),

    ringBar: $('#ringBar'),
    ringPct: $('#ringPct'),
    ringDone: $('#ringDone'),
    ringTotal: $('#ringTotal'),
    statTotal: $('#statTotal'),
    statProgress: $('#statProgress'),
    statOverdue: $('#statOverdue'),
    overdueCard: $('#overdueCard'),
    statSpent: $('#statSpent'),
    statPlanned: $('#statPlanned'),
    budgetBar: $('#budgetBar'),
    conDays: $('#conDays'),
    conName: $('#conName'),

    taskOverlay: $('#taskOverlay'),
    taskForm: $('#taskForm'),
    modalTitle: $('#modalTitle'),
    submitBtn: $('#submitBtn'),
    tabs: $('#taskForm .tabs'),
    fTitle: $('#fTitle'),
    fDesc: $('#fDesc'),
    fProject: $('#fProject'),
    fWork: $('#fWork'),
    fStatus: $('#fStatus'),
    fDeadline: $('#fDeadline'),
    subsCount: $('#subsCount'),
    matsCount: $('#matsCount'),
    subEditor: $('#subEditor'),
    subNew: $('#subNew'),
    subAdd: $('#subAdd'),
    matEditor: $('#matEditor'),
    matAdd: $('#matAdd'),
    matSpent: $('#matSpent'),
    matTotal: $('#matTotal'),

    projectOverlay: $('#projectOverlay'),
    projectForm: $('#projectForm'),
    projectModalTitle: $('#projectModalTitle'),
    projectSubmit: $('#projectSubmit'),
    projectDelete: $('#projectDelete'),
    pName: $('#pName'),
    pFandom: $('#pFandom'),
    pCon: $('#pCon'),
    pDeadline: $('#pDeadline'),
    pColors: $('#pColors'),
    pArts: $('#pArts'),

    auth: $('#auth'),
    authGallery: $('#authGallery'),
    authForm: $('#authForm'),
    authTabs: $('#authTabs'),
    authTitle: $('#authTitle'),
    authSub: $('#authSub'),
    authMsg: $('#authMsg'),
    authSubmit: $('#authSubmit'),
    authLocalBtn: $('#authLocalBtn'),
    authLocalText: $('#authLocalText'),
    aName: $('#aName'),
    aEmail: $('#aEmail'),
    aPass: $('#aPass'),
    aEye: $('#aEye'),

    userBtn: $('#userBtn'),
    userMenu: $('#userMenu'),
    userAvatar: $('#userAvatar'),
    syncDot: $('#syncDot'),
    umAvatar: $('#umAvatar'),
    umName: $('#umName'),
    umEmail: $('#umEmail'),
    umSyncDot: $('#umSyncDot'),
    umSyncText: $('#umSyncText'),
    umSyncNow: $('#umSyncNow'),
    umLogin: $('#umLogin'),
    umLogout: $('#umLogout'),
    artsToggle: $('#artsToggle'),

    confirmOverlay: $('#confirmOverlay'),
    confirmTitle: $('#confirmTitle'),
    confirmText: $('#confirmText'),
    confirmBtn: $('#confirmBtn'),
    toasts: $('#toasts')
  };

  const state = {
    tasks: [],
    projects: [],
    space: root.dataset.space || 'all',
    filter: { status: 'all', priority: 'all', work: 'all', project: null, query: '', sort: 'deadline' },
    expanded: new Set(),
    editingId: null,
    editingProjectId: null,
    draft: { subtasks: [], materials: [] },
    confirmCb: null,
    lastFocus: [],
    postersShown: false,
    updatedAt: 0
  };

  // где лежат данные: 'local' — только это устройство, 'cloud' — аккаунт
  const store = { mode: 'local', userId: null };
  const cloud = { available: null, user: null, timer: 0, poll: 0, pushing: false, pending: false, syncing: false, lastPushed: null };

  /* ---------- Утилиты ---------- */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const icon = name => `<svg class="ico"><use href="#i-${name}"/></svg>`;
  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : d; };
  const money = n => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(n));

  function plural(n, forms) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
  }

  function inkOn(hex) {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
    if (!m) return '#fff';
    const [r, g, b] = [m[1], m[2], m[3]].map(x => parseInt(x, 16));
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? INK : '#fff';
  }

  const rtf = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' });
  const absFmt = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  function relative(ms) {
    const diff = ms - Date.now();
    const abs = Math.abs(diff);
    if (abs < 36e5) return rtf.format(Math.round(diff / 6e4), 'minute');
    if (abs < DAY) return rtf.format(Math.round(diff / 36e5), 'hour');
    return rtf.format(Math.round(diff / DAY), 'day');
  }

  const pad = n => String(n).padStart(2, '0');
  function toLocalInput(ms) {
    if (ms == null) return '';
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function toDateInput(ms) {
    if (ms == null) return '';
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function fromInput(v) {
    if (!v) return null;
    const ms = new Date(v.length === 10 ? v + 'T12:00' : v).getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  const isOverdue = t => t.status !== 'done' && t.deadline != null && t.deadline < Date.now();
  const projectById = id => state.projects.find(p => p.id === id) || null;
  const taskPlanned = t => t.materials.reduce((s, m) => s + m.qty * m.price, 0);
  const taskSpent = t => t.materials.reduce((s, m) => s + (m.bought ? m.qty * m.price : 0), 0);

  // прогресс = выполненные этапы (или задачи без этапов) к общему числу
  function progressOf(tasks) {
    let done = 0, total = 0;
    tasks.forEach(t => {
      if (t.subtasks.length) {
        total += t.subtasks.length;
        done += t.status === 'done' ? t.subtasks.length : t.subtasks.filter(s => s.done).length;
      } else {
        total += 1;
        if (t.status === 'done') done += 1;
      }
    });
    return total ? done / total : 0;
  }

  /* ---------- Хранилище и миграция ---------- */
  function readJSON(key) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* хранилище недоступно */ }
  }
  function writeCache() {
    writeJSON(KEYS.userCache(store.userId), { tasks: state.tasks, projects: state.projects, updatedAt: state.updatedAt });
  }

  function save() {
    if (store.mode === 'cloud') {
      state.updatedAt = Date.now();
      writeCache();
      schedulePush();
    } else {
      writeJSON(KEYS.tasks, state.tasks);
      writeJSON(KEYS.projects, state.projects);
    }
  }

  // подставить данные (из облака, кэша или локального хранилища)
  function applyData(data, { reset = false } = {}) {
    state.tasks = Array.isArray(data && data.tasks) ? data.tasks.map(normalizeTask) : [];
    state.projects = Array.isArray(data && data.projects) ? data.projects.map(normalizeProject) : [];
    const ids = new Set(state.projects.map(p => p.id));
    state.tasks.forEach(t => { if (t.projectId && !ids.has(t.projectId)) t.projectId = null; });
    if (state.filter.project && !ids.has(state.filter.project)) state.filter.project = null;
    if (reset) {
      state.filter.project = null;
      state.expanded.clear();
      state.postersShown = false;
    }
  }

  function normalizeTask(t) {
    const now = Date.now();
    return {
      id: t.id || uid(),
      title: String(t.title || 'Без названия'),
      description: String(t.description || ''),
      status: STATUSES.includes(t.status) ? t.status : 'todo',
      priority: PRIORITY[t.priority] ? t.priority : 'medium',
      deadline: typeof t.deadline === 'number' ? t.deadline : null,
      createdAt: t.createdAt || now,
      updatedAt: t.updatedAt || now,
      completedAt: t.completedAt || null,
      space: t.space === 'workshop' ? 'workshop' : 'personal',
      projectId: t.projectId || null,
      workType: WORK[t.workType] ? t.workType : null,
      subtasks: Array.isArray(t.subtasks) ? t.subtasks.map(s => ({ id: s.id || uid(), text: String(s.text || ''), done: !!s.done })) : [],
      materials: Array.isArray(t.materials) ? t.materials.map(m => ({
        id: m.id || uid(), name: String(m.name || ''), qty: num(m.qty, 1), price: num(m.price, 0), bought: !!m.bought
      })) : []
    };
  }

  function normalizeProject(p) {
    return {
      id: p.id || uid(),
      name: String(p.name || 'Без имени'),
      fandom: String(p.fandom || ''),
      convention: String(p.convention || ''),
      deadline: typeof p.deadline === 'number' ? p.deadline : null,
      color: PROJECT_COLORS.includes(p.color) ? p.color : PROJECT_COLORS[0],
      art: p.art === undefined ? (DEMO_ART[p.name] || '') : (ARTS.some(a => a.file === p.art) ? p.art : ''),
      createdAt: p.createdAt || Date.now()
    };
  }

  function demoData(withPersonal) {
    const now = Date.now();
    const h = 36e5;
    const P = (name, fandom, convention, days, color) => ({ id: uid(), name, fandom, convention, deadline: now + days * DAY, color, art: DEMO_ART[name] || '', createdAt: now - DAY * 10 });
    const p1 = P('Призрачный самурай', 'Ориджинал · Evil\'s Forge', 'Animate Fest', 21, '#e8175d');
    const p2 = P('Гейша-они', 'Ориджинал · арт-серия', 'Starcon', 45, '#6a3aa2');
    const p3 = P('Дух-хранитель', 'Ориджинал', 'Студийный фотосет', 60, '#2ff0e6');

    const S = list => list.map(x => typeof x === 'string' ? { text: x, done: false } : { text: x[0], done: true });
    const M = list => list.map(([name, qty, price, bought]) => ({ name, qty, price, bought: !!bought }));
    const T = (o, ageDays) => normalizeTask(Object.assign({
      createdAt: now - DAY * ageDays, updatedAt: now - DAY * ageDays,
      completedAt: o.status === 'done' ? now - h * 6 : null
    }, o));

    const tasks = [
      T({ space: 'workshop', projectId: p1.id, workType: 'armor', status: 'progress', priority: 'high', deadline: now + DAY * 8,
        title: 'Кираса и наплечники из EVA', description: 'Термоформовка, грани как на арте, шнуровка X-стежком.',
        subtasks: S([['Выкройки по скетчу'], ['Вырезать EVA 10 мм'], 'Термоформовка', 'Шнуровка и крепления']),
        materials: M([['EVA 10 мм, лист', 2, 1800, 1], ['Клей 88', 1, 450, 1], ['Пластидип', 1, 1200]]) }, 6),
      T({ space: 'workshop', projectId: p1.id, workType: 'paint', status: 'todo', priority: 'medium', deadline: now + DAY * 14,
        title: 'Покраска брони: маджента-градиент', description: 'Грунт → база → градиент к синему → спрей-зерно.',
        subtasks: S(['Грунт', 'Базовый цвет', 'Градиент', 'Спрей-текстура', 'Матовый лак']),
        materials: M([['Акрил маджента', 2, 390], ['Акрил ультрамарин', 2, 390], ['Лак матовый', 1, 650]]) }, 5),
      T({ space: 'workshop', projectId: p1.id, workType: 'props', status: 'todo', priority: 'high', deadline: now + DAY * 16,
        title: 'Катана с бирюзовой подсветкой', description: '',
        materials: M([['ПВХ-труба', 1, 300, 1], ['LED-лента бирюзовая', 1, 700], ['Аккумулятор 18650', 1, 900]]) }, 4),
      T({ space: 'workshop', projectId: p1.id, workType: 'con', status: 'todo', priority: 'critical', deadline: now + DAY * 3,
        title: 'Заявка на дефиле Animate Fest', description: 'Подать до закрытия регистрации, приложить референсы.' }, 2),
      T({ space: 'workshop', projectId: p1.id, workType: 'makeup', status: 'done', priority: 'low', deadline: now - DAY * 2,
        title: 'Тест грима: голубая кожа и шрамы', description: '',
        subtasks: S([['Тон кожи'], ['Шрамы маджентой']]), materials: M([['Аквагрим голубой', 1, 850, 1]]) }, 9),
      T({ space: 'workshop', projectId: p2.id, workType: 'sewing', status: 'progress', priority: 'critical', deadline: now - h * 20,
        title: 'Кимоно с узором чешуи', description: 'Набивка узора по ткани, широкие рукава.',
        subtasks: S([['Купить ткань'], ['Выкройка'], 'Набивка узора', 'Пошив рукавов', 'Пояс-оби']),
        materials: M([['Атлас розовый, м', 4, 600, 1], ['Краска по ткани', 2, 450]]) }, 7),
      T({ space: 'workshop', projectId: p2.id, workType: 'wig', status: 'todo', priority: 'medium', deadline: now + DAY * 30,
        title: 'Парик: высокий пучок со шпильками', description: '',
        materials: M([['Парик малиновый', 1, 3200, 1], ['Канекалон', 2, 250]]) }, 3),
      T({ space: 'workshop', projectId: p2.id, workType: 'props', status: 'todo', priority: 'medium', deadline: now + DAY * 35,
        title: 'Веер и маска-они', description: '',
        subtasks: S(['Каркас веера', 'Скульпт маски', 'Клыки и покраска']) }, 1),
      T({ space: 'workshop', projectId: p3.id, workType: 'photo', status: 'todo', priority: 'low', deadline: now + DAY * 58,
        title: 'Фотосет с бирюзовым дымом', description: 'Дым-машина, бирюзовые гели, белый фон.' }, 1)
    ];

    if (withPersonal) {
      tasks.push(
        T({ space: 'personal', status: 'todo', priority: 'high', deadline: now + DAY * 2, title: 'Оплатить аренду мастерской' }, 1),
        T({ space: 'personal', status: 'progress', priority: 'medium', deadline: now + DAY * 6, title: 'Записать туториал по EVA',
          subtasks: S([['Сценарий'], 'Съёмка', 'Монтаж']) }, 3),
        T({ space: 'personal', status: 'done', priority: 'low', title: 'Выспаться перед конвентом' }, 4)
      );
    }
    return { projects: [p1, p2, p3], tasks };
  }

  function loadLocal() {
    const rawTasks = readJSON(KEYS.tasks);
    const rawProjects = readJSON(KEYS.projects);
    applyData({ tasks: rawTasks, projects: rawProjects }, { reset: true });

    // первый запуск: показываем мастерскую на примерах, старые задачи уходят в «Личное»
    if (!Array.isArray(rawProjects)) {
      const demo = demoData(!Array.isArray(rawTasks) || rawTasks.length === 0);
      state.projects = demo.projects;
      state.tasks = state.tasks.concat(demo.tasks);
    }
    save();
  }

  /* ---------- CRUD: задачи ---------- */
  const inSpace = t => state.space === 'all' || t.space === state.space;

  function scopeTasks() {
    return state.tasks.filter(t => inSpace(t) && (!state.filter.project || t.projectId === state.filter.project));
  }

  function getTasks() {
    const { status, priority, work, query, sort } = state.filter;
    const q = query.trim().toLowerCase();
    const workOn = state.space !== 'personal' && work !== 'all';
    const list = scopeTasks().filter(t => {
      if (status !== 'all' && t.status !== status) return false;
      if (priority !== 'all' && t.priority !== priority) return false;
      if (workOn && t.workType !== work) return false;
      if (!q) return true;
      const proj = projectById(t.projectId);
      const hay = [t.title, t.description, proj ? proj.name : '', ...t.subtasks.map(s => s.text), ...t.materials.map(m => m.name)].join(' ').toLowerCase();
      return hay.includes(q);
    });
    const byDeadline = (a, b) => (a.deadline ?? Infinity) - (b.deadline ?? Infinity);
    const byPriority = (a, b) => PRIORITY[b.priority].weight - PRIORITY[a.priority].weight;
    list.sort((a, b) => {
      if (sort === 'priority') return byPriority(a, b) || byDeadline(a, b);
      if (sort === 'created') return b.createdAt - a.createdAt;
      return byDeadline(a, b) || byPriority(a, b);
    });
    return list;
  }

  function createTask(data) {
    const now = Date.now();
    const task = normalizeTask(Object.assign({}, data, {
      id: uid(), createdAt: now, updatedAt: now, completedAt: data.status === 'done' ? now : null
    }));
    state.tasks.push(task);
    save();
    return task;
  }

  function updateTask(id, patch) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return null;
    if (patch.status && patch.status !== task.status) task.completedAt = patch.status === 'done' ? Date.now() : null;
    Object.assign(task, patch, { updatedAt: Date.now() });
    save();
    return task;
  }

  function deleteTask(id) {
    const index = state.tasks.findIndex(t => t.id === id);
    if (index === -1) return null;
    const [task] = state.tasks.splice(index, 1);
    state.expanded.delete(id);
    save();
    return { task, index };
  }

  function restoreTask(snap) {
    state.tasks.splice(Math.min(snap.index, state.tasks.length), 0, snap.task);
    save();
  }

  /* ---------- CRUD: проекты ---------- */
  function createProject(data) {
    const p = normalizeProject(Object.assign({}, data, { id: uid(), createdAt: Date.now() }));
    state.projects.push(p);
    save();
    return p;
  }

  function updateProject(id, patch) {
    const p = projectById(id);
    if (!p) return null;
    Object.assign(p, patch);
    save();
    return p;
  }

  function deleteProject(id) {
    const index = state.projects.findIndex(p => p.id === id);
    if (index === -1) return null;
    const [project] = state.projects.splice(index, 1);
    const taskIds = state.tasks.filter(t => t.projectId === id).map(t => t.id);
    state.tasks.forEach(t => { if (t.projectId === id) t.projectId = null; });
    if (state.filter.project === id) state.filter.project = null;
    save();
    return { project, index, taskIds };
  }

  function restoreProject(snap) {
    state.projects.splice(Math.min(snap.index, state.projects.length), 0, snap.project);
    const ids = new Set(snap.taskIds);
    state.tasks.forEach(t => { if (ids.has(t.id)) t.projectId = snap.project.id; });
    save();
  }

  /* ---------- Рендер: карточки ---------- */
  function dueHtml(t) {
    if (t.status === 'done') {
      const when = t.completedAt ? 'выковано ' + relative(t.completedAt) : 'выковано';
      return `<span class="due is-done">${icon('check')}${escapeHtml(when)}</span>`;
    }
    if (t.deadline == null) return `<span class="due">${icon('clock')}без дедлайна</span>`;
    const abs = `<span class="due-abs">· ${escapeHtml(absFmt.format(t.deadline))}</span>`;
    if (isOverdue(t)) return `<span class="due is-overdue"><span class="due-core"></span>горит ${escapeHtml(relative(t.deadline))}</span>${abs}`;
    const soon = t.deadline - Date.now() < DAY;
    return `<span class="due${soon ? ' is-soon' : ''}">${icon('clock')}${escapeHtml(relative(t.deadline))}</span>${abs}`;
  }

  function subsHtml(t) {
    if (!t.subtasks.length) return '';
    const done = t.subtasks.filter(s => s.done).length;
    const pct = Math.round((done / t.subtasks.length) * 100);
    const items = t.subtasks.map(s =>
      `<li><button type="button" class="sub-item${s.done ? ' is-done' : ''}" data-act="sub" data-sid="${s.id}">${escapeHtml(s.text)}</button></li>`
    ).join('');
    return `
      <div class="subs">
        <button type="button" class="sub-toggle" data-act="expand" aria-expanded="${state.expanded.has(t.id)}">
          ${icon('steps')}<span>Этапы <b data-subcount>${done}/${t.subtasks.length}</b></span>
          <span class="bar"><span data-subbar style="width:${pct}%"></span></span>
          <svg class="ico chev"><use href="#i-chev"/></svg>
        </button>
        <div class="sub-wrap"><div class="sub-inner"><ul class="sub-list">${items}</ul></div></div>
      </div>`;
  }

  function taskHtml(t) {
    const cls = ['task', 'glass'];
    if (t.status === 'done') cls.push('is-done');
    if (isOverdue(t)) cls.push('is-overdue');
    if (state.expanded.has(t.id)) cls.push('open');

    const tags = [];
    const proj = projectById(t.projectId);
    if (proj && !state.filter.project) {
      tags.push(`<span class="tag tag-project" style="--tc:${proj.color};color:${inkOn(proj.color)}"><span>${escapeHtml(proj.name)}</span></span>`);
    }
    const work = t.workType && WORK[t.workType];
    if (work) tags.push(`<span class="tag" style="--tc:${work.color}">${icon(work.icon)}${work.label}</span>`);
    if (state.space === 'all' && t.space === 'personal') tags.push(`<span class="tag" style="--tc:#9b6bff">${icon('fan')}Личное</span>`);

    const planned = taskPlanned(t);
    const moneyHtml = planned > 0
      ? `<span class="money" title="Куплено / всего">${icon('coin')}<b>${money(taskSpent(t))}</b>&nbsp;/ ${money(planned)} ₽</span>` : '';

    return `
      <article class="${cls.join(' ')}" data-id="${t.id}" data-priority="${t.priority}" draggable="true" tabindex="0">
        <span class="task-blade"></span>
        <div class="task-top">
          <button class="check" type="button" data-act="toggle" aria-label="${t.status === 'done' ? 'Вернуть в работу' : 'Отметить выполненной'}">${icon('check')}</button>
          <div class="task-main">
            ${tags.length ? `<div class="task-tags">${tags.join('')}</div>` : ''}
            <h3 class="task-title">${escapeHtml(t.title)}</h3>
            ${t.description ? `<p class="task-desc">${escapeHtml(t.description)}</p>` : ''}
          </div>
          <div class="task-actions">
            <button class="mini-btn" type="button" data-act="edit" aria-label="Редактировать" title="Редактировать">${icon('edit')}</button>
            <button class="mini-btn" type="button" data-act="delete" aria-label="Удалить" title="Удалить">${icon('trash')}</button>
          </div>
        </div>
        ${subsHtml(t)}
        <div class="task-meta">
          <span class="badge"><span>${PRIORITY[t.priority].label}</span></span>
          ${dueHtml(t)}
          ${moneyHtml}
        </div>
      </article>`;
  }

  function emptyHtml(status) {
    const filtered = state.filter.query.trim() || state.filter.priority !== 'all' || (state.filter.work !== 'all' && state.space !== 'personal');
    const fresh = !filtered && status === 'todo' && scopeTasks().length === 0;
    if (fresh) {
      return `<div class="empty empty-fresh"><span class="empty-kanji">${EMPTY_KANJI[status]}</span>
        <span>Здесь пока пусто — выкуй первую задачу</span>
        <button type="button" class="btn btn-primary btn-sm empty-add" data-empty="task"><svg class="ico"><use href="#i-plus"/></svg><span>Первая задача</span></button></div>`;
    }
    const text = filtered ? 'Ничего не найдено' : (status === 'done' ? 'Пока ничего не выковано' : 'Пусто — перетащи задачу сюда');
    return `<div class="empty"><span class="empty-kanji">${EMPTY_KANJI[status]}</span><span>${text}</span></div>`;
  }

  function render({ animate = true, flashId = null } = {}) {
    const motion = animate && !reducedMotion;
    const prev = new Map();
    if (motion) {
      $$('.task', el.board).forEach(node => {
        const r = node.getBoundingClientRect();
        if (r.width) prev.set(node.dataset.id, r);
      });
    }

    const list = getTasks();
    STATUSES.forEach(status => {
      const items = list.filter(t => t.status === status);
      $(`.column-body[data-drop="${status}"]`, el.board).innerHTML = items.length ? items.map(taskHtml).join('') : emptyHtml(status);
      const counter = $(`.col-count[data-count="${status}"]`, el.board);
      const n = String(items.length);
      if (counter.textContent !== n) {
        counter.textContent = n;
        counter.classList.remove('bump');
        void counter.offsetWidth;
        counter.classList.add('bump');
      }
    });

    // FLIP: карточки плавно переезжают на новые места
    if (motion) {
      let fresh = 0;
      $$('.task', el.board).forEach(node => {
        const r = node.getBoundingClientRect();
        if (!r.width) return;
        const p = prev.get(node.dataset.id);
        if (p) {
          const dx = p.left - r.left, dy = p.top - r.top;
          if (dx || dy) {
            node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
              { duration: 620, easing: 'cubic-bezier(.3, 1.25, .5, 1)' });
          }
        } else {
          node.animate([
            { opacity: 0, transform: 'translateY(18px) rotate(-1.5deg) scale(.96)', filter: 'blur(6px)' },
            { opacity: 1, transform: 'none', filter: 'blur(0)' }
          ], { duration: 560, delay: Math.min(fresh++, 12) * 45, easing: EASE, fill: 'backwards' });
        }
      });
    }

    if (flashId) {
      const node = $(`.task[data-id="${flashId}"]`, el.board);
      if (node) {
        node.classList.add('flash');
        node.addEventListener('animationend', () => node.classList.remove('flash'), { once: true });
      }
    }
    renderStats();
  }

  /* ---------- Рендер: проекты ---------- */
  function renderProjects() {
    const track = el.projectsTrack;
    const scroll = track.scrollLeft;
    const posters = state.projects.map(p => {
      const tasks = state.tasks.filter(t => t.projectId === p.id);
      const pct = Math.round(progressOf(tasks) * 100);
      const planned = tasks.reduce((s, t) => s + taskPlanned(t), 0);
      const spent = tasks.reduce((s, t) => s + taskSpent(t), 0);
      const active = state.filter.project === p.id;
      let con = '';
      if (p.deadline != null || p.convention) {
        const when = p.deadline != null ? relative(p.deadline) : '';
        const soon = p.deadline != null && p.deadline - Date.now() < DAY * 7;
        con = `<span class="poster-con${soon ? ' is-soon' : ''}">${icon('con')}<span>${escapeHtml([p.convention, when].filter(Boolean).join(' · '))}</span></span>`;
      }
      return `
        <article class="poster glass${active ? ' is-active' : ''}${p.art ? ' has-art' : ''}" data-pid="${p.id}" style="--pc:${p.color}" tabindex="0" role="button" aria-pressed="${active}">
          <span class="poster-panel">${p.art ? `<img src="assets/${p.art}" alt="" loading="lazy" decoding="async">` : ''}</span>
          <span class="poster-letter" aria-hidden="true">${escapeHtml(p.name.trim().charAt(0).toUpperCase())}</span>
          <span class="poster-flag">◆ фильтр</span>
          <button type="button" class="poster-edit" data-pact="edit" aria-label="Редактировать персонажа">${icon('edit')}</button>
          <span class="poster-fandom">${escapeHtml(p.fandom || 'Ориджинал')}</span>
          <h3 class="poster-name">${escapeHtml(p.name)}</h3>
          ${con}
          <div class="poster-foot">
            <svg class="mini-ring" viewBox="0 0 42 42" aria-hidden="true">
              <circle class="mr-ink" cx="21" cy="21" r="16"/>
              <circle class="mr-track" cx="21" cy="21" r="16"/>
              <circle class="mr-bar" cx="21" cy="21" r="16" stroke-dasharray="${MINI_LEN}" stroke-dashoffset="${(MINI_LEN * (1 - pct / 100)).toFixed(2)}"/>
            </svg>
            <div class="poster-nums">
              <b>${pct}%</b>
              <span>${tasks.length} ${plural(tasks.length, ['задача', 'задачи', 'задач'])}${planned ? ` · ${money(spent)} / ${money(planned)} ₽` : ''}</span>
            </div>
          </div>
        </article>`;
    }).join('');

    track.innerHTML = posters +
      `<button type="button" class="poster poster-new glass" data-pact="new">
         <span class="plus">${icon('plus')}</span><span>Новый персонаж</span>
       </button>`;
    track.scrollLeft = scroll;

    if (!state.postersShown && !reducedMotion) {
      $$('.poster', track).forEach((node, i) => node.animate([
        { opacity: 0, transform: 'translateY(20px) rotate(2deg)', filter: 'blur(6px)' },
        { opacity: 1, transform: 'none', filter: 'blur(0)' }
      ], { duration: 620, delay: 250 + i * 70, easing: EASE, fill: 'backwards' }));
    }
    state.postersShown = true;
    renderProjectChip();
  }

  function renderProjectChip() {
    const p = state.space !== 'personal' && projectById(state.filter.project);
    el.projectChip.hidden = !p;
    if (!p) return;
    el.projectChip.style.setProperty('--tc', p.color);
    el.projectChip.style.color = inkOn(p.color);
    el.projectChip.innerHTML = `<span>Персонаж: ${escapeHtml(p.name)}</span>${icon('close')}`;
    el.projectChip.title = 'Снять фильтр по проекту';
  }

  /* ---------- Рендер: статистика ---------- */
  function animateNumber(node, to, fmt = String) {
    const from = Number(node.dataset.value || 0);
    node.dataset.value = to;
    if (from === to || reducedMotion) { node.textContent = fmt(to); return; }
    const start = performance.now();
    const step = now => {
      const k = Math.min(1, (now - start) / 750);
      const e = 1 - Math.pow(1 - k, 4);
      node.textContent = fmt(Math.round(from + (to - from) * e));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function renderStats() {
    const scope = scopeTasks();
    const total = scope.length;
    const done = scope.filter(t => t.status === 'done').length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const overdue = scope.filter(isOverdue).length;

    animateNumber(el.ringPct, pct);
    animateNumber(el.ringDone, done);
    animateNumber(el.ringTotal, total);
    el.ringBar.style.strokeDashoffset = String(RING_LEN * (1 - pct / 100));
    animateNumber(el.statTotal, total);
    animateNumber(el.statProgress, scope.filter(t => t.status === 'progress').length);
    animateNumber(el.statOverdue, overdue);
    el.overdueCard.classList.toggle('is-hot', overdue > 0);

    const ws = scope.filter(t => t.space === 'workshop');
    const planned = ws.reduce((s, t) => s + taskPlanned(t), 0);
    const spent = ws.reduce((s, t) => s + taskSpent(t), 0);
    animateNumber(el.statSpent, spent, money);
    el.statPlanned.textContent = money(planned);
    el.budgetBar.style.width = (planned ? Math.min(100, (spent / planned) * 100) : 0) + '%';

    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const pool = state.filter.project ? state.projects.filter(p => p.id === state.filter.project) : state.projects;
    const next = pool.filter(p => p.deadline != null && p.deadline >= startOfToday).sort((a, b) => a.deadline - b.deadline)[0];
    if (next) {
      const days = Math.max(0, Math.ceil((new Date(next.deadline).setHours(0, 0, 0, 0) - startOfToday) / DAY));
      el.conDays.textContent = days === 0 ? 'Сегодня' : `${days} ${plural(days, ['день', 'дня', 'дней'])}`;
      el.conName.textContent = [next.convention, next.name].filter(Boolean).join(' · ');
    } else {
      el.conDays.textContent = '—';
      el.conName.textContent = 'нет в планах';
    }
  }

  function renderAll(opts) {
    renderProjects();
    render(opts);
  }

  /* ---------- Сегменты с бегущей подложкой ---------- */
  function moveInd(container) {
    const ind = $('.seg-ind', container);
    const active = $('.is-active', container);
    if (!ind || !active || !active.offsetWidth) return;
    ind.style.width = active.offsetWidth + 'px';
    ind.style.transform = `translateX(${active.offsetLeft}px)`;
  }
  function setActive(container, btn) {
    $$('.seg-btn, .tab', container).forEach(b => {
      b.classList.toggle('is-active', b === btn);
      b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
    });
    moveInd(container);
  }
  const moveAllInd = () => [el.spaceSwitch, el.statusFilter, el.tabs, el.authTabs].forEach(moveInd);

  /* ---------- Пространства ---------- */
  function setSpace(space) {
    state.space = space;
    root.dataset.space = space;
    try { localStorage.setItem(KEYS.space, space); } catch (e) { /* ignore */ }
    if (space === 'personal') state.filter.project = null;
    setActive(el.spaceSwitch, $(`.seg-btn[data-value="${space}"]`, el.spaceSwitch));
    requestAnimationFrame(() => moveInd(el.statusFilter));
    renderAll();
  }

  el.spaceSwitch.addEventListener('click', e => {
    const btn = e.target.closest('.seg-btn');
    if (btn && btn.dataset.value !== state.space) setSpace(btn.dataset.value);
  });

  /* ---------- Фильтры ---------- */
  el.workFilter.innerHTML = '<option value="all">Любая</option>' +
    Object.entries(WORK).map(([k, w]) => `<option value="${k}">${w.label}</option>`).join('');

  el.statusFilter.addEventListener('click', e => {
    const btn = e.target.closest('.seg-btn');
    if (!btn || btn.classList.contains('is-active')) return;
    setActive(el.statusFilter, btn);
    state.filter.status = btn.dataset.value;
    el.board.dataset.filter = btn.dataset.value;
    render({ animate: false });
    if (!reducedMotion) {
      $$('.task', el.board).forEach((node, i) => node.animate(
        [{ opacity: 0, transform: 'translateY(14px)', filter: 'blur(5px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
        { duration: 520, delay: Math.min(i, 12) * 40, easing: EASE, fill: 'backwards' }
      ));
    }
  });

  el.workFilter.addEventListener('change', () => { state.filter.work = el.workFilter.value; render(); });
  el.priorityFilter.addEventListener('change', () => { state.filter.priority = el.priorityFilter.value; render(); });
  el.sortSelect.addEventListener('change', () => { state.filter.sort = el.sortSelect.value; render(); });
  el.projectChip.addEventListener('click', () => { state.filter.project = null; renderAll(); });

  let searchTimer = 0;
  el.search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.filter.query = el.search.value; render(); }, 120);
  });

  window.addEventListener('resize', moveAllInd);

  /* ---------- Полоса проектов ---------- */
  function toggleProjectFilter(id) {
    state.filter.project = state.filter.project === id ? null : id;
    renderAll();
  }

  el.projectsTrack.addEventListener('click', e => {
    const act = e.target.closest('[data-pact]');
    if (act && act.dataset.pact === 'new') { openProjectModal(null); return; }
    const poster = e.target.closest('.poster[data-pid]');
    if (!poster) return;
    if (act && act.dataset.pact === 'edit') { openProjectModal(projectById(poster.dataset.pid)); return; }
    toggleProjectFilter(poster.dataset.pid);
  });
  el.projectsTrack.addEventListener('keydown', e => {
    const poster = e.target.closest('.poster[data-pid]');
    if (!poster || e.target !== poster) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleProjectFilter(poster.dataset.pid); }
  });
  el.addProjectBtn.addEventListener('click', () => openProjectModal(null));

  /* ---------- Оверлеи ---------- */
  const overlays = [el.confirmOverlay, el.projectOverlay, el.taskOverlay];

  function openOverlay(overlay, focusEl) {
    state.lastFocus.push(document.activeElement);
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    setTimeout(() => focusEl && focusEl.focus(), 80);
  }
  function closeOverlay(overlay) {
    if (!overlay.classList.contains('open')) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    const f = state.lastFocus.pop();
    if (f && document.contains(f) && f.focus) f.focus();
  }
  const anyOpen = () => overlays.some(o => o.classList.contains('open'));

  overlays.forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.closest('[data-close]')) closeOverlay(overlay);
    });
  });

  function askConfirm({ title, html, button = 'Удалить', onConfirm }) {
    state.confirmCb = onConfirm;
    el.confirmTitle.textContent = title;
    el.confirmText.innerHTML = html;
    $('span', el.confirmBtn).textContent = button;
    openOverlay(el.confirmOverlay, el.confirmBtn);
  }
  el.confirmBtn.addEventListener('click', () => {
    const cb = state.confirmCb;
    state.confirmCb = null;
    closeOverlay(el.confirmOverlay);
    if (cb) cb();
  });

  function invalid(input) {
    const field = input.closest('.field');
    field.classList.remove('invalid');
    void field.offsetWidth;
    field.classList.add('invalid');
    input.focus();
  }
  [() => el.fTitle, () => el.pName].forEach(get => get().addEventListener('input', e => e.target.closest('.field').classList.remove('invalid')));

  /* ---------- Модалка задачи ---------- */
  const formSpace = () => (new FormData(el.taskForm).get('space') || 'workshop');

  function switchTab(name) {
    $$('.tab', el.tabs).forEach(t => t.classList.toggle('is-active', t.dataset.tab === name));
    $$('.tab-panel', el.taskForm).forEach(p => p.classList.toggle('is-active', p.dataset.panel === name));
    moveInd(el.tabs);
  }

  function applyFormSpace() {
    const space = formSpace();
    el.taskForm.dataset.space = space;
    if (space === 'personal' && $('.tab.is-active', el.tabs).dataset.tab === 'mats') switchTab('main');
    requestAnimationFrame(() => moveInd(el.tabs));
  }

  function fillTaskSelects(task) {
    el.fProject.innerHTML = '<option value="">Без проекта</option>' +
      state.projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    el.fWork.innerHTML = '<option value="">Не указан</option>' +
      Object.entries(WORK).map(([k, w]) => `<option value="${k}">${w.label}</option>`).join('');
    el.fProject.value = task ? (task.projectId || '') : (state.filter.project || '');
    el.fWork.value = task ? (task.workType || '') : (state.filter.work !== 'all' ? state.filter.work : '');
  }

  function openTaskModal(task) {
    state.editingId = task ? task.id : null;
    state.draft = {
      subtasks: task ? task.subtasks.map(s => Object.assign({}, s)) : [],
      materials: task ? task.materials.map(m => Object.assign({}, m)) : []
    };
    el.taskForm.reset();
    $$('.field.invalid', el.taskForm).forEach(f => f.classList.remove('invalid'));
    el.modalTitle.textContent = task ? 'Перековать задачу' : 'Новая задача';
    $('span', el.submitBtn).textContent = task ? 'Сохранить' : 'Выковать';

    const space = task ? task.space : (state.space === 'personal' ? 'personal' : 'workshop');
    $(`input[name="space"][value="${space}"]`, el.taskForm).checked = true;
    el.fTitle.value = task ? task.title : '';
    el.fDesc.value = task ? task.description : '';
    el.fStatus.value = task ? task.status : (state.filter.status !== 'all' ? state.filter.status : 'todo');
    el.fDeadline.value = task ? toLocalInput(task.deadline) : '';
    $(`input[name="priority"][value="${task ? task.priority : 'medium'}"]`, el.taskForm).checked = true;
    fillTaskSelects(task);

    renderSubEditor();
    renderMatEditor();
    el.taskForm.dataset.space = space;
    switchTab('main');
    openOverlay(el.taskOverlay, el.fTitle);
  }

  $('#fSpace').addEventListener('change', applyFormSpace);
  el.tabs.addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (tab) switchTab(tab.dataset.tab);
  });

  // --- этапы
  function renderSubEditor() {
    const list = state.draft.subtasks;
    el.subEditor.innerHTML = list.length ? list.map(s => `
      <li data-rid="${s.id}">
        <input type="checkbox" class="dcheck" aria-label="Этап выполнен" ${s.done ? 'checked' : ''}>
        <input type="text" value="${escapeHtml(s.text)}" maxlength="120" aria-label="Название этапа">
        <button type="button" class="row-del" aria-label="Удалить этап">${icon('trash')}</button>
      </li>`).join('') : '<li class="editor-empty">Этапов пока нет</li>';
    el.subsCount.textContent = list.length;
  }

  function addSub() {
    const text = el.subNew.value.trim();
    if (!text) { el.subNew.focus(); return; }
    state.draft.subtasks.push({ id: uid(), text, done: false });
    el.subNew.value = '';
    renderSubEditor();
    el.subNew.focus();
  }
  el.subAdd.addEventListener('click', addSub);
  el.subNew.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } });

  // --- материалы
  function renderMatEditor(focusId) {
    const list = state.draft.materials;
    el.matEditor.innerHTML = list.length ? list.map(m => `
      <li data-rid="${m.id}">
        <input type="text" data-f="name" value="${escapeHtml(m.name)}" maxlength="80" placeholder="Например, EVA 5 мм" aria-label="Материал">
        <input type="number" data-f="qty" value="${m.qty}" min="0" step="1" aria-label="Количество">
        <input type="number" data-f="price" value="${m.price}" min="0" step="10" aria-label="Цена за единицу">
        <input type="checkbox" class="dcheck" data-f="bought" aria-label="Куплено" ${m.bought ? 'checked' : ''}>
        <button type="button" class="row-del" aria-label="Удалить материал">${icon('trash')}</button>
      </li>`).join('') : '<li class="editor-empty">Список закупок пуст</li>';
    el.matsCount.textContent = list.length;
    updateMatTotals();
    if (focusId) {
      const input = $(`li[data-rid="${focusId}"] input[data-f="name"]`, el.matEditor);
      if (input) input.focus();
    }
  }

  function updateMatTotals() {
    const ms = state.draft.materials;
    el.matTotal.textContent = money(ms.reduce((s, m) => s + m.qty * m.price, 0)) + ' ₽';
    el.matSpent.textContent = money(ms.reduce((s, m) => s + (m.bought ? m.qty * m.price : 0), 0)) + ' ₽';
  }

  el.matAdd.addEventListener('click', () => {
    const m = { id: uid(), name: '', qty: 1, price: 0, bought: false };
    state.draft.materials.push(m);
    renderMatEditor(m.id);
  });

  // общий обработчик для обоих редакторов
  function bindEditor(listEl, getList, onChange) {
    const rowOf = e => {
      const li = e.target.closest('li[data-rid]');
      return li ? { li, item: getList().find(x => x.id === li.dataset.rid) } : {};
    };
    listEl.addEventListener('input', e => {
      const { item } = rowOf(e);
      if (!item) return;
      const f = e.target.dataset.f;
      if (e.target.type === 'checkbox') return;
      if (f === 'qty' || f === 'price') item[f] = num(e.target.value, 0);
      else if (f === 'name') item.name = e.target.value;
      else item.text = e.target.value;
      onChange();
    });
    listEl.addEventListener('change', e => {
      const { item } = rowOf(e);
      if (!item || e.target.type !== 'checkbox') return;
      if ('bought' in item) item.bought = e.target.checked; else item.done = e.target.checked;
      onChange();
    });
    listEl.addEventListener('click', e => {
      if (!e.target.closest('.row-del')) return;
      const { li, item } = rowOf(e);
      if (!item) return;
      const remove = () => {
        const list = getList();
        list.splice(list.indexOf(item), 1);
        listEl === el.subEditor ? renderSubEditor() : renderMatEditor();
      };
      if (reducedMotion) { remove(); return; }
      li.classList.add('out');
      li.addEventListener('animationend', remove, { once: true });
    });
    listEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.matches('input')) e.preventDefault();
    });
  }
  bindEditor(el.subEditor, () => state.draft.subtasks, () => {});
  bindEditor(el.matEditor, () => state.draft.materials, updateMatTotals);

  el.taskForm.addEventListener('submit', e => {
    e.preventDefault();
    const title = el.fTitle.value.trim();
    if (!title) { switchTab('main'); setTimeout(() => invalid(el.fTitle), 60); return; }
    const space = formSpace();
    const ws = space === 'workshop';
    const data = {
      title,
      description: el.fDesc.value.trim(),
      status: el.fStatus.value,
      priority: new FormData(el.taskForm).get('priority') || 'medium',
      deadline: fromInput(el.fDeadline.value),
      space,
      projectId: ws ? (el.fProject.value || null) : null,
      workType: ws ? (el.fWork.value || null) : null,
      subtasks: state.draft.subtasks.filter(s => s.text.trim()).map(s => ({ id: s.id, text: s.text.trim(), done: !!s.done })),
      materials: ws ? state.draft.materials.filter(m => m.name.trim()).map(m => Object.assign({}, m, { name: m.name.trim() })) : []
    };
    let task;
    let cheer = null;
    if (state.editingId) {
      const prev = state.tasks.find(t => t.id === state.editingId);
      const becameDone = prev && prev.status !== 'done' && data.status === 'done';
      const projectWasDone = data.projectId ? projectDone(data.projectId) : false;
      task = updateTask(state.editingId, data);
      if (becameDone && task) cheer = () => celebrate(task, projectWasDone);
      else toast('Задача перекована', { type: 'success' });
    } else {
      task = createTask(data);
      toast('Задача выкована', { type: 'success' });
    }
    // если задача не попадает в текущий вид — переключаемся, чтобы её было видно
    if (task && !inSpace(task)) setSpace('all');
    if (task && state.filter.project && task.projectId !== state.filter.project) state.filter.project = null;
    closeOverlay(el.taskOverlay);
    renderAll({ flashId: task && task.id });
    if (cheer) setTimeout(cheer, 380);
  });

  /* ---------- Модалка проекта ---------- */
  function openProjectModal(project) {
    state.editingProjectId = project ? project.id : null;
    el.projectForm.reset();
    $$('.field.invalid', el.projectForm).forEach(f => f.classList.remove('invalid'));
    el.projectModalTitle.textContent = project ? 'Перековать персонажа' : 'Новый персонаж';
    $('span', el.projectSubmit).textContent = project ? 'Сохранить' : 'Создать';
    el.projectDelete.hidden = !project;
    el.pName.value = project ? project.name : '';
    el.pFandom.value = project ? project.fandom : '';
    el.pCon.value = project ? project.convention : '';
    el.pDeadline.value = project ? toDateInput(project.deadline) : '';

    const used = new Set(state.projects.map(p => p.color));
    const color = project ? project.color : (PROJECT_COLORS.find(c => !used.has(c)) || PROJECT_COLORS[0]);
    el.pColors.innerHTML = PROJECT_COLORS.map(c => `
      <label class="swatch" title="${c}">
        <input type="radio" name="pcolor" value="${c}" ${c === color ? 'checked' : ''}>
        <span style="--c:${c}"></span>
      </label>`).join('');

    const art = project ? project.art : '';
    el.pArts.innerHTML =
      `<label class="art-opt" title="Без арта"><input type="radio" name="part" value="" ${art ? '' : 'checked'}><span>без арта</span></label>` +
      ARTS.map(a => `
        <label class="art-opt" title="${escapeHtml(a.title)}">
          <input type="radio" name="part" value="${a.file}" ${a.file === art ? 'checked' : ''}>
          <span><img src="assets/${a.file}" alt="${escapeHtml(a.title)}" loading="lazy" decoding="async"></span>
        </label>`).join('');
    openOverlay(el.projectOverlay, el.pName);
  }

  el.projectForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = el.pName.value.trim();
    if (!name) { invalid(el.pName); return; }
    const data = {
      name,
      fandom: el.pFandom.value.trim(),
      convention: el.pCon.value.trim(),
      deadline: fromInput(el.pDeadline.value),
      color: new FormData(el.projectForm).get('pcolor') || PROJECT_COLORS[0],
      art: new FormData(el.projectForm).get('part') || ''
    };
    if (state.editingProjectId) {
      updateProject(state.editingProjectId, data);
      toast('Персонаж обновлён', { type: 'success' });
    } else {
      const p = createProject(data);
      toast(`Персонаж «${p.name}» в кузнице`, { type: 'success' });
      if (state.space === 'personal') setSpace('workshop');
    }
    closeOverlay(el.projectOverlay);
    renderAll();
    // прокрутить к новому/изменённому постеру
    const id = state.editingProjectId || state.projects[state.projects.length - 1].id;
    const poster = $(`.poster[data-pid="${id}"]`, el.projectsTrack);
    if (poster) poster.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' });
  });

  el.projectDelete.addEventListener('click', () => {
    const p = projectById(state.editingProjectId);
    if (!p) return;
    closeOverlay(el.projectOverlay);
    const count = state.tasks.filter(t => t.projectId === p.id).length;
    askConfirm({
      title: 'Удалить персонажа?',
      html: `«<b>${escapeHtml(p.name)}</b>» исчезнет из кузницы. ${count ? `${count} ${plural(count, ['задача останется', 'задачи останутся', 'задач останутся'])} без проекта.` : ''}`,
      onConfirm: () => {
        const snap = deleteProject(p.id);
        renderAll();
        if (snap) toast('Персонаж удалён', { type: 'danger', action: 'Отменить', onAction: () => { restoreProject(snap); renderAll(); } });
      }
    });
  });

  /* ---------- Действия на карточках ---------- */
  function askDeleteTask(task) {
    askConfirm({
      title: 'Уничтожить задачу?',
      html: `«<b>${escapeHtml(task.title)}</b>» будет удалена. Это можно отменить в течение нескольких секунд.`,
      onConfirm: () => {
        const node = $(`.task[data-id="${task.id}"]`, el.board);
        const finish = () => {
          const snap = deleteTask(task.id);
          renderAll();
          if (snap) {
            toast('Задача уничтожена', {
              type: 'danger', action: 'Отменить',
              onAction: () => { restoreTask(snap); renderAll({ flashId: snap.task.id }); }
            });
          }
        };
        if (node && !reducedMotion) {
          node.animate([
            { opacity: 1, transform: 'none', filter: 'blur(0)' },
            { opacity: 0, transform: 'scale(.86) translateX(30px) rotate(4deg)', filter: 'blur(8px)' }
          ], { duration: 340, easing: EASE, fill: 'forwards' }).onfinish = finish;
        } else {
          finish();
        }
      }
    });
  }

  function toggleSubtask(card, task, btn) {
    const sub = task.subtasks.find(s => s.id === btn.dataset.sid);
    if (!sub) return;
    sub.done = !sub.done;
    task.updatedAt = Date.now();
    save();
    btn.classList.toggle('is-done', sub.done);
    const done = task.subtasks.filter(s => s.done).length;
    $('[data-subcount]', card).textContent = `${done}/${task.subtasks.length}`;
    $('[data-subbar]', card).style.width = Math.round((done / task.subtasks.length) * 100) + '%';
    renderStats();
    renderProjects();
    if (sub.done && done === task.subtasks.length && task.status !== 'done') {
      toast('Все этапы готовы!', {
        type: 'success', action: 'В «Готово»',
        onAction: () => completeTask(task, $(`.task[data-id="${task.id}"]`, el.board))
      });
    }
  }

  el.board.addEventListener('click', e => {
    const card = e.target.closest('.task');
    const btn = e.target.closest('[data-act]');
    if (!card || !btn) return;
    const task = state.tasks.find(t => t.id === card.dataset.id);
    if (!task) return;
    const act = btn.dataset.act;

    if (act === 'toggle') {
      const next = task.status === 'done' ? 'todo' : 'done';
      card.classList.toggle('is-done', next === 'done');
      if (next === 'done') {
        // даём галочке прорисоваться, затем удар катаны
        setTimeout(() => completeTask(task, card), reducedMotion ? 0 : 260);
      } else {
        setTimeout(() => {
          updateTask(task.id, { status: next });
          renderAll({ flashId: task.id });
        }, reducedMotion ? 0 : 320);
      }
    } else if (act === 'expand') {
      const open = !state.expanded.has(task.id);
      open ? state.expanded.add(task.id) : state.expanded.delete(task.id);
      card.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    } else if (act === 'sub') {
      toggleSubtask(card, task, btn);
    } else if (act === 'edit') {
      openTaskModal(task);
    } else if (act === 'delete') {
      askDeleteTask(task);
    }
  });

  el.board.addEventListener('click', e => {
    if (e.target.closest('[data-empty="task"]')) openTaskModal(null);
  });

  el.board.addEventListener('dblclick', e => {
    const card = e.target.closest('.task');
    if (!card || e.target.closest('[data-act]')) return;
    const task = state.tasks.find(t => t.id === card.dataset.id);
    if (task) openTaskModal(task);
  });

  el.board.addEventListener('keydown', e => {
    const card = e.target.closest('.task');
    if (!card || e.target !== card) return;
    const task = state.tasks.find(t => t.id === card.dataset.id);
    if (!task) return;
    if (e.key === 'Enter') { e.preventDefault(); openTaskModal(task); }
    if (e.key === 'Delete') { e.preventDefault(); askDeleteTask(task); }
  });

  /* ---------- Drag & Drop ---------- */
  let dragId = null;

  el.board.addEventListener('dragstart', e => {
    const card = e.target.closest('.task');
    if (!card) return;
    dragId = card.dataset.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
    requestAnimationFrame(() => card.classList.add('dragging'));
  });
  el.board.addEventListener('dragend', e => {
    const card = e.target.closest('.task');
    if (card) card.classList.remove('dragging');
    $$('.column-body.drag-over', el.board).forEach(b => b.classList.remove('drag-over'));
    dragId = null;
  });
  el.board.addEventListener('dragover', e => {
    const body = e.target.closest('.column-body');
    if (!body || !dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    $$('.column-body.drag-over', el.board).forEach(b => b !== body && b.classList.remove('drag-over'));
    body.classList.add('drag-over');
  });
  el.board.addEventListener('dragleave', e => {
    const body = e.target.closest('.column-body');
    if (body && !body.contains(e.relatedTarget)) body.classList.remove('drag-over');
  });
  el.board.addEventListener('drop', e => {
    const body = e.target.closest('.column-body');
    if (!body) return;
    e.preventDefault();
    body.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain') || dragId;
    const task = state.tasks.find(t => t.id === id);
    const status = body.dataset.drop;
    if (!task || task.status === status) return;
    if (status === 'done') {
      completeTask(task, $(`.task[data-id="${id}"]`, el.board));
      return;
    }
    updateTask(id, { status });
    renderAll({ flashId: id });
  });

  /* =========================================================
     Празднование: удар катаны по карточке и самурай с поздравлением
     ========================================================= */
  // самураи, вырезанные из артов (прозрачный фон); ключ — исходный арт для обложек персонажей
  const SAMURAI = {
    'art-banner.jpg': 'samurai/banner.webp',
    'art-fire.jpg': 'samurai/fire.webp',
    'art-spirit.jpg': 'samurai/spirit.webp',
    'art-spirit-jump.jpg': 'samurai/spirit-jump.webp',
    'art-ronin.jpg': 'samurai/ronin.webp',
    'art-flame.jpg': 'samurai/flame.webp'
  };
  const SAMURAI_ARTS = Object.values(SAMURAI);

  // подгружаем фигуры заранее, чтобы поздравление открывалось мгновенно
  const preloadSamurai = () => SAMURAI_ARTS.forEach(f => { const i = new Image(); i.decoding = 'async'; i.src = `assets/${f}`; });
  if ('requestIdleCallback' in window) requestIdleCallback(preloadSamurai, { timeout: 4000 });
  else setTimeout(preloadSamurai, 2500);
  const TASK_CHEERS = [
    ['Выковано!', 'Чистый разрез'],
    ['Мастерски!', 'Клинок доволен'],
    ['Готово!', 'Ещё шаг к дефиле'],
    ['見事!', 'Безупречная работа']
  ];
  let lastArt = '';
  let celebration = null;

  const projectDone = pid => {
    const list = state.tasks.filter(t => t.projectId === pid);
    return list.length > 0 && list.every(t => t.status === 'done');
  };
  const pick = list => list[Math.floor(Math.random() * list.length)];

  // обложка персонажа → его вырезанный самурай; иначе случайный, без повтора подряд
  function pickArt(preferred) {
    if (preferred && SAMURAI[preferred]) return SAMURAI[preferred];
    const pool = SAMURAI_ARTS.filter(a => a !== lastArt);
    lastArt = pick(pool);
    return lastArt;
  }

  // карточка разрезается по диагонали: блик клинка, искры, половинки разлетаются
  function slashCard(card) {
    return new Promise(resolve => {
      card.classList.remove('dragging', 'flash');
      const r = card.getBoundingClientRect();
      if (!r.width) { resolve(); return; }
      const yL = 0.66, yR = 0.3; // линия разреза: слева ниже, справа выше
      const pieces = [];

      const piece = clip => {
        const c = card.cloneNode(true);
        c.classList.add('cut-piece');
        c.removeAttribute('draggable');
        c.removeAttribute('tabindex');
        c.setAttribute('aria-hidden', 'true');
        Object.assign(c.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', clipPath: clip });
        document.body.appendChild(c);
        pieces.push(c);
        return c;
      };
      const top = piece(`polygon(0 0, 100% 0, 100% ${yR * 100}%, 0 ${yL * 100}%)`);
      const bottom = piece(`polygon(0 ${yL * 100}%, 100% ${yR * 100}%, 100% 100%, 0 100%)`);
      card.style.visibility = 'hidden';

      // геометрия линии разреза
      const x0 = r.left, y0 = r.top + r.height * yL;
      const x1 = r.right, y1 = r.top + r.height * yR;
      const len = Math.hypot(x1 - x0, y1 - y0);
      const ux = (x1 - x0) / len, uy = (y1 - y0) / len;
      const nx = -uy, ny = ux; // нормаль: от верхней половинки к нижней
      const ang = Math.atan2(y1 - y0, x1 - x0);
      const ext = 60;

      const blade = document.createElement('span');
      blade.className = 'cut-blade';
      Object.assign(blade.style, { left: (x0 - ux * ext) + 'px', top: (y0 - uy * ext - 3) + 'px', width: (len + ext * 2) + 'px' });
      document.body.appendChild(blade);
      pieces.push(blade);
      blade.animate([
        { transform: `rotate(${ang}rad) scaleX(0)`, opacity: 1 },
        { transform: `rotate(${ang}rad) scaleX(1)`, opacity: 1, offset: 0.42 },
        { transform: `rotate(${ang}rad) scaleX(1) scaleY(2.4)`, opacity: 0 }
      ], { duration: 460, easing: 'cubic-bezier(.7, 0, .2, 1)' });

      // искры вдоль разреза
      for (let i = 0; i < 14; i++) {
        const t = Math.random();
        const sx = x0 + (x1 - x0) * t, sy = y0 + (y1 - y0) * t;
        const s = document.createElement('span');
        s.className = 'cut-spark';
        s.style.left = sx + 'px';
        s.style.top = sy + 'px';
        document.body.appendChild(s);
        pieces.push(s);
        const side = Math.random() < 0.5 ? -1 : 1;
        const dist = 30 + Math.random() * 70;
        const dx = (nx * side + ux * (Math.random() - 0.5) * 1.6) * dist;
        const dy = (ny * side + uy * (Math.random() - 0.5) * 1.6) * dist;
        s.animate([
          { transform: `translate(-50%, -50%) rotate(${ang}rad) scale(1)`, opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${ang + side}rad) scale(.2)`, opacity: 0 }
        ], { duration: 420 + Math.random() * 300, delay: 120 + t * 120, easing: 'cubic-bezier(.2, .8, .3, 1)', fill: 'both' });
      }

      // половинки разлетаются и падают
      const split = (el, sign, rot) => el.animate([
        { transform: 'none', filter: 'brightness(1)', opacity: 1 },
        { transform: 'none', filter: 'brightness(2.2)', opacity: 1, offset: 0.16 },
        { transform: `translate(${nx * sign * 18}px, ${ny * sign * 18}px) rotate(${rot * 0.4}deg)`, filter: 'brightness(1.1)', opacity: 1, offset: 0.42 },
        { transform: `translate(${nx * sign * 46 + sign * 24}px, ${ny * sign * 46 + 150}px) rotate(${rot}deg)`, filter: 'brightness(.9) blur(1px)', opacity: 0 }
      ], { duration: 1050, delay: 120, easing: 'cubic-bezier(.45, 0, .7, .6)', fill: 'both' });
      split(top, -1, -9);
      split(bottom, 1, 7);
      if (navigator.vibrate) { try { navigator.vibrate(25); } catch (e) { /* ignore */ } }

      setTimeout(resolve, 300);
      setTimeout(() => pieces.forEach(p => p.remove()), 1300);
    });
  }

  // окно с артом-самураем
  function showSamurai({ task, project }) {
    if (celebration) celebration.close(true);
    const isProject = !!project;
    const art = pickArt(isProject ? project.art : '');
    const [title, sub] = isProject ? ['Персонаж готов!', 'Все задачи выкованы'] : pick(TASK_CHEERS);
    const detail = isProject
      ? (project.convention ? `«${project.name}» готов. Впереди — ${project.convention}!` : `«${project.name}» готов к дефиле!`)
      : `«${task.title}»`;

    const node = document.createElement('div');
    node.className = 'samurai-pop' + (isProject ? ' is-project' : '');
    node.setAttribute('role', 'status');
    node.innerHTML = `
      <span class="sp-rays" aria-hidden="true"></span>
      <div class="sp-stage">
        <span class="sp-kanji" aria-hidden="true">${isProject ? '完成' : '見事'}</span>
        ${isProject ? '<span class="sp-shards" aria-hidden="true">' + Array.from({ length: 16 }, (_, i) => `<i style="--a:${i * 22.5}deg;--d:${120 + (i % 4) * 40}px;--dl:${(i % 5) * 40}ms"></i>`).join('') + '</span>' : ''}
        <div class="sp-hero">
          <span class="sp-ground" aria-hidden="true"></span>
          <img src="assets/${art}" alt="" decoding="async">
          <span class="sp-cut" aria-hidden="true"></span>
        </div>
        <div class="sp-banner">
          <b>${escapeHtml(title)}</b>
          <span>${escapeHtml(sub)}</span>
          <small>${escapeHtml(detail)}</small>
        </div>
        <p class="sp-hint">нажми, чтобы продолжить</p>
      </div>`;
    document.body.appendChild(node);

    let closed = false;
    const close = instant => {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey, true);
      if (celebration && celebration.node === node) celebration = null;
      if (instant) { node.remove(); return; }
      node.classList.add('out');
      setTimeout(() => node.remove(), 450);
    };
    const onKey = e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); close(); } };
    node.addEventListener('click', () => close());
    document.addEventListener('keydown', onKey, true);
    const timer = setTimeout(close, isProject ? 4600 : 2900);
    celebration = { node, close };
  }

  function celebrate(task, projectWasDone) {
    const pid = task.projectId;
    const project = pid && !projectWasDone && projectDone(pid) ? projectById(pid) : null;
    if (reducedMotion) {
      toast(project ? `Персонаж «${project.name}» готов!` : 'Выковано! Задача выполнена', { type: 'success' });
      return;
    }
    showSamurai({ task, project });
  }

  // отметить задачу выполненной с праздником (card — карточка на доске, если есть)
  async function completeTask(task, card) {
    const projectWasDone = task.projectId ? projectDone(task.projectId) : false;
    if (card && !reducedMotion) {
      await slashCard(card);
      card.remove(); // новая карточка появится в «Готово», а не прилетит со старого места
    }
    updateTask(task.id, { status: 'done' });
    renderAll({ flashId: task.id });
    setTimeout(() => celebrate(task, projectWasDone), card && !reducedMotion ? 320 : 0);
  }

  /* ---------- Тосты ---------- */
  function toast(message, { type = 'info', action, onAction, duration = 5000 } = {}) {
    const node = document.createElement('div');
    node.className = 'toast glass';
    node.dataset.type = type;
    node.innerHTML = `<span class="toast-mark"></span><span class="toast-msg">${escapeHtml(message)}</span>` +
      (action ? `<button class="toast-action" type="button">${escapeHtml(action)}</button>` : '') +
      `<span class="toast-bar" style="animation-duration:${duration}ms"></span>`;
    el.toasts.appendChild(node);

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      node.classList.add('out');
      node.addEventListener('animationend', () => node.remove(), { once: true });
      setTimeout(() => node.remove(), 600);
    };
    const timer = setTimeout(close, duration);
    if (action) {
      $('.toast-action', node).addEventListener('click', () => {
        clearTimeout(timer);
        if (onAction) onAction();
        close();
      });
    }
    const live = $$('.toast:not(.out)', el.toasts);
    if (live.length > 4) live[0].classList.add('out');
  }

  /* ---------- Тема ---------- */
  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem(KEYS.theme, theme); } catch (e) { /* ignore */ }
  }

  el.themeToggle.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    if (!document.startViewTransition || reducedMotion) { setTheme(next); return; }
    const r = el.themeToggle.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const transition = document.startViewTransition(() => setTheme(next));
    transition.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 760, easing: 'cubic-bezier(.65, 0, .35, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
  });

  /* ---------- Блик стекла и параллакс фона ---------- */
  let raf = 0;
  let lastEvt = null;
  document.addEventListener('pointermove', e => {
    lastEvt = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const ev = lastEvt;
      if (!reducedMotion) {
        el.bg.style.setProperty('--px', ((ev.clientX / innerWidth) - 0.5).toFixed(3));
        el.bg.style.setProperty('--py', ((ev.clientY / innerHeight) - 0.5).toFixed(3));
      }
      const g = ev.target && ev.target.closest ? ev.target.closest('.glass') : null;
      if (!g) return;
      const r = g.getBoundingClientRect();
      g.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
      g.style.setProperty('--my', (ev.clientY - r.top) + 'px');
    });
  }, { passive: true });

  /* ---------- Горячие клавиши ---------- */
  document.addEventListener('keydown', e => {
    if (!el.auth.hidden) return;
    if (e.key === 'Escape' && !el.userMenu.hidden) { closeUserMenu(); el.userBtn.focus(); return; }
    if (e.key === 'Escape') {
      const top = overlays.find(o => o.classList.contains('open'));
      if (top) closeOverlay(top);
      else if (document.activeElement === el.search) el.search.blur();
      return;
    }
    const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');
    if (typing || anyOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'KeyN') { e.preventDefault(); openTaskModal(null); }
    if (e.code === 'KeyP') { e.preventDefault(); openProjectModal(null); }
    if (e.key === '/' || e.code === 'Slash') { e.preventDefault(); el.search.focus(); }
  });

  el.addBtn.addEventListener('click', () => openTaskModal(null));

  /* =========================================================
     Облако: синхронизация через наш API (Vercel + Neon)
     ========================================================= */
  const SYNC_TEXT = {
    local: 'Данные только на этом устройстве',
    syncing: 'Синхронизация…',
    synced: 'Сохранено в облаке',
    offline: 'Нет связи — сохраню, когда появится сеть',
    error: 'Не удалось синхронизировать'
  };
  const cloudReady = () => cloud.available === true;

  // запрос к API; бросает ошибку с кодом из ответа сервера
  async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${API}/${path}`, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* не JSON */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || `http_${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function setSync(status, text) {
    el.syncDot.dataset.status = status;
    el.umSyncDot.dataset.status = status;
    el.umSyncText.textContent = text || SYNC_TEXT[status];
    el.syncDot.title = text || SYNC_TEXT[status];
  }

  function schedulePush() {
    if (!cloud.user) return;
    clearTimeout(cloud.timer);
    setSync('syncing');
    cloud.timer = setTimeout(() => { cloud.timer = 0; push(); }, 700);
  }

  async function push() {
    if (!cloud.user) return;
    if (cloud.pushing) { cloud.pending = true; return; }
    cloud.pushing = true;
    const userId = cloud.user.id;
    const updated_at = new Date(state.updatedAt || Date.now()).toISOString();
    let failed = null;
    try {
      await api('data', { method: 'PUT', body: { data: { tasks: state.tasks, projects: state.projects }, updated_at } });
    } catch (e) { failed = e; }
    cloud.pushing = false;
    if (!cloud.user || cloud.user.id !== userId) return;
    if (failed) {
      if (failed.status === 401) { sessionLost(); return; }
      setSync(navigator.onLine ? 'error' : 'offline');
      return;
    }
    cloud.lastPushed = updated_at;
    if (cloud.pending) { cloud.pending = false; push(); } else setSync('synced');
  }

  async function pull() {
    try {
      const row = await api('data');
      return { ok: true, row: row && row.data ? row : null };
    } catch (e) {
      if (e.status === 401) { sessionLost(); return { ok: false, row: null }; }
      setSync(navigator.onLine ? 'error' : 'offline');
      return { ok: false, row: null };
    }
  }

  // принять версию с другого устройства, если она новее и у нас нет несохранённых правок
  function applyRemote(row, notify) {
    if (!row || !row.data) return false;
    const ts = Date.parse(row.updated_at) || 0;
    if (ts <= (state.updatedAt || 0) || cloud.timer || cloud.pushing) return false;
    applyData(row.data);
    state.updatedAt = ts;
    cloud.lastPushed = row.updated_at;
    writeCache();
    if (!anyOpen()) renderAll({ animate: !notify });
    setSync('synced');
    if (notify) toast('Обновлено с другого устройства', { type: 'success' });
    return true;
  }

  async function syncNow(notify) {
    if (!cloud.user || cloud.syncing) return;
    cloud.syncing = true;
    try {
      const res = await pull();
      if (!res.ok) return;
      if (!applyRemote(res.row, notify)) {
        const remoteTs = res.row ? Date.parse(res.row.updated_at) || 0 : 0;
        if ((state.updatedAt || 0) > remoteTs) push();
        else if (!cloud.timer && !cloud.pushing) setSync('synced');
      }
    } finally {
      cloud.syncing = false;
    }
  }

  async function startCloudUser(user) {
    if (cloud.user && cloud.user.id === user.id) { hideAuth(); return; }
    cloud.user = user;
    store.mode = 'cloud';
    store.userId = user.id;
    try { localStorage.removeItem(KEYS.mode); } catch (e) { /* ignore */ }
    updateUserUi();

    // сначала мгновенно показываем кэш с этого устройства, затем сверяемся с облаком
    const cache = readJSON(KEYS.userCache(user.id));
    applyData(cache || { tasks: [], projects: [] }, { reset: true });
    state.updatedAt = (cache && cache.updatedAt) || 0;
    hideAuth();
    renderAll();
    setSync('syncing');

    const res = await pull();
    if (!cloud.user || cloud.user.id !== user.id || !res.ok) return;

    if (res.row) {
      const remoteTs = Date.parse(res.row.updated_at) || 0;
      if (!cache || remoteTs > state.updatedAt) {
        applyData(res.row.data);
        state.updatedAt = remoteTs;
        cloud.lastPushed = res.row.updated_at;
        writeCache();
        renderAll();
        setSync('synced');
      } else if (state.updatedAt > remoteTs) {
        push();
      } else {
        setSync('synced');
      }
    } else if (!cache) {
      // новый аккаунт: чистый лист — персонажей и задачи человек добавляет сам
      applyData({ tasks: [], projects: [] });
      save();
      renderAll();
    } else {
      push();
    }
    startPolling();
  }

  // проверяем правки с других устройств, пока вкладка открыта
  function startPolling() {
    clearInterval(cloud.poll);
    cloud.poll = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) syncNow(true);
    }, POLL_MS);
  }

  function endCloudUser() {
    clearInterval(cloud.poll);
    cloud.poll = 0;
    clearTimeout(cloud.timer);
    cloud.timer = 0;
    cloud.user = null;
    cloud.lastPushed = null;
    store.mode = 'local';
    store.userId = null;
    applyData({ tasks: [], projects: [] }, { reset: true });
    state.updatedAt = 0;
    updateUserUi();
    setSync('local');
    renderAll({ animate: false });
    showAuth('login');
  }

  // сессия истекла или cookie удалена — просим войти снова
  function sessionLost() {
    if (!cloud.user) return;
    endCloudUser();
    authMessage('Сессия закончилась — войди снова.', 'info');
  }

  async function signOut() {
    closeUserMenu();
    if (!cloud.user) { showAuth('login'); return; }
    if (cloud.timer) { clearTimeout(cloud.timer); cloud.timer = 0; await push(); }
    try { await api('auth/logout', { method: 'POST', body: {} }); } catch (e) { /* ignore */ }
    endCloudUser();
  }

  function startLocal() {
    if (cloud.user) return;
    try { localStorage.setItem(KEYS.mode, 'local'); } catch (e) { /* ignore */ }
    store.mode = 'local';
    store.userId = null;
    loadLocal();
    updateUserUi();
    setSync('local');
    hideAuth();
    renderAll();
  }

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && cloud.user) syncNow(true); });
  window.addEventListener('online', () => { if (cloud.user) syncNow(true); });
  window.addEventListener('offline', () => { if (cloud.user) setSync('offline'); });

  /* =========================================================
     Экран входа и регистрации
     ========================================================= */
  const AUTH_TEXT = {
    login: { title: 'Вход в кузницу', sub: 'Твои костюмы, этапы и бюджет — на любом устройстве.', submit: 'Войти' },
    register: { title: 'Новый мастер', sub: 'Аккаунт хранит твои данные в облаке и открывает их на любом устройстве.', submit: 'Создать аккаунт' }
  };
  let authMode = 'login';
  let galleryBuilt = false;

  function buildGallery() {
    if (galleryBuilt) return;
    galleryBuilt = true;
    const cols = [[], [], []];
    ARTS.forEach((a, i) => cols[i % 3].push(a));
    el.authGallery.innerHTML = cols.map(col => {
      const items = col.map(a => `<span class="print"><img src="assets/${a.file}" alt="" decoding="async"></span>`).join('');
      return `<div class="auth-col">${items}${items}</div>`;
    }).join('');
  }

  function authMessage(text, type = 'info') {
    el.authMsg.textContent = text || '';
    el.authMsg.dataset.type = type;
  }

  function setAuthMode(mode) {
    authMode = mode;
    el.authForm.dataset.mode = mode;
    const t = AUTH_TEXT[mode];
    el.authTitle.textContent = t.title;
    el.authSub.textContent = t.sub;
    $('span', el.authSubmit).textContent = t.submit;
    el.aPass.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    $$('.tab', el.authTabs).forEach(b => b.classList.toggle('is-active', b.dataset.mode === mode));
    $$('.field.invalid', el.authForm).forEach(f => f.classList.remove('invalid'));
    requestAnimationFrame(() => moveInd(el.authTabs));

    if (cloud.available === false) {
      authMessage('Сервер аккаунтов недоступен — проверь интернет и обнови страницу. Пока можно работать без аккаунта.', 'info');
      el.authSubmit.disabled = true;
    } else {
      authMessage('');
      el.authSubmit.disabled = false;
    }
  }

  function showAuth(mode = 'login') {
    closeUserMenu();
    overlays.forEach(closeOverlay);
    buildGallery();
    el.auth.classList.remove('leaving');
    el.auth.hidden = false;
    setAuthMode(mode);
    setTimeout(() => moveInd(el.authTabs), 350);
    setTimeout(() => el.aEmail.focus(), 120);
  }

  function hideAuth() {
    if (el.auth.hidden) return;
    if (reducedMotion) { el.auth.hidden = true; return; }
    el.auth.classList.add('leaving');
    el.auth.addEventListener('animationend', () => {
      el.auth.hidden = true;
      el.auth.classList.remove('leaving');
    }, { once: true });
    requestAnimationFrame(moveAllInd);
  }

  const AUTH_ERRORS = {
    invalid_credentials: 'Неверная почта или пароль',
    email_taken: 'Эта почта уже зарегистрирована — войди',
    invalid_email: 'Похоже, почта указана с ошибкой',
    weak_password: 'Пароль слишком короткий — минимум 6 символов',
    password_too_long: 'Пароль слишком длинный',
    too_many_attempts: 'Слишком много попыток — подожди 15 минут',
    server_error: 'Ошибка сервера — попробуй ещё раз чуть позже'
  };
  function translateAuthError(err) {
    const code = String((err && err.message) || '');
    if (AUTH_ERRORS[code]) return AUTH_ERRORS[code];
    if (/failed to fetch|network/i.test(code)) return 'Нет связи с сервером';
    return 'Что-то пошло не так';
  }

  el.authTabs.addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (tab && tab.dataset.mode !== authMode) setAuthMode(tab.dataset.mode);
  });
  el.authLocalBtn.addEventListener('click', startLocal);
  el.aEye.addEventListener('click', () => {
    const show = el.aPass.type === 'password';
    el.aPass.type = show ? 'text' : 'password';
    el.aEye.classList.toggle('on', show);
    el.aEye.setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль');
  });
  [el.aEmail, el.aPass].forEach(i => i.addEventListener('input', () => i.closest('.field').classList.remove('invalid')));

  el.authForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!cloudReady()) return;
    const email = el.aEmail.value.trim();
    const password = el.aPass.value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { invalid(el.aEmail); return; }
    if (password.length < 6) { invalid(el.aPass); return; }

    el.authSubmit.disabled = true;
    el.authSubmit.classList.add('busy');
    authMessage('');
    try {
      if (authMode === 'register') {
        const { user } = await api('auth/register', { method: 'POST', body: { email, password, name: el.aName.value.trim() } });
        await startCloudUser(user);
        toast('Добро пожаловать в кузницу!', { type: 'success' });
      } else {
        const { user } = await api('auth/login', { method: 'POST', body: { email, password } });
        await startCloudUser(user);
      }
      el.aPass.value = '';
    } catch (err) {
      authMessage(translateAuthError(err), 'error');
    } finally {
      el.authSubmit.classList.remove('busy');
      el.authSubmit.disabled = !cloudReady();
    }
  });

  /* ---------- Меню аккаунта ---------- */
  function updateUserUi() {
    const u = cloud.user;
    const name = u ? (u.name || (u.email || '').split('@')[0] || 'Мастер') : 'Гость';
    const initial = (name.trim().charAt(0) || '?').toUpperCase();
    el.userAvatar.textContent = initial;
    el.umAvatar.textContent = initial;
    el.umName.textContent = name;
    el.umEmail.textContent = u ? u.email : 'локальный режим';
    el.userBtn.title = u ? `${name} · ${u.email}` : 'Гость — данные на этом устройстве';
    el.umLogin.hidden = !!u;
    el.umLogout.hidden = !u;
    el.umSyncNow.hidden = !u;
  }

  function openUserMenu() {
    el.userMenu.classList.remove('out');
    el.userMenu.hidden = false;
    el.userBtn.setAttribute('aria-expanded', 'true');
  }
  function closeUserMenu() {
    if (el.userMenu.hidden) return;
    el.userBtn.setAttribute('aria-expanded', 'false');
    if (reducedMotion) { el.userMenu.hidden = true; return; }
    el.userMenu.classList.add('out');
    el.userMenu.addEventListener('animationend', () => {
      if (el.userMenu.classList.contains('out')) { el.userMenu.hidden = true; el.userMenu.classList.remove('out'); }
    }, { once: true });
  }

  el.userBtn.addEventListener('click', e => {
    e.stopPropagation();
    el.userMenu.hidden ? openUserMenu() : closeUserMenu();
  });
  document.addEventListener('click', e => {
    if (!el.userMenu.hidden && !e.target.closest('.user-wrap')) closeUserMenu();
  });
  el.umLogin.addEventListener('click', () => showAuth('login'));
  el.umLogout.addEventListener('click', signOut);
  el.umSyncNow.addEventListener('click', () => { syncNow(true); });

  el.artsToggle.checked = root.dataset.arts !== 'off';
  el.artsToggle.addEventListener('change', () => {
    const on = el.artsToggle.checked;
    root.dataset.arts = on ? 'on' : 'off';
    try { localStorage.setItem(KEYS.arts, on ? 'on' : 'off'); } catch (e) { /* ignore */ }
    toast(on ? 'Арты на фоне включены' : 'Арты на фоне скрыты', { duration: 2200 });
  });

  /* ---------- Старт ---------- */
  async function boot() {
    setActive(el.spaceSwitch, $(`.seg-btn[data-value="${state.space}"]`, el.spaceSwitch) || $('.seg-btn', el.spaceSwitch));
    updateUserUi();
    setSync('local');
    const wantsLocal = readMode() === 'local';

    // есть ли сервер аккаунтов и открыта ли сессия
    let user = null;
    if (location.protocol.startsWith('http')) {
      try {
        ({ user } = await api('auth/me'));
        cloud.available = true;
      } catch (e) {
        cloud.available = false;
      }
    } else {
      cloud.available = false;
    }

    if (user) startCloudUser(user);
    else if (wantsLocal) startLocal();
    else showAuth('login');

    moveAllInd();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveAllInd);
  }

  function readMode() {
    try { return localStorage.getItem(KEYS.mode); } catch (e) { return null; }
  }

  boot();

  // относительное время и «горящие» задачи обновляются раз в минуту
  setInterval(() => { if (el.auth.hidden && !anyOpen() && !dragId) renderAll({ animate: false }); }, 60000);
})();
