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

/**
 * Maximum nesting depth of parsed elements, the same limit as Chrome's HTML
 * parser. Deeper elements become siblings at this depth, so that recursive
 * code like the serializers can't overflow the call stack on hostile input.
 */
export const MAX_PARSE_DEPTH = 512

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
  // Lowercase tag names of the open elements in `stack` and how often each is
  // open, so an end tag without an open element is ignored in O(1) instead of
  // searching the whole stack, which is quadratic for many stray end tags
  const stackNames: string[] = ['']
  const openCount = new Map<string, number>()

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
      const parentNode = stack[Math.min(stack.length, MAX_PARSE_DEPTH) - 1]
      if (parentNode) {
        const element = document.createElement(tagName, attrs)
        parentNode.appendChild(element)
        if (!SELF_CLOSING_TAGS.includes(lowerTagName) && !isSelfClosing) {
          const name = tagName.toLowerCase()
          stack.push(element)
          stackNames.push(name)
          openCount.set(name, (openCount.get(name) ?? 0) + 1)
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
      if (SELF_CLOSING_TAGS.includes(lowerTagName) || !openCount.get(lowerTagName))
        return
      // Pop down to the nearest matching open element. Index 0 is the root
      // document/fragment and is never popped, so an unmatched end tag (e.g.
      // `</div>` with no open `div`) is ignored instead of underflowing the
      // stack - which would otherwise orphan every following sibling, including
      // the entire `<body>` after a malformed `<head>`.
      while (stack.length > 1) {
        const name = stackNames.pop()!
        stack.pop()
        openCount.set(name, openCount.get(name)! - 1)
        if (name === lowerTagName)
          return
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
  this._detachChildren()
  this._childNodes = frag._childNodes
  frag._childNodes = []
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
