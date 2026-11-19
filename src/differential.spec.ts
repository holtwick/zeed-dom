import fc from 'fast-check'
import { createHTMLDocument, VNode } from './vdom'
import { parseHTML } from './vdomparser'

// Differential tests: zeed-dom must agree with a real DOM implementation on
// random input. The reference is the browser's own DOM when the tests run in
// a browser, jsdom otherwise. fast-check shrinks a failing case to a minimal
// example and prints the seed to replay it.

async function referenceDocument(): Promise<Document> {
  if (typeof window !== 'undefined' && typeof window.document?.createElement === 'function')
    return window.document
  // Variable specifier, so the browser build doesn't try to bundle jsdom
  const name = 'jsdom'
  const { JSDOM } = await import(/* @vite-ignore */ name)
  return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document
}

let ref: Document

beforeAll(async () => {
  ref = await referenceDocument()
})

/** Comparable plain structure of a DOM or zeed-dom subtree */
function structure(node: any): any {
  if (node.nodeType === VNode.TEXT_NODE)
    return node.nodeValue
  if (node.nodeType === VNode.ELEMENT_NODE) {
    const attrs: Record<string, string> = {}
    for (const { name, value } of Array.from(node.attributes as ArrayLike<{ name: string, value: string }>))
      attrs[name] = value
    return {
      tag: node.tagName.toLowerCase(),
      attrs,
      children: Array.from(node.childNodes as ArrayLike<any>).map(structure),
    }
  }
  return Array.from(node.childNodes as ArrayLike<any>).map(structure)
}

/** Structure of the children only, e.g. of a container element */
function childStructure(node: any): any[] {
  return Array.from(node.childNodes as ArrayLike<any>).map(structure)
}

/** Merge adjacent text nodes and drop empty ones, like `normalize()` */
function normalized(s: any): any {
  if (typeof s === 'string' || s == null)
    return s
  const children: any[] = []
  for (const c of (Array.isArray(s)
    ? s
    : s.children).map(normalized)) {
    if (typeof c === 'string') {
      if (!c)
        continue
      if (typeof children[children.length - 1] === 'string') {
        children[children.length - 1] += c
        continue
      }
    }
    children.push(c)
  }
  return Array.isArray(s)
    ? children
    : { ...s, children }
}

// Random well-formed HTML

// No elements with implied end tags or special parsing rules (p, li, table,
// a, script …), their trees differ on purpose, zeed-dom doesn't follow the spec
const TAGS = [
  'div',
  'span',
  'b',
  'i',
  'em',
  'strong',
  'section',
  'u',
  'code',
  'small',
]
const VOID_TAGS = ['br', 'hr', 'img']

const textArb = fc.string({
  unit: fc.constantFrom('a', 'b', ' ', '\n', '&', '<', '>', '"', '\'', '=', '/', 'ä', '€', '😀', ' '),
  maxLength: 8,
})
const attrNameArb = fc.constantFrom('id', 'class', 'title', 'data-x', 'data-long-name', 'href', 'style', 'aria-label')
const attrsArb = fc.uniqueArray(fc.tuple(attrNameArb, textArb), {
  selector: ([n]) => n,
  maxLength: 3,
})

interface Tree { tag: string, attrs: [string, string][], children: (Tree | string)[] }

const { tree: treeArb } = fc.letrec<{ tree: Tree, node: Tree | string }>(tie => ({
  tree: fc.record({
    tag: fc.constantFrom(...TAGS),
    attrs: attrsArb,
    children: fc.array(tie('node'), { maxLength: 4 }),
  }),
  node: fc.oneof(
    { depthSize: 'small', withCrossShrink: true },
    textArb,
    fc.record({
      tag: fc.constantFrom(...VOID_TAGS),
      attrs: attrsArb,
      children: fc.constant([] as (Tree | string)[]),
    }),
    tie('tree'),
  ),
}))

