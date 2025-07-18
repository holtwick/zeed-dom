import antfu from '@antfu/eslint-config'
import { eslintIgnoreDefaults, eslintRulesDefaults } from 'zeed/eslint'

export default antfu(
  {
    typescript: true,
    vue: true,

    regexp: false,

    ignores: [
      ...eslintIgnoreDefaults(),
      'docs', 'dist', '**/dist/**', 'node_modules', '**/node_modules/**', 'build', '**/build/**', 'tmp', '**/tmp/**', 'demos', '**/demos/**', 'coverage', '**/coverage/**', '_archive', '**/_archive/**', '*.spec.*', '**/*.spec.*/**', 'vitest.config.ts', '**/vitest.config.ts/**', '*.md', '**/*.md/**', '*.yml', '**/*.yml/**',
    ],
  },
  {},
  {
    rules: {
      ...eslintRulesDefaults(),
      'regexp/*': 'off',
      'regexp/confusing-quantifier': 'off',
      'antfu/consistent-list-newline': 'off',
      'eslint-disable-unused-imports/no-unused-imports': 'off',
    },
  },
)
