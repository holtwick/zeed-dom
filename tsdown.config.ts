import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.browser.ts',
    'src/index.node.ts',
    'src/jsx-runtime.ts',
    'src/jsx-runtime-strict.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  outExtensions: ({ format }) => ({
    js: format === 'es'
      ? '.js'
      : '.cjs',
    dts: format === 'es'
      ? '.d.ts'
      : '.d.cts',
  }),
})
