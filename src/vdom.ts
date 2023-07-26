// Copyright (c) 2020 Dirk Holtwick. All rights reserved. https://holtwick.de/copyright

import { escapeHTML } from './encoding'
import { hFactory } from './h'
import { html, htmlVDOM } from './html'
import { matchSelector } from './vcss'

// For node debugging
const inspect = Symbol.for('nodejs.util.inspect.custom')

const B = { fontWeight: 'bold' }
const I = { fontStyle: 'italic' }
const M = { backgroundColor: 'rgb(255, 250, 165)' }
const U = { textDecorations: 'underline' }
const S = { textDecorations: 'line-through' }
// let C = {}

const DEFAULTS = {
  b: B,
  strong: B,
  em: I,
  i: I,
  mark: M,
  u: U,
  a: U,
  s: S,
  del: S,
  ins: M,
  strike: S,
  // 'code': C,
  // 'tt': C
} as any

const toCamelCase = (s: string) =>
  s.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())

export class VNode {
  static ELEMENT_NODE = 1
  static TEXT_NODE = 3
  static CDATA_SECTION_NODE = 4
  static PROCESSING_INSTRUCTION_NODE = 7
  static COMMENT_NODE = 8
  static DOCUMENT_NODE = 9
  static DOCUMENT_TYPE_NODE = 10
  static DOCUMENT_FRAGMENT_NODE = 11

  _parentNode: any
  _childNodes: any[]

  get nodeType(): number {
    console.error('Subclasses should define nodeType!')
    return 0
  }

  get nodeName() {
    console.error('Subclasses should define nodeName!')
    return ''
  }

  get nodeValue(): string | null {
    return null
  }

  constructor() {
    this._parentNode = null
    this._childNodes = []
  }

  cloneNode(deep = false) {
    // @ts-expect-error xxx
    const node = new this.constructor()
    if (deep) {
      node._childNodes = this._childNodes.map(c => c.cloneNode(true))
      node._fixChildNodesParent()
    }
    return node
  }

  _fixChildNodesParent() {
    this._childNodes.forEach(node => (node._parentNode = this))
  }

  insertBefore(newNode: VNode, node?: VNode) {
    if (newNode !== node) {
      let index = node ? this._childNodes.indexOf(node) : 0
      if (index < 0)
        index = 0
      this._childNodes.splice(index, 0, newNode)
      this._fixChildNodesParent()
    }
  }

  appendChild(node: VNode | VNode[] | string | string[] | null | undefined) {
    if (node == null)
      return
    if (node === this) {
      console.warn('Cannot appendChild to self')
      return
    }
    // log('appendChild', node, this)

    if (node instanceof VDocument)
      console.warn('No defined how to append a document to a node!', node)

    if (node instanceof VDocumentFragment) {
      for (const c of [...node._childNodes]) {
        // Don't iterate over the original! Do [...el]
        this.appendChild(c)
      }
    }
    else if (Array.isArray(node)) {
      for (const c of [...node]) {
        // Don't iterate over the original! Do [...el]
        this.appendChild(c)
      }
    }
    else if (node instanceof VNode) {
      node.remove()
      this._childNodes.push(node)
    }
    else {
      // Fallback for unknown data
      try {
        const text
          = typeof node === 'string' ? node : JSON.stringify(node, null, 2)
        this._childNodes.push(new VTextNode(text))
      }
      catch (err) {
        console.error(
          `The data ${node} to be added to ${this.render()} is problematic: ${err}`,
        )
      }
    }
    this._fixChildNodesParent()
  }

  append = this.appendChild

  removeChild(node: { _parentNode: null }) {
    const i = this._childNodes.indexOf(node)
    if (i >= 0) {
      node._parentNode = null
      this._childNodes.splice(i, 1)
      this._fixChildNodesParent()
    }
  }

  remove() {
    this?.parentNode?.removeChild(this)
    return this
  }

  replaceChildren(...nodes: any[]) {
    this._childNodes = nodes.map(n =>
      typeof n === 'string' ? new VTextNode(n) : n.remove(),
    )
    this._fixChildNodesParent()
  }

  replaceWith(...nodes: any[]) {
    const p = this._parentNode
    if (p) {
      const index = this._indexInParent()
      if (index >= 0) {
        nodes = nodes.map(n =>
          typeof n === 'string' ? new VTextNode(n) : n.remove(),
        )
        p._childNodes.splice(index, 1, ...nodes)
        this._parentNode = null
        p._fixChildNodesParent()
      }
    }
  }

  _indexInParent() {
    if (this._parentNode)
      return this._parentNode.childNodes.indexOf(this)

    return -1
  }

  get parentNode() {
    return this._parentNode
  }

  get childNodes() {
    return this._childNodes || []
  }

  get children() {
    return this._childNodes || []
  }

  get firstChild() {
    return this._childNodes[0]
  }

  get lastChild() {
    return this._childNodes[this._childNodes.length - 1]
  }

  get nextSibling() {
    const i = this._indexInParent()
    if (i != null)
      return this.parentNode.childNodes[i + 1] || null

    return null
  }

