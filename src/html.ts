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
      if (name === 'html')
        continue
      if (name.length === 9 && name.toLowerCase() === 'classname')
        name = 'class'
      if (name.includes('__'))
        name = name.replace(/__/g, ':')
      if (v === true) {
        out += ` ${name}`
      }
      else if (name === 'style' && typeof v === 'object') {
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
          out += ` ${name}="${styleStr}"`
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
            if ((typeof c === 'string' && c.startsWith('<') && c.endsWith('>')) || tag === 'script' || tag === 'style') {
              out += c
            }
            else {
              out += escapeHTML(c.toString())
            }
          }
        }
        else {
          if ((typeof child === 'string' && child.startsWith('<') && child.endsWith('>')) || tag === 'script' || tag === 'style') {
            out += child
          }
          else {
            out += escapeHTML(child.toString())
          }
        }
      }
    }
  }

  if (attrs.html)
    out += attrs.html

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

html.firstLine = '<!DOCTYPE html>'
html.html = true

export const h = html
