/* eslint-disable node/prefer-global/buffer */

import { unescapeHTML } from './encoding'
import { SELF_CLOSING_TAGS } from './html'
import { createHtmlParser } from './htmlparser'
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

  const parse = createHtmlParser({
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
  })
  parse(html)
  return frag
}

// Attach parser-dependent methods to VElement prototype
VElement.prototype.setInnerHTML = function (html) {
  const frag = parseHTML(html)
  this._childNodes = frag._childNodes
  this._fixChildNodesParent()
}

VElement.prototype.insertAdjacentHTML = function (
  position: 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend',
  text: string,
) {
  let nodes: VNode[] = []
  try {
    const frag = parseHTML(text)
    nodes = frag._childNodes.filter((n: any) => n instanceof VNode)
  }
  catch (e) {
    // Only fallback if text is not valid HTML
    if (/^\s*<\/?[a-zA-Z]/.test(text)) {
      throw new Error('HTML parsing failed in insertAdjacentHTML')
    }
    nodes = [new VTextNode(text)]
  }
  switch (position) {
    case 'beforebegin':
      if (this.parentNode) {
        const idx = this._indexInParent()
        if (idx >= 0) {
          this.parentNode._childNodes.splice(idx, 0, ...nodes)
          this.parentNode._fixChildNodesParent()
        }
      }
      break
    case 'afterbegin':
      this._childNodes.unshift(...nodes)
      this._fixChildNodesParent()
      break
    case 'beforeend':
      this._childNodes.push(...nodes)
      this._fixChildNodesParent()
      break
    case 'afterend':
      if (this.parentNode) {
        const idx = this._indexInParent()
        if (idx >= 0) {
          this.parentNode._childNodes.splice(idx + 1, 0, ...nodes)
          this.parentNode._fixChildNodesParent()
        }
      }
      break
  }
}
