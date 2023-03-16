// Copyright (c) 2020 Dirk Holtwick. All rights reserved. https://holtwick.de/copyright

import type { VDocument, VDocumentFragment } from './vdom'

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
  tag: string | ((a0: any) => string),
  attrs: object,
  children: any[],
): string {
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
    let el
    if (tag) {
      if (tag.toLowerCase() === 'fragment')
        el = context.document.createDocumentFragment()
      else
        el = context.document.createElement(tag)
    }
    else {
      el = context.document.createElement('div')
    }
    if (attrs) {
      for (let [key, value] of Object.entries(attrs)) {
        key = key.toString()
        const compareKey = key.toLowerCase()
        if (compareKey === 'classname') {
          el.className = value
        }
        else if (compareKey === 'on') {
          Object.entries(value).forEach(([name, value]) => {
            el.setAttribute(`on${name}`, value)
          })
          // else if (key.indexOf('on') === 0) {
          //   if (el.addEventListener) {
          //     el.addEventListener(key.substring(2), value)
          //     continue
          //   }
        }
        else if (value !== false && value != null) {
          if (value === true)
            el.setAttribute(key, key)
          else
            el.setAttribute(key, value.toString())
        }
      }
    }
    if (children) {
      for (const childOuter of children) {
        const cc = Array.isArray(childOuter) ? [...childOuter] : [childOuter]
        for (const child of cc) {
          if (child) {
            if (child !== false && child != null) {
              if (typeof child !== 'object') {
                el.appendChild(
                  context.document.createTextNode(child.toString()),
                )
              }
              else {
                el.appendChild(child)
              }
            }
          }
        }
      }
    }
    return el
  }
}

export function hArgumentParser(tag: any, attrs: any, ...children: any[]) {
  if (typeof tag === 'object') {
    tag = 'fragment'
    children = tag.children
    attrs = tag.attrs
  }
  if (Array.isArray(attrs)) {
    children = [attrs]
    attrs = {}
  }
  else if (attrs) {
    if (attrs.attrs) {
      attrs = { ...attrs.attrs, ...attrs }
      delete attrs.attrs
    }
  }
  else {
    attrs = {}
  }
  return {
    tag,
    attrs,
    children:
      typeof children[0] === 'string' ? children : children.flat(Infinity),
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
