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

    const rules: Record<string, () => string> = {}

    SELECTOR_BLOCK_ELEMENTS.split(',').forEach((tag) => {
      rules[tag] = () => `\n\n${handleChildren().trim()}\n\n`
    })

    // After the block rules, not before: `SELECTOR_BLOCK_ELEMENTS` lists
    // `title` and `script` itself, so declaring these first meant the block
    // handler overwrote them and their raw text ended up in the output.
    rules.br = () => `${handleChildren()}\n`
    rules.title = () => ''
    rules.script = () => ''
    rules.style = () => ''

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
