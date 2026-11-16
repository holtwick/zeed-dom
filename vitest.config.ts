/// <reference types="vitest" />
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  oxc: {
    jsx: {
      runtime: 'classic',
      pragma: 'h',
      pragmaFrag: 'Fragment',
      development: false,
    },
  },
  test: {
    include: ['./src/**/*.{client,test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    globals: true,
    alias: {
      '@/': `${resolve(process.cwd(), 'src')}/`,
    },
  },
})
