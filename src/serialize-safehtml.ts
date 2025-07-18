import { escapeHTML } from './encoding'
import { isVElement, VNode } from './vdom'
import { parseHTML } from './vdomparser'

export const SELECTOR_BLOCK_ELEMENTS = 'p,h1,h2,h3,h4,h5,h6,blockquote,div,ul,ol,li,article,section,footer,nav,hr,form'

interface SerializeContext {
  level: number
  count: 0
  mode?: 'ol' | 'ul'
}

function serialize(node: VNode, context: SerializeContext = {
  level: 0,
  count: 0,
}): string {
  if (node.nodeType === VNode.DOCUMENT_FRAGMENT_NODE) {
    return node.children.map(c => serialize(c, { ...context })).join('')
  }

  else if (isVElement(node)) {
    const tag: string = node.tagName?.toLowerCase()
    const handleChildren = (ctx?: Partial<SerializeContext>): string => node.children.map(c => serialize(c, { ...context, ...ctx })).join('')

    const rules: Record<string, () => string> = {
      a: () => `<a href="${escapeHTML(node.getAttribute('href') ?? '')}" rel="noopener noreferrer" target="_blank">${handleChildren()}</a>`,
      img: () => `<img src="${escapeHTML(node.getAttribute('src') ?? '')}" alt="${escapeHTML(node.getAttribute('alt') ?? '')}">`,
      br: () => `<br>`,
      title: () => '',
      script: () => '',
      style: () => '',
      head: () => '',
    }

    SELECTOR_BLOCK_ELEMENTS.split(',').forEach((tag) => {
      rules[tag] = () => `<${tag}>${handleChildren().trim()}</${tag}>`
    })

    const fn = rules[tag]

    if (fn)
      return fn()

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