  get previousSibling() {
    const i = this._indexInParent()
    if (i > 0)
      return this.parentNode.childNodes[i - 1] || null

    return null
  }

  flatten(): VElement[] {
    const elements: VElement[] = []
    if (this instanceof VElement)
      elements.push(this)

    for (const child of this._childNodes)
      elements.push(...child.flatten())

    return elements
  }

  flattenNodes(): VNode[] {
    const nodes: VNode[] = []
    nodes.push(this)
    for (const child of this._childNodes)
      nodes.push(...child.flattenNodes())

    return nodes
  }

  render() {
    return ''
  }

  get textContent(): string | null {
    return this._childNodes.map(c => c.textContent).join('')
  }

  set textContent(text) {
    this._childNodes = []
    if (text)
      this.appendChild(new VTextNode(text.toString()))
  }

  contains(otherNode: this) {
    if (otherNode === this)
      return true
    // if (this._childNodes.includes(otherNode)) return true
    return this._childNodes.some(n => n.contains(otherNode))
  }

  get ownerDocument() {
    if (
      this.nodeType === VNode.DOCUMENT_NODE
      || this.nodeType === VNode.DOCUMENT_FRAGMENT_NODE
    )
      return this

    return this?._parentNode?.ownerDocument
  }

  toString(): string {
    return `${this.nodeName}`
    // return `${this.nodeName}: ${JSON.stringify(this.nodeValue)}`
  }

  [inspect]() {
    return `${this.constructor.name} "${this.render()}"`
  }
}

export class VTextNode extends VNode {
  _text: string

  get nodeType(): number {
    return VNode.TEXT_NODE
  }

  get nodeName() {
    return '#text'
  }

  get nodeValue(): string | null {
    return this._text || ''
  }

  get textContent(): string | null {
    return this.nodeValue
  }

  constructor(text = '') {
    super()
    this._text = text
  }

  render() {
    const parentTagName = this.parentNode?.tagName
    if (parentTagName === 'SCRIPT' || parentTagName === 'STYLE')
      return this._text

    return escapeHTML(this._text)
  }

  cloneNode(deep = false) {
    const node = super.cloneNode(deep)
    node._text = this._text
    return node
  }
}

export class VNodeQuery extends VNode {
  getElementById(name: string) {
    return this.flatten().find(e => e._attributes.id === name)
  }

  getElementsByClassName(name: any) {
    return this.flatten().filter(e => e.classList.contains(name))
  }

  matches(selector: string) {
    return matchSelector(selector, this as any)
  }

  querySelectorAll(selector: any) {
    return this.flatten().filter(e => e.matches(selector))
  }

  querySelector(selector: string) {
    return this.flatten().find(e => e.matches(selector))
  }

  //

  parent(selector: string) {
    if (this.matches(selector))
      return this

    if (this.parentNode == null)
      return null

    return this.parentNode?.parent(selector)
  }

  handle(selector: any, handler: (arg0: VElement, arg1: number) => void) {
    let i = 0
    for (const el of this.querySelectorAll(selector))
      handler(el, i++)
  }
}

export class VElement extends VNodeQuery {
  _originalTagName: string
  _nodeName: any
  _attributes: Record<string, string>
  _styles: any

  get nodeType() {
    return VNode.ELEMENT_NODE
  }

  get nodeName() {
    return this._nodeName
  }

  constructor(name = 'div', attrs = {}) {
    super()
    this._originalTagName = name
    this._nodeName = (name || '').toUpperCase()
    this._attributes = attrs || {}
    this._styles = null
  }

  cloneNode(deep = false) {
    const node = super.cloneNode(deep)
    node._originalTagName = this._originalTagName
    node._nodeName = this._nodeName
    node._attributes = Object.assign({}, this._attributes)
    return node
  }

  get attributes() {
    return this._attributes
  }

  _findAttributeName(name: string) {
    const search = name.toLowerCase()
    return (
      Object.keys(this._attributes).find(
        name => search === name.toLowerCase(),
      ) || null
    )
  }

  setAttribute(name: string, value: string) {
    this.removeAttribute(name)
    this._attributes[name] = value
    this._styles = null
  }

  getAttribute(name: string): string | null {
    const originalName = this._findAttributeName(name)
    const value = originalName ? this._attributes[originalName] : null
    if (value == null)
      return null
    else if (typeof value === 'string')
      return value
    else
      return ''
  }

  removeAttribute(name: string | number) {
    const originalName = this._findAttributeName(String(name))
    if (originalName)
      delete this._attributes[name]
  }

  hasAttribute(name: any) {
    const originalName = this._findAttributeName(name)
    return originalName ? this._attributes[originalName] != null : false
  }

  get style() {
    if (this._styles == null) {
      const styles = Object.assign({}, DEFAULTS[this.tagName.toLowerCase()] || {})
      const styleString = this.getAttribute('style')
      if (styleString) {
        let m: string[] | null
        const re = /\s*([\w-]+)\s*:\s*([^;]+)/g
        // eslint-disable-next-line no-cond-assign
        while ((m = re.exec(styleString))) {
          const name = m[1]
          const value = m[2].trim()
          styles[name] = value
          styles[toCamelCase(name)] = value
        }
      }
      this._styles = styles
    }
    return this._styles
  }

