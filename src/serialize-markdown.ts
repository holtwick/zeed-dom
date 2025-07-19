import type { VElement } from './vdom'
import { isVElement, VNode } from './vdom'

interface SerializeContext {
  level: number
  count: 0
  mode?: 'ol' | 'ul'
}

// Build rules map only once for performance
const rules: Record<string, (node: VElement, handleChildren: (ctx?: Partial<SerializeContext>) => string, ctx?: SerializeContext) => string> = {
  b: (node, h) => `**${h()}**`,
  strong: (node, h) => `**${h()}**`,
  i: (node, h) => `*${h()}*`,
  em: (node, h) => `*${h()}*`,
  u: (node, h) => `<u>${h()}</u>`,
  mark: (node, h) => `==${h()}==`,
  tt: (node, h) => `==${h()}==`,
  code: (node, h) => `==${h()}==`,
  strike: (node, h) => `~~${h()}~~`,
  sub: (node, h) => `~${h()}~`,
  super: (node, h) => `^${h()}^`,
  sup: (node, h) => `^${h()}^`,
  li: (node, h) => `- ${h()}\n`,
  br: (node, h) => `\n`,
  ol: (node, h, ctx) => `\n\n${h({ level: (ctx?.level ?? 0) + 1 })}\n\n`,
  ul: (node, h, ctx) => `\n\n${h({ level: (ctx?.level ?? 0) + 1 })}\n\n`,
  blockquote: (node, h) => `\n\n> ${h()}\n\n`,
  pre: (node, h) => `\n\n\`\`\`\n${h()}\n\`\`\`\n\n`,
  p: (node, h) => `\n\n${h()}\n\n`,
  div: (node, h) => `\n\n${h()}\n\n`,
  h1: (node, h) => `\n\n# ${h()}\n\n`,
  h2: (node, h) => `\n\n## ${h()}\n\n`,
  h3: (node, h) => `\n\n### ${h()}\n\n`,
  h4: (node, h) => `\n\n#### ${h()}\n\n`,
  h5: (node, h) => `\n\n##### ${h()}\n\n`,
  h6: (node, h) => `\n\n###### ${h()}\n\n`,
  hr: () => `\n\n---\n\n`,
  a: (node, h) => `[${h()}](${node.getAttribute('href') ?? '#'})`,
  img: node => `![${node.getAttribute('alt') ?? ''}](${node.getAttribute('src') ?? ''})`,
  del: (node, h) => `~~${h()}~~`,
  ins: (node, h) => `++${h()}++`,
  span: (node, h) => h(),
  table: (node, h) => `\n\n${h()}\n\n`,
  tr: (node, h) => `|${h()}|\n`,
  th: (node, h) => ` ${h()} |`,
  td: (node, h) => ` ${h()} |`,
  caption: (node, h) => `\n${h()}\n`,
}

function serialize(node: VNode | VElement, context: SerializeContext = {
  level: 0,
  count: 0,
}): string {
  if (node.nodeType === VNode.DOCUMENT_FRAGMENT_NODE) {
    return (node.childNodes || []).map(c => serialize(c, { ...context })).join('')
  }
  else if (isVElement(node)) {
    const tag: string = node.tagName.toLowerCase()
    const handleChildren = (ctx?: Partial<SerializeContext>): string => (node.childNodes || []).map(c => serialize(c, { ...context, ...ctx })).join('')
    const fn = rules[tag]
    if (fn)
      return fn(node as VElement, handleChildren, context)
    else
      return handleChildren()
  }
  return node.textContent ?? ''
}

export function serializeMarkdown(node: VNode): string {
  return `${serialize(node).replace(/\n{2,}/g, '\n\n').trim()}\n`
}
