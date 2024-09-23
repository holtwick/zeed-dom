import type { VElement } from './vdom'
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
    return node.children.map(c => serialize(c, { ...context })).join('')
  }

  else if (isVElement(node)) {
    const tag: string = node.tagName.toLowerCase()

    const handleChildren = (ctx?: Partial<SerializeContext>): string => node.children.map(c => serialize(c, { ...context, ...ctx })).join('')

    const rules: Record<string, () => string> = {
      b: () => `**${handleChildren()}**`,
      strong: () => `**${handleChildren()}**`,
      i: () => `*${handleChildren()}*`,
      em: () => `*${handleChildren()}*`,
      u: () => `<u>${handleChildren()}</u>`,
      mark: () => `==${handleChildren()}==`,
      tt: () => `==${handleChildren()}==`,
      code: () => `==${handleChildren()}==`,
      strike: () => `~~${handleChildren()}~~`,
      sub: () => `~${handleChildren()}~`,
      super: () => `^${handleChildren()}^`,
      sup: () => `^${handleChildren()}^`,
      li: () => `- ${handleChildren()}\n`, // todo numbered
      br: () => `${handleChildren()}\n`,
      ol: () => `\n\n${handleChildren({ level: context.level + 1 })}\n\n`, // todo indent
      ul: () => `\n\n${handleChildren({ level: context.level + 1 })}\n\n`, // todo indent
      blockquote: () => `\n\n> ${handleChildren()}\n\n`, // todo continue '>'
      pre: () => `\n\n\`\`\`\n${handleChildren()}\n\`\`\`\n\n`,
      p: () => `\n\n${handleChildren()}\n\n`,
      div: () => `\n\n${handleChildren()}\n\n`,
      h1: () => `\n\n# ${handleChildren()}\n\n`,
      h2: () => `\n\n## ${handleChildren()}\n\n`,
      h3: () => `\n\n### ${handleChildren()}\n\n`,
      h4: () => `\n\n#### ${handleChildren()}\n\n`,
      h5: () => `\n\n##### ${handleChildren()}\n\n`,
      h6: () => `\n\n###### ${handleChildren()}\n\n`,
      hr: () => `\n\n---\n\n`,
      a: () => `[${handleChildren()}](${node.getAttribute('href') ?? '#'})`,
      img: () => `![${node.getAttribute('alt') ?? ''}](${node.getAttribute('src') ?? ''})`,

      // todo audio, video and other HTML stuff
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
  return `${serialize(node).replace(/\n{2,}/g, '\n\n').trim()}\n`
}
