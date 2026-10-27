// Быстрая проверка трекера: основные действия без аккаунта + снимки экрана.
// Запуск:  node tests/smoke.mjs                 — поднимет локальный сервер из папки проекта
//          BASE=https://адрес node tests/smoke.mjs — проверит готовый сайт (например, тестовую ссылку Vercel)
// Снимки — в tests/shots/<имя>-<ширина>.png. Код выхода 1, если хоть одна проверка не прошла.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'tests', 'shots');
const LABEL = process.env.LABEL || 'now';
let BASE = process.env.BASE;
let server = null;

// простой статический сервер: api/* отвечает 404, значит трекер работает без аккаунта
if (!BASE) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.avif': 'image/avif' };
  server = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]);
    if (u.startsWith('/api/')) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end('{"error":"not_found"}'); return; }
    if (u.endsWith('/')) u += 'index.html';
    const p = path.join(ROOT, u);
    if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(p, (e, c) => {
      if (e) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
      res.end(c);
    });
  });
  await new Promise(r => server.listen(0, r));
  BASE = `http://localhost:${server.address().port}/`;
}

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`); };
const tasksIn = page => page.evaluate(() => JSON.parse(localStorage.getItem('evilsforge.tasks') || '[]'));
const projectsIn = page => page.evaluate(() => JSON.parse(localStorage.getItem('evilsforge.projects') || '[]'));

const browser = await chromium.launch();
const errors = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|404/.test(m.text())) errors.push(m.text()); });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  if (await page.locator('#auth:not([hidden])').count()) await page.click('#authLocalBtn');
  await page.waitForTimeout(400);
  const before = await tasksIn(page);
  check('Сайт открылся, есть данные', before.length > 0, `${before.length} задач`);
  check('Видны строки задач', await page.locator('.task[data-id]').count() > 0);

  // создание
  await page.click('#addBtn');
  await page.fill('#fTitle', 'Smoke: проверка');
  await page.press('#fTitle', 'Enter');
  await page.waitForTimeout(500);
  let tasks = await tasksIn(page);
  const created = tasks.find(t => t.title === 'Smoke: проверка');
  check('Создание задачи', !!created);
  check('Новая задача видна в списке', await page.locator('.task', { hasText: 'Smoke: проверка' }).count() > 0);

  // сохранение после перезагрузки
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  check('Данные сохраняются после F5', (await tasksIn(page)).some(t => t.title === 'Smoke: проверка'));

  // поиск
  await page.fill('#search', 'Smoke');
  await page.waitForTimeout(400);
  const found = await page.locator('.task[data-id]').count();
  check('Поиск находит задачу', found >= 1 && found < before.length + 1, `${found} строк`);
  await page.fill('#search', '');
  await page.waitForTimeout(300);

  // закрыть задачу
  await page.locator('.task', { hasText: 'Smoke: проверка' }).first().locator('[data-act="toggle"]').click();
  await page.waitForTimeout(1200);
  await page.keyboard.press('Escape');
  tasks = await tasksIn(page);
  check('Закрытие задачи (статус done)', tasks.find(t => t.title === 'Smoke: проверка')?.status === 'done');

  // удаление и «Отменить»
  await page.click('#addBtn');
  await page.fill('#fTitle', 'Smoke: удалить');
  await page.press('#fTitle', 'Enter');
  await page.waitForTimeout(500);
  const row = page.locator('.task', { hasText: 'Smoke: удалить' }).first();
  await row.hover();
  await row.locator('[data-act="delete"]').click({ force: true });
  await page.click('#confirmBtn');
  await page.waitForTimeout(700);
  check('Удаление задачи', !(await tasksIn(page)).some(t => t.title === 'Smoke: удалить'));
  await page.locator('.toast-action').last().click();
  await page.waitForTimeout(400);
  check('«Отменить» возвращает задачу', (await tasksIn(page)).some(t => t.title === 'Smoke: удалить'));

  // персонаж
  await page.click('#addProjectBtn');
  await page.fill('#pName', 'Smoke-персонаж');
  await page.press('#pName', 'Enter');
  await page.waitForTimeout(500);
  check('Создание персонажа', (await projectsIn(page)).some(p => p.name === 'Smoke-персонаж'));

  // пространства
  await page.locator('#spaceSwitch [data-value="personal"]').first().click({ force: true });
  await page.waitForTimeout(300);
  check('Переключение «Личное»', await page.evaluate(() => document.documentElement.dataset.space) === 'personal');
  await page.locator('#spaceSwitch [data-value="all"]').first().click({ force: true });
  await page.waitForTimeout(300);

  // горячие клавиши
  await page.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {});
  await page.keyboard.press('KeyN');
  await page.waitForTimeout(300);
  check('Клавиша N открывает создание', await page.locator('#taskOverlay.open').count() === 1);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check('Esc закрывает окно', await page.locator('#taskOverlay.open').count() === 0);
  await page.keyboard.press('Slash');
  check('Клавиша / ставит фокус в поиск', await page.evaluate(() => document.activeElement && document.activeElement.id === 'search'));
  await page.keyboard.press('Escape');

  check('Нет ошибок в консоли', errors.length === 0, errors.slice(0, 3).join(' | '));

  // снимки
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const [w, h] of [[1440, 900], [1366, 768], [390, 844], [360, 740]]) {
    const c = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
    const p = await c.newPage();
    await p.goto(BASE, { waitUntil: 'networkidle' });
    if (await p.locator('#auth:not([hidden])').count()) {
      await p.screenshot({ path: path.join(SHOTS, `${LABEL}-auth-${w}.png`) });
      await p.click('#authLocalBtn');
    }
    await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(SHOTS, `${LABEL}-tracker-${w}.png`) });
    const hasNoHScroll = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    check(`Нет горизонтальной прокрутки на ${w}px`, hasNoHScroll);
    await c.close();
  }
} finally {
  await browser.close();
  if (server) server.close();
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} проверок прошло`);
process.exit(failed.length ? 1 : 0);
