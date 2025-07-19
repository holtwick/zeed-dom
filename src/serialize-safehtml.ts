import type { VElement } from './vdom'
import { escapeHTML } from './encoding'
import { isVElement, VNode } from './vdom'
import { parseHTML } from './vdomparser'

export const SELECTOR_BLOCK_ELEMENTS = 'p,h1,h2,h3,h4,h5,h6,blockquote,div,ul,ol,li,article,section,footer,nav,hr,form'

interface SerializeContext {
  level: number
  count: 0
  mode?: 'ol' | 'ul'
}

// Build rules map only once for performance
const blockTags = SELECTOR_BLOCK_ELEMENTS.split(',')
const baseRules: Record<string, (node: VElement, handleChildren: (ctx?: Partial<SerializeContext>) => string) => string> = {
  a: (node, handleChildren) => `<a href="${escapeHTML(node.getAttribute('href') ?? '')}" rel="noopener noreferrer" target="_blank">${handleChildren()}</a>`,
  img: node => `<img src="${escapeHTML(node.getAttribute('src') ?? '')}" alt="${escapeHTML(node.getAttribute('alt') ?? '')}">`,
  br: () => `<br>`,
  title: () => '',
  script: () => '',
  style: () => '',
  head: () => '',
}
blockTags.forEach((tag) => {
  baseRules[tag] = (node, handleChildren) => `<${tag}>${handleChildren().trim()}</${tag}>`
})

function serialize(node: VNode, context: SerializeContext = {
  level: 0,
  count: 0,
}): string {
  if (node.nodeType === VNode.DOCUMENT_FRAGMENT_NODE) {
    return (node.childNodes || []).map(c => serialize(c, { ...context })).join('')
  }
  else if (isVElement(node)) {
    const tag: string = node.tagName?.toLowerCase()
    const handleChildren = (ctx?: Partial<SerializeContext>): string => (node.childNodes || []).map(c => serialize(c, { ...context, ...ctx })).join('')
    const fn = baseRules[tag]
    if (fn)
      return fn(node, handleChildren)
    return handleChildren()
  }
  return escapeHTML(node.textContent ?? '')
}

export function serializeSafeHTML(node: VNode): string {
  return serialize(node).trim()
}

export function safeHTML(html: string) {
  return serializeSafeHTML(parseHTML(html))
}
