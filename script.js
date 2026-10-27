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
    ai: 'evilsforge.ai',
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
  const DAY = 864e5;
  const INK = '#0b0a14';

  const STATUSES = ['todo', 'progress', 'done'];
  const STATUS_LABEL = { todo: 'К выполнению', progress: 'В работе', done: 'Выполнено' };
  const STATUS_SHORT = { todo: 'Ждёт', progress: 'В работе', done: 'Готово' };
  const PRIORITY = {
    low: { label: 'Низкий', weight: 1, code: 'P3' },
    medium: { label: 'Средний', weight: 2, code: 'P2' },
    high: { label: 'Высокий', weight: 3, code: 'P1' },
    critical: { label: 'Критический', weight: 4, code: 'P0' }
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
  const SPACE_NAME = { workshop: 'Мастерская', personal: 'Личное', all: 'Всё' };
  // арты хранятся как 'art-banner.jpg' (так их помнят сохранённые досье); показываем сжатые WebP нужного размера
  const artUrl = (file, w) => `assets/art/${w}/${String(file).replace(/\.jpg$/, '.webp')}`;
  const artSet = file => `${artUrl(file, 480)} 480w, ${artUrl(file, 960)} 960w`;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const root = document.documentElement;
  // режим анимаций: «Выкл» ставится по настройке системы или вручную в меню (см. <head>)
  let reducedMotion = root.dataset.motion === 'off';
  const phoneQuery = matchMedia('(max-width: 767px)');
  const isPhone = () => phoneQuery.matches;

  const el = {
    app: $('#app'),
    hud: $('#hud'),
    layout: $('#layout'),
    board: $('#board'),
    search: $('#search'),
    searchOpen: $('#searchOpen'),
    searchCancel: $('#searchCancel'),
    addBtn: $('#addBtn'),
    addProjectBtn: $('#addProjectBtn'),
    spaceSwitch: $('#spaceSwitch'),
    spaceBtn: $('#spaceBtn'),
    spaceMenu: $('#spaceMenu'),
    spaceLabel: $('#spaceLabel'),
    statusFilter: $('#statusFilter'),
    toolbar: $('#toolbar'),
    dropzones: $('#dropzones'),
    workFilter: $('#workFilter'),
    priorityFilter: $('#priorityFilter'),
    sortSelect: $('#sortSelect'),
    filtersBtn: $('#filtersBtn'),
    filtersMenu: $('#filtersMenu'),
    filtersDot: $('#filtersDot'),
    projectChip: $('#projectChip'),
    hotChip: $('#hotChip'),
    projectsTrack: $('#projectsTrack'),
    dossierSum: $('#dossierSum'),
    tabbar: $('#tabbar'),

    statline: $('#statline'),
    ringDone: $('#ringDone'),
    ringTotal: $('#ringTotal'),
    statProgress: $('#statProgress'),
    statOverdue: $('#statOverdue'),
    overdueCard: $('#overdueCard'),
    statSpent: $('#statSpent'),
    statPlanned: $('#statPlanned'),
    conStat: $('#conStat'),
    conDays: $('#conDays'),
    conName: $('#conName'),

    panel: $('#panel'),
    panelScrim: $('#panelScrim'),
    statusMenu: $('#statusMenu'),

    taskOverlay: $('#taskOverlay'),
    taskForm: $('#taskForm'),
    modalTitle: $('#modalTitle'),
    submitBtn: $('#submitBtn'),
    fTitle: $('#fTitle'),
    fDesc: $('#fDesc'),
    fProject: $('#fProject'),
    fWork: $('#fWork'),
    fStatus: $('#fStatus'),
    fDeadline: $('#fDeadline'),
    fDeadlineOut: $('#fDeadlineOut'),
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
    pPreview: $('#pPreview'),

    auth: $('#auth'),
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
    umReset: $('#umReset'),
    umKeys: $('#umKeys'),
    motionToggle: $('#motionToggle'),

    specBtn: $('#specBtn'),
    aiStatus: $('#aiStatus'),
    aiStatusText: $('#aiStatusText'),
    keyDot: $('#keyDot'),
    dsOverlay: $('#dsOverlay'),
    dsTitle: $('#dsTitle'),
    dsKeyLabel: $('#dsKeyLabel'),
    dsNoKey: $('#dsNoKey'),
    dsNoKeyText: $('#dsNoKeyText'),
    dsAddKey: $('#dsAddKey'),
    dsMsg: $('#dsMsg'),
    dsSugg: $('#dsSugg'),
    dsSuggList: $('#dsSuggList'),
    dsFile: $('#dsFile'),
    dsCopy: $('#dsCopy'),
    dsDownload: $('#dsDownload'),
    dsRawToggle: $('#dsRawToggle'),
    dsDoc: $('#dsDoc'),
    dsRaw: $('#dsRaw'),
    dsMeta: $('#dsMeta'),
    keyOverlay: $('#keyOverlay'),
    keyForm: $('#keyForm'),
    keyInput: $('#keyInput'),
    keyStatus: $('#keyStatus'),
    keyMsg: $('#keyMsg'),
    keySave: $('#keySave'),
    keyDelete: $('#keyDelete'),
    umAiKey: $('#umAiKey'),
    umAiKeyHint: $('#umAiKeyHint'),
    aKey: $('#aKey'),

    confirmOverlay: $('#confirmOverlay'),
    confirmTitle: $('#confirmTitle'),
    confirmText: $('#confirmText'),
    confirmBtn: $('#confirmBtn'),
    confirmCancel: $('#confirmCancel'),
    keysOverlay: $('#keysOverlay'),
    toasts: $('#toasts')
  };

  const state = {
    tasks: [],
    projects: [],
    space: root.dataset.space || 'all',
    filter: { status: 'active', priority: 'all', work: 'all', project: null, query: '', sort: 'ai', hot: false },
    selectedId: null,
    editingId: null,
    editingProjectId: null,
    draft: { subtasks: [], materials: [] },
    confirmCb: null,
    lastFocus: [],
    shownIds: null,
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

  let onSaved = null; // AI по SPEC подписывается сюда: после изменений пересчитать план
  function save() {
    if (onSaved) onSaved();
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
      })) : [],
      // AI-план: место в списке дел, предложенный приоритет и причина
      aiRank: typeof t.aiRank === 'number' ? t.aiRank : null,
      aiPriority: PRIORITY[t.aiPriority] ? t.aiPriority : null,
      aiReason: typeof t.aiReason === 'string' ? t.aiReason.slice(0, 200) : '',
      aiDone: typeof t.aiDone === 'string' ? t.aiDone.slice(0, 200) : '',
      aiDoneAuto: !!t.aiDoneAuto,       // критерий написал AI (свой текст AI не перезаписывает)
      priorityManual: !!t.priorityManual, // приоритет поставлен руками — AI его не меняет
      aiSig: typeof t.aiSig === 'string' ? t.aiSig.slice(0, 40) : '' // отпечаток задачи на момент плана
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
      createdAt: p.createdAt || Date.now(),
      spec: normalizeSpec(p.spec)
    };
  }

  // AI-часть SPEC досье (пишет Gemini личным ключом); цифры SPEC трекер считает сам
  function normalizeSpec(x) {
    if (!x || typeof x !== 'object') return null;
    const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
    const arr = (v, n, len) => (Array.isArray(v) ? v : []).map(a => str(a, len)).filter(Boolean).slice(0, n);
    return {
      goal: str(x.goal, 300),
      focus: str(x.focus, 400),
      doneCriteria: arr(x.doneCriteria, 6, 200),
      order: (Array.isArray(x.order) ? x.order : []).filter(o => o && o.id).slice(0, 80).map(o => ({ id: String(o.id), reason: str(o.reason, 200) })),
      missing: (Array.isArray(x.missing) ? x.missing : []).filter(m => m && m.title).slice(0, 5).map(m => ({
        id: m.id || uid(), title: str(m.title, 120), why: str(m.why, 200), workType: WORK[m.workType] ? m.workType : null
      })),
      risks: arr(x.risks, 4, 200),
      context: str(x.context, 400),
      model: str(x.model, 60),
      sig: str(x.sig, 40),
      at: typeof x.at === 'number' ? x.at : 0
    };
  }

  function demoData(withPersonal) {
    const now = Date.now();
    const h = 36e5;
    const P = (name, fandom, convention, days, color) => ({ id: uid(), name, fandom, convention, deadline: now + days * DAY, color, art: DEMO_ART[name] || '', createdAt: now - DAY * 10 });
    const p1 = P('Призрачный самурай', 'Ориджинал · Evil\'s Forge', 'Фестиваль', 21, '#e8175d');
    const p2 = P('Гейша-они', 'Ориджинал · арт-серия', 'Конвент', 45, '#6a3aa2');
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
        title: 'Заявка на дефиле фестиваля', description: 'Подать до закрытия регистрации, приложить референсы.' }, 2),
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
    const { priority, work, query, sort, hot } = state.filter;
    const q = query.trim().toLowerCase();
    const workOn = state.space !== 'personal' && work !== 'all';
    const list = scopeTasks().filter(t => {
      if (hot && !isOverdue(t)) return false;
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
      if (sort === 'ai') return (a.aiRank ?? Infinity) - (b.aiRank ?? Infinity) || byPriority(a, b) || byDeadline(a, b);
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

  /* ---------- Срок по-человечески ---------- */
  const timeFmt = new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' });
  const dateFmt = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' });
  const startOfDay = ms => new Date(ms).setHours(0, 0, 0, 0);
  const dayDiff = ms => Math.round((startOfDay(ms) - startOfDay(Date.now())) / DAY);
  const daysWord = n => `${n} ${plural(n, ['день', 'дня', 'дней'])}`;

  // «через 2 дня», «завтра», «сегодня до 19:00», «просрочено на 12 ч»; часы — только в последние сутки
  function humanDue(t) {
    if (t.status === 'done') return { text: t.completedAt ? 'закрыт ' + relative(t.completedAt) : 'закрыт', cls: 'is-done' };
    if (t.deadline == null) return { text: 'без срока', cls: 'is-none' };
    const diff = t.deadline - Date.now();
    if (diff < 0) {
      const ago = -diff;
      if (ago < 36e5) return { text: `просрочено на ${Math.max(1, Math.round(ago / 6e4))} мин`, cls: 'is-overdue' };
      if (ago < DAY) return { text: `просрочено на ${Math.round(ago / 36e5)} ч`, cls: 'is-overdue' };
      return { text: `просрочено на ${daysWord(Math.round(ago / DAY))}`, cls: 'is-overdue' };
    }
    const dd = dayDiff(t.deadline);
    if (dd <= 0) return { text: `сегодня до ${timeFmt.format(t.deadline)}`, cls: 'is-soon' };
    if (dd === 1) return diff < DAY ? { text: `завтра до ${timeFmt.format(t.deadline)}`, cls: 'is-soon' } : { text: 'завтра', cls: '' };
    if (dd <= 30) return { text: `через ${daysWord(dd)}`, cls: '' };
    return { text: 'до ' + dateFmt.format(t.deadline), cls: '' };
  }

  function dueHtml(t) {
    const d = humanDue(t);
    const title = t.deadline != null ? ` title="Срок: ${escapeHtml(absFmt.format(t.deadline))}"` : '';
    return `<span class="due ${d.cls}"${title}>${escapeHtml(d.text)}</span>`;
  }

  // срок до конвента в досье: «Comic Con через 3 дня»
  function conDue(p) {
    if (p.deadline == null) return p.convention ? { text: p.convention, cls: '' } : null;
    const dd = dayDiff(p.deadline);
    const name = p.convention ? p.convention + ' ' : '';
    if (dd < 0) return { text: p.convention ? `${p.convention} — уже прошёл` : 'дата прошла', cls: 'is-past' };
    if (dd === 0) return { text: `${name}сегодня`, cls: 'is-soon' };
    if (dd === 1) return { text: `${name}завтра`, cls: 'is-soon' };
    return { text: `${name}через ${daysWord(dd)}`, cls: dd <= 7 ? 'is-soon' : '' };
  }

  const fmtStamp = ms => {
    if (ms == null) return '';
    const d = new Date(ms);
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  function projectOptions(selected) {
    return '<option value="">Без персонажа</option>' +
      state.projects.map(p => `<option value="${p.id}"${p.id === selected ? ' selected' : ''}>${escapeHtml(p.name)}</option>`).join('');
  }
  function workOptions(selected) {
    return '<option value="">Не указан</option>' +
      Object.entries(WORK).map(([k, w]) => `<option value="${k}"${k === selected ? ' selected' : ''}>${w.label}</option>`).join('');
  }

  /* ---------- Рендер: строки контрактов ---------- */
  const statusMatch = (t, status) => (status === 'active' ? t.status !== 'done' : t.status === status);

  function taskHtml(t) {
    const cls = ['task'];
    if (t.status === 'done') cls.push('is-done');
    if (isOverdue(t)) cls.push('is-overdue');
    if (t.id === state.selectedId) cls.push('is-selected');
    if (state.knownIds && !state.knownIds.has(t.id)) cls.push('is-new');

    const meta = [];
    const proj = projectById(t.projectId);
    if (proj && !state.filter.project) meta.push(escapeHtml(proj.name));
    const work = t.workType && WORK[t.workType];
    if (work) meta.push(work.label);
    if (state.space === 'all' && t.space === 'personal') meta.push('Личное');
    if (t.subtasks.length) meta.push(`этапы <span class="num">${t.subtasks.filter(s => s.done).length}/${t.subtasks.length}</span>`);
    if (state.filter.sort === 'ai' && t.aiRank != null && t.status !== 'done') meta.push(`<span class="ai-rank">AI <span class="num">#${t.aiRank + 1}</span></span>`);
    if (!meta.length && t.description) meta.push(escapeHtml(t.description));

    const planned = taskPlanned(t);
    const moneyHtml = planned > 0 ? `<span class="money" title="Куплено / всего"><b>${money(taskSpent(t))}</b> / ${money(planned)} ₽</span>` : '';
    const p = PRIORITY[t.priority];

    return `
      <div class="${cls.join(' ')}" data-id="${t.id}" data-priority="${t.priority}" draggable="true" tabindex="0" role="listitem">
        <span class="prio" aria-hidden="true"></span><span class="prio-cut" aria-hidden="true"></span>
        <button class="check" type="button" data-act="toggle" aria-label="${t.status === 'done' ? 'Вернуть в работу' : 'Закрыть контракт'}: ${escapeHtml(t.title)}">${icon('check')}</button>
        <div class="task-main">
          <h3 class="task-title">${escapeHtml(t.title)}</h3>
          ${meta.length ? `<p class="task-meta">${meta.join('<span class="sep">·</span>')}</p>` : ''}
        </div>
        <div class="task-side">${dueHtml(t)}${moneyHtml}</div>
        <span class="plabel" title="Приоритет: ${p.label}">${p.code}</span>
        <div class="task-end">
          <button class="status-btn" type="button" data-act="status" aria-haspopup="menu" aria-label="Статус: ${STATUS_LABEL[t.status]}. Изменить"><span class="sdot" data-s="${t.status}"></span>${STATUS_SHORT[t.status]}</button>
          <div class="task-actions">
            <button class="icon-btn" type="button" data-act="edit" aria-label="Открыть контракт" title="Открыть">${icon('edit')}</button>
            <button class="icon-btn" type="button" data-act="delete" aria-label="Удалить контракт" title="Удалить">${icon('trash')}</button>
          </div>
        </div>
      </div>`;
  }

  function emptyHtml() {
    const f = state.filter;
    const filtered = f.query.trim() || f.priority !== 'all' || f.hot || (f.work !== 'all' && state.space !== 'personal');
    if (filtered) {
      return `<div class="empty">Ничего не найдено
        <button type="button" class="btn btn-ghost btn-sm" data-empty="reset"><span>Сбросить фильтры</span></button></div>`;
    }
    if (f.status === 'done') return '<div class="empty">Закрытых пока нет</div>';
    if (f.status === 'progress') return '<div class="empty">Сейчас ничего не в работе<small>Поставь контракту статус «В работе» — кнопкой в строке.</small></div>';
    return `<div class="empty">Нет активных контрактов
      <button type="button" class="btn btn-primary btn-sm" data-empty="task">${icon('plus')}<span>Контракт</span></button></div>`;
  }

  function render({ flashId = null } = {}) {
    const all = getTasks();
    const list = all.filter(t => statusMatch(t, state.filter.status));
    // фокус остаётся на той же строке после перерисовки
    const active = document.activeElement;
    const focusRow = active && el.board.contains(active) ? active.closest('.task') : null;
    const focusId = focusRow && focusRow.dataset.id;
    const focusAct = focusId && active !== focusRow && active.dataset ? active.dataset.act : null;
    el.board.innerHTML = list.length ? list.map(taskHtml).join('') : emptyHtml();
    if (focusId) {
      const row = $(`.task[data-id="${focusId}"]`, el.board);
      const target = row && (focusAct ? $(`[data-act="${focusAct}"]`, row) : row);
      if (target) target.focus({ preventScroll: true });
    }
    ['active', 'progress', 'done'].forEach(s => {
      const c = $(`[data-count="${s}"]`, el.statusFilter);
      if (c) c.textContent = all.filter(t => statusMatch(t, s)).length;
    });
    state.knownIds = new Set(state.tasks.map(t => t.id));

    if (flashId) {
      const node = $(`.task[data-id="${flashId}"]`, el.board);
      if (node) {
        node.classList.add('flash');
        setTimeout(() => node.classList.remove('flash'), 900);
      }
    }
    renderStats();
    renderChips();
  }

  /* ---------- Рендер: досье ---------- */
  function dosArtHtml(p) {
    if (p.art) {
      return `<span class="frame frame-sm dos-art" style="--art:url('${artUrl(p.art, 160)}')"><img src="${artUrl(p.art, 160)}" alt="" width="56" height="56" loading="lazy" decoding="async"><span class="scan" aria-hidden="true"><i></i></span></span>`;
    }
    return `<span class="frame frame-sm dos-art"><span class="dos-letter">${escapeHtml((p.name || '?').trim().charAt(0).toUpperCase() || '?')}</span></span>`;
  }

  function dosInnerHtml(p, { pct = 0, preview = false } = {}) {
    const due = conDue(p);
    return `
        ${dosArtHtml(p)}
        <span class="dos-main">
          <span class="dos-name">${escapeHtml(p.name || 'Имя персонажа')}</span>
          <span class="dos-fandom">${escapeHtml(p.fandom || 'Ориджинал')} · ${pct}%</span>
          ${due ? `<span class="dos-due ${due.cls}">${escapeHtml(due.text)}</span>` : ''}
        </span>
        ${preview ? '' : `<span class="dos-acts"><button type="button" class="icon-btn dos-edit" data-pact="spec" aria-label="SPEC досье «${escapeHtml(p.name)}»" title="SPEC досье">${icon('doc')}</button><button type="button" class="icon-btn dos-edit" data-pact="edit" aria-label="Изменить досье «${escapeHtml(p.name)}»" title="Изменить">${icon('edit')}</button></span>`}
        <span class="dos-bar" aria-hidden="true"></span>`;
  }

  function dosHtml(p, { pct = 0, active = false } = {}) {
    return `
      <div class="dos${active ? ' is-active' : ''}" data-pid="${p.id}" tabindex="0" role="button" aria-pressed="${active}" style="--pc:${p.color};--p:${pct}%" title="${escapeHtml(p.name)}">${dosInnerHtml(p, { pct })}
      </div>`;
  }

  function renderProjects() {
    const track = el.projectsTrack;
    const scroll = track.scrollTop;
    const items = state.projects.map(p => {
      const tasks = state.tasks.filter(t => t.projectId === p.id);
      return dosHtml(p, { pct: Math.round(progressOf(tasks) * 100), active: state.filter.project === p.id });
    }).join('');
    const allActive = !state.filter.project;
    const allItem = state.projects.length ? `
      <div class="dos dos-all${allActive ? ' is-active' : ''}" data-pid="" tabindex="0" role="button" aria-pressed="${allActive}" title="Все персонажи">
        <span class="dos-art">${icon('all')}</span>
        <span class="dos-main"><span class="dos-name">Все персонажи</span><span class="dos-fandom">${state.projects.length} досье</span></span>
      </div>` : '';
    track.innerHTML = allItem + items +
      `<button type="button" class="dos-new" data-pact="new">${icon('plus')}<span>Новое досье</span></button>`;
    track.scrollTop = scroll;
    renderChips();
  }

  function renderChips() {
    const p = state.space !== 'personal' && projectById(state.filter.project);
    el.projectChip.hidden = !p;
    el.specBtn.hidden = !p;
    if (p) {
      el.projectChip.style.setProperty('--pc', p.color);
      el.projectChip.innerHTML = `<span class="pc"></span><span>${escapeHtml(p.name)}</span>${icon('close')}`;
      el.projectChip.title = 'Снять фильтр по персонажу';
    }
    el.hotChip.hidden = !state.filter.hot;
    if (state.filter.hot) {
      el.hotChip.innerHTML = `<span>Только просроченные</span>${icon('close')}`;
      el.hotChip.title = 'Показать все';
    }
    const f = state.filter;
    el.filtersDot.hidden = !(f.priority !== 'all' || f.sort !== 'ai' || (f.work !== 'all' && state.space !== 'personal'));
  }

  /* ---------- Рендер: сводка ---------- */
  function nextConvention() {
    const today = startOfDay(Date.now());
    const pool = state.filter.project ? state.projects.filter(p => p.id === state.filter.project) : state.projects;
    return pool.filter(p => p.deadline != null && p.deadline >= today).sort((a, b) => a.deadline - b.deadline)[0] || null;
  }

  function renderStats() {
    const scope = scopeTasks();
    const total = scope.length;
    const done = scope.filter(t => t.status === 'done').length;
    const overdue = scope.filter(isOverdue).length;
    el.ringDone.textContent = done;
    el.ringTotal.textContent = total;
    el.statProgress.textContent = scope.filter(t => t.status === 'progress').length;
    el.statOverdue.textContent = overdue;
    el.overdueCard.classList.toggle('is-hot', overdue > 0);
    el.overdueCard.classList.toggle('is-on', state.filter.hot);
    $('[data-stat="progress"]', el.statline).classList.toggle('is-on', state.filter.status === 'progress');

    const ws = scope.filter(t => t.space === 'workshop');
    const planned = ws.reduce((s, t) => s + taskPlanned(t), 0);
    const spent = ws.reduce((s, t) => s + taskSpent(t), 0);
    el.statSpent.textContent = money(spent);
    el.statPlanned.textContent = money(planned);

    const next = nextConvention();
    let conText = 'не запланирован';
    if (next) {
      const dd = dayDiff(next.deadline);
      conText = dd <= 0 ? 'сегодня' : `через ${daysWord(dd)}`;
    }
    el.conName.textContent = next ? (next.convention || next.name) : 'Конвент';
    el.conDays.textContent = conText;

    // сводка вверху вкладки «Досье» на телефоне
    el.dossierSum.innerHTML = state.space === 'personal' ? '' :
      `<span class="st"><span class="st-l">Бюджет</span><b class="st-v">${money(spent)} / ${money(planned)} ₽</b></span>` +
      (next ? `<span class="st"><span class="st-l">${escapeHtml(next.convention || next.name)}</span><b class="st-v">${escapeHtml(conText)}</b></span>` : '') +
      (overdue ? `<span class="st is-hot"><span class="st-l">Горит</span><b class="st-v">${overdue}</b></span>` : '');
  }

  function renderAll(opts) {
    renderProjects();
    render(opts);
    renderPanelIfSafe();
    if (el.dsOverlay.classList.contains('open')) renderDossierSpec();
  }

  /* ---------- Сегменты ---------- */
  function setActive(container, btn) {
    $$('.seg-btn, .tab', container).forEach(b => {
      const on = b === btn;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  /* ---------- Меню: пространство, фильтры, статус, аккаунт ---------- */
  let menuScrim = null;
  const menuOwners = () => [[el.spaceMenu, el.spaceBtn], [el.filtersMenu, el.filtersBtn], [el.statusMenu, null], [el.userMenu, el.userBtn]];
  const anyMenuOpen = () => menuOwners().some(([m]) => !m.hidden);

  function openMenu(menu, btn) {
    closeMenus(menu);
    menu.hidden = false;
    if (btn) btn.setAttribute('aria-expanded', 'true');
    if (isPhone() && (menu === el.userMenu || menu === el.filtersMenu)) {
      if (!menuScrim) {
        menuScrim = document.createElement('div');
        menuScrim.className = 'menu-scrim';
        menuScrim.addEventListener('click', () => closeMenus());
      }
      document.body.appendChild(menuScrim);
      document.body.classList.add('has-menu-scrim');
    }
  }
  function closeMenus(except) {
    menuOwners().forEach(([m, b]) => {
      if (m === except || m.hidden) return;
      m.hidden = true;
      if (b) b.setAttribute('aria-expanded', 'false');
    });
    if (menuScrim && !(except && (except === el.userMenu || except === el.filtersMenu))) {
      menuScrim.remove();
      document.body.classList.remove('has-menu-scrim');
    }
  }
  function toggleMenu(menu, btn) { menu.hidden ? openMenu(menu, btn) : closeMenus(); }

  document.addEventListener('click', e => {
    if (!anyMenuOpen()) return;
    if (e.target.closest('.menu, #spaceBtn, #filtersBtn, #userBtn, [data-act="status"], .tab-item[data-tab="more"]')) return;
    closeMenus();
  });

  // стрелки внутри меню
  document.addEventListener('keydown', e => {
    const menu = e.target.closest && e.target.closest('.menu');
    if (!menu || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
    const items = $$('.menu-item', menu).filter(i => !i.hidden && i.offsetParent !== null);
    if (!items.length) return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? items[(i + 1) % items.length] : items[(i - 1 + items.length) % items.length];
    next.focus();
  });

  /* ---------- Пространства ---------- */
  function setSpace(space) {
    state.space = space;
    root.dataset.space = space;
    try { localStorage.setItem(KEYS.space, space); } catch (e) { /* ignore */ }
    if (space === 'personal') state.filter.project = null;
    setActive(el.spaceSwitch, $(`.seg-btn[data-value="${space}"]`, el.spaceSwitch));
    el.spaceLabel.textContent = SPACE_NAME[space];
    $$('.menu-item', el.spaceMenu).forEach(b => b.setAttribute('aria-checked', String(b.dataset.value === space)));
    // смена пространства — список просто проявляется за 150 мс, без «сбоя»
    if (!reducedMotion) el.board.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'linear' });
    if (panel.id) {
      const t = state.tasks.find(x => x.id === panel.id);
      if (t && !inSpace(t)) closePanel();
    }
    renderAll();
  }

  el.spaceSwitch.addEventListener('click', e => {
    const btn = e.target.closest('.seg-btn');
    if (btn && btn.dataset.value !== state.space) setSpace(btn.dataset.value);
  });
  el.spaceBtn.addEventListener('click', () => toggleMenu(el.spaceMenu, el.spaceBtn));
  el.spaceMenu.addEventListener('click', e => {
    const b = e.target.closest('.menu-item');
    if (!b) return;
    closeMenus();
    if (b.dataset.value !== state.space) setSpace(b.dataset.value);
    el.spaceBtn.focus();
  });

  /* ---------- Фильтры и сводка ---------- */
  el.workFilter.innerHTML = '<option value="all">Любой</option>' +
    Object.entries(WORK).map(([k, w]) => `<option value="${k}">${w.label}</option>`).join('');

  function setStatusFilter(value) {
    state.filter.status = value;
    el.board.dataset.filter = value;
    setActive(el.statusFilter, $(`.seg-btn[data-value="${value}"]`, el.statusFilter));
    render();
  }
  el.statusFilter.addEventListener('click', e => {
    const btn = e.target.closest('.seg-btn');
    if (btn && !btn.classList.contains('is-active')) setStatusFilter(btn.dataset.value);
  });

  el.statline.addEventListener('click', e => {
    const st = e.target.closest('button.st');
    if (!st) return;
    if (st.dataset.stat === 'progress') setStatusFilter(state.filter.status === 'progress' ? 'active' : 'progress');
    if (st.dataset.stat === 'overdue') {
      state.filter.hot = !state.filter.hot;
      if (state.filter.hot && state.filter.status === 'done') setStatusFilter('active');
      else render();
    }
  });

  function resetFilters() {
    Object.assign(state.filter, { query: '', priority: 'all', work: 'all', hot: false });
    el.search.value = '';
    el.priorityFilter.value = 'all';
    el.workFilter.value = 'all';
    render();
  }

  el.filtersBtn.addEventListener('click', () => toggleMenu(el.filtersMenu, el.filtersBtn));
  el.workFilter.addEventListener('change', () => { state.filter.work = el.workFilter.value; render(); });
  el.priorityFilter.addEventListener('change', () => { state.filter.priority = el.priorityFilter.value; render(); });
  el.sortSelect.addEventListener('change', () => { state.filter.sort = el.sortSelect.value; render(); });
  el.projectChip.addEventListener('click', () => { state.filter.project = null; renderAll(); });
  el.hotChip.addEventListener('click', () => { state.filter.hot = false; render(); });

  let searchTimer = 0;
  el.search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.filter.query = el.search.value; render(); }, 120);
  });
  el.searchOpen.addEventListener('click', () => {
    el.hud.classList.add('search-open');
    setTimeout(() => el.search.focus(), 30);
  });
  el.searchCancel.addEventListener('click', e => {
    e.preventDefault();
    el.hud.classList.remove('search-open');
    if (el.search.value) { el.search.value = ''; state.filter.query = ''; render(); }
  });

  /* ---------- Досье: клики ---------- */
  function toggleProjectFilter(id) {
    state.filter.project = id && state.filter.project !== id ? id : null;
    if (isPhone()) setView('list');
    renderAll();
  }

  el.projectsTrack.addEventListener('click', e => {
    const act = e.target.closest('[data-pact]');
    if (act && act.dataset.pact === 'new') { openProjectModal(null); return; }
    const item = e.target.closest('.dos[data-pid]');
    if (!item) return;
    if (act && act.dataset.pact === 'edit') { openProjectModal(projectById(item.dataset.pid)); return; }
    if (act && act.dataset.pact === 'spec') { openDossierSpec(item.dataset.pid); return; }
    toggleProjectFilter(item.dataset.pid || null);
  });
  el.projectsTrack.addEventListener('keydown', e => {
    const item = e.target.closest('.dos[data-pid]');
    if (!item || e.target !== item) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleProjectFilter(item.dataset.pid || null); }
  });
  el.addProjectBtn.addEventListener('click', () => openProjectModal(null));

  /* =========================================================
     Панель контракта: просмотр и правка с автосохранением.
     Пока поле в фокусе, синхронизация не перерисовывает панель;
     сохраняются только изменённые поля.
     ========================================================= */
  const panel = { id: null, shownAt: 0, timer: 0, stale: false, pushed: false, draft: null, dirty: new Set() };
  const panelTask = () => (panel.id ? state.tasks.find(t => t.id === panel.id) || null : null);
  const panelFocused = () => !!panel.id && el.panel.contains(document.activeElement) && !!document.activeElement.matches('input, textarea, select');

  function autoGrow(ta) {
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }

  function setSaveState(kind) {
    const s = $('#panelSave', el.panel);
    if (!s) return;
    s.classList.toggle('is-saving', kind === 'saving');
    s.textContent = kind === 'saving' ? 'Сохраняю…' : 'Сохранено ✓';
  }

  function panelSubsHtml() {
    const list = panel.draft.subtasks;
    return list.length ? list.map(s => `
      <li data-rid="${s.id}" class="${s.done ? 'is-done' : ''}">
        <input type="checkbox" class="dcheck" aria-label="Этап выполнен" ${s.done ? 'checked' : ''}>
        <input type="text" value="${escapeHtml(s.text)}" maxlength="120" aria-label="Название этапа">
        <button type="button" class="row-del" aria-label="Удалить этап">${icon('trash')}</button>
      </li>`).join('') : '<li class="editor-empty">Этапов пока нет</li>';
  }

  function panelMatsHtml() {
    const list = panel.draft.materials;
    return list.length ? list.map(m => `
      <li data-rid="${m.id}" class="${m.bought ? 'is-bought' : ''}">
        <input type="text" data-f="name" value="${escapeHtml(m.name)}" maxlength="80" placeholder="Например, EVA 5 мм" aria-label="Материал">
        <input type="number" data-f="qty" value="${m.qty}" min="0" step="1" inputmode="decimal" aria-label="Количество">
        <input type="number" data-f="price" value="${m.price}" min="0" step="10" inputmode="decimal" aria-label="Цена за единицу, ₽">
        <input type="checkbox" class="dcheck" data-f="bought" aria-label="Куплено" ${m.bought ? 'checked' : ''}>
        <button type="button" class="row-del" aria-label="Удалить материал">${icon('trash')}</button>
      </li>`).join('') : '<li class="editor-empty">Список закупок пуст</li>';
  }

  function updatePanelCounts() {
    const subs = panel.draft.subtasks;
    const c = $('[data-sub-count]', el.panel);
    if (c) c.textContent = subs.length ? `${subs.filter(s => s.done).length}/${subs.length}` : '';
    const mc = $('[data-mat-count]', el.panel);
    if (mc) {
      const ms = panel.draft.materials;
      mc.textContent = ms.length || '';
      $('[data-mat-total]', el.panel).textContent = money(ms.reduce((s, m) => s + m.qty * m.price, 0)) + ' ₽';
      $('[data-mat-spent]', el.panel).textContent = 'куплено на ' + money(ms.reduce((s, m) => s + (m.bought ? m.qty * m.price : 0), 0)) + ' ₽';
    }
  }

  function renderPanelLists() {
    const subs = $('[data-list="subs"]', el.panel);
    if (subs) subs.innerHTML = panelSubsHtml();
    const mats = $('[data-list="mats"]', el.panel);
    if (mats) mats.innerHTML = panelMatsHtml();
    updatePanelCounts();
  }

  const prioHintHtml = task => (task.priorityManual
    ? `<button type="button" class="link-btn" data-pact="ai-prio" title="Сейчас приоритет закреплён вручную">${icon('spark')}<span>Вернуть приоритет AI</span></button>`
    : (task.aiReason ? '<small class="field-hint mono">Приоритет — AI по SPEC</small>' : ''));

  function renderPanel(task) {
    const same = el.panel.dataset.id === task.id;
    const oldBody = $('.panel-body', el.panel);
    const scroll = same && oldBody ? oldBody.scrollTop : 0;
    const proj = projectById(task.projectId);
    const ws = task.space === 'workshop';
    panel.draft = {
      subtasks: task.subtasks.map(s => Object.assign({}, s)),
      materials: task.materials.map(m => Object.assign({}, m))
    };
    panel.dirty.clear();
    el.panel.dataset.id = task.id;
    const prio = ['critical', 'high', 'medium', 'low'].map(v =>
      `<label class="seg-opt" data-p="${v}"><input type="radio" name="pfPrio" value="${v}" data-f="priority" ${task.priority === v ? 'checked' : ''}><span><b>${PRIORITY[v].code}</b></span></label>`).join('');

    el.panel.innerHTML = `
      <header class="panel-head">
        <button type="button" class="icon-btn back" data-pact="close" aria-label="Назад к списку">${icon('back')}</button>
        <span class="mono-label">Контракт</span>
        <span class="save-state" id="panelSave" aria-live="polite">Сохранено ✓</span>
        <button type="button" class="icon-btn close-x" data-pact="close" aria-label="Закрыть панель (Esc)" title="Закрыть (Esc)">${icon('close')}</button>
      </header>
      <div class="panel-body" tabindex="-1">
        ${proj && proj.art ? `<span class="frame panel-art" style="--art:url('${artUrl(proj.art, 480)}')"><img src="${artUrl(proj.art, 480)}" srcset="${artSet(proj.art)}" sizes="400px" alt="${escapeHtml(proj.name)} — арт" decoding="async"><span class="scan" aria-hidden="true"><i></i></span></span>` : ''}
        <textarea class="panel-title" data-f="title" rows="1" maxlength="120" aria-label="Название контракта">${escapeHtml(task.title)}</textarea>
        <div class="seg seg-full seg-form" role="radiogroup" aria-label="Статус">
          ${STATUSES.map(s => `<label class="seg-opt"><input type="radio" name="pfStatus" value="${s}" data-f="status" ${task.status === s ? 'checked' : ''}><span>${STATUS_LABEL[s]}</span></label>`).join('')}
        </div>
        <dl class="kv">
          <dt>Пространство</dt>
          <dd><div class="seg seg-form" role="radiogroup" aria-label="Пространство">${['workshop', 'personal'].map(v =>
            `<label class="seg-opt"><input type="radio" name="pfSpace" value="${v}" data-f="space" ${task.space === v ? 'checked' : ''}><span>${SPACE_NAME[v]}</span></label>`).join('')}</div></dd>
          ${ws ? `
          <dt><label for="pfProject">Персонаж</label></dt>
          <dd><select class="select" id="pfProject" data-f="projectId">${projectOptions(task.projectId)}</select>${proj ? `<button type="button" class="link-btn" data-pact="spec">${icon('doc')}<span>SPEC досье</span></button>` : ''}</dd>
          <dt><label for="pfWork">Тип работы</label></dt>
          <dd><select class="select" id="pfWork" data-f="workType">${workOptions(task.workType)}</select></dd>` : ''}
          <dt><label for="pfDeadline">Срок</label></dt>
          <dd><input class="input" type="datetime-local" id="pfDeadline" data-f="deadline" value="${toLocalInput(task.deadline)}"><small class="field-hint mono" data-due-out>${fmtStamp(task.deadline)}</small></dd>
          <dt>Приоритет</dt>
          <dd><div class="seg seg-form seg-prio" role="radiogroup" aria-label="Приоритет">${prio}</div><span data-prio-hint>${prioHintHtml(task)}</span></dd>
        </dl>
        <section class="p-section p-done">
          <h4><label for="pfDone">Готово, когда</label></h4>
          <textarea class="input" id="pfDone" data-f="aiDone" rows="2" maxlength="200" placeholder="Проверяемый критерий: «кираса надета и держится 2 часа»">${escapeHtml(task.aiDone)}</textarea>
          ${task.aiReason ? `<p class="p-why"><b>AI:</b> ${escapeHtml(task.aiReason)}</p>` : ''}
        </section>
        <section class="p-section">
          <h4><label for="pfDesc">Описание</label></h4>
          <textarea class="input" id="pfDesc" data-f="description" rows="3" maxlength="600" placeholder="Детали, референсы, заметки…">${escapeHtml(task.description)}</textarea>
        </section>
        <section class="p-section">
          <h4>Этапы <i class="cnt" data-sub-count></i></h4>
          <ul class="editor-list" data-list="subs"></ul>
          <div class="add-row">
            <input class="input" type="text" maxlength="120" data-new="sub" placeholder="Новый этап, Enter — добавить" aria-label="Новый этап" enterkeyhint="enter">
            <button type="button" class="btn btn-ghost btn-sm" data-pact="add-sub">${icon('plus')}<span>Этап</span></button>
          </div>
        </section>
        ${ws ? `
        <section class="p-section">
          <h4>Материалы <i class="cnt" data-mat-count></i></h4>
          <ul class="editor-list mat-list" data-list="mats"></ul>
          <div class="add-row"><button type="button" class="btn btn-ghost btn-sm" data-pact="add-mat">${icon('plus')}<span>Материал</span></button></div>
          <div class="mat-total-row"><span>Итого</span><span><b data-mat-total></b> <small data-mat-spent></small></span></div>
        </section>` : ''}
        <footer class="panel-foot">
          ${task.status === 'done'
            ? `<button type="button" class="btn btn-ghost" data-pact="reopen">${icon('undo')}<span>Вернуть в работу</span></button>`
            : `<button type="button" class="btn btn-primary" data-pact="complete">${icon('check')}<span>Закрыть контракт</span></button>`}
          <button type="button" class="btn btn-danger-ghost" data-pact="delete">${icon('trash')}<span>Удалить</span></button>
        </footer>
        <p class="panel-meta">Создан ${escapeHtml(absFmt.format(task.createdAt))}${task.updatedAt - task.createdAt > 1000 ? ' · изменён ' + escapeHtml(relative(task.updatedAt)) : ''}</p>
      </div>`;
    renderPanelLists();
    autoGrow($('.panel-title', el.panel));
    panel.shownAt = task.updatedAt;
    panel.stale = false;
    const body = $('.panel-body', el.panel);
    if (body) body.scrollTop = scroll;
  }

  function openPanel(task, { focusTitle = false } = {}) {
    if (!task) return;
    flushPanel();
    const wasOpen = !!panel.id;
    panel.id = task.id;
    state.selectedId = task.id;
    el.panel.hidden = false;
    el.panelScrim.hidden = false;
    el.layout.classList.add('has-panel');
    renderPanel(task);
    $$('.task.is-selected', el.board).forEach(n => n.classList.remove('is-selected'));
    const row = $(`.task[data-id="${task.id}"]`, el.board);
    if (row) row.classList.add('is-selected');
    if (!wasOpen) {
      el.panel.classList.remove('is-entering');
      void el.panel.offsetWidth;
      el.panel.classList.add('is-entering');
    }
    const art = $('.panel-art', el.panel);
    if (art && !reducedMotion) { art.classList.add('is-scanning'); setTimeout(() => art.classList.remove('is-scanning'), 700); }
    if (isPhone() && !panel.pushed) {
      try { history.pushState({ efPanel: task.id }, ''); panel.pushed = true; } catch (e) { /* ignore */ }
    }
    if (focusTitle) setTimeout(() => { const t = $('.panel-title', el.panel); if (t) t.focus(); }, 40);
    else if (isPhone() || !wasOpen) setTimeout(() => { const b = $('.panel-body', el.panel); if (b && document.activeElement && !el.panel.contains(document.activeElement)) b.focus({ preventScroll: true }); }, 40);
  }

  function closePanel({ fromHistory = false, restoreFocus = true } = {}) {
    if (!panel.id) return;
    flushPanel();
    const id = panel.id;
    panel.id = null;
    state.selectedId = null;
    el.panel.hidden = true;
    el.panel.innerHTML = '';
    delete el.panel.dataset.id;
    el.panelScrim.hidden = true;
    el.layout.classList.remove('has-panel');
    $$('.task.is-selected', el.board).forEach(n => n.classList.remove('is-selected'));
    if (panel.pushed) {
      panel.pushed = false;
      if (!fromHistory) { try { history.back(); } catch (e) { /* ignore */ } }
    }
    if (restoreFocus) {
      const row = $(`.task[data-id="${id}"]`, el.board);
      if (row) row.focus({ preventScroll: isPhone() });
    }
  }
  window.addEventListener('popstate', () => { if (panel.id && panel.pushed) closePanel({ fromHistory: true }); });
  el.panelScrim.addEventListener('click', () => closePanel());

  // собрать только изменённые поля
  function collectPanel() {
    const t = panelTask();
    if (!t) return null;
    const f = n => $(`[data-f="${n}"]`, el.panel);
    const checked = n => { const x = $(`[data-f="${n}"]:checked`, el.panel); return x ? x.value : null; };
    const space = checked('space') || t.space;
    const ws = space === 'workshop';
    const all = {
      title: (f('title').value.trim() || t.title).slice(0, 120),
      description: f('description').value.trim(),
      aiDone: f('aiDone') ? f('aiDone').value.trim().slice(0, 200) : t.aiDone,
      space,
      projectId: ws ? (f('projectId') ? f('projectId').value || null : t.projectId) : null,
      workType: ws ? (f('workType') ? f('workType').value || null : t.workType) : null,
      deadline: fromInput(f('deadline').value),
      priority: checked('priority') || t.priority,
      subtasks: panel.draft.subtasks.filter(s => s.text.trim()).map(s => ({ id: s.id, text: s.text.trim(), done: !!s.done })),
      materials: ws ? panel.draft.materials.filter(m => m.name.trim()).map(m => Object.assign({}, m, { name: m.name.trim() })) : []
    };
    const patch = {};
    panel.dirty.forEach(k => { if (k in all) patch[k] = all[k]; });
    if (patch.space === 'personal') { patch.projectId = null; patch.workType = null; patch.materials = []; }
    return patch;
  }

  function commitPanel() {
    clearTimeout(panel.timer);
    panel.timer = 0;
    const t = panelTask();
    if (!t) return;
    const patch = collectPanel();
    panel.dirty.clear();
    if (patch && 'priority' in patch && patch.priority !== t.priority) patch.priorityManual = true;
    if (patch && 'aiDone' in patch && patch.aiDone !== t.aiDone) patch.aiDoneAuto = false;
    const changed = patch && Object.keys(patch).some(k => JSON.stringify(t[k]) !== JSON.stringify(patch[k]));
    if (changed) {
      updateTask(t.id, patch);
      const hint = $('[data-prio-hint]', el.panel);
      if (hint) hint.innerHTML = prioHintHtml(t);
      panel.shownAt = t.updatedAt;
      renderProjects();
      render();
    }
    setSaveState('saved');
  }
  function schedulePanelSave(field) {
    if (field) panel.dirty.add(field);
    setSaveState('saving');
    clearTimeout(panel.timer);
    panel.timer = setTimeout(commitPanel, 600);
  }
  function flushPanel() { if (panel.timer) commitPanel(); }

  // перерисовать панель, если задачу изменили не здесь (синхронизация, AI-план, список)
  function renderPanelIfSafe() {
    if (!panel.id) return;
    const t = panelTask();
    if (!t) { closePanel({ restoreFocus: false }); return; }
    if (t.updatedAt === panel.shownAt) return;
    if (panelFocused() || panel.timer) { panel.stale = true; return; }
    renderPanel(t);
  }

  el.panel.addEventListener('focusout', () => {
    setTimeout(() => {
      if (!panel.stale || panelFocused()) return;
      panel.stale = false;
      toast('Задача изменена на другом устройстве', {
        action: 'Обновить',
        onAction: () => { const t = panelTask(); if (t) renderPanel(t); }
      });
    }, 0);
  });

  el.panel.addEventListener('input', e => {
    const tgt = e.target;
    const f = tgt.dataset.f;
    if (tgt.classList.contains('panel-title')) autoGrow(tgt);
    const li = tgt.closest('li[data-rid]');
    if (li) {
      const isMat = !!tgt.closest('[data-list="mats"]');
      const list = isMat ? panel.draft.materials : panel.draft.subtasks;
      const item = list.find(x => x.id === li.dataset.rid);
      if (!item || tgt.type === 'checkbox') return;
      if (f === 'qty' || f === 'price') item[f] = num(tgt.value, 0);
      else if (f === 'name') item.name = tgt.value;
      else item.text = tgt.value;
      updatePanelCounts();
      schedulePanelSave(isMat ? 'materials' : 'subtasks');
      return;
    }
    if (f === 'title' || f === 'description' || f === 'aiDone') schedulePanelSave(f);
    if (f === 'deadline') { const o = $('[data-due-out]', el.panel); if (o) o.textContent = fmtStamp(fromInput(tgt.value)); }
  });

  el.panel.addEventListener('change', e => {
    const tgt = e.target;
    const f = tgt.dataset.f;
    const t = panelTask();
    if (!t) return;
    const li = tgt.closest('li[data-rid]');
    if (li && tgt.type === 'checkbox') {
      const isMat = !!tgt.closest('[data-list="mats"]');
      const list = isMat ? panel.draft.materials : panel.draft.subtasks;
      const item = list.find(x => x.id === li.dataset.rid);
      if (!item) return;
      if (isMat) item.bought = tgt.checked; else item.done = tgt.checked;
      li.classList.toggle(isMat ? 'is-bought' : 'is-done', tgt.checked);
      panel.dirty.add(isMat ? 'materials' : 'subtasks');
      commitPanel();
      updatePanelCounts();
      if (!isMat && tgt.checked && t.status !== 'done' && panel.draft.subtasks.length && panel.draft.subtasks.every(s => s.done)) {
        toast('Все этапы закрыты', {
          type: 'success', action: 'Закрыть контракт',
          onAction: () => { const x = panelTask() || state.tasks.find(y => y.id === t.id); if (x) completeTask(x, $(`.task[data-id="${x.id}"]`, el.board)); }
        });
      }
      return;
    }
    if (f === 'status') {
      flushPanel();
      setTaskStatus(t, tgt.value, $(`.task[data-id="${t.id}"]`, el.board));
      return;
    }
    if (f === 'space' || f === 'projectId' || f === 'workType' || f === 'deadline' || f === 'priority') {
      panel.dirty.add(f);
      commitPanel();
      if (f === 'space' || f === 'projectId') {
        const fresh = panelTask();
        if (fresh) {
          renderPanel(fresh);
          const again = $(`[data-f="${f}"]${f === 'space' ? ':checked' : ''}`, el.panel);
          if (again) again.focus();
        }
        if (fresh && !inSpace(fresh)) setSpace('all');
      }
    }
  });

  el.panel.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('[data-new="sub"]')) { e.preventDefault(); panelAddSub(); return; }
    if (e.key === 'Enter' && e.target.classList.contains('panel-title')) { e.preventDefault(); e.target.blur(); return; }
    if (e.key === 'Enter' && e.target.matches('li input')) e.preventDefault();
  });

  function panelAddSub() {
    const input = $('[data-new="sub"]', el.panel);
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    panel.draft.subtasks.push({ id: uid(), text, done: false });
    input.value = '';
    renderPanelLists();
    panel.dirty.add('subtasks');
    commitPanel();
    input.focus();
  }

  el.panel.addEventListener('click', e => {
    const del = e.target.closest('.row-del');
    if (del) {
      const li = del.closest('li[data-rid]');
      const isMat = !!del.closest('[data-list="mats"]');
      const list = isMat ? panel.draft.materials : panel.draft.subtasks;
      const i = list.findIndex(x => x.id === li.dataset.rid);
      if (i > -1) list.splice(i, 1);
      renderPanelLists();
      panel.dirty.add(isMat ? 'materials' : 'subtasks');
      commitPanel();
      return;
    }
    const act = e.target.closest('[data-pact]');
    if (!act) return;
    const t = panelTask();
    const a = act.dataset.pact;
    if (a === 'close') { closePanel(); return; }
    if (!t) return;
    if (a === 'spec') { flushPanel(); if (t.projectId) openDossierSpec(t.projectId); return; }
    if (a === 'ai-prio') {
      flushPanel();
      updateTask(t.id, { priorityManual: false, aiSig: '' });
      renderPanel(t);
      toast(aiReady() ? 'Приоритет снова расставит AI' : 'Приоритет снова расставит AI, когда будет ключ Gemini', { duration: 2600 });
      return;
    }
    if (a === 'add-sub') panelAddSub();
    else if (a === 'add-mat') {
      const m = { id: uid(), name: '', qty: 1, price: 0, bought: false };
      panel.draft.materials.push(m);
      renderPanelLists();
      const inp = $(`li[data-rid="${m.id}"] input[data-f="name"]`, el.panel);
      if (inp) inp.focus();
    } else if (a === 'complete') { flushPanel(); completeTask(t, $(`.task[data-id="${t.id}"]`, el.board)); }
    else if (a === 'reopen') { flushPanel(); setTaskStatus(t, 'todo'); }
    else if (a === 'delete') { flushPanel(); askDeleteTask(t); }
  });

  /* ---------- Оверлеи ---------- */
  const overlays = [el.confirmOverlay, el.keyOverlay, el.keysOverlay, el.projectOverlay, el.taskOverlay, el.dsOverlay];

  function openOverlay(overlay, focusEl) {
    closeMenus();
    state.lastFocus.push(document.activeElement);
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    setTimeout(() => focusEl && focusEl.focus(), 60);
  }
  function closeOverlay(overlay) {
    if (!overlay.classList.contains('open')) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    const f = state.lastFocus.pop();
    if (f && document.contains(f) && f.focus) f.focus({ preventScroll: true });
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
    openOverlay(el.confirmOverlay, el.confirmCancel);
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

  /* ---------- Окно нового контракта ---------- */
  const formSpace = () => (new FormData(el.taskForm).get('space') || 'workshop');
  const applyFormSpace = () => { el.taskForm.dataset.space = formSpace(); };

  function fillTaskSelects(task) {
    el.fProject.innerHTML = projectOptions(task ? task.projectId : state.filter.project);
    el.fWork.innerHTML = workOptions(task ? task.workType : (state.filter.work !== 'all' ? state.filter.work : null));
  }

  function showDeadlineOut() {
    el.fDeadlineOut.textContent = el.fDeadline.value ? fmtStamp(fromInput(el.fDeadline.value)) : '';
  }

  function openTaskModal(task) {
    state.editingId = task ? task.id : null;
    state.draft = {
      subtasks: task ? task.subtasks.map(s => Object.assign({}, s)) : [],
      materials: task ? task.materials.map(m => Object.assign({}, m)) : []
    };
    el.taskForm.reset();
    $$('.field.invalid', el.taskForm).forEach(f => f.classList.remove('invalid'));
    el.modalTitle.textContent = task ? 'Контракт' : 'Новый контракт';
    $$('button[type="submit"] span', el.taskForm).forEach(s => { s.textContent = task ? 'Сохранить' : 'Создать'; });

    const space = task ? task.space : (state.space === 'personal' ? 'personal' : 'workshop');
    $(`input[name="space"][value="${space}"]`, el.taskForm).checked = true;
    el.fTitle.value = task ? task.title : '';
    el.fDesc.value = task ? task.description : '';
    el.fStatus.value = task ? task.status : (state.filter.status === 'progress' ? 'progress' : 'todo');
    el.fDeadline.value = task ? toLocalInput(task.deadline) : '';
    showDeadlineOut();
    $(`input[name="priority"][value="${task ? task.priority : 'medium'}"]`, el.taskForm).checked = true;
    fillTaskSelects(task);
    $('#foldDesc').open = !!(task && task.description);
    $('#foldSubs').open = !!(task && task.subtasks.length);
    $('#foldMats').open = !!(task && task.materials.length);

    renderSubEditor();
    renderMatEditor();
    el.taskForm.dataset.space = space;
    openOverlay(el.taskOverlay, el.fTitle);
  }

  $('#fSpace').addEventListener('change', applyFormSpace);
  el.fDeadline.addEventListener('input', showDeadlineOut);

  // --- этапы
  function renderSubEditor() {
    const list = state.draft.subtasks;
    el.subEditor.innerHTML = list.length ? list.map(s => `
      <li data-rid="${s.id}" class="${s.done ? 'is-done' : ''}">
        <input type="checkbox" class="dcheck" aria-label="Этап выполнен" ${s.done ? 'checked' : ''}>
        <input type="text" value="${escapeHtml(s.text)}" maxlength="120" aria-label="Название этапа">
        <button type="button" class="row-del" aria-label="Удалить этап">${icon('trash')}</button>
      </li>`).join('') : '';
    el.subsCount.textContent = list.length || '';
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
      <li data-rid="${m.id}" class="${m.bought ? 'is-bought' : ''}">
        <input type="text" data-f="name" value="${escapeHtml(m.name)}" maxlength="80" placeholder="Например, EVA 5 мм" aria-label="Материал">
        <input type="number" data-f="qty" value="${m.qty}" min="0" step="1" inputmode="decimal" aria-label="Количество">
        <input type="number" data-f="price" value="${m.price}" min="0" step="10" inputmode="decimal" aria-label="Цена за единицу, ₽">
        <input type="checkbox" class="dcheck" data-f="bought" aria-label="Куплено" ${m.bought ? 'checked' : ''}>
        <button type="button" class="row-del" aria-label="Удалить материал">${icon('trash')}</button>
      </li>`).join('') : '<li class="editor-empty">Список закупок пуст</li>';
    el.matsCount.textContent = list.length || '';
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

  // общий обработчик для обоих редакторов окна
  function bindEditor(listEl, getList, onChange, rerender) {
    const rowOf = e => {
      const li = e.target.closest('li[data-rid]');
      return li ? { li, item: getList().find(x => x.id === li.dataset.rid) } : {};
    };
    listEl.addEventListener('input', e => {
      const { item } = rowOf(e);
      if (!item || e.target.type === 'checkbox') return;
      const f = e.target.dataset.f;
      if (f === 'qty' || f === 'price') item[f] = num(e.target.value, 0);
      else if (f === 'name') item.name = e.target.value;
      else item.text = e.target.value;
      onChange();
    });
    listEl.addEventListener('change', e => {
      const { li, item } = rowOf(e);
      if (!item || e.target.type !== 'checkbox') return;
      if ('bought' in item) { item.bought = e.target.checked; li.classList.toggle('is-bought', item.bought); }
      else { item.done = e.target.checked; li.classList.toggle('is-done', item.done); }
      onChange();
    });
    listEl.addEventListener('click', e => {
      if (!e.target.closest('.row-del')) return;
      const { item } = rowOf(e);
      if (!item) return;
      const list = getList();
      list.splice(list.indexOf(item), 1);
      rerender();
    });
    listEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.matches('input')) e.preventDefault();
    });
  }
  bindEditor(el.subEditor, () => state.draft.subtasks, () => {}, renderSubEditor);
  bindEditor(el.matEditor, () => state.draft.materials, updateMatTotals, () => renderMatEditor());

  el.taskForm.addEventListener('submit', e => {
    e.preventDefault();
    const title = el.fTitle.value.trim();
    if (!title) { setTimeout(() => invalid(el.fTitle), 30); return; }
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
    let after = null;
    if (state.editingId) {
      const prev = state.tasks.find(t => t.id === state.editingId);
      const becameDone = prev && prev.status !== 'done' && data.status === 'done';
      if (prev && data.priority !== prev.priority) data.priorityManual = true;
      const projectWasDone = data.projectId ? projectDone(data.projectId) : false;
      task = updateTask(state.editingId, data);
      if (becameDone && task) after = () => celebrate(task, projectWasDone);
      else toast('Контракт обновлён', { type: 'success' });
    } else {
      task = createTask(Object.assign({ priorityManual: data.priority !== 'medium' }, data));
      toast('Контракт принят', { type: 'success' });
    }
    // если контракт не попадает в текущий вид — показываем его
    if (task && !inSpace(task)) setSpace('all');
    if (task && state.filter.project && task.projectId !== state.filter.project) state.filter.project = null;
    if (task && !statusMatch(task, state.filter.status)) setStatusFilter(task.status === 'done' ? 'done' : 'active');
    closeOverlay(el.taskOverlay);
    if (isPhone()) setView('list');
    renderAll({ flashId: task && task.id });
    if (after) setTimeout(after, 200);
  });

  /* ---------- Окно досье (персонажа) ---------- */
  function projectFormData() {
    const fd = new FormData(el.projectForm);
    return {
      name: el.pName.value.trim(),
      fandom: el.pFandom.value.trim(),
      convention: el.pCon.value.trim(),
      deadline: fromInput(el.pDeadline.value),
      color: fd.get('pcolor') || PROJECT_COLORS[0],
      art: fd.get('part') || ''
    };
  }
  function renderProjectPreview() {
    const d = projectFormData();
    const tasks = state.editingProjectId ? state.tasks.filter(t => t.projectId === state.editingProjectId) : [];
    const pct = Math.round(progressOf(tasks) * 100);
    el.pPreview.style.setProperty('--pc', d.color);
    el.pPreview.style.setProperty('--p', pct + '%');
    el.pPreview.innerHTML = dosInnerHtml(d, { pct, preview: true });
  }

  function openProjectModal(project) {
    state.editingProjectId = project ? project.id : null;
    el.projectForm.reset();
    $$('.field.invalid', el.projectForm).forEach(f => f.classList.remove('invalid'));
    el.projectModalTitle.textContent = project ? 'Досье' : 'Новое досье';
    $$('button[type="submit"] span', el.projectForm).forEach(s => { s.textContent = project ? 'Сохранить' : 'Создать'; });
    el.projectDelete.hidden = !project;
    el.pName.value = project ? project.name : '';
    el.pFandom.value = project ? project.fandom : '';
    el.pCon.value = project ? project.convention : '';
    el.pDeadline.value = project ? toDateInput(project.deadline) : '';

    const used = new Set(state.projects.map(p => p.color));
    const color = project ? project.color : (PROJECT_COLORS.find(c => !used.has(c)) || PROJECT_COLORS[0]);
    el.pColors.innerHTML = PROJECT_COLORS.map((c, i) => `
      <label class="swatch" title="Цвет ${i + 1}">
        <input type="radio" name="pcolor" value="${c}" ${c === color ? 'checked' : ''} aria-label="Цвет ${i + 1}">
        <span style="--c:${c}"></span>
      </label>`).join('');

    const art = project ? project.art : '';
    el.pArts.innerHTML =
      `<label class="art-opt" title="Без арта"><input type="radio" name="part" value="" ${art ? '' : 'checked'}><span>без арта</span></label>` +
      ARTS.map(a => `
        <label class="art-opt" title="${escapeHtml(a.title)}">
          <input type="radio" name="part" value="${a.file}" ${a.file === art ? 'checked' : ''} aria-label="${escapeHtml(a.title)}">
          <span><img src="${artUrl(a.file, 160)}" alt="" width="160" height="226" loading="lazy" decoding="async"></span>
        </label>`).join('');
    renderProjectPreview();
    openOverlay(el.projectOverlay, el.pName);
  }

  el.projectForm.addEventListener('input', renderProjectPreview);
  el.projectForm.addEventListener('change', renderProjectPreview);

  el.projectForm.addEventListener('submit', e => {
    e.preventDefault();
    const data = projectFormData();
    if (!data.name) { invalid(el.pName); return; }
    let id = state.editingProjectId;
    if (id) {
      updateProject(id, data);
      toast('Досье обновлено', { type: 'success' });
    } else {
      const p = createProject(data);
      id = p.id;
      toast(`Досье «${p.name}» заведено`, { type: 'success' });
      if (state.space === 'personal') setSpace('workshop');
    }
    closeOverlay(el.projectOverlay);
    renderAll();
    const item = $(`.dos[data-pid="${id}"]`, el.projectsTrack);
    if (item) item.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
  });

  el.projectDelete.addEventListener('click', () => {
    const p = projectById(state.editingProjectId);
    if (!p) return;
    closeOverlay(el.projectOverlay);
    const count = state.tasks.filter(t => t.projectId === p.id).length;
    askConfirm({
      title: 'Удалить досье?',
      html: `<b>${escapeHtml(p.name)}</b>${count ? `${count} ${plural(count, ['контракт останется', 'контракта останутся', 'контрактов останутся'])} без персонажа. ` : ''}Сразу после удаления можно отменить.`,
      onConfirm: () => {
        const snap = deleteProject(p.id);
        renderAll();
        if (snap) toast('Досье удалено', { type: 'danger', action: 'Отменить', onAction: () => { restoreProject(snap); renderAll(); } });
      }
    });
  });

  /* ---------- Действия со строками ---------- */
  function askDeleteTask(task) {
    askConfirm({
      title: 'Удалить контракт?',
      html: `<b>${escapeHtml(task.title)}</b>Сразу после удаления можно отменить.`,
      onConfirm: () => {
        const node = $(`.task[data-id="${task.id}"]`, el.board);
        const finish = () => {
          if (panel.id === task.id) closePanel({ restoreFocus: false });
          const snap = deleteTask(task.id);
          renderAll();
          if (snap) {
            toast('Контракт удалён', {
              type: 'danger', action: 'Отменить',
              onAction: () => { restoreTask(snap); renderAll({ flashId: snap.task.id }); }
            });
          }
        };
        if (node && !reducedMotion) {
          node.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(16px)' }],
            { duration: 200, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'forwards' }).onfinish = finish;
        } else {
          finish();
        }
      }
    });
  }

  // сменить статус; «выполнено» — через закрытие со штампом
  function setTaskStatus(task, status, row) {
    if (!task || task.status === status) return;
    flushPanel();
    if (status === 'done') { completeTask(task, row); return; }
    updateTask(task.id, { status });
    renderAll({ flashId: task.id });
    refreshOwnPanel(task.id);
  }

  // своя правка задачи, открытой в панели, — перерисовать панель сразу, без «изменено на другом устройстве»
  function refreshOwnPanel(id) {
    if (panel.id !== id) return;
    const t = panelTask();
    if (!t) return;
    const focused = document.activeElement && el.panel.contains(document.activeElement) ? document.activeElement : null;
    const sel = focused && focused.dataset.f ? `[data-f="${focused.dataset.f}"]${focused.type === 'radio' ? ':checked' : ''}` : null;
    renderPanel(t);
    if (sel) { const again = $(sel, el.panel); if (again) again.focus({ preventScroll: true }); }
  }

  el.board.addEventListener('click', e => {
    if (e.target.closest('[data-empty="task"]')) { openTaskModal(null); return; }
    if (e.target.closest('[data-empty="reset"]')) { resetFilters(); return; }
    const row = e.target.closest('.task');
    if (!row) return;
    const task = state.tasks.find(t => t.id === row.dataset.id);
    if (!task) return;
    const btn = e.target.closest('[data-act]');
    const act = btn ? btn.dataset.act : 'open';
    if (act === 'toggle') {
      if (task.status === 'done') setTaskStatus(task, 'todo', row);
      else completeTask(task, row);
    } else if (act === 'status') {
      openStatusMenu(task, btn);
    } else if (act === 'edit' || act === 'open') {
      openPanel(task);
    } else if (act === 'delete') {
      askDeleteTask(task);
    }
  });

  el.board.addEventListener('keydown', e => {
    const row = e.target.closest('.task');
    if (!row || e.target !== row) return;
    const task = state.tasks.find(t => t.id === row.dataset.id);
    if (!task) return;
    if (e.key === 'Enter') { e.preventDefault(); openPanel(task); }
    else if (e.key === 'Delete') { e.preventDefault(); askDeleteTask(task); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const rows = $$('.task', el.board);
      const i = rows.indexOf(row);
      const next = rows[e.key === 'ArrowDown' ? Math.min(rows.length - 1, i + 1) : Math.max(0, i - 1)];
      if (next) next.focus();
    }
  });

  /* ---------- Меню статуса ---------- */
  let statusFor = null;
  function openStatusMenu(task, btn) {
    const m = el.statusMenu;
    if (!m.hidden && statusFor === task.id) { closeMenus(); return; }
    statusFor = task.id;
    $$('.menu-item', m).forEach(b => b.setAttribute('aria-checked', String(b.dataset.status === task.status)));
    openMenu(m, null);
    m.style.position = 'fixed';
    const r = btn.getBoundingClientRect();
    const w = m.offsetWidth, h = m.offsetHeight;
    const left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8));
    let top = r.bottom + 4;
    if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 4);
    m.style.left = left + 'px';
    m.style.top = top + 'px';
    m.dataset.opener = task.id;
    const cur = $('.menu-item[aria-checked="true"]', m) || $('.menu-item', m);
    cur.focus();
  }
  el.statusMenu.addEventListener('click', e => {
    const b = e.target.closest('.menu-item');
    if (!b) return;
    closeMenus();
    const task = state.tasks.find(t => t.id === statusFor);
    const row = task && $(`.task[data-id="${task.id}"]`, el.board);
    if (!task) return;
    if (b.dataset.row === 'open') { openPanel(task); return; }
    if (b.dataset.row === 'delete') { askDeleteTask(task); return; }
    setTaskStatus(task, b.dataset.status, row);
    const btn = row && $('[data-act="status"]', row);
    if (btn && document.contains(btn)) btn.focus({ preventScroll: true });
  });
  window.addEventListener('scroll', () => { if (!el.statusMenu.hidden) closeMenus(); }, { passive: true });

  /* ---------- Перетаскивание: строку бросают на одну из трёх крупных зон ---------- */
  let dragId = null;
  el.board.addEventListener('dragstart', e => {
    const row = e.target.closest('.task');
    if (!row) return;
    dragId = row.dataset.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
    closeMenus();
    requestAnimationFrame(() => { row.classList.add('dragging'); el.toolbar.classList.add('list-dragging'); });
  });
  el.board.addEventListener('dragend', e => {
    const row = e.target.closest('.task');
    if (row) row.classList.remove('dragging');
    el.toolbar.classList.remove('list-dragging');
    $$('.dz.is-over', el.dropzones).forEach(z => z.classList.remove('is-over'));
    dragId = null;
  });
  el.dropzones.addEventListener('dragover', e => {
    const dz = e.target.closest('.dz');
    if (!dz || !dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    $$('.dz', el.dropzones).forEach(z => z.classList.toggle('is-over', z === dz));
  });
  el.dropzones.addEventListener('dragleave', e => {
    const dz = e.target.closest('.dz');
    if (dz && !dz.contains(e.relatedTarget)) dz.classList.remove('is-over');
  });
  el.dropzones.addEventListener('drop', e => {
    const dz = e.target.closest('.dz');
    if (!dz) return;
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragId;
    const task = state.tasks.find(t => t.id === id);
    el.toolbar.classList.remove('list-dragging');
    dz.classList.remove('is-over');
    if (task) setTaskStatus(task, dz.dataset.drop, $(`.task[data-id="${id}"]`, el.board));
  });

  /* =========================================================
     Закрытие контракта: скан строки и штамп «Контракт закрыт»;
     когда готов весь персонаж — «Досье закрыто»
     ========================================================= */
  let celebration = null;
  const projectDone = pid => {
    const list = state.tasks.filter(t => t.projectId === pid);
    return list.length > 0 && list.every(t => t.status === 'done');
  };

  function showDossierClosed(project) {
    if (celebration) celebration.close(true);
    const node = document.createElement('div');
    node.className = 'dossier-pop';
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'assertive');
    node.innerHTML = `
      <div class="dp-card">
        ${project.art ? `<span class="frame dp-art is-scanning" style="--art:url('${artUrl(project.art, 480)}')"><img src="${artUrl(project.art, 480)}" srcset="${artSet(project.art)}" sizes="280px" alt="" decoding="async"><span class="scan" aria-hidden="true"><i></i></span></span>` : ''}
        <span class="dp-stamp">Досье закрыто</span>
        <b class="dp-name">${escapeHtml(project.name)}</b>
        <span class="dp-sub">${escapeHtml(project.convention ? `Готов · ${project.convention}` : 'Готов к дефиле')}</span>
        <span class="dp-hint">Нажми, чтобы продолжить</span>
      </div>`;
    document.body.appendChild(node);

    let closed = false;
    const close = instant => {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey, true);
      if (celebration && celebration.node === node) celebration = null;
      if (instant || reducedMotion) { node.remove(); return; }
      node.classList.add('out');
      setTimeout(() => node.remove(), 220);
    };
    const onKey = e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); close(); } };
    node.addEventListener('click', () => close());
    document.addEventListener('keydown', onKey, true);
    const timer = setTimeout(close, 4600);
    celebration = { node, close };
  }

  function celebrate(task, projectWasDone, prevStatus = 'todo') {
    const pid = task.projectId;
    const project = pid && !projectWasDone && projectDone(pid) ? projectById(pid) : null;
    if (project && !reducedMotion) { showDossierClosed(project); return; }
    const msg = project
      ? `Досье «${project.name}» закрыто — ${project.convention ? `готов · ${project.convention}` : 'готов к дефиле'}`
      : `Контракт закрыт: «${task.title}»`;
    toast(msg, {
      type: 'success', action: 'Вернуть',
      onAction: () => { updateTask(task.id, { status: prevStatus }); renderAll({ flashId: task.id }); refreshOwnPanel(task.id); }
    });
  }

  // закрыть контракт (row — строка в списке, если видна)
  async function completeTask(task, row) {
    if (!task || task.status === 'done') return;
    flushPanel();
    const projectWasDone = task.projectId ? projectDone(task.projectId) : false;
    const prev = task.status;
    if (row && document.contains(row) && !reducedMotion) {
      row.classList.add('is-closing', 'is-done');
      const stamp = document.createElement('span');
      stamp.className = 'stamp';
      stamp.textContent = 'Контракт закрыт';
      row.appendChild(stamp);
      if (navigator.vibrate) { try { navigator.vibrate(20); } catch (e) { /* ignore */ } }
      await new Promise(r => setTimeout(r, 650));
    }
    updateTask(task.id, { status: 'done' });
    renderAll({ flashId: task.id });
    refreshOwnPanel(task.id);
    celebrate(task, projectWasDone, prev);
  }

  /* ---------- Уведомления ---------- */
  function toast(message, { type = 'info', action, onAction, duration = 5000 } = {}) {
    const node = document.createElement('div');
    node.className = 'toast';
    node.dataset.type = type;
    node.setAttribute('role', type === 'danger' ? 'alert' : 'status');
    node.innerHTML = `<span class="toast-mark"></span><span class="toast-msg">${escapeHtml(message)}</span>` +
      (action ? `<button class="toast-action" type="button">${escapeHtml(action)}</button>` : '');
    el.toasts.appendChild(node);

    let closed = false;
    let timer = 0;
    let left = duration;
    let started = 0;
    const close = () => {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      node.classList.add('out');
      setTimeout(() => node.remove(), reducedMotion ? 0 : 160);
    };
    const arm = () => { started = Date.now(); timer = setTimeout(close, left); };
    arm();
    // таймер останавливается, пока курсор над уведомлением
    node.addEventListener('mouseenter', () => { clearTimeout(timer); left = Math.max(1200, left - (Date.now() - started)); });
    node.addEventListener('mouseleave', () => { if (!closed) arm(); });
    if (action) {
      $('.toast-action', node).addEventListener('click', () => {
        if (onAction) onAction();
        close();
      });
    }
    const live = $$('.toast:not(.out)', el.toasts);
    if (live.length > 4) { live[0].classList.add('out'); setTimeout(() => live[0].remove(), 160); }
  }

  /* ---------- Телефон: разделы таб-бара ---------- */
  function setView(view) {
    el.app.dataset.view = view;
    $$('.tab-item', el.tabbar).forEach(b => b.classList.toggle('is-active', b.dataset.tab === view));
    window.scrollTo(0, 0);
  }
  el.tabbar.addEventListener('click', e => {
    const b = e.target.closest('.tab-item');
    if (!b) return;
    const tab = b.dataset.tab;
    if (tab === 'list' || tab === 'dossier') {
      if (panel.id) closePanel({ restoreFocus: false });
      closeMenus();
      setView(tab);
    } else if (tab === 'add') {
      openTaskModal(null);
    } else if (tab === 'more') {
      toggleMenu(el.userMenu, el.userBtn);
    }
  });
  phoneQuery.addEventListener('change', () => {
    if (!isPhone()) { setView('list'); el.hud.classList.remove('search-open'); }
    closeMenus();
  });

  /* =========================================================
     AI по SPEC: трекер сам расставляет порядок и приоритеты
     через Gemini на личном ключе пользователя (api/prioritize).
     Без кнопок: план пересчитывается после входа и после изменений
     в контрактах. Приоритет, который пользователь поставил руками, AI не трогает.
     ========================================================= */
  const AI_ERRORS = {
    unauthorized: 'AI работает в аккаунте. Войди или создай аккаунт.',
    no_user_key: 'Добавь свой ключ Gemini — без него AI не расставит задачи.',
    invalid_key: 'Google не принял ключ. Проверь его в AI Studio и сохрани заново.',
    bad_key_format: 'Это не похоже на ключ Gemini. Скопируй его целиком из AI Studio.',
    ai_rate_limited: 'Gemini просит паузу: лимит запросов твоего ключа. Повторю позже.',
    no_tasks: 'Нет открытых контрактов.'
  };
  const ai = Object.assign({ focus: '', at: 0, model: '', spec: '' }, readJSON(KEYS.ai) || {});
  const aiKey = { known: false, hasKey: false, hint: null };
  const plan = { timer: 0, busy: false, error: '', retryAt: 0, askKey: false };
  const PLAN_DEBOUNCE = 6000;      // пауза после последнего изменения
  const PLAN_GAP = 90 * 1000;      // не чаще раза в полторы минуты
  const PLAN_MAX = 120;

  function aiMessage(node, text, type = 'info') {
    if (!node) return;
    node.textContent = text || '';
    node.dataset.type = type;
  }

  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  // отпечаток того, что важно для плана; AI-поля и приоритет сюда не входят
  function taskFp(t) {
    const p = projectById(t.projectId);
    return hash([t.title, t.status, t.deadline ?? '', t.space, t.projectId || '', t.workType || '',
      t.subtasks.filter(s => s.done).length + '/' + t.subtasks.length,
      t.materials.filter(m => !m.bought).length,
      p ? (p.deadline ?? '') + p.convention : ''].join('|'));
  }
  const planOpen = () => state.tasks.filter(t => t.status !== 'done');
  const needsPlan = () => planOpen().some(t => t.aiSig !== taskFp(t));
  const aiReady = () => store.mode === 'cloud' && aiKey.known && aiKey.hasKey;

  function schedulePlan(delay = PLAN_DEBOUNCE) {
    clearTimeout(plan.timer);
    plan.timer = 0;
    if (!aiReady() || !needsPlan()) { renderAiStatus(); return; }
    const wait = Math.max(delay, (ai.at || 0) + PLAN_GAP - Date.now(), plan.retryAt - Date.now());
    plan.timer = setTimeout(runPlan, Math.max(0, wait));
    renderAiStatus();
  }

  async function runPlan() {
    plan.timer = 0;
    if (plan.busy || !aiReady() || !needsPlan()) { renderAiStatus(); return; }
    const open = planOpen();
    const sorted = open.slice().sort((a, b) => (a.deadline ?? Infinity) - (b.deadline ?? Infinity)).slice(0, PLAN_MAX);
    const fps = new Map(open.map(t => [t.id, taskFp(t)]));
    const iso = ms => (ms == null ? null : toLocalInput(ms));
    const payload = sorted.map(t => {
      const p = projectById(t.projectId);
      return {
        id: t.id, title: t.title, description: t.description, status: t.status, priority: t.priority,
        deadline: iso(t.deadline), overdue: isOverdue(t), space: t.space,
        workType: t.workType ? WORK[t.workType].label : null,
        project: p ? p.name : null, convention: p ? p.convention : null, conventionDate: p ? iso(p.deadline) : null,
        stepsDone: t.subtasks.filter(s => s.done).length, stepsTotal: t.subtasks.length,
        materialsToBuy: t.materials.filter(m => !m.bought).length
      };
    });
    plan.busy = true;
    plan.error = '';
    renderAiStatus();
    try {
      const res = await api('prioritize', { method: 'POST', body: { tasks: payload, now: toLocalInput(Date.now()), scope: 'всё' } });
      const ids = new Set(sorted.map(t => t.id));
      state.tasks.forEach(t => { if (ids.has(t.id)) { t.aiRank = null; t.aiPriority = null; t.aiReason = ''; } });
      res.items.forEach((it, i) => {
        const t = state.tasks.find(x => x.id === it.id);
        if (!t) return;
        t.aiRank = i;
        t.aiPriority = it.priority;
        t.aiReason = it.reason || '';
        if (it.doneWhen && (!t.aiDone || t.aiDoneAuto)) { t.aiDone = it.doneWhen; t.aiDoneAuto = true; }
        if (PRIORITY[it.priority] && !t.priorityManual && t.priority !== it.priority) t.priority = it.priority;
      });
      // отпечаток ставим и тем, что не влезли в лимит, — иначе план крутился бы без конца
      open.forEach(t => { t.aiSig = fps.get(t.id); });
      Object.assign(ai, { focus: res.focus || '', at: Date.now(), model: res.model || '', spec: res.spec || '' });
      writeJSON(KEYS.ai, ai);
      plan.retryAt = 0;
      save();
      renderAll();
    } catch (err) {
      if (err.status === 401 && cloud.user) { sessionLost(); return; }
      if (err.message === 'no_user_key' || err.message === 'invalid_key') {
        Object.assign(aiKey, { known: true, hasKey: err.message !== 'no_user_key' ? aiKey.hasKey : false });
        plan.error = err.message;
      } else {
        plan.error = err.message === 'ai_rate_limited' ? 'rate' : 'failed';
        plan.retryAt = Date.now() + (err.message === 'ai_rate_limited' ? 3 : 5) * 60 * 1000;
        schedulePlan(0);
      }
    } finally {
      plan.busy = false;
      renderAiStatus();
      renderKeyUi();
    }
  }

  // маленький статус в панели фильтров вместо отдельного окна AI
  function renderAiStatus() {
    const s = el.aiStatus;
    if (!s) return;
    let state_ = 'ok', text = '', title = '';
    if (store.mode !== 'cloud') { state_ = 'off'; text = 'AI · войди'; title = 'AI расставляет задачи по SPEC в аккаунте с ключом Gemini'; }
    else if (!aiKey.known) { s.hidden = true; return; }
    else if (!aiKey.hasKey) { state_ = 'warn'; text = 'AI · добавь ключ'; title = 'Добавь ключ Gemini — и трекер сам расставит задачи'; }
    else if (plan.error === 'invalid_key') { state_ = 'warn'; text = 'AI · ключ не принят'; title = AI_ERRORS.invalid_key; }
    else if (plan.busy) { state_ = 'busy'; text = 'AI расставляет…'; title = 'Gemini расставляет задачи по SPEC'; }
    else if (plan.error === 'rate') { state_ = 'warn'; text = 'AI · пауза'; title = AI_ERRORS.ai_rate_limited; }
    else if (plan.error === 'failed') { state_ = 'warn'; text = 'AI · повторю позже'; title = 'Не получилось связаться с Gemini — попробую ещё раз'; }
    else if (plan.timer || needsPlan()) { state_ = 'busy'; text = 'AI · скоро обновлю'; title = 'Есть изменения — план пересчитается через несколько секунд'; }
    else if (ai.at) { text = 'AI · ' + (Date.now() - ai.at < 60 * 1000 ? 'только что' : relative(ai.at)); title = ai.focus ? 'Фокус: ' + ai.focus : 'Задачи расставлены по SPEC'; }
    else { text = 'AI · готов'; title = 'Задачи расставлены по SPEC'; }
    s.hidden = false;
    s.dataset.state = state_;
    el.aiStatusText.textContent = text;
    s.title = title;
    s.setAttribute('aria-label', title);
  }
  el.aiStatus.addEventListener('click', () => {
    if (store.mode !== 'cloud') { showAuth('login'); return; }
    if (!aiKey.hasKey || plan.error === 'invalid_key') { openKeyModal(); return; }
    if (ai.focus) toast('Фокус: ' + ai.focus, { duration: 6000 });
  });
  setInterval(() => { if (!plan.busy && ai.at) renderAiStatus(); }, 60 * 1000);
  onSaved = () => schedulePlan();

  /* ---------- личный ключ ---------- */
  function renderKeyUi() {
    const has = aiKey.hasKey;
    el.umAiKey.hidden = store.mode !== 'cloud';
    el.umAiKeyHint.textContent = has ? aiKey.hint || 'есть' : 'нет';
    el.umAiKeyHint.dataset.on = has ? '1' : '';
    // без ключа: точка на аватаре и пункт меню «Добавить ключ Gemini»
    const missing = store.mode === 'cloud' && aiKey.known && !has;
    el.keyDot.hidden = !missing;
    if (cloud.user) el.userBtn.title = missing ? 'Аккаунт · добавь ключ Gemini для AI' : 'Аккаунт';
    el.umAiKey.classList.toggle('is-warn', missing);
    $('span', el.umAiKey).textContent = has ? 'AI-ключ Gemini' : 'Добавить ключ Gemini';
    el.dsKeyLabel.textContent = store.mode !== 'cloud' ? 'Gemini · нужен аккаунт' : has ? `Gemini · твой ключ ${aiKey.hint || ''}`.trim() : 'Gemini · ключ не добавлен';
    el.dsNoKey.hidden = !(store.mode !== 'cloud' || missing);
    el.dsNoKeyText.textContent = store.mode !== 'cloud'
      ? 'AI-часть SPEC пишет Gemini на твоём личном ключе — для этого нужен аккаунт. Сроки, контракты и бюджет считаются и без него.'
      : 'AI-часть SPEC пишет Gemini на твоём личном ключе. Добавь ключ — сроки, контракты и бюджет считаются и без него.';
    $('span', el.dsAddKey).textContent = store.mode !== 'cloud' ? 'Войти' : 'Добавить ключ';
    renderAiStatus();
  }

  async function refreshKey() {
    if (store.mode !== 'cloud') { Object.assign(aiKey, { known: false, hasKey: false, hint: null }); renderKeyUi(); return; }
    try {
      const r = await api('ai-key');
      Object.assign(aiKey, { known: true, hasKey: r.hasKey, hint: r.hint });
    } catch (e) {
      if (e.status === 401 && cloud.user) sessionLost();
    }
    renderKeyUi();
    if (plan.askKey && aiKey.known && !aiKey.hasKey) {
      toast('Добавь ключ Gemini — и трекер сам расставит задачи по SPEC', { action: 'Добавить', onAction: openKeyModal, duration: 8000 });
    }
    plan.askKey = false;
    schedulePlan(1500);
  }

  // сохранить ключ (из окна ключа или со страницы входа)
  async function saveKey(key) {
    const r = await api('ai-key', { method: 'PUT', body: { key } });
    Object.assign(aiKey, { known: true, hasKey: r.hasKey, hint: r.hint });
    plan.error = '';
    plan.retryAt = 0;
    renderKeyUi();
    // новый ключ — пересчитать план сразу
    state.tasks.forEach(t => { t.aiSig = ''; });
    ai.at = 0;
    schedulePlan(300);
    return r;
  }

  function openKeyModal() {
    closeMenus();
    el.keyInput.value = '';
    el.keyStatus.textContent = aiKey.hasKey ? `Ключ сохранён ${aiKey.hint || ''}`.trim() : 'Ключ не добавлен';
    el.keyStatus.dataset.on = aiKey.hasKey ? '1' : '';
    el.keyDelete.hidden = !aiKey.hasKey;
    $('span', el.keySave).textContent = aiKey.hasKey ? 'Заменить' : 'Сохранить';
    aiMessage(el.keyMsg, '');
    openOverlay(el.keyOverlay, el.keyInput);
  }

  el.keyForm.addEventListener('submit', async e => {
    e.preventDefault();
    const key = el.keyInput.value.trim();
    if (!key) { invalid(el.keyInput); return; }
    el.keySave.disabled = true;
    aiMessage(el.keyMsg, 'Проверяю ключ у Google…');
    try {
      await saveKey(key);
      el.keyInput.value = '';
      closeOverlay(el.keyOverlay);
      toast('Ключ Gemini сохранён — расставляю задачи по SPEC', { type: 'success' });
      if (el.dsOverlay.classList.contains('open')) autoDossierSpec();
    } catch (err) {
      if (err.status === 401 && cloud.user) { closeOverlay(el.keyOverlay); sessionLost(); return; }
      aiMessage(el.keyMsg, AI_ERRORS[err.message] || 'Не удалось сохранить ключ. Попробуй ещё раз.', 'danger');
    } finally {
      el.keySave.disabled = false;
    }
  });
  el.keyInput.addEventListener('input', () => el.keyInput.closest('.field').classList.remove('invalid'));
  el.keyDelete.addEventListener('click', async () => {
    try {
      await api('ai-key', { method: 'DELETE' });
      Object.assign(aiKey, { known: true, hasKey: false, hint: null });
      renderKeyUi();
      closeOverlay(el.keyOverlay);
      toast('Ключ удалён', { type: 'danger' });
    } catch (err) {
      aiMessage(el.keyMsg, 'Не удалось удалить ключ.', 'danger');
    }
  });
  el.umAiKey.addEventListener('click', openKeyModal);
  el.dsAddKey.addEventListener('click', () => {
    if (store.mode === 'cloud') { openKeyModal(); return; }
    closeOverlay(el.dsOverlay);
    showAuth('login');
  });

  /* ---------- Markdown → HTML (для SPEC: заголовки, списки, чекбоксы, таблицы, цитаты) ---------- */
  function mdInline(t) {
    return escapeHtml(t)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/(^|[\s(])«?\b(P[0-3])\b/g, '$1<span class="spec-p spec-$2">$2</span>');
  }
  function renderMarkdown(src) {
    const lines = String(src || '').split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      let m;
      if (!line.trim()) { i++; continue; }
      if ((m = /^(#{1,4})\s+(.*)$/.exec(line))) {
        out.push(`<h${m[1].length}>${mdInline(m[2])}</h${m[1].length}>`); i++; continue;
      }
      if (/^>\s?/.test(line)) {
        const q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
        out.push(`<blockquote>${mdInline(q.join(' '))}</blockquote>`); continue;
      }
      if (/^\|/.test(line)) {
        const rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
        const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        const head = cells(rows[0]);
        const body = rows.slice(2).map(cells);
        out.push('<div class="spec-table"><table><thead><tr>' + head.map(c => `<th>${mdInline(c)}</th>`).join('') +
          '</tr></thead><tbody>' + body.map(r => '<tr>' + r.map(c => `<td>${mdInline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>');
        continue;
      }
      if (/^\s*-\s/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*-\s/.test(lines[i])) {
          const l = lines[i++];
          const nested = /^\s{2,}-\s/.test(l);
          const text = l.replace(/^\s*-\s/, '');
          if (nested && items.length) items[items.length - 1].sub.push(text);
          else items.push({ text, sub: [] });
        }
        out.push('<ul>' + items.map(it => {
          const cb = /^\[( |x)\]\s+/.exec(it.text);
          const body = cb ? it.text.slice(cb[0].length) : it.text;
          const box = cb ? `<span class="spec-box${cb[1] === 'x' ? ' on' : ''}"></span>` : '';
          const sub = it.sub.length ? '<ul>' + it.sub.map(x => `<li>${mdInline(x)}</li>`).join('') + '</ul>' : '';
          return `<li${cb ? ' class="task-li"' : ''}>${box}${mdInline(body)}${sub}</li>`;
        }).join('') + '</ul>');
        continue;
      }
      const para = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>|\||\s*-\s)/.test(lines[i])) para.push(lines[i++]);
      out.push(`<p>${mdInline(para.join(' '))}</p>`);
    }
    return out.join('');
  }

  /* =========================================================
     SPEC досье: живой документ по одному персонажу.
     Сроки, контракты, этапы, материалы и бюджет трекер считает сам из данных;
     цель, критерии «готово», порядок, недостающие контракты и риски пишет
     Gemini на личном ключе пользователя (api/dossier-spec). Общего ключа нет.
     ========================================================= */
  const ds = { pid: null, busy: false };
  const dsDate = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', year: 'numeric' });
  const mdSafe = v => String(v || '').replace(/[\r\n]+/g, ' ').replace(/\|/g, '/').trim();
  const shortDate = ms => fmtStamp(ms).split(' · ')[0];
  const dossierTasks = p => state.tasks.filter(t => t.projectId === p.id);

  // порядок открытых контрактов: сначала как предложил AI, новые — по сроку в конце
  function dossierOrder(p, open) {
    const byId = new Map(open.map(t => [t.id, t]));
    const reasons = new Map();
    const list = [];
    (p.spec ? p.spec.order : []).forEach(o => {
      const t = byId.get(o.id);
      if (t && !reasons.has(o.id)) { reasons.set(o.id, o.reason); list.push(t); }
    });
    const rest = open.filter(t => !reasons.has(t.id)).sort((a, b) => (a.deadline ?? Infinity) - (b.deadline ?? Infinity));
    return { list: list.concat(rest), reasons, fresh: p.spec ? rest.length : 0 };
  }

  function buildDossierSpec(p) {
    const tasks = dossierTasks(p);
    const open = tasks.filter(t => t.status !== 'done');
    const closed = tasks.filter(t => t.status === 'done');
    const sp = p.spec;
    const { list, reasons } = dossierOrder(p, open);
    let n = 0;
    const h = title => L.push(`## ${++n}. ${title}`, '');
    const L = [];
    L.push(`# SPEC · ${mdSafe(p.name)}`, '');
    L.push(`> ${[p.fandom ? mdSafe(p.fandom) : '', `контрактов ${tasks.length}`, `закрыто ${closed.length}`, `прогресс ${Math.round(progressOf(tasks) * 100)}%`].filter(Boolean).join(' · ')}`, '');

    h('Цель');
    L.push(sp && sp.goal ? mdSafe(sp.goal)
      : `Готовый костюм «${mdSafe(p.name)}»${p.convention ? ` к событию «${mdSafe(p.convention)}»` : ''}${p.deadline != null ? ` — ${dsDate.format(p.deadline)}` : ''}.`.replace(/\.\.$/, '.'), '');
    if (sp && sp.focus) L.push(`**Фокус сейчас:** ${mdSafe(sp.focus)}`, '');

    h('Готово, когда');
    L.push(`- [${tasks.length && !open.length ? 'x' : ' '}] Все контракты закрыты — ${closed.length} из ${tasks.length}`);
    (sp ? sp.doneCriteria : []).forEach(c => L.push(`- [ ] ${mdSafe(c)}`));
    L.push('');

    h('Сроки');
    if (p.deadline != null) {
      const days = Math.round((startOfDay(p.deadline) - startOfDay(Date.now())) / DAY);
      const left = days > 0 ? `через ${days} ${plural(days, ['день', 'дня', 'дней'])}` : days === 0 ? 'сегодня' : `прошло ${-days} ${plural(-days, ['день', 'дня', 'дней'])}`;
      L.push(`- Событие: ${p.convention ? `«${mdSafe(p.convention)}», ` : ''}${dsDate.format(p.deadline)} — ${left}`);
    } else L.push('- Событие: дата не задана');
    const next = open.filter(t => t.deadline != null).sort((a, b) => a.deadline - b.deadline)[0];
    if (next) L.push(`- Ближайший срок: «${mdSafe(next.title)}» — ${fmtStamp(next.deadline)}`);
    const over = open.filter(isOverdue).length;
    L.push(`- Просрочено: ${over}`, '');

    h('Порядок работы');
    if (list.length) {
      L.push('| # | Контракт | Приоритет | Срок | Этапы | Готово, когда |', '|---|---|---|---|---|---|');
      list.forEach((t, i) => {
        const why = reasons.get(t.id);
        const steps = t.subtasks.length ? `${t.subtasks.filter(s => s.done).length}/${t.subtasks.length}` : '—';
        L.push(`| ${i + 1} | **${mdSafe(t.title)}**${t.status === 'progress' ? ' · в работе' : ''}${why ? ` — ${mdSafe(why)}` : ''} | ${PRIORITY[t.priority].code} | ${t.deadline != null ? shortDate(t.deadline) + (isOverdue(t) ? ' ⚠' : '') : '—'} | ${steps} | ${mdSafe(t.aiDone) || '—'} |`);
      });
    } else L.push(tasks.length ? '- Все контракты закрыты.' : '- Контрактов пока нет.');
    L.push('');
    if (closed.length) { L.push('### Закрыто', ''); closed.forEach(t => L.push(`- [x] ${mdSafe(t.title)}`)); L.push(''); }

    h('Материалы и бюджет');
    const mats = tasks.flatMap(t => t.materials.map(m => ({ m, t })));
    const planned = tasks.reduce((s, t) => s + taskPlanned(t), 0);
    const spent = tasks.reduce((s, t) => s + taskSpent(t), 0);
    L.push(`- Бюджет: потрачено ${money(spent)} ₽ из ${money(planned)} ₽`);
    const toBuy = mats.filter(x => !x.m.bought);
    if (toBuy.length) {
      L.push(`- Осталось купить: ${toBuy.length} ${plural(toBuy.length, ['позиция', 'позиции', 'позиций'])} на ${money(toBuy.reduce((s, x) => s + x.m.qty * x.m.price, 0))} ₽`, '');
      toBuy.forEach(x => L.push(`- [ ] ${mdSafe(x.m.name)} × ${x.m.qty} — ${money(x.m.qty * x.m.price)} ₽ · ${mdSafe(x.t.title)}`));
    } else L.push(mats.length ? '- Всё куплено' : '- Материалы не добавлены');
    L.push('');

    if (sp && sp.missing.length) {
      h('Не хватает контрактов');
      sp.missing.forEach(m => L.push(`- [ ] **${mdSafe(m.title)}** — ${mdSafe(m.why)}`));
      L.push('');
    }

    h('Риски');
    const risks = (sp ? sp.risks : []).map(mdSafe);
    if (over) risks.unshift(`Просрочено контрактов: ${over}`);
    if (risks.length) risks.forEach(r => L.push(`- ${r}`));
    else L.push(sp ? '- Не выявлено' : '- Риски оценит AI');
    L.push('');

    L.push(sp && sp.at
      ? `> AI-часть: Gemini${sp.model ? ` (${mdSafe(sp.model)})` : ''}, ${relative(sp.at)}${sp.context ? ` · условия: ${mdSafe(sp.context)}` : ''}. Сроки, контракты и бюджет — из трекера, обновляются сами.`
      : '> AI-часть ещё не составлена. Сроки, контракты и бюджет — из трекера, обновляются сами.');
    return L.join('\n');
  }

  const dsFileName = p => `SPEC-${(p.name || 'dossier').trim().replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 40)}.md`;
  // отпечаток досье: AI-часть SPEC пересобирается, только если что-то поменялось
  const dossierSig = p => hash([p.name, p.fandom, p.convention, p.deadline ?? ''].concat(dossierTasks(p).map(taskFp).sort()).join('#'));

  function renderDossierSpec() {
    const p = projectById(ds.pid);
    if (!p) { closeOverlay(el.dsOverlay); return; }
    const md = buildDossierSpec(p);
    el.dsTitle.textContent = `SPEC · ${p.name}`;
    el.dsFile.textContent = dsFileName(p);
    el.dsDoc.innerHTML = renderMarkdown(md);
    el.dsRaw.textContent = md;
    const sugg = p.spec ? p.spec.missing : [];
    el.dsSugg.hidden = !sugg.length;
    el.dsSuggList.innerHTML = sugg.map(m => `
      <li data-mid="${m.id}">
        <span class="ds-s-body"><b>${escapeHtml(m.title)}</b>${m.why ? `<small>${escapeHtml(m.why)}</small>` : ''}</span>
        <button type="button" class="btn btn-ghost btn-sm" data-ds="add">${icon('plus')}<span>В контракты</span></button>
        <button type="button" class="icon-btn" data-ds="skip" aria-label="Убрать предложение «${escapeHtml(m.title)}»" title="Не нужно">${icon('close')}</button>
      </li>`).join('');
    const fresh = dossierOrder(p, dossierTasks(p).filter(t => t.status !== 'done')).fresh;
    el.dsMeta.textContent = p.spec && p.spec.at
      ? ['AI-часть: ' + relative(p.spec.at), fresh ? `${fresh} ${plural(fresh, ['новый контракт', 'новых контракта', 'новых контрактов'])} без AI` : ''].filter(Boolean).join(' · ')
      : (aiReady() ? 'AI-часть составляется…' : 'AI-часть не составлена');
    renderKeyUi();
  }

  function openDossierSpec(pid) {
    const p = projectById(pid);
    if (!p) return;
    ds.pid = p.id;
    aiMessage(el.dsMsg, '');
    el.dsRaw.hidden = true;
    el.dsDoc.hidden = false;
    el.dsRawToggle.setAttribute('aria-pressed', 'false');
    $('span', el.dsRawToggle).textContent = 'Исходник';
    renderDossierSpec();
    if (!el.dsOverlay.classList.contains('open')) openOverlay(el.dsOverlay, el.dsCopy);
    autoDossierSpec();
  }

  // AI-часть SPEC досье обновляется сама, когда досье открыто и в нём что-то изменилось
  function autoDossierSpec() {
    const p = projectById(ds.pid);
    if (!p || !aiReady() || ds.busy || !dossierTasks(p).length) return;
    if (p.spec && p.spec.at && p.spec.sig === dossierSig(p)) return;
    if (p.spec && p.spec.at && Date.now() - p.spec.at < 60 * 1000) return;
    runDossierSpec();
  }

  async function runDossierSpec() {
    const p = projectById(ds.pid);
    if (!p || ds.busy) return;
    const tasks = dossierTasks(p);
    if (!tasks.length) return;
    const sig = dossierSig(p);
    ds.busy = true;
    el.dsOverlay.classList.add('ai-busy');
    aiMessage(el.dsMsg, 'Gemini обновляет SPEC досье…');
    const iso = ms => (ms == null ? null : toLocalInput(ms));
    const payload = tasks.slice(0, 80).map(t => ({
      id: t.id, title: t.title, description: t.description, status: t.status, priority: t.priority,
      deadline: iso(t.deadline), overdue: isOverdue(t), workType: t.workType ? WORK[t.workType].label : null,
      steps: t.subtasks.map(s => (s.done ? '✓ ' : '') + s.text), stepsDone: t.subtasks.filter(s => s.done).length,
      toBuy: t.materials.filter(m => !m.bought).map(m => m.name)
    }));
    try {
      const res = await api('dossier-spec', { method: 'POST', body: {
        project: { name: p.name, fandom: p.fandom, convention: p.convention, conventionDate: iso(p.deadline) },
        tasks: payload, now: toLocalInput(Date.now())
      } });
      const live = projectById(p.id);
      if (!live) return;
      live.spec = normalizeSpec({
        goal: res.goal, focus: res.focus, doneCriteria: res.doneCriteria, risks: res.risks, missing: res.missing,
        order: res.order.map(o => ({ id: o.id, reason: o.reason })), model: res.model, at: Date.now(), sig
      });
      res.order.forEach(o => {
        const t = state.tasks.find(x => x.id === o.id);
        if (!t) return;
        t.aiPriority = o.priority;
        if (o.reason) t.aiReason = o.reason;
        if (o.doneWhen && (!t.aiDone || t.aiDoneAuto)) { t.aiDone = o.doneWhen; t.aiDoneAuto = true; }
        if (PRIORITY[o.priority] && !t.priorityManual) t.priority = o.priority;
      });
      save();
      aiMessage(el.dsMsg, '');
      renderAll();
    } catch (err) {
      if (err.status === 401 && cloud.user) { closeOverlay(el.dsOverlay); sessionLost(); return; }
      if (err.message === 'no_user_key') { Object.assign(aiKey, { known: true, hasKey: false }); renderKeyUi(); }
      aiMessage(el.dsMsg, AI_ERRORS[err.message] || (navigator.onLine === false ? 'Нет связи с интернетом — AI-часть обновится позже.' : 'Не получилось обновить AI-часть. Попробую при следующем открытии.'), 'danger');
    } finally {
      ds.busy = false;
      el.dsOverlay.classList.remove('ai-busy');
      if (el.dsOverlay.classList.contains('open')) renderDossierSpec();
    }
  }

  el.specBtn.addEventListener('click', () => { if (state.filter.project) openDossierSpec(state.filter.project); });
  el.dsSuggList.addEventListener('click', e => {
    const btn = e.target.closest('[data-ds]');
    const li = btn && btn.closest('li[data-mid]');
    const p = projectById(ds.pid);
    if (!li || !p || !p.spec) return;
    const i = p.spec.missing.findIndex(m => m.id === li.dataset.mid);
    if (i === -1) return;
    const [m] = p.spec.missing.splice(i, 1);
    if (btn.dataset.ds === 'add') {
      const t = createTask({ title: m.title, description: m.why, space: 'workshop', projectId: p.id, workType: m.workType, priority: 'medium', status: 'todo' });
      renderAll({ flashId: t.id });
      toast(`Контракт добавлен: «${m.title}»`, { type: 'success', duration: 2600 });
    } else save();
    renderDossierSpec();
  });
  el.dsCopy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(el.dsRaw.textContent); toast('SPEC скопирован', { type: 'success', duration: 2200 }); }
    catch (e) { toast('Не удалось скопировать', { type: 'danger' }); }
  });
  el.dsDownload.addEventListener('click', () => {
    const p = projectById(ds.pid);
    if (!p) return;
    const url = URL.createObjectURL(new Blob([el.dsRaw.textContent], { type: 'text/markdown;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: dsFileName(p) });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  el.dsRawToggle.addEventListener('click', () => {
    const raw = el.dsRaw.hidden;
    el.dsRaw.hidden = !raw;
    el.dsDoc.hidden = raw;
    el.dsRawToggle.setAttribute('aria-pressed', String(raw));
    $('span', el.dsRawToggle).textContent = raw ? 'Документ' : 'Исходник';
  });

  /* ---------- Горячие клавиши ---------- */
  document.addEventListener('keydown', e => {
    if (!el.auth.hidden) return;
    if (e.key === 'Escape') {
      if (anyMenuOpen()) {
        const statusOpen = !el.statusMenu.hidden;
        const userOpen = !el.userMenu.hidden;
        closeMenus();
        if (statusOpen) { const row = $(`.task[data-id="${statusFor}"] [data-act="status"]`, el.board); if (row) row.focus(); }
        else if (userOpen) el.userBtn.focus();
        return;
      }
      const top = overlays.find(o => o.classList.contains('open'));
      if (top) { closeOverlay(top); return; }
      if (document.activeElement === el.search) { el.search.blur(); el.hud.classList.remove('search-open'); return; }
      if (panel.id) { e.preventDefault(); closePanel(); }
      return;
    }
    const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');
    if (typing || anyOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '?') { e.preventDefault(); openOverlay(el.keysOverlay, $('[data-close]', el.keysOverlay)); return; }
    if (e.code === 'KeyN') { e.preventDefault(); openTaskModal(null); }
    if (e.code === 'KeyP') { e.preventDefault(); openProjectModal(null); }
    if (e.code === 'KeyS' && state.filter.project && state.space !== 'personal') { e.preventDefault(); openDossierSpec(state.filter.project); }
    if (e.key === '/' || e.code === 'Slash') {
      e.preventDefault();
      if (isPhone()) el.hud.classList.add('search-open');
      el.search.focus();
    }
  });

  el.addBtn.addEventListener('click', () => openTaskModal(null));

  /* =========================================================
     Облако: синхронизация через наш API (Vercel + Neon)
     ========================================================= */
  const SYNC_TEXT = {
    local: 'Данные только в этом браузере',
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
    if (onSaved) onSaved();
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
    refreshKey();

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
    Object.assign(aiKey, { known: false, hasKey: false, hint: null });
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
    closeMenus();
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
    login: { title: 'Вход в кузницу', sub: 'Досье, контракты и бюджет — на любом устройстве.', submit: 'Войти' },
    register: { title: 'Новый мастер', sub: 'Войди один раз — данные будут на телефоне и ноутбуке.', submit: 'Создать аккаунт' }
  };
  let authMode = 'login';

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
    $('#aKeyOpt').textContent = mode === 'login' ? 'если ещё не сохранён' : 'для AI';
    $$('.tab', el.authTabs).forEach(b => {
      const on = b.dataset.mode === mode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $$('.field.invalid', el.authForm).forEach(f => f.classList.remove('invalid'));

    if (cloud.available === false) {
      authMessage('Сервер не отвечает. Проверь интернет и обнови страницу — или продолжи без аккаунта.', 'info');
      el.authSubmit.disabled = true;
    } else {
      authMessage('');
      el.authSubmit.disabled = false;
    }
  }

  function showAuth(mode = 'login') {
    closeMenus();
    if (panel.id) closePanel({ restoreFocus: false });
    overlays.forEach(closeOverlay);
    el.auth.classList.remove('leaving');
    el.auth.hidden = false;
    setAuthMode(mode);
    const frame = $('.auth-art .frame', el.auth);
    if (frame && !reducedMotion) { frame.classList.remove('is-scanning'); void frame.offsetWidth; frame.classList.add('is-scanning'); }
    setTimeout(() => el.aEmail.focus(), 120);
  }

  function hideAuth() {
    if (el.auth.hidden) return;
    const done = () => { el.auth.hidden = true; el.auth.classList.remove('leaving'); };
    if (reducedMotion) { done(); return; }
    el.auth.classList.add('leaving');
    el.auth.addEventListener('animationend', done, { once: true });
    setTimeout(() => { if (el.auth.classList.contains('leaving')) done(); }, 400);
  }

  const AUTH_ERRORS = {
    invalid_credentials: 'Почта или пароль не подходят. Проверь раскладку и попробуй ещё раз',
    email_taken: 'Эта почта уже зарегистрирована. Войди во вкладке «Вход»',
    invalid_email: 'Похоже, почта указана с ошибкой',
    weak_password: 'Пароль слишком короткий — минимум 6 символов',
    password_too_long: 'Пароль слишком длинный',
    too_many_attempts: 'Слишком много попыток — подожди 15 минут',
    invalid_key: 'Google не принял ключ Gemini — проверь его или оставь поле пустым и добавь позже',
    bad_key_format: 'Это не похоже на ключ Gemini — скопируй его целиком или оставь поле пустым',
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
  const FIELD_ERR = new Map([[el.aEmail, 'Проверь почту — в ней ошибка'], [el.aPass, 'Пароль — минимум 6 символов']]);
  [el.aEmail, el.aPass, el.aKey].forEach(i => i.addEventListener('input', () => i.closest('.field').classList.remove('invalid')));
  el.authForm.addEventListener('submit', () => {
    FIELD_ERR.forEach((text, input) => { const m = $('.field-error', input.closest('.field')); if (m) m.innerHTML = icon('alert') + text; });
  }, true);

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
        const geminiKey = el.aKey.value.trim();
        if (geminiKey) authMessage('Проверяю ключ Gemini…');
        plan.askKey = !geminiKey;
        const { user, ai: keyInfo } = await api('auth/register', { method: 'POST', body: { email, password, name: el.aName.value.trim(), geminiKey } });
        if (keyInfo) Object.assign(aiKey, { known: true, hasKey: keyInfo.hasKey, hint: keyInfo.hint });
        el.aKey.value = '';
        await startCloudUser(user);
        toast(keyInfo && keyInfo.hasKey ? 'Добро пожаловать! AI расставит задачи по SPEC' : 'Добро пожаловать в кузницу', { type: 'success' });
      } else {
        const geminiKey = el.aKey.value.trim();
        const { user } = await api('auth/login', { method: 'POST', body: { email, password } });
        plan.askKey = !geminiKey;
        await startCloudUser(user);
        if (geminiKey) {
          el.aKey.value = '';
          try {
            await saveKey(geminiKey);
            toast('Ключ Gemini подключён — расставляю задачи по SPEC', { type: 'success' });
          } catch (err) {
            toast(AI_ERRORS[err.message] || 'Ключ не сохранился — добавь его в меню профиля', { type: 'danger', action: 'Ввести заново', onAction: openKeyModal, duration: 8000 });
          }
        }
      }
      el.aPass.value = '';
    } catch (err) {
      const code = String((err && err.message) || '');
      const fieldFor = { invalid_email: el.aEmail, email_taken: el.aEmail, weak_password: el.aPass, password_too_long: el.aPass, invalid_key: el.aKey, bad_key_format: el.aKey }[code];
      if (fieldFor) {
        const field = fieldFor.closest('.field');
        const fold = fieldFor.closest('details');
        if (fold) fold.open = true;
        let msg = $('.field-error', field);
        if (!msg) { msg = document.createElement('small'); msg.className = 'field-error'; field.appendChild(msg); }
        msg.innerHTML = icon('alert') + escapeHtml(translateAuthError(err));
        invalid(fieldFor);
        authMessage('');
      } else {
        authMessage(translateAuthError(err), 'error');
      }
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
    el.umEmail.textContent = u ? u.email : 'без аккаунта';
    el.userBtn.title = u ? `${name} · ${u.email}` : 'Гость — данные только в этом браузере';
    el.umLogin.hidden = !!u;
    el.umLogout.hidden = !u;
    el.umSyncNow.hidden = !u;
    if (typeof renderKeyUi === 'function') renderKeyUi();
  }

  el.userBtn.addEventListener('click', () => toggleMenu(el.userMenu, el.userBtn));
  el.userMenu.addEventListener('click', e => {
    // пункты-действия закрывают меню; тумблер анимаций — нет
    if (e.target.closest('button.menu-item')) setTimeout(() => closeMenus(), 0);
  });
  el.umLogin.addEventListener('click', () => showAuth('login'));
  el.umLogout.addEventListener('click', signOut);

  // удалить всех персонажей и задачи (с подтверждением и отменой)
  el.umReset.addEventListener('click', () => {
    closeMenus();
    const nt = state.tasks.length, np = state.projects.length;
    if (!nt && !np) { toast('Доска уже пустая'); return; }
    askConfirm({
      title: 'Начать с чистого листа?',
      html: `Удалятся ${np} ${plural(np, ['досье', 'досье', 'досье'])} и ${nt} ${plural(nt, ['контракт', 'контракта', 'контрактов'])}${cloud.user ? ' — на всех устройствах' : ''}. Сразу после удаления можно отменить.`,
      button: 'Очистить',
      onConfirm: () => {
        const snap = { tasks: state.tasks, projects: state.projects };
        applyData({ tasks: [], projects: [] }, { reset: true });
        save();
        renderAll();
        toast('Доска очищена', {
          type: 'danger', action: 'Отменить', duration: 7000,
          onAction: () => { applyData(snap); save(); renderAll(); }
        })
      }
    });
  });
  el.umSyncNow.addEventListener('click', () => { syncNow(true); });

  // анимации: «Вкл / Выкл»; ручной выбор важнее системной настройки
  el.motionToggle.checked = !reducedMotion;
  el.motionToggle.addEventListener('change', () => {
    const on = el.motionToggle.checked;
    root.dataset.motion = on ? 'on' : 'off';
    reducedMotion = !on;
    try { localStorage.setItem('evilsforge.motion', on ? 'on' : 'off'); } catch (e) { /* ignore */ }
  });
  el.umKeys.addEventListener('click', () => openOverlay(el.keysOverlay, $('[data-close]', el.keysOverlay)));

  /* ---------- Старт ---------- */
  // на телефоне сканирование арта — по касанию
  document.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || reducedMotion) return;
    const f = e.target.closest && e.target.closest('.frame');
    if (!f || !f.querySelector('.scan')) return;
    f.classList.remove('is-scanning');
    void f.offsetWidth;
    f.classList.add('is-scanning');
    setTimeout(() => f.classList.remove('is-scanning'), 700);
  }, { passive: true });

  async function boot() {
    if (!reducedMotion) { el.app.classList.add('is-booting'); setTimeout(() => el.app.classList.remove('is-booting'), 300); }
    setActive(el.spaceSwitch, $(`.seg-btn[data-value="${state.space}"]`, el.spaceSwitch) || $('.seg-btn', el.spaceSwitch));
    el.spaceLabel.textContent = SPACE_NAME[state.space] || SPACE_NAME.all;
    $$('.menu-item', el.spaceMenu).forEach(b => b.setAttribute('aria-checked', String(b.dataset.value === state.space)));
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

    // переход с лендинга («Начать бесплатно» / «Открыть трекер») всегда ведёт на вход или регистрацию,
    // даже если в этом браузере раньше выбрали «Продолжить без аккаунта»
    const asked = new URLSearchParams(location.search).get('auth');
    if (asked) { try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* ignore */ } }
    if (user) startCloudUser(user);
    else if (asked === 'login' || asked === 'register') showAuth(asked);
    else if (wantsLocal) startLocal();
    else showAuth('login');

  }

  function readMode() {
    try { return localStorage.getItem(KEYS.mode); } catch (e) { return null; }
  }

  boot();

  // относительное время и «горящие» задачи обновляются раз в минуту
  setInterval(() => { if (el.auth.hidden && !anyOpen() && !dragId) renderAll({ animate: false }); }, 60000);
})();
