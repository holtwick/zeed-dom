import antfu from '@antfu/eslint-config'

export default antfu({
ignores: ["dist","**/dist/**","node_modules","**/node_modules/**","build","**/build/**","tmp","**/tmp/**","demos","**/demos/**","coverage","**/coverage/**","_archive","**/_archive/**","*.spec.*","**/*.spec.*/**","vitest.config.ts","**/vitest.config.ts/**","*.md","**/*.md/**","*.yml","**/*.yml/**"]
})
