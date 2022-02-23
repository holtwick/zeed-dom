// (C)opyright 2021-07-20 Dirk Holtwick, holtwick.it. All rights reserved.

import { VDocument, VNode, VTextNode } from "./vdom"

const SELECTOR_BLOCK_ELEMENTS =
  "meta,link,script,p,h1,h2,h3,h4,h5,h6,blockquote,div,ul,ol,li,article,section,footer,head,body,title,nav,section,article,hr,form"
const TAGS_KEEP_CONTENT = ["PRE", "CODE", "SCRIPT", "STYLE", "TT"]

function level(element: VNode): string {
  let indent = ""
  while (element.parentNode) {
    indent += "  "
    element = element.parentNode
  }
  return indent.substr(2)
}

export function tidyDOM(document: VDocument) {
  document.handle(SELECTOR_BLOCK_ELEMENTS, (e) => {
    // Ignore if inside PRE etc.
    let ee = e
    while (ee) {
      if (TAGS_KEEP_CONTENT.includes(ee.tagName)) return
      ee = ee.parentNode
    }

    let prev = e.previousSibling
    if (
      !prev ||
      prev.nodeType !== VNode.TEXT_NODE ||
      !prev.nodeValue?.endsWith("\n")
    ) {
      e.parentNode?.insertBefore(new VTextNode("\n"), e)
    }
    e.parentNode?.insertBefore(new VTextNode(level(e)), e)

    let next = e.nextSibling
    if (
      !next ||
      next.nodeType !== VNode.TEXT_NODE ||
      !next.nodeValue?.startsWith("\n")
    ) {
      if (next) {
        e.parentNode?.insertBefore(new VTextNode("\n"), next)
      } else {
        e.parentNode?.appendChild(new VTextNode("\n"))
      }
    }

    if (e.childNodes.length) {
      let first = e.firstChild
      if (first.nodeType === VNode.TEXT_NODE) {
        e.insertBefore(new VTextNode("\n" + level(e) + "  "))
      }
      e.appendChild(new VTextNode("\n" + level(e)))
    }
  })
}
