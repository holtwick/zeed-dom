// Copyright (c) 2020 Dirk Holtwick. All rights reserved. https://holtwick.de/copyright

// Special cases:
// 1. <noop> is an element that is not printed out, can be used to create a list of elements
// 2. Attribute name '__' gets transformed to ':' for namespace emulation
// 3. Emulate CDATA by <cdata> element

// TODO: Probably use this instead of html.js

import { hArgumentParser } from "./h.js"
import { escapeHTML } from "./encoding.js"

export const SELF_CLOSING_TAGS = [
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
  "command",
]
let USED_JSX = [] // HACK:dholtwick:2016-08-23

export function CDATA(s) {
  s = "<![CDATA[" + s + "]]>"
  USED_JSX.push(s)
  return s
}

export function HTML(s) {
  USED_JSX.push(s)
  return s
}

// export function prependXMLIdentifier(s) {
//   return '<?xml version="1.0" encoding="utf-8"?>\n' + s
// }

// https://reactjs.org/docs/jsx-in-depth.html
export function markup(xmlMode, tag, attrs, children) {
  // console.log('markup', xmlMode, tag, attrs, children)
  const hasChildren = children && children.length > 0
  let s = ""
  tag = tag.replace(/__/g, ":")
  if (tag !== "noop") {
    if (tag !== "cdata") {
      s += `<${tag}`
    } else {
      s += "<![CDATA["
    }

    // Add attributes
    for (let name in attrs) {
      if (name && attrs.hasOwnProperty(name)) {
        let v = attrs[name]
        if (name === "html") {
          continue
        }
        if (name.toLowerCase() === "classname") {
          name = "class"
        }
        name = name.replace(/__/g, ":")
        if (v === true) {
          // s += ` ${name}="${name}"`
          s += ` ${name}`
        } else if (name === "style" && typeof v === "object") {
          s += ` ${name}="${Object.keys(v)
            .filter((k) => v[k] != null)
            .map((k) => {
              let vv = v[k]
              vv = typeof vv === "number" ? vv + "px" : vv
              return `${k
                .replace(/([a-z])([A-Z])/g, "$1-$2")
                .toLowerCase()}:${vv}`
            })
            .join(";")}"`
        } else if (v !== false && v != null) {
          s += ` ${name}="${escapeHTML(v.toString())}"`
        }
      }
    }
    if (tag !== "cdata") {
      if (xmlMode && !hasChildren) {
        s += " />"
        USED_JSX.push(s)
        return s
      } else {
        s += `>`
      }
    }

    if (!xmlMode) {
      if (SELF_CLOSING_TAGS.includes(tag)) {
        USED_JSX.push(s)
        return s
      }
    }
  }

  // Append children
  if (hasChildren) {
    for (let child of children) {
      if (child != null && child !== false) {
        if (!Array.isArray(child)) {
          child = [child]
        }
        for (let c of child) {
          if (
            USED_JSX.indexOf(c) !== -1 ||
            tag === "script" ||
            tag === "style"
          ) {
            s += c
          } else {
            s += escapeHTML(c.toString())
          }
        }
      }
    }
  }

  if (attrs.html) {
    s += attrs.html
  }

  if (tag !== "noop") {
    if (tag !== "cdata") {
      s += `</${tag}>`
    } else {
      s += "]]>"
    }
  }
  USED_JSX.push(s)
  return s
}

export function html(itag: string, iattrs?: object, ...ichildren: any[]) {
  // @ts-ignore
  let { tag, attrs, children } = hArgumentParser(itag, iattrs, ichildren)
  return markup(false, tag, attrs, children)
}

html.firstLine = "<!DOCTYPE html>"
html.html = true

export let h = html
