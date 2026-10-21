// Создаёт таблицы в Neon. Запуск: DATABASE_URL=... node scripts/migrate.mjs
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}
const sql = neon(url)

await sql`create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  password_hash text not null,
  created_at timestamptz not null default now()
)`
await sql`create table if not exists forge_data (
  user_id uuid primary key references users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
)`
await sql`create table if not exists login_attempts (
  id bigserial primary key,
  email text not null,
  at timestamptz not null default now()
)`
await sql`create index if not exists login_attempts_email_at on login_attempts (email, at)`

const tables = await sql`select table_name from information_schema.tables where table_schema = 'public' order by 1`
console.log('tables:', tables.map((t) => t.table_name).join(', '))