  get tagName() {
    return this._nodeName
  }

  get id(): string | null {
    return this._attributes.id || null
  }

  set id(value: string | null) {
    if (value == null)
      delete this._attributes.id
    else this._attributes.id = value
  }

  get src(): string | null {
    return this._attributes.src
  }

  set src(value: string | null) {
    if (value == null)
      delete this._attributes.src
    else this._attributes.src = value
  }

  //

  getElementsByTagName(name: string) {
    name = name.toUpperCase()
    const elements = this.flatten()
    if (name !== '*')
      return elements.filter(e => e.tagName === name)

    return elements
  }

  // html

  setInnerHTML(_html: string) {
    // throw new Error('setInnerHTML is not implemented; see vdomparser for an example')
  }

  get innerHTML() {
    return this._childNodes.map(c => c.render(html)).join('')
  }

  set innerHTML(html) {
    this.setInnerHTML(html)
  }

  get outerHTML() {
    return this.render(htmlVDOM)
  }

  // class

  get className(): string {
    return this._attributes.class || ''
  }

  set className(name: string | string[]) {
    if (Array.isArray(name)) {
      name = name.filter(n => !!n).join(' ')
    }
    else if (typeof name === 'object') {
      name = Object.entries(name)
        .filter(([_k, v]) => !!v)
        .map(([k, _v]) => k)
        .join(' ')
    }
    this._attributes.class = name
  }

  get classList() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    const classNames = (this.className || '').trim().split(/\s+/g) || []
    // log('classList', classNames)
    return {
      contains(s: any) {
        return classNames.includes(s)
      },
      add(s: any) {
        if (!classNames.includes(s)) {
          classNames.push(s)
          self.className = classNames
        }
      },
      remove(s: any) {
        const index = classNames.indexOf(s)
        if (index >= 0) {
          classNames.splice(index, 1)
          self.className = classNames
        }
      },
    }
  }

  //

  render(h = htmlVDOM) {
    return h(
      this._originalTagName || this.tagName,
      this.attributes,
      this._childNodes.map(c => c.render(h)).join(''), // children:string is not escaped again
    )
  }
}

export class VDocType extends VNode {
  // todo

  name: any
  publicId: any
  systemId: any

  get nodeName(): string {
    return super.nodeName
  }

  get nodeValue(): string | null {
    return super.nodeValue
  }

  get nodeType(): number {
    return VDocType.DOCUMENT_TYPE_NODE
  }

  render() {
    return '<!DOCTYPE html>' // hack!
  }
}

export class VDocumentFragment extends VNodeQuery {
  docType?: VDocType

  get nodeType() {
    return VNode.DOCUMENT_FRAGMENT_NODE
  }

  get nodeName() {
    return '#document-fragment'
  }

  render(h = htmlVDOM) {
    return this._childNodes.map(c => c.render(h) || []).join('')
  }

  get innerHTML() {
    // for debug
    return this._childNodes.map(c => c.render(html)).join('')
  }

  createElement(name: string, attrs = {}) {
    return new VElement(name, attrs)
  }

  createDocumentFragment() {
    return new VDocumentFragment()
  }

  createTextNode(text?: string) {
    return new VTextNode(text)
  }
}

export class VDocument extends VDocumentFragment {
  get nodeType() {
    return VNode.DOCUMENT_NODE
  }

  get nodeName() {
    return '#document'
  }

  get documentElement() {
    return this.firstChild
  }

  render(h = htmlVDOM) {
    let content = super.render(h)
    if (this.docType)
      content = this.docType.render() + content

    return content
  }
}

export class VHTMLDocument extends VDocument {
  constructor(empty = false) {
    super()
    this.docType = new VDocType()
    if (!empty) {
      const html = new VElement('html')
      const body = new VElement('body')
      const head = new VElement('head')
      const title = new VElement('title')
      html.appendChild(head)
      head.appendChild(title)
      html.appendChild(body)
      this.appendChild(html)
    }
  }

  get body(): VElement {
    let body = this.querySelector('body')
    if (!body) {
      let html = this.querySelector('html')
      if (!html) {
        html = new VElement('html')
        this.appendChild(html)
      }
      body = new VElement('body')
      html.appendChild(html)
    }
    return body
  }

  get title(): string {
    return this.querySelector('title')?.textContent || ''
  }

  set title(title: string) {
    const titleElement = this.querySelector('title')
    if (titleElement)
      titleElement.textContent = title
  }

  get head(): VElement {
    let head = this.querySelector('head')
    if (!head) {
      let html = this.querySelector('html')
      if (!html) {
        html = new VElement('html')
        this.appendChild(html)
      }
      head = new VElement('head')
      html.insertBefore(html)
    }
    return head
  }
}

export function createDocument(): VDocument {
  return new VDocument()
}

export function createHTMLDocument(): VHTMLDocument {
  return new VHTMLDocument()
}

export const document = createDocument()
export const h = hFactory({ document })
