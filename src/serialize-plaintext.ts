import type { VElement } from './vdom'
import { SELECTOR_BLOCK_ELEMENTS } from './tidy'
import { isVElement, VNode } from './vdom'

interface SerializeContext {
  level: number
  count: 0
  mode?: 'ol' | 'ul'
}

function serialize(node: VNode | VElement, context: SerializeContext = {
  level: 0,
  count: 0,
}): string {
  if (node.nodeType === VNode.DOCUMENT_FRAGMENT_NODE) {
    return node.childNodes.map(c => serialize(c, { ...context })).join('')
  }

  else if (isVElement(node)) {
    const tag: string = node.tagName.toLowerCase()

    const handleChildren = (ctx?: Partial<SerializeContext>): string => node.childNodes.map(c => serialize(c, { ...context, ...ctx })).join('')

    const rules: Record<string, () => string> = {
      br: () => `${handleChildren()}\n`,
      title: () => '',
      script: () => '',
      style: () => '',
    }

    SELECTOR_BLOCK_ELEMENTS.split(',').forEach((tag) => {
      rules[tag] = () => `\n\n${handleChildren().trim()}\n\n`
    })

    const fn = rules[tag]

    if (fn)
      return fn()
    else
      return handleChildren()
  }
  return node.textContent ?? ''
}

export function serializePlaintext(node: VNode): string {
  return `${serialize(node).replace(/\n{2,}/g, '\n\n').trim()}\n`
}
