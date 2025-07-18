import type { VDocument } from './vdom'
import { VNode, VTextNode } from './vdom'

export const SELECTOR_BLOCK_ELEMENTS = 'meta,link,script,p,h1,h2,h3,h4,h5,h6,blockquote,div,ul,ol,li,article,section,footer,head,body,title,nav,hr,form'
export const TAGS_KEEP_CONTENT = ['PRE', 'CODE', 'SCRIPT', 'STYLE', 'TT']

function level(element: VNode): string {
  let indent = ''
  while (element.parentNode) {
    indent += '  '
    element = element.parentNode
  }
  return indent.slice(2)
}

export function tidyDOM(document: VDocument) {
  document.handle(SELECTOR_BLOCK_ELEMENTS, (e) => {
    // Ignore if inside PRE etc.
    let ee = e
    while (ee) {
      if (TAGS_KEEP_CONTENT.includes(ee.tagName))
        return
      ee = ee.parentNode
    }

    const parent = e.parentNode
    if (!parent)
      return

    const prev = e.previousSibling
    if (!prev || prev.nodeType !== VNode.TEXT_NODE || !prev.nodeValue?.endsWith('\n')) {
      parent.insertBefore(new VTextNode('\n'), e)
    }
    parent.insertBefore(new VTextNode(level(e)), e)

    const next = e.nextSibling
    if (!next || next.nodeType !== VNode.TEXT_NODE || !next.nodeValue?.startsWith('\n')) {
      if (next) {
        parent.insertBefore(new VTextNode('\n'), next)
      }
      else {
        parent.appendChild(new VTextNode('\n'))
      }
    }

    if (e.childNodes.length) {
      const first = e.firstChild
      if (first.nodeType === VNode.TEXT_NODE) {
        e.insertBefore(new VTextNode(`\n${level(e)}  `), first)
      }
      e.appendChild(new VTextNode(`\n${level(e)}`))
    }
  })
}