function escapeText(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function toHTML(node: Tree | string): string {
  if (typeof node === 'string')
    return escapeText(node)
  const attrs = node.attrs.map(([n, v]) => ` ${n}="${v.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`).join('')
  if (VOID_TAGS.includes(node.tag))
    return `<${node.tag}${attrs}>`
  return `<${node.tag}${attrs}>${node.children.map(toHTML).join('')}</${node.tag}>`
}

describe('differential: parsing', () => {
  it('parses well-formed HTML to the same tree as a real DOM', () => {
    fc.assert(fc.property(fc.array(fc.oneof(treeArb, textArb), { maxLength: 4 }), (nodes) => {
      const html = nodes.map(toHTML).join('')
      const container = ref.createElement('div')
      container.innerHTML = html
      expect(normalized(structure(parseHTML(html)))).toEqual(normalized(childStructure(container)))
    }), { numRuns: 300 })
  })

  it('reads its own output back to the same tree', () => {
    fc.assert(fc.property(fc.array(fc.oneof(treeArb, textArb), { maxLength: 4 }), (nodes) => {
      const doc = parseHTML(nodes.map(toHTML).join(''))
      const again = parseHTML(doc.render())
      expect(normalized(structure(again))).toEqual(normalized(structure(doc)))
      expect(again.render()).toBe(doc.render())
    }), { numRuns: 300 })
  })

  it('serializes so that a real DOM reads the same tree', () => {
    fc.assert(fc.property(fc.array(fc.oneof(treeArb, textArb), { maxLength: 4 }), (nodes) => {
      const doc = parseHTML(nodes.map(toHTML).join(''))
      const container = ref.createElement('div')
      container.innerHTML = doc.render()
      expect(normalized(childStructure(container))).toEqual(normalized(structure(doc)))
    }), { numRuns: 300 })
  })
})

// Random sequences of DOM mutations, applied to both implementations

type Op
  = | { type: 'append', parent: number, child: number }
    | { type: 'insertBefore', parent: number, child: number, ref: number | null }
    | { type: 'remove', node: number }
    | { type: 'removeChild', parent: number, child: number }
    | { type: 'replaceWith', node: number, with: (number | string)[] }
    | { type: 'replaceChildren', parent: number, with: (number | string)[] }
    | { type: 'textContent', node: number, text: string }
    | { type: 'setAttribute', node: number, name: string, value: string }
    | { type: 'removeAttribute', node: number, name: string }

const NODES = 8 // node 0 is the root, 1-5 elements, 6-7 text nodes
const nodeArb = fc.integer({ min: 0, max: NODES - 1 })
const elementArb = fc.integer({ min: 0, max: 5 })
const contentArb = fc.array(fc.oneof(fc.integer({ min: 1, max: NODES - 1 }), fc.string({ maxLength: 3 })), { maxLength: 3 })

const opArb: fc.Arbitrary<Op> = fc.oneof(
  fc.record({
    type: fc.constant('append' as const),
    parent: elementArb,
    child: nodeArb,
  }),
  fc.record({
    type: fc.constant('insertBefore' as const),
    parent: elementArb,
    child: nodeArb,
    ref: fc.option(nodeArb),
  }),
  fc.record({
    type: fc.constant('remove' as const),
    node: nodeArb,
  }),
  fc.record({
    type: fc.constant('removeChild' as const),
    parent: elementArb,
    child: nodeArb,
  }),
  fc.record({
    type: fc.constant('replaceWith' as const),
    node: nodeArb,
    with: contentArb,
  }),
  fc.record({
    type: fc.constant('replaceChildren' as const),
    parent: elementArb,
    with: contentArb,
  }),
  fc.record({
    type: fc.constant('textContent' as const),
    node: elementArb,
    text: fc.string({ maxLength: 3 }),
  }),
  fc.record({
    type: fc.constant('setAttribute' as const),
    node: elementArb,
    name: attrNameArb,
    value: textArb,
  }),
  fc.record({
    type: fc.constant('removeAttribute' as const),
    node: elementArb,
    name: attrNameArb,
  }),
)

function createNodes(doc: any) {
  const nodes: any[] = [
    doc.createElement('main'),
  ]
  for (let i = 1; i <= 5; i++)
    nodes.push(doc.createElement(TAGS[i]!))
  nodes.push(doc.createTextNode('x'), doc.createTextNode('y'))
  return nodes
}

/**
 * True if the DOM would reject `op` because a node would end up inside itself.
 * Must be checked before, the DOM moves the nodes into a fragment before it
 * throws, so the call has side effects even though it fails.
 */
function isHierarchyError(nodes: any[], op: Op): boolean {
  const into = (parent: any, list: any[]) => !!parent && list.some(n => typeof n !== 'string' && nodes[n].contains(parent))
  switch (op.type) {
    case 'append':
    case 'insertBefore':
      return into(nodes[op.parent], [op.child])
    case 'replaceChildren':
      return into(nodes[op.parent], op.with)
    case 'replaceWith':
      return into(nodes[op.node].parentNode, op.with)
    default:
      return false
  }
}

/** Apply `op` to the reference DOM; returns false if the DOM rejects it */
function applyOp(nodes: any[], op: Op): boolean {
  const content = (list: (number | string)[]) => list.map(x => typeof x === 'string'
    ? x
    : nodes[x])
  try {
    switch (op.type) {
      case 'append':
        nodes[op.parent].appendChild(nodes[op.child])
        break
      case 'insertBefore':
        // `null`, not `undefined`: that is the DOM call, see `VNode.insertBefore`
        nodes[op.parent].insertBefore(nodes[op.child], op.ref == null
          ? null
          : nodes[op.ref])
        break
      case 'remove':
        nodes[op.node].remove()
        break
      case 'removeChild':
        nodes[op.parent].removeChild(nodes[op.child])
        break
      case 'replaceWith':
        nodes[op.node].replaceWith(...content(op.with))
        break
      case 'replaceChildren':
        nodes[op.parent].replaceChildren(...content(op.with))
        break
      case 'textContent':
        nodes[op.node].textContent = op.text
        break
      case 'setAttribute':
        nodes[op.node].setAttribute(op.name, op.value)
        break
      case 'removeAttribute':
        nodes[op.node].removeAttribute(op.name)
        break
    }
    return true
  }
  catch {
    return false
  }
}

/** The parent, children and siblings of every node must agree with each other */
function checkLinks(nodes: any[]) {
  for (const node of nodes) {
    const children = Array.from(node.childNodes as ArrayLike<any>)
    children.forEach((child, i) => {
      expect(child.parentNode).toBe(node)
      expect(child.previousSibling ?? null).toBe(children[i - 1] ?? null)
      expect(child.nextSibling ?? null).toBe(children[i + 1] ?? null)
    })
    expect(node.firstChild ?? null).toBe(children[0] ?? null)
    expect(node.lastChild ?? null).toBe(children[children.length - 1] ?? null)
    if (node.parentNode)
      expect(Array.from(node.parentNode.childNodes as ArrayLike<any>)).toContain(node)
  }
}

describe('differential: DOM mutations', () => {
  it('gives the same trees as a real DOM after random mutations', () => {
    // Rejected insertions into a node's own subtree warn
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())
    fc.assert(fc.property(fc.array(opArb, { maxLength: 12 }), (ops) => {
      const refNodes = createNodes(ref)
      const zeedNodes = createNodes(createHTMLDocument())
      for (const op of ops) {
        // Only what the DOM accepts, zeed-dom is lenient with invalid calls
        // like inserting a node into itself
        if (isHierarchyError(refNodes, op)) {
          // The DOM throws, zeed-dom warns and must leave the tree unchanged
          const before = zeedNodes.map(structure)
          applyOp(zeedNodes, op)
          expect(zeedNodes.map(structure)).toEqual(before)
          continue
        }
        if (!applyOp(refNodes, op))
          continue
        applyOp(zeedNodes, op)
      }
      checkLinks(zeedNodes)
      for (let i = 0; i < NODES; i++) {
        expect(structure(zeedNodes[i])).toEqual(structure(refNodes[i]))
        expect(zeedNodes.indexOf(zeedNodes[i].parentNode)).toBe(refNodes.indexOf(refNodes[i].parentNode))
      }
    }), { numRuns: 1000 })
  })
})
