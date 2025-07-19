/* eslint-disable node/prefer-global/buffer */

import { unescapeHTML } from './encoding'
import { SELF_CLOSING_TAGS } from './html'
import { HtmlParser } from './htmlparser'
import { hasOwn } from './utils'
import { document, VDocType, VDocumentFragment, VElement, VHTMLDocument, VNode, VTextNode } from './vdom'

// Makes sure we operate on VNodes
export function vdom(obj: VNode | Buffer | string | null = null): VNode {
  if (obj instanceof VNode)
    return obj
  if (obj instanceof Buffer)
    obj = obj.toString('utf-8')
  if (typeof obj === 'string')
    return parseHTML(obj)
  return new VDocumentFragment()
}

export function parseHTML(html: string): VDocumentFragment | VHTMLDocument {
  if (typeof html !== 'string') {
    console.error('parseHTML requires string, found', html)
    throw new Error('parseHTML requires string')
  }

  const isDoc = html.startsWith('<!')
  const frag = isDoc ? new VHTMLDocument(true) : new VDocumentFragment()
  const stack: VNode[] = [frag]

  const parser = new HtmlParser({
    scanner: {
      startElement(tagName: string, attrs: Record<string, string>, isSelfClosing: boolean) {
        const lowerTagName = tagName.length === 1 ? tagName : tagName.toLowerCase()
        if (lowerTagName === '!doctype') {
          frag.docType = new VDocType()
          return
        }
        for (const name in attrs) {
          if (hasOwn(attrs, name) && typeof attrs[name] === 'string') {
            attrs[name] = unescapeHTML(attrs[name])
          }
        }
        const parentNode = stack[stack.length - 1]
        if (parentNode) {
          const element = document.createElement(tagName, attrs)
          parentNode.appendChild(element)
          if (!SELF_CLOSING_TAGS.includes(lowerTagName) && !isSelfClosing) {
            stack.push(element)
          }
        }
      },
      endElement() {
        stack.pop()
      },
      characters(text: string) {
        text = unescapeHTML(text)
        const parentNode = stack[stack.length - 1]
        if (parentNode?.lastChild?.nodeType === VNode.TEXT_NODE) {
          parentNode.lastChild._text += text
        }
        else if (parentNode) {
          parentNode.appendChild(new VTextNode(text))
        }
      },
      comment() {},
    },
  })
  parser.parse(html)
  return frag
}

VElement.prototype.setInnerHTML = function (html) {
  const frag = parseHTML(html)
  this._childNodes = frag._childNodes
  this._fixChildNodesParent()
}
