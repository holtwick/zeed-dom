// Copyright (c) 2020 Dirk Holtwick. All rights reserved. https://holtwick.de/copyright

import { unescapeHTML } from "./encoding"
import { SELF_CLOSING_TAGS } from "./html"
import { HtmlParser } from "./htmlparser"
import {
  document,
  VDocType,
  VDocument,
  VDocumentFragment,
  VElement,
  VNode,
  VNodeQuery,
  VTextNode,
} from "./vdom"

// Makes sure we operate on VNodes
export function vdom(obj = null): VNode {
  if (obj instanceof VNode) {
    return obj
  }
  // @ts-ignore
  if (obj instanceof Buffer) {
    obj = obj.toString("utf-8")
  }
  if (typeof obj === "string") {
    return parseHTML(obj)
  }
  // console.warn('Cannot convert to VDOM:', obj)
  return new VDocumentFragment()
}

export function parseHTML(html: string): VDocumentFragment {
  let frag = html.startsWith("<!") ? new VDocument() : new VDocumentFragment() // !hack

  let stack = [frag]

  let parser = new HtmlParser({
    // the for methods must be implemented yourself
    scanner: {
      startElement(tagName, attrs, isSelfClosing) {
        const lowerTagName = tagName.toLowerCase()

        if (lowerTagName === "!doctype") {
          frag.docType = new VDocType()
          return
        }

        for (let name in attrs) {
          if (attrs.hasOwnProperty(name)) {
            let value = attrs[name]
            // console.log(name, value)
            if (typeof value === "string") {
              attrs[name] = unescapeHTML(value)
            }
          }
        }
        let parentNode = stack[stack.length - 1]
        const element = document.createElement(tagName, attrs)
        parentNode.appendChild(element)
        if (
          !(SELF_CLOSING_TAGS.includes(tagName.toLowerCase()) || isSelfClosing)
        ) {
          // @ts-ignore
          stack.push(element)
        }
      },
      endElement(tagName) {
        stack.pop()
      },
      characters(text) {
        text = unescapeHTML(text)
        let parentNode = stack[stack.length - 1]
        if (parentNode?.lastChild?.nodeType === VNode.TEXT_NODE) {
          parentNode.lastChild._text += text
        } else {
          parentNode.appendChild(new VTextNode(text))
        }
      },
      comment(text) {},
    },
  })
  parser.parse(html)
  // console.log('frag', frag.innerHTML)
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
  let frag = parseHTML(html)
  this._childNodes = frag._childNodes
  this._fixChildNodesParent()
}
