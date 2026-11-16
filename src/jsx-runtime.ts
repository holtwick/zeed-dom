import { h } from './html'

// See
// https://esbuild.github.io/api/#jsx-import-source
// https://www.typescriptlang.org/tsconfig/#jsxImportSource

/** Fragment for the automatic runtime, `<>...</>` renders only its children */
export const Fragment = ''

/**
 * Entry point of the automatic JSX runtime (`"jsx": "react-jsx"`).
 * Children arrive as `props.children` instead of extra arguments, `key` as
 * separate argument which has no meaning for static markup.
 */
export function jsx(tag: any, props?: Record<string, unknown> | null, _key?: unknown): string {
  const { children, ...attrs } = props ?? {}
  if (children === undefined)
    return h(tag, attrs)
  return h(tag, attrs, ...(Array.isArray(children)
    ? children
    : [children]))
}

export {
  h,
  jsx as jsxDEV,
  jsx as jsxs,
}
