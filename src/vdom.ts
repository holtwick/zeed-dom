import { escapeHTML } from './encoding'
import { hFactory } from './h'
import { htmlVDOM } from './html'
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

function toCamelCase(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+(.)/gi, (_m, chr) => chr.toUpperCase())
}

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
  /** Cached position in the parent's `_childNodes`, only a hint, see `_indexInParent` */
  _index = -1

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
    const Ctor = this.constructor as unknown as new () => this
    const node = new Ctor()
    if (deep) {
      // Iterative, so deeply nested trees don't overflow the call stack.
      // Subclasses copy their own fields in `cloneNode(false)`.
      const stack: [VNode, VNode][] = [
        [this, node],
      ]
      while (stack.length) {
        const [source, target] = stack.pop()!
        target._childNodes = source._childNodes.map((c) => {
          const clone = c.cloneNode(false)
          stack.push([c, clone])
          return clone
        })
        target._fixChildNodesParent()
      }
    }
    return node
  }

  _fixChildNodesParent() {
    const nodes = this._childNodes
    for (let i = 0; i < nodes.length; i++) {
      nodes[i]._parentNode = this
      nodes[i]._index = i
    }
  }

  /** Position of `node` in `_childNodes` or -1, uses the `_index` hint if valid */
  _childIndex(node: VNode) {
    return this._childNodes[node._index] === node
      ? node._index
      : this._childNodes.indexOf(node)
  }

  // The mutations below don't re-index the following siblings, which would
  // cost O(n) per call. `_indexInParent` repairs stale hints when needed.

  /**
   * True, and a warning, if `node` is this node or one of its ancestors:
   * inserting it here would make a node its own ancestor, and walks over the
   * tree would never end. The DOM throws a HierarchyRequestError then.
   */
  _rejectsChild(node: unknown, parent: VNode = this): boolean {
    if (!(node instanceof VNode))
      return false
    // A node without children can only be the parent itself, cheap for parsing
    if (node === parent || (node._childNodes.length > 0 && node.contains(parent))) {
      console.warn('Cannot insert a node into itself or one of its descendants', node)
      return true
    }
    return false
  }

  /** Detach all children, so they don't point to this node anymore */
  _detachChildren() {
    for (const child of this._childNodes) {
      child._parentNode = null
      child._index = -1
    }
    this._childNodes = []
  }

  /**
   * Like the DOM: `null` as reference node appends, a fragment inserts its
   * children. Without a reference node (`undefined`), which is a TypeError in
   * browsers, zeed-dom inserts at the start, as it always did.
   */
  insertBefore(newNode: VNode, node?: VNode | null) {
    if (node === null)
      return this.appendChild(newNode)
    if (newNode === node || this._rejectsChild(newNode))
      return
    const nodes = newNode instanceof VDocumentFragment
      ? [...newNode._childNodes]
      : [newNode]
    for (const n of nodes)
      n.remove()
    // Unknown reference node: the DOM throws, zeed-dom inserts at the start
    const index = node
      ? Math.max(0, this._childIndex(node))
      : 0
    this._childNodes.splice(index, 0, ...nodes)
    for (let i = 0; i < nodes.length; i++) {
      nodes[i]!._parentNode = this
      nodes[i]!._index = index + i
    }
  }

  appendChild(node: VNode | VNode[] | string | string[] | null | undefined) {
    if (node == null || this._rejectsChild(node))
      return
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
      node._parentNode = this
      node._index = this._childNodes.push(node) - 1
    }
    else {
      // Fallback for unknown data
      try {
        const text
          = typeof node === 'string'
            ? node
            : JSON.stringify(node, null, 2)
        const textNode = new VTextNode(text)
        textNode._parentNode = this
        textNode._index = this._childNodes.push(textNode) - 1
      }
      catch (err) {
        console.error(`The data ${node} to be added to ${this.render()} is problematic: ${err}`)
      }
    }
  }

  append = this.appendChild

  removeChild(node: VNode) {
    const i = this._childIndex(node)
    if (i >= 0) {
      node._parentNode = null
      node._index = -1
      // `shift` and `pop` are much faster than `splice` on large arrays in V8
      if (i === 0)
        this._childNodes.shift()
      else if (i === this._childNodes.length - 1)
        this._childNodes.pop()
      else
        this._childNodes.splice(i, 1)
    }
  }

  /** Remove node */
  remove() {
    this?.parentNode?.removeChild(this)
    return this
  }

  /** Replace content of node with text or nodes */
  replaceChildren(...nodes: any[]) {
    // Collect in a fragment first like the DOM: removes the nodes from their
    // parents, including this one, and a node given twice is added once
    // Check first, moving the nodes into the fragment would change the tree
    if (nodes.some(n => this._rejectsChild(n)))
      return
    const fragment = new VDocumentFragment()
    for (const n of nodes) {
      fragment.appendChild(typeof n === 'string'
        ? new VTextNode(n)
        : n)
    }
    this._detachChildren()
    this.appendChild(fragment)
  }

  /** Replace node itself with nodes */
  replaceWith(...nodes: any[]) {
    const parent = this._parentNode
    if (!parent || parent._childIndex(this) < 0 || nodes.some(n => this._rejectsChild(n, parent)))
      return
    // Like the DOM: the new nodes go where this node is, or if this node is
    // one of them, before the first following sibling that is not
    let next = this.nextSibling
    while (next && nodes.includes(next))
      next = next.nextSibling
    const fragment = new VDocumentFragment()
    for (const n of nodes) {
      fragment.appendChild(typeof n === 'string'
        ? new VTextNode(n)
        : n)
    }
    if (this._parentNode === parent) {
      parent.insertBefore(fragment, this)
      parent.removeChild(this)
    }
    else {
      parent.insertBefore(fragment, next)
    }
  }

  /**
   * Position in the parent's child list. `_index` is only a hint: mutations
   * like `insertBefore` or `removeChild` shift siblings without updating it.
   * If the hint is stale, all siblings are re-indexed once, so walking the
   * children with `nextSibling` stays O(n) instead of O(n²).
   */
  _indexInParent() {
    const p = this._parentNode
    if (!p)
      return -1
    const nodes = p._childNodes
    if (nodes[this._index] === this)
      return this._index
    const i = nodes.indexOf(this)
    if (i >= 0)
      p._fixChildNodesParent()
    return i
  }

  get parentNode() {
    return this._parentNode
  }

  get childNodes() {
    return this._childNodes || []
  }

  get children() {
    return (this._childNodes || []).filter<any>(isVElement)
  }

  get firstChild() {
    return this._childNodes[0]
  }

  get lastChild() {
    return this._childNodes[this._childNodes.length - 1]
  }

  get nextSibling() {
    const i = this._indexInParent()
    if (i >= 0)
      return this.parentNode.childNodes[i + 1] || null
    return null
  }

  get previousSibling() {
    const i = this._indexInParent()
    if (i > 0)
      return this.parentNode.childNodes[i - 1] || null
    return null
  }

  get childElementCount() {
    return this._childNodes.filter(child => child.nodeType === VNode.ELEMENT_NODE).length
  }

  get firstElementChild() {
    return this._childNodes.find(child => child.nodeType === VNode.ELEMENT_NODE) || null
  }

  get lastElementChild() {
    for (let i = this._childNodes.length - 1; i >= 0; i--) {
      if (this._childNodes[i].nodeType === VNode.ELEMENT_NODE) {
        return this._childNodes[i]
      }
    }
    return null
  }

  /**
   * Visit this node and all descendants in document order until `fn` returns
   * true. Iterative, so deeply nested trees don't overflow the call stack.
   */
  _walk(fn: (node: VNode) => boolean | void): VNode | undefined {
    if (fn(this))
      return this
    // One list and position per level, so a wide parent costs nothing until
    // its children are visited
    const lists: VNode[][] = [this._childNodes]
    const positions: number[] = [0]
    while (lists.length) {
      const top = lists.length - 1
      const children = lists[top]!
      const i = positions[top]!
      if (i >= children.length) {
        lists.pop()
        positions.pop()
        continue
      }
      positions[top] = i + 1
      const node = children[i]!
      if (fn(node))
        return node
      if (node._childNodes.length) {
        lists.push(node._childNodes)
        positions.push(0)
      }
    }
  }

  flatten(): VElement[] {
    const elements: VElement[] = []
    this._walk((node) => {
      if (node instanceof VElement)
        elements.push(node)
    })
    return elements
  }

  flattenNodes(): VNode[] {
    const nodes: VNode[] = []
    this._walk((node) => {
      nodes.push(node)
    })
    return nodes
  }

  render() {
    return ''
  }

  get textContent(): string | null {
    let text = ''
    this._walk((node) => {
      if (node.nodeType === VNode.TEXT_NODE)
        text += node.nodeValue ?? ''
    })
    return text
  }

  set textContent(text) {
    this._detachChildren()
    if (text)
      this.appendChild(new VTextNode(text.toString()))
  }

  contains(otherNode: VNode | null | undefined) {
    // Walk up instead of searching the whole subtree. A node whose parent no
    // longer lists it (e.g. after `innerHTML` was set) is not contained.
    for (let node = otherNode; node; node = node._parentNode) {
      if (node === this)
        return true
      if (node._parentNode && node._parentNode._childIndex(node) < 0)
        return false
    }
    return false
  }

  get ownerDocument(): any {
    const isDocument = (node: VNode) => node.nodeType === VNode.DOCUMENT_NODE || node.nodeType === VNode.DOCUMENT_FRAGMENT_NODE
    if (isDocument(this))
      return this
    for (let node: VNode | null = this._parentNode; node; node = node._parentNode) {
      if (isDocument(node))
        return node
    }
    return undefined
  }

  toString(): string {
    return `${this.nodeName}`
    // return `${this.nodeName}: ${JSON.stringify(this.nodeValue)}`
  }

  [inspect]() {
    return `${this.constructor.name} "${this.render()}"`
  }

  get parentElement() {
    // DOM spec: parentNode if it is an element, else null
    const p = this.parentNode
    return p && p.nodeType === VNode.ELEMENT_NODE
      ? p
      : null
  }

  // insertAdjacentHTML(position: 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend', text: string) {
  //   let nodes: VNode[] = []
  //   try {
  //     const fragment = parseHTML(text)
  //     nodes = fragment.childNodes.filter((n: any) => n instanceof VNode)
  //   } catch (e) {
  //     // Only fallback if text is not valid HTML
  //     if (/^\s*<\/?[a-zA-Z]/.test(text)) {
  //       throw new Error('HTML parsing failed in insertAdjacentHTML')
  //     }
  //     nodes = [new VTextNode(text)]
  //   }
  //   switch (position) {
  //     case 'beforebegin':
  //       if (this.parentNode) {
  //         const idx = this._indexInParent()
  //         if (idx >= 0) {
  //           this.parentNode._childNodes.splice(idx, 0, ...nodes)
  //           this.parentNode._fixChildNodesParent()
  //         }
  //       }
  //       break
  //     case 'afterbegin':
  //       this._childNodes.unshift(...nodes)
  //       this._fixChildNodesParent()
  //       break
  //     case 'beforeend':
  //       this._childNodes.push(...nodes)
  //       this._fixChildNodesParent()
  //       break
  //     case 'afterend':
  //       if (this.parentNode) {
  //         const idx = this._indexInParent()
  //         if (idx >= 0) {
  //           this.parentNode._childNodes.splice(idx + 1, 0, ...nodes)
  //           this.parentNode._fixChildNodesParent()
  //         }
  //       }
  //       break
  //   }
  // }
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
  /** First element in document order, including this one, for which `fn` is true */
  _findElement(fn: (element: VElement) => boolean): VElement | undefined {
    return this._walk(node => node instanceof VElement && fn(node)) as VElement | undefined
  }

  getElementById(name: string) {
    return this._findElement(e => e._attributes.id === name)
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
    // Stops at the first match instead of collecting all elements first
    return this._findElement(e => e.matches(selector))
  }

  getElementsByName(name: string) {
    // DOM spec: only elements with a matching name attribute
    return this.flatten().filter(e => e.getAttribute && e.getAttribute('name') === name)
  }

  //

  parent(selector: string): any {
    if (this.matches(selector))
      return this
    for (let node: VNodeQuery | null = this.parentNode; node; node = node.parentNode) {
      if (node.matches(selector))
        return node
    }
    return null
  }

  handle(selector: any, handler: (arg0: VElement, arg1: number) => void) {
    let i = 0
    for (const el of this.querySelectorAll(selector))
      handler(el, i++)
  }
}

