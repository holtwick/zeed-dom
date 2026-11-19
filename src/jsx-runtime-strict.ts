import type { HTMLString } from './html-strict'
import { htmlStrict } from './html-strict'

// Strict JSX runtime, use with `"jsxImportSource": "zeed-dom/strict"`.
// Like `zeed-dom/jsx-runtime`, but text is always escaped, see `htmlStrict()`.

/** Fragment for the automatic runtime, `<>...</>` renders only its children */
export const Fragment = ''

export function jsx(tag: any, props?: Record<string, unknown> | null, _key?: unknown): HTMLString {
  if (typeof tag === 'function')
    return tag(props ?? {})
  const { children, ...attrs } = props ?? {}
  if (children === undefined)
    return htmlStrict(tag, attrs)
  return htmlStrict(tag, attrs, ...(Array.isArray(children)
    ? children
    : [children]))
}

export {
  htmlStrict as h,
  jsx as jsxDEV,
  jsx as jsxs,
}

// eslint-disable-next-line ts/no-namespace
export namespace JSX {
  export type Element = HTMLString
  export interface IntrinsicElements {
    [elemName: string]: any
  }
}
