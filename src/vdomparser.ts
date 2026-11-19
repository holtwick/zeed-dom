import { unescapeHTML } from './encoding'
import { SELF_CLOSING_TAGS } from './html'
import { createHtmlParser } from './htmlparser'
import { hasOwn } from './utils'
import { document, VDocType, VDocumentFragment, VElement, VHTMLDocument, VNode, VTextNode } from './vdom'

interface NodeBufferLike {
  toString: (encoding?: any) => string
}

// Detect a Node-style Buffer without forcing `@types/node` on consumers.
function isNodeBuffer(value: unknown): value is NodeBufferLike {
  // eslint-disable-next-line node/prefer-global/buffer
  const B = (globalThis as { Buffer?: { isBuffer?: (v: unknown) => boolean } }).Buffer
  return !!B?.isBuffer?.(value)
}

// Makes sure we operate on VNodes
export function vdom(obj: VNode | NodeBufferLike | string | null = null): VNode {
  if (obj instanceof VNode)
    return obj
  if (isNodeBuffer(obj))
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
  const frag = isDoc
    ? new VHTMLDocument(true)
    : new VDocumentFragment()
  const stack: VNode[] = [frag]

  const parse = createHtmlParser({
    startElement(tagName: string, attrs: Record<string, string>, isSelfClosing: boolean) {
      const lowerTagName = tagName.length === 1
        ? tagName
        : tagName.toLowerCase()
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
    endElement(tagName: string) {
      // Always lowercase, no shortcut for single letters: `</B>` has to match
      // the open `b` element below
      const lowerTagName = tagName.toLowerCase()
      // Void elements are never pushed onto the stack (see startElement). A stray
      // end tag for one - some real-world (mail) HTML emits `</meta>`, `</img>`,
      // `</br>` - must therefore pop nothing.
      if (SELF_CLOSING_TAGS.includes(lowerTagName))
        return
      // Pop down to the nearest matching open element. Index 0 is the root
      // document/fragment and is never popped, so an unmatched end tag (e.g.
      // `</div>` with no open `div`) is ignored instead of underflowing the
      // stack - which would otherwise orphan every following sibling, including
      // the entire `<body>` after a malformed `<head>`.
      for (let i = stack.length - 1; i > 0; i--) {
        if ((stack[i] as VElement).tagName?.toLowerCase() === lowerTagName) {
          stack.length = i
          return
        }
      }
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
    nodes = [
      new VTextNode(text),
    ]
  }
  const insert = (parent: VNode, index: number) => {
    parent._childNodes.splice(index, 0, ...nodes)
    for (let i = 0; i < nodes.length; i++) {
      nodes[i]!._parentNode = parent
      nodes[i]!._index = index + i
    }
  }
  switch (position) {
    case 'beforebegin':
    case 'afterend':
      if (this.parentNode) {
        const idx = this._indexInParent()
        if (idx >= 0) {
          insert(this.parentNode, position === 'beforebegin'
            ? idx
            : idx + 1)
        }
      }
      break
    case 'afterbegin':
      insert(this, 0)
      break
    case 'beforeend':
      insert(this, this._childNodes.length)
      break
  }
}