interface Attr {
  name: string
  value: string
}

export type VElementStyle = Record<string, string> & {
  get length(): number
  getPropertyValue: (name: string) => any
}

export class VElement extends VNodeQuery {
  _originalTagName: string
  _nodeName: string
  _attributes: Record<string, string>
  _styles: VElementStyle | undefined
  _dataset: Record<string, string> | undefined

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
  }

  cloneNode(deep = false) {
    const node = super.cloneNode(deep)
    node._originalTagName = this._originalTagName
    node._nodeName = this._nodeName
    node._attributes = Object.assign({}, this._attributes)
    return node
  }

  get attributes(): Attr[] {
    return Object.entries(this._attributes).map(([name, value]): Attr => ({ name, value }))
    // return this._attributes
  }

  get attributesObject() {
    return { ...this._attributes }
  }

  _findAttributeName(name: string) {
    const search = name.toLowerCase()
    return (
      Object.keys(this._attributes).find(
        name => search === name.toLowerCase(),
      ) || null
    )
  }

  setAttribute(name: string, value: any) {
    this.removeAttribute(name)
    if (value != null && value !== false) {
      this._attributes[name] = value
    }
    this._styles = undefined
    this._dataset = undefined
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
    if (originalName) {
      delete this._attributes[originalName]
      this._styles = undefined
      this._dataset = undefined
    }
  }

  hasAttribute(name: any) {
    const originalName = this._findAttributeName(name)
    return originalName
      ? this._attributes[originalName] != null
      : false
  }

  /// See https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style
  get style(): VElementStyle {
    if (this._styles == null) {
      // const styles = Object.assign({}, DEFAULTS[this.tagName.toLowerCase()] || {})

      const styles: Record<string, string> = {}
      let count = 0

      const styleString = this.getAttribute('style')
      if (styleString) {
        let m: string[] | null

        // Thanks to https://github.com/holtwick/zeed-dom/issues/12#issuecomment-2148998665
        const re = /\s*([\w-]+)\s*:\s*((url\(.*?\)[^;]*|[^;]+))/gi

        // eslint-disable-next-line no-cond-assign
        while ((m = re.exec(styleString))) {
          const name = m[1]
          const value = m[2]?.trim()
          if (!name || value == null)
            continue
          ++count
          styles[name] = value
          styles[toCamelCase(name)] = value
        }
      }
      this._styles = {
        get length(): number {
          return count
        },
        getPropertyValue(name: string) {
          return styles[name]
        },

        ...DEFAULTS[this.tagName.toLowerCase()],
        ...styles,
      }
    }
    return this._styles!
  }

  /// See https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset
  get dataset() {
    if (this._dataset == null) {
      const dataset: Record<string, string> = {}
      for (const [key, value] of Object.entries(this._attributes)) {
        if (key.startsWith('data-')) {
          dataset[key.slice(5)] = value
          dataset[toCamelCase(key.slice(5))] = value
        }
      }
      this._dataset = dataset
    }
    return this._dataset
  }

  get tagName() {
    return this._nodeName
  }

  /** Private function to easily change the tagName */
  setTagName(name: string) {
    this._originalTagName = name
    this._nodeName = name.toUpperCase()
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

  insertAdjacentHTML(
    position: 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend',
    text: string,
  ) {
    // throw new Error('setInnerHTML is not implemented; see vdomparser for an example')
  }

  get innerHTML() {
    // htmlVDOM, NOT html: element renders pass their already-rendered children
    // as one string; `html()` routes that through hArgumentParser's array
    // branch, which escapes text AGAIN (double-escaping `&lt;` to `&amp;lt;`
    // inside nested elements). outerHTML below uses the same correct path.
    return this._childNodes.map(c => c.render(htmlVDOM)).join('')
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
    const classNames = String(this.className ?? '').trim().split(/\s+/g) || []
    // log('classList', classNames)
    return {
      contains(s: any) {
        return classNames.includes(s)
      },
      add: (s: any) => {
        if (!classNames.includes(s)) {
          classNames.push(s)
          this.className = classNames
        }
      },
      remove: (s: any) => {
        const index = classNames.indexOf(s)
        if (index >= 0) {
          classNames.splice(index, 1)
          this.className = classNames
        }
      },
    }
  }

  //

  render(h = htmlVDOM) {
    // Iterative, so deeply nested elements don't overflow the call stack.
    // Each frame collects the rendered children of one element.
    interface Frame { element: VElement, index: number, parts: any[] }
    const stack: Frame[] = [
      { element: this, index: 0, parts: [] },
    ]
    while (true) {
      const frame = stack[stack.length - 1]!
      const children = frame.element._childNodes
      if (frame.index < children.length) {
        const child = children[frame.index++]
        if (child instanceof VElement && child.render === VElement.prototype.render)
          stack.push({ element: child, index: 0, parts: [] })
        else
          frame.parts.push(child.render(h))
        continue
      }
      const { element, parts } = frame
      const result = h(
        element._originalTagName || element.tagName,
        element._attributes,
        parts.join(''), // children:string is not escaped again
      )
      stack.pop()
      if (!stack.length)
        return result
      stack[stack.length - 1]!.parts.push(result)
    }
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
    // htmlVDOM, NOT html — see VElement.innerHTML for the double-escape trap.
    return this._childNodes.map(c => c.render(htmlVDOM)).join('')
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
      html.appendChild(body)
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
      html.insertBefore(head, html.firstChild)
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

export function isVElement(n: VNode): n is VElement {
  return n.nodeType === VNode.ELEMENT_NODE
}

export function isVTextElement(n: VNode): n is VTextNode {
  return n.nodeType === VNode.TEXT_NODE
}

export function isVDocument(n: VNode): n is VDocument {
  return n.nodeType === VNode.DOCUMENT_NODE
}
