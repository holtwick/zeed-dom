// Copyright (c) 2020 Dirk Holtwick. All rights reserved. https://holtwick.de/copyright

import { unescapeHTML } from './encoding'
import { SELF_CLOSING_TAGS } from './html'
import { HtmlParser } from './htmlparser'
import {
  VDocType,
  VDocumentFragment,
  VElement,
  VHTMLDocument,
  VNode,
  VTextNode,
  document,
} from './vdom'

// Makes sure we operate on VNodes
export function vdom(obj: VNode | Buffer | string | null = null): VNode {
  if (obj instanceof VNode)
    return obj

  if (obj instanceof Buffer)
    obj = obj.toString('utf-8')

  if (typeof obj === 'string')
    return parseHTML(obj)

  // console.warn('Cannot convert to VDOM:', obj)
  return new VDocumentFragment()
}

export function parseHTML(html: string): VDocumentFragment | VHTMLDocument {
  if (typeof html !== 'string') {
    console.error('parseHTML requires string, found', html)
    throw new Error('parseHTML requires string')
  }

  const frag
    = html.indexOf('<!') === 0 ? new VHTMLDocument(true) : new VDocumentFragment() // !hack

  const stack: VNode[] = [frag]

  const parser = new HtmlParser({
    // the for methods must be implemented yourself
    scanner: {
      startElement(
        tagName: string,
        attrs: Record<string, string>,
        isSelfClosing: boolean,
      ) {
        const lowerTagName = tagName.toLowerCase()

        if (lowerTagName === '!doctype') {
          frag.docType = new VDocType()
          return
        }

        for (const name in attrs) {
          if (Object.hasOwn(attrs, name)) {
            const value = attrs[name]
            // console.log(name, value)
            if (typeof value === 'string')
              attrs[name] = unescapeHTML(value)
          }
        }
        const parentNode = stack[stack.length - 1]
        if (parentNode) {
          const element = document.createElement(tagName, attrs)
          parentNode.appendChild(element)
          if (
            !(
              SELF_CLOSING_TAGS.includes(tagName.toLowerCase()) || isSelfClosing
            )
          )
            stack.push(element)
        }
      },
      endElement(tagName: string) {
        stack.pop()
      },
      characters(text: string) {
        text = unescapeHTML(text)
        const parentNode = stack[stack.length - 1]
        if (parentNode?.lastChild?.nodeType === VNode.TEXT_NODE) {
          parentNode.lastChild._text += text
        }
        else {
          if (parentNode)
            parentNode.appendChild(new VTextNode(text))
            // } else {
            //   console.trace(parentNode, stack)
        }
      },
      comment(text: string) {},
    },
  })
  parser.parse(html)
  // console.log("frag", frag)
  return frag
}

// export function parseHTML2(html) {
//   let frag = new VDocumentFragment()
//
//   let stack = [frag]
//   let currentElement = frag
//
//   let parser = new Parser({
//     onopentag: (name, attrs) => {
//       let element = document.createElement(name, attrs)
//       stack.push(element)
//       currentElement.appendChild(element)
//       currentElement = element
//     },
//     ontext: function (text) {
//       if (currentElement?.lastChild?.nodeType === VNode.TEXT_NODE) {
//         currentElement.lastChild._text += text
//       } else {
//         currentElement.appendChild(new VTextNode(text))
//       }
//     },
//     onclosetag: function (name) {
//       let element = stack.pop()
//       currentElement = stack[stack.length - 1]
//       // if (element.nodeName !== currentElement.nodeName) {
//       //   console.log('error', element, currentElement)
//       // }
//     },
//   }, { decodeEntities: true })
//   parser.write(html)
//   parser.end()
//
//   // console.log('frag', frag.innerHTML)
//
//   return frag
// }

VElement.prototype.setInnerHTML = function (html) {
  const frag = parseHTML(html)
  this._childNodes = frag._childNodes
  this._fixChildNodesParent()
}
