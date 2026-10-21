import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Лендинг собирается в ../promo и публикуется рядом с трекером:
// https://mrevil-master.github.io/evils-forge/promo/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  build: { outDir: '../promo', emptyOutDir: true },
})
