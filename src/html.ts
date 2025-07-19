// Special cases:
// 1. <noop> is an element that is not printed out, can be used to create a list of elements
// 2. Attribute name '__' gets transformed to ':' for namespace emulation
// 3. Emulate CDATA by <cdata> element

import { escapeHTML } from './encoding'
import { hArgumentParser } from './h'
import { hasOwn } from './utils'
import { VDocumentFragment, VElement } from './vdom'

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

  const parts: string[] = []
  tag = tag.replace(/__/g, ':')

  // React fragment <>...</> and ours: <noop>...</noop>
  if (tag !== 'noop' && tag !== '') {
    if (tag !== 'cdata') {
      parts.push(`<${tag}`)
    }
    else {
      parts.push('<![CDATA[')
    }

    // Add attributes
    for (let name in attrs) {
      if (!name || !hasOwn(attrs, name))
        continue
      const v = attrs[name]
      if (name === 'html')
        continue
      if (name.toLowerCase() === 'classname')
        name = 'class'
      name = name.replace(/__/g, ':')
      if (v === true) {
        parts.push(` ${name}`)
      }
      else if (name === 'style' && typeof v === 'object') {
        const styleStr = Object.keys(v)
          .filter(k => v[k] != null)
          .map((k) => {
            let vv = v[k]
            vv = typeof vv === 'number' ? `${vv}px` : vv
            return `${k.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}:${vv}`
          })
          .join(';')
        if (styleStr)
          parts.push(` ${name}="${styleStr}"`)
      }
      else if (v !== false && v != null) {
        parts.push(` ${name}="${escapeHTML(v.toString())}"`)
      }
    }

    const isSelfClosing = !xmlMode && SELF_CLOSING_TAGS.includes(tag)
    if (tag !== 'cdata') {
      if (xmlMode && !hasChildren) {
        parts.push(' />')
        return parts.join('')
      }
      else {
        parts.push('>')
      }
    }
    if (isSelfClosing)
      return parts.join('')
  }

  // Append children
  if (hasChildren) {
    if (typeof children === 'string') {
      parts.push(children)
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
              parts.push(c)
            }
            else {
              parts.push(escapeHTML(c.toString()))
            }
          }
        }
        else {
          if ((typeof child === 'string' && child.startsWith('<') && child.endsWith('>')) || tag === 'script' || tag === 'style') {
            parts.push(child)
          }
          else {
            parts.push(escapeHTML(child.toString()))
          }
        }
      }
    }
  }

  if (attrs.html)
    parts.push(attrs.html)

  if (tag !== 'noop' && tag !== '') {
    if (tag !== 'cdata') {
      parts.push(`</${tag}>`)
    }
    else {
      parts.push(']]>')
    }
  }
  return parts.join('')
}

export function html(
  tag: string | ((props: any) => VDocumentFragment | VElement),
  attrs?: Record<string, unknown> | null,
  ...children: unknown[]
): string {
  const parsed = hArgumentParser(tag, attrs, ...children)
  return markup(false, parsed.tag as string, parsed.attrs, parsed.children)
}

export const htmlVDOM = markup.bind(null, false)

html.firstLine = '<!DOCTYPE html>'
html.html = true

export const h = html
