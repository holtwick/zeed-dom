import type { VElement } from './vdom'
import { SELECTOR_BLOCK_ELEMENTS } from './tidy'
import { isVElement, VNode } from './vdom'

// Built once, not for every element
const BLOCK_TAGS = new Set(SELECTOR_BLOCK_ELEMENTS.split(','))
const DROP_TAGS = new Set(['title', 'script', 'style'])

interface SerializeContext {
  level: number
  count: 0
  mode?: 'ol' | 'ul'
}

function serialize(node: VNode | VElement, context: SerializeContext = {
  level: 0,
  count: 0,
}): string {
  // A document is walked exactly like a fragment. Without this it fell
  // through to the `textContent` branch at the bottom, which loses every
  // block boundary and includes the raw text of `<title>` and `<style>`.
  // `parseHTML` of any complete page returns a document.
  if (node.nodeType === VNode.DOCUMENT_FRAGMENT_NODE || node.nodeType === VNode.DOCUMENT_NODE) {
    return node.childNodes.map(c => serialize(c, { ...context })).join('')
  }

  else if (isVElement(node)) {
    const tag: string = node.tagName.toLowerCase()

    const handleChildren = (ctx?: Partial<SerializeContext>): string => node.childNodes.map(c => serialize(c, {
      ...context,
      ...ctx,
    })).join('')

    // Order as before: dropped tags win over `br`, which wins over blocks.
    // `SELECTOR_BLOCK_ELEMENTS` lists `title` and `script` itself.
    if (DROP_TAGS.has(tag))
      return ''
    if (tag === 'br')
      return `${handleChildren()}\n`
    if (BLOCK_TAGS.has(tag))
      return `\n\n${handleChildren().trim()}\n\n`
    return handleChildren()
  }
  return node.textContent ?? ''
}

export function serializePlaintext(node: VNode): string {
  return `${serialize(node).replace(/\n{2,}/g, '\n\n').trim()}\n`
}
