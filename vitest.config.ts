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
    alias: [
      { find: '@/', replacement: `${resolve(process.cwd(), 'src')}/` },
      // @tiptap/html imports `zeed-dom`; point it at the sources so
      // src/tiptap.spec.ts tests this checkout, not a published version.
      { find: /^zeed-dom$/, replacement: resolve(process.cwd(), 'src/index.browser.ts') },
    ],
    server: {
      deps: {
        // Let Vite transform @tiptap/html so the alias above applies to it.
        inline: [/@tiptap\/html/],
      },
    },
  },
})
