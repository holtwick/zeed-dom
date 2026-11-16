import type { VElement } from './vdom'
import { isVElement, VNode } from './vdom'

interface SerializeContext {
  level: number
  count: 0
  mode?: 'ol' | 'ul'
  options?: SerializeMarkdownOptions
}

const INLINE_STYLE_TAGS = new Set([
  'b', 'strong', 'i', 'em', 'u', 'mark', 'tt', 'code',
  'strike', 'del', 'ins', 'sub', 'sup', 'super',
])

// Content that is never shown in a browser
const DROP_TAGS = new Set(['script', 'style', 'head', 'title', 'template'])

/**
 * Wrap inline content in markers. Leading and trailing whitespace goes
 * outside: `foo<b> bar</b>` must become `foo **bar**`, because `** bar**` is
 * not emphasis in Markdown. Content without such whitespace is unchanged.
 */
function wrapInline(content: string, open: string, close = open): string {
  const [, lead, inner, trail] = content.match(/^(\s*)([\s\S]*?)(\s*)$/)!
  if (!inner)
    return lead || trail ? ' ' : ''
  return `${lead ? ' ' : ''}${open}${inner}${close}${trail ? ' ' : ''}`
}

// Build rules map only once for performance
const rules: Record<string, (node: VElement, handleChildren: (ctx?: Partial<SerializeContext>) => string, ctx?: SerializeContext) => string> = {
  b: (node, h) => wrapInline(h(), '**'),
  strong: (node, h) => wrapInline(h(), '**'),
  i: (node, h) => wrapInline(h(), '*'),
  em: (node, h) => wrapInline(h(), '*'),
  u: (node, h) => wrapInline(h(), '<u>', '</u>'),
  mark: (node, h) => wrapInline(h(), '=='),
  tt: (node, h) => `==${h()}==`,
  code: (node, h) => `==${h()}==`,
  strike: (node, h) => wrapInline(h(), '~~'),
  sub: (node, h) => wrapInline(h(), '~'),
  super: (node, h) => wrapInline(h(), '^'),
  sup: (node, h) => wrapInline(h(), '^'),
  li: (node, h, ctx) => {
    const indent = '  '.repeat(Math.max(0, (ctx?.level ?? 1) - 1))
    const content = h().replace(/\n+$/, '')
    return `${indent}- ${content}\n`
  },
  br: (node, h) => `\n`,
  ol: (node, h, ctx) => {
    const level = (ctx?.level ?? 0) + 1
    const inner = h({ level })
    return level > 1 ? `\n${inner}` : `\n\n${inner}\n\n`
  },
  ul: (node, h, ctx) => {
    const level = (ctx?.level ?? 0) + 1
    const inner = h({ level })
    return level > 1 ? `\n${inner}` : `\n\n${inner}\n\n`
  },
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
  a: (node, h, ctx) => {
    const href = node.getAttribute('href') ?? '#'
    const text = h()
    if (ctx?.options?.linkStyle === 'autolink') {
      const trimmed = text.trim()
      if (!trimmed || trimmed === href)
        return `<${href}>`
      return `${text} <${href}>`
    }
    return `[${text}](${href})`
  },
  img: (node, _h, ctx) => {
    const src = node.getAttribute('src') ?? ''
    const alt = node.getAttribute('alt') ?? ''
    if (ctx?.options?.linkStyle === 'autolink') {
      if (!alt || alt === src)
        return `<${src}>`
      return `${alt} <${src}>`
    }
    return `![${alt}](${src})`
  },
  del: (node, h) => wrapInline(h(), '~~'),
  ins: (node, h) => wrapInline(h(), '++'),
  span: (node, h) => h(),
  table: (node, h) => `\n\n${h()}\n\n`,
  tr: (node, h) => {
    // Every cell ends with ` |` itself, so the row only adds the leading pipe
    const row = `|${h()}\n`
    // GFM renders a table only with a delimiter row below the header
    const cells = node.childNodes.filter(c => isVElement(c) && ['td', 'th'].includes(c.tagName.toLowerCase())) as VElement[]
    if (cells.length > 0 && cells.every(c => c.tagName.toLowerCase() === 'th'))
      return `${row}|${' --- |'.repeat(cells.length)}\n`
    return row
  },
  th: (node, h) => ` ${h().replace(/\|/g, '\\|')} |`,
  td: (node, h) => ` ${h().replace(/\|/g, '\\|')} |`,
  caption: (node, h) => `\n${h()}\n`,
}

function serialize(node: VNode | VElement, context: SerializeContext = {
  level: 0,
  count: 0,
}): string {
  // A document (`parseHTML` of a complete page) is walked like a fragment,
  // otherwise it fell through to plain `textContent` below
  if (node.nodeType === VNode.DOCUMENT_FRAGMENT_NODE || node.nodeType === VNode.DOCUMENT_NODE) {
    return (node.childNodes || []).map(c => serialize(c, { ...context })).join('')
  }
  else if (isVElement(node)) {
    const tag: string = node.tagName.toLowerCase()
    if (DROP_TAGS.has(tag))
      return ''
    const handleChildren = (ctx?: Partial<SerializeContext>): string => (node.childNodes || []).map(c => serialize(c, { ...context, ...ctx })).join('')
    if (context.options?.inlineStyles === false && INLINE_STYLE_TAGS.has(tag))
      return handleChildren()
    const fn = rules[tag]
    if (fn)
      return fn(node as VElement, handleChildren, context)
    else
      return handleChildren()
  }
  return node.textContent ?? ''
}

export interface SerializeMarkdownOptions {
  /** Wrap column for soft-wrapping long lines. `0` or omitted disables wrapping. */
  wrap?: number
  /**
   * How `<a href="…">…</a>` and `<img src="…" alt="…">` are rendered.
   * - `'inline'` (default): `[text](url)` / `![alt](src)` — standard inline syntax
   * - `'autolink'`: `text <url>` / `alt <src>` — label followed by an autolink
   *   (or just `<url>` / `<src>` if the label is empty or equals the URL)
   */
  linkStyle?: 'inline' | 'autolink'
  /**
   * When `false`, inline text-styling tags (`b`, `strong`, `i`, `em`, `u`, `mark`,
   * `tt`, `code`, `strike`, `del`, `ins`, `sub`, `sup`) are unwrapped and rendered
   * as plain text. Default `true` (styles preserved).
   */
  inlineStyles?: boolean
}

export function serializeMarkdown(node: VNode, options: SerializeMarkdownOptions = {}): string {
  const out = `${serialize(node, { level: 0, count: 0, options }).replace(/\n{2,}/g, '\n\n').trim()}\n`
  return options.wrap && options.wrap > 0 ? wrapMarkdown(out, options.wrap) : out
}

function wrapMarkdown(text: string, width: number): string {
  const lines = text.split('\n')
  const result: string[] = []
  let inFence = false
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      result.push(line)
      continue
    }
    if (inFence || line.length <= width || /^\s*\|/.test(line)) {
      result.push(line)
      continue
    }
    const m = line.match(/^(\s*)((?:[-*+]\s+|\d+\.\s+|>\s+)?)/)
    const indent = m?.[1] ?? ''
    const marker = m?.[2] ?? ''
    const contIndent = indent + ' '.repeat(marker.length)
    const head = indent + marker
    const body = line.slice(head.length)
    const words = body.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      result.push(line)
      continue
    }
    let current = head + words.shift()
    for (const word of words) {
      if (current.length + 1 + word.length > width) {
        result.push(current)
        current = contIndent + word
      }
      else {
        current += ` ${word}`
      }
    }
    result.push(current)
  }
  return result.join('\n')
}
