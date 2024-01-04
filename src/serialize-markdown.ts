import type { VElement, VNode } from './vdom'
import { isVElement } from './vdom'

interface SerializeContext {
  level: number
  count: 0
  mode?: 'ol' | 'ul'
}

function serialize(node: VNode | VElement, context: SerializeContext = {
  level: 0,
  count: 0,
}): string {
  if (isVElement(node)) {
    const tag: string = node.tagName.toLowerCase()

    const handleChildren = (ctx?: Partial<SerializeContext>): string => node.children.map(c => serialize(c, { ...context, ...ctx })).join('')

    const rules: Record<string, () => string> = {
      b: () => `**${handleChildren()}**`,
      i: () => `*${handleChildren()}*`,
      u: () => `_${handleChildren()}_`,
      strike: () => `~~${handleChildren()}~~`,
      li: () => `- ${handleChildren()}\n`,
      br: () => `${handleChildren()}\n`,
      ol: () => `\n\n${handleChildren({ level: context.level + 1 })}\n\n`,
      ul: () => `\n\n${handleChildren({ level: context.level + 1 })}\n\n`,
      p: () => `\n\n${handleChildren()}\n\n`,
      div: () => `\n\n${handleChildren()}\n\n`,
      h1: () => `\n\n# ${handleChildren()}\n\n`,
      h2: () => `\n\n## ${handleChildren()}\n\n`,
      h3: () => `\n\n### ${handleChildren()}\n\n`,
      h4: () => `\n\n#### ${handleChildren()}\n\n`,
      h5: () => `\n\n##### ${handleChildren()}\n\n`,
      h6: () => `\n\n###### ${handleChildren()}\n\n`,
      a: () => `[${handleChildren()}](${node.getAttribute('href')})`,
    }

    const fn = rules[tag]

    if (fn)
      return fn()
    else
      return handleChildren()
  }
  return node.textContent ?? ''
}

export function serializeMarkdown(node: VNode): string {
  return `${serialize(node).replace(/\n\n+/gim, '\n\n').trim()}\n`
}
