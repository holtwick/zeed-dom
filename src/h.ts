import type { VDocument, VDocumentFragment, VElement } from './vdom'

/*
 * Abstraction for h/jsx like DOM descriptions.
 * It is used in DOM, VDOM
 *
 */

interface Context {
  h?: any
  document: VDocument | VDocumentFragment
}

function _h(
  context: Context,
  tag: string | ((a0: any) => VDocumentFragment | VElement),
  attrs: object,
  children: any[],
): VDocumentFragment | VElement {
  if (typeof tag === 'function') {
    return tag({
      props: { ...attrs, children },
      attrs,
      children,
      h: context.h,
      context,
    })
  }
  else {
    let isElement = true
    let el: VDocumentFragment | VElement
    if (tag) {
      if (tag.toLowerCase() === 'fragment') {
        el = context.document.createDocumentFragment()
        isElement = false
      }
      else { el = context.document.createElement(tag) }
    }
    else {
      el = context.document.createElement('div')
    }
    if (attrs && isElement) {
      const element = el as VElement
      for (const [key, value] of Object.entries(attrs)) {
        const compareKey = key.toLowerCase()
        if (compareKey === 'classname') {
          element.className = value
        }
        else if (compareKey === 'on') {
          for (const [name, v] of Object.entries(value)) {
            element.setAttribute(`on${name}`, String(v))
          }
        }
        else if (value !== false && value != null) {
          element.setAttribute(key, value === true ? key : value.toString())
        }
      }
    }
    if (children) {
      for (const childOuter of children) {
        const cc = Array.isArray(childOuter) ? childOuter : [childOuter]
        for (const child of cc) {
          if (child !== false && child != null) {
            if (typeof child !== 'object') {
              el.appendChild(context.document.createTextNode(child.toString()))
            }
            else {
              el.appendChild(child)
            }
          }
        }
      }
    }
    return el
  }
}

export function hArgumentParser(
  tag: string | ((props: any) => VDocumentFragment | VElement),
  attrs?: Record<string, unknown> | unknown[] | null,
  ...childrenInput: unknown[]
): { tag: string | ((props: any) => VDocumentFragment | VElement), attrs: Record<string, unknown>, children: unknown[] } {
  let children: unknown[] = childrenInput

  if (typeof tag === 'object' && tag !== null) {
    // If tag is an object, treat as fragment-like
    children = (tag as any).children
    attrs = (tag as any).attrs
    tag = 'fragment'
  }

  if (Array.isArray(attrs)) {
    children = [attrs]
    attrs = {}
  }
  else if (attrs) {
    if ((attrs as Record<string, unknown>).attrs) {
      const attrsObj = (attrs as Record<string, unknown>).attrs
      attrs = { ...(typeof attrsObj === 'object' && attrsObj !== null ? attrsObj : {}), ...attrs }
      delete (attrs as Record<string, unknown>).attrs
    }
  }
  else {
    attrs = {}
  }

  return {
    tag,
    attrs: attrs ?? {},
    children:
      typeof children[0] === 'string'
        ? children
        : children.flat(Number.POSITIVE_INFINITY),
  }
}

export function hFactory(context: Context) {
  // let context = { document }
  context.h = function h(itag: any, iattrs: any, ...ichildren: any[]) {
    const { tag, attrs, children } = hArgumentParser(itag, iattrs, ichildren)
    return _h(context, tag, attrs, children)
  }
  return context.h
}
