// Special cases:
// 1. <noop> is an element that is not printed out, can be used to create a list of elements
// 2. Attribute name '__' gets transformed to ':' for namespace emulation
// 3. Emulate CDATA by <cdata> element

import type { VDocumentFragment, VElement } from './vdom'
import { escapeHTML } from './encoding'
import { hArgumentParser } from './h'
import { hasOwn } from './utils'

export const SELF_CLOSING_TAGS = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
  'command',
]

const SELF_CLOSING_SET = new Set(SELF_CLOSING_TAGS)

// A tag or attribute name containing one of these would end the tag early
// and let the rest of the name become attributes or markup, for example
// `setAttribute('x onload=alert(1)', '')`. Browsers reject such names with an
// `InvalidCharacterError`. The parser never produces them, it ends names there.
const INVALID_TAG_NAME_RE = /[\s/>]/
// `=` is allowed at the start, `<a =x>` is parsed to an attribute `=x` like in browsers
const INVALID_ATTRIBUTE_NAME_RE = /[\s>]|.=/

/**
 * Markup that is inserted as it is when used as a child of `html()` or the
 * JSX runtime. Returned by `htmlStrict()`, the strict JSX runtime and `raw()`.
 */
export class HTMLString extends String {}

function renderChild(child: any, tag: string, strict: boolean): string {
  if (child instanceof HTMLString)
    return child.toString()
  if (tag === 'script' || tag === 'style') {
    // Strict: `<\/script>` means the same in JavaScript strings and CSS, but
    // can't end the element
    return strict
      ? String(child).replace(/<\//g, '<\\/')
      : child
  }
  // Not strict: a string looking like markup is taken as markup, because
  // nested `html()` calls return plain strings. Untrusted text that starts
  // with `<` and ends with `>` is inserted unescaped, see `htmlStrict()`.
  if (!strict && typeof child === 'string' && child.startsWith('<') && child.endsWith('>'))
    return child
  return escapeHTML(child.toString())
}

export const CDATA = (s: string) => `<![CDATA[${s}]]>`
export const HTML = (s: string) => s

// export function prependXMLIdentifier(s) {
//   return '<?xml version="1.0" encoding="utf-8"?>\n' + s
// }

// https://reactjs.org/docs/jsx-in-depth.html
export function markup(
  xmlMode: boolean,
  tag: string,
  attrs: any = {},
  children?: any[] | string,
  strict = false,
) {
  const hasChildren = !(
    (typeof children === 'string' && children === '')
    || (Array.isArray(children)
      && (children.length === 0
        || (children.length === 1 && children[0] === '')))
      || children == null
  )

  let out = ''
  if (tag.includes('__'))
    tag = tag.replace(/__/g, ':')
  if (INVALID_TAG_NAME_RE.test(tag))
    throw new Error(`Invalid tag name: ${JSON.stringify(tag)}`)

  // The `html` prop of `html()` / JSX inserts raw markup. An element of the
  // VDOM renders with its children as one string, there `html` is an ordinary
  // attribute: it may come from parsed, untrusted HTML like `<div html="…">`.
  const rawHTML = typeof children === 'string'
    ? undefined
    : attrs.html

  // React fragment <>...</> and ours: <noop>...</noop>
  if (tag !== 'noop' && tag !== '') {
    if (tag !== 'cdata') {
      out += `<${tag}`
    }
    else {
      out += '<![CDATA['
    }

    // Add attributes
    for (let name in attrs) {
      if (!name || !hasOwn(attrs, name))
        continue
      const v = attrs[name]
      if (name === 'html' && typeof children !== 'string')
        continue
      if (name.length === 9 && name.toLowerCase() === 'classname')
        name = 'class'
      if (name.includes('__'))
        name = name.replace(/__/g, ':')
      if (INVALID_ATTRIBUTE_NAME_RE.test(name))
        continue
      if (v === true) {
        out += ` ${name}`
      }
      else if (name === 'style' && typeof v === 'object' && !(v instanceof HTMLString)) {
        const styleStr = Object.entries(v)
          .filter(([, val]) => val != null)
          .map(([k, val]) => {
            const vv = typeof val === 'number'
              ? `${val}px`
              : val
            return `${k.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}:${vv}`
          })
          .join(';')
        if (styleStr)
          out += ` ${name}="${escapeHTML(styleStr)}"`
      }
      else if (v !== false && v != null) {
        out += ` ${name}="${escapeHTML(v.toString())}"`
      }
    }

    const isSelfClosing = !xmlMode && SELF_CLOSING_SET.has(tag)
    if (tag !== 'cdata') {
      if (xmlMode && !hasChildren) {
        out += ' />'
        return out
      }
      else {
        out += '>'
      }
    }
    if (isSelfClosing)
      return out
  }

  // Append children
  if (hasChildren) {
    if (typeof children === 'string') {
      out += children
    }
    else if (children && children.length > 0) {
      for (const child of children) {
        if (child == null || child === false)
          continue
        if (Array.isArray(child)) {
          for (const c of child) {
            if (c == null || c === false)
              continue
            out += renderChild(c, tag, strict)
          }
        }
        else {
          out += renderChild(child, tag, strict)
        }
      }
    }
  }

  if (rawHTML)
    out += rawHTML

  if (tag !== 'noop' && tag !== '') {
    if (tag !== 'cdata') {
      out += `</${tag}>`
    }
    else {
      out += ']]>'
    }
  }
  return out
}

export function html(
  tag: string | ((props: any) => VDocumentFragment | VElement),
  attrs?: Record<string, unknown> | unknown[] | null,
  ...children: unknown[]
): string {
  const parsed = hArgumentParser(tag, attrs, ...children)
  return markup(false, parsed.tag as string, parsed.attrs, parsed.children)
}

export const htmlVDOM = markup.bind(null, false)
export const xmlVDOM = markup.bind(null, true)

html.firstLine = '<!DOCTYPE html>'
html.html = true

export const h = html
