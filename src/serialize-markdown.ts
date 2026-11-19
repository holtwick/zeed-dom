import type { VElement } from './vdom'
import { isUnsafeUrl } from './encoding'
import { hasOwn } from './utils'
import { isVElement, VNode } from './vdom'

interface SerializeContext {
  level: number
  count: 0
  mode?: 'ol' | 'ul'
  /** Row counter of the enclosing table */
  row?: { n: number }
  options?: SerializeMarkdownOptions
  /** Inside `<pre>`, which becomes a code block where text is literal */
  pre?: boolean
}

const INLINE_STYLE_TAGS = new Set([
  'b',
  'strong',
  'i',
  'em',
  'u',
  'mark',
  'tt',
  'code',
  'strike',
  'del',
  'ins',
  'sub',
  'sup',
  'super',
])

// Content that is never shown in a browser
const DROP_TAGS = new Set([
  'script',
  'style',
  'head',
  'title',
  'template',
])

/** Whitespace moved out of inline markers, line breaks (block boundaries) are kept */
function outside(ws: string): string {
  if (!ws)
    return ''
  return ws.includes('\n')
    ? ws
    : ' '
}

/**
 * Wrap inline content in markers. Leading and trailing whitespace goes
 * outside: `foo<b> bar</b>` must become `foo **bar**`, because `** bar**` is
 * not emphasis in Markdown. Content without such whitespace is unchanged.
 */
function wrapInline(content: string, open: string, close = open): string {
  // `trimStart` / `trimEnd` instead of `/^(\s*)([\s\S]*?)(\s*)$/`, which is
  // quadratic for long runs of whitespace inside the content
  const start = content.length - content.trimStart().length
  const inner = content.trim()
  const lead = content.slice(0, start)
  const trail = content.slice(start + inner.length)
  if (!inner)
    return outside(lead + trail)
  return `${outside(lead)}${open}${inner}${close}${outside(trail)}`
}

/**
 * Text that looks like markup: `<` before a letter, `/`, `!` or `?`. Markdown
 * passes HTML through, so `&lt;img onerror=…&gt;` in the HTML became a real
 * `<img onerror=…>` in the Markdown. `&lt;` shows the same `<` when rendered.
 */
function escapeMarkup(text: string): string {
  return text.replace(/<(?=[a-z/!?])/gi, '&lt;')
}

/**
 * Link and image targets: characters that would end the target (`)`, spaces)
 * or an autolink (`>`) are percent-encoded, otherwise
 * `href="x)<img onerror=…>"` left the rest of the URL as raw HTML.
 */
function escapeUrl(url: string): string {
  // Leading and trailing spaces and control characters are ignored by browsers
  let start = 0
  let end = url.length
  while (start < end && url.charCodeAt(start) <= 32)
    start++
  while (end > start && url.charCodeAt(end - 1) <= 32)
    end--
  return url.slice(start, end).replace(/[\s()<>]/g, c => c === '('
    ? '%28'
    : c === ')'
      ? '%29'
      : encodeURIComponent(c))
}

/** A run of backticks longer than any in `text`, so the content can't close the code block */
function fenceFor(text: string): string {
  let longest = 2
  for (const run of text.match(/`+/g) ?? [])
    longest = Math.max(longest, run.length)
  return '`'.repeat(longest + 1)
}

// Build rules map only once for performance
const rules: Record<string, (node: VElement, handleChildren: (ctx?: Partial<SerializeContext>) => string, ctx?: SerializeContext) => string> = {
  b: (node, h) => wrapInline(h(), '**'),
  strong: (node, h) => wrapInline(h(), '**'),
  i: (node, h) => wrapInline(h(), '*'),
  em: (node, h) => wrapInline(h(), '*'),
  u: (node, h) => wrapInline(h(), '<u>', '</u>'),
  mark: (node, h) => wrapInline(h(), '=='),
  tt: (node, h) => wrapInline(h(), '=='),
  code: (node, h) => wrapInline(h(), '=='),
  strike: (node, h) => wrapInline(h(), '~~'),
  sub: (node, h) => wrapInline(h(), '~'),
  super: (node, h) => wrapInline(h(), '^'),
  sup: (node, h) => wrapInline(h(), '^'),
  li: (node, h, ctx) => {
    const indent = '  '.repeat(Math.max(0, (ctx?.level ?? 1) - 1))
    // `trimEnd` and not `/\n+$/`, which is quadratic for many line breaks
    let content = h()
    let end = content.length
    while (end > 0 && content.charCodeAt(end - 1) === 10)
      end--
    content = content.slice(0, end)
    return `${indent}- ${content}\n`
  },
  br: (node, h) => `\n`,
  ol: (node, h, ctx) => {
    const level = (ctx?.level ?? 0) + 1
    const inner = h({ level })
    return level > 1
      ? `\n${inner}`
      : `\n\n${inner}\n\n`
  },
  ul: (node, h, ctx) => {
    const level = (ctx?.level ?? 0) + 1
    const inner = h({ level })
    return level > 1
      ? `\n${inner}`
      : `\n\n${inner}\n\n`
  },
  blockquote: (node, h) => `\n\n> ${h()}\n\n`,
  pre: (node, h) => {
    const content = h({ pre: true })
    const fence = fenceFor(content)
    return `\n\n${fence}\n${content}\n${fence}\n\n`
  },
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
    const text = h()
    // A `javascript:` link would run script when clicked in the rendered Markdown
    if (isUnsafeUrl(node.getAttribute('href') ?? ''))
      return text
    const href = escapeUrl(node.getAttribute('href') ?? '#')
    if (ctx?.options?.linkStyle === 'autolink') {
      const trimmed = text.trim()
      if (!trimmed || trimmed === href)
        return `<${href}>`
      return `${text} <${href}>`
    }
    return `[${text}](${href})`
  },
  img: (node, _h, ctx) => {
    if (isUnsafeUrl(node.getAttribute('src') ?? '', true))
      return ''
    const src = escapeUrl(node.getAttribute('src') ?? '')
    const alt = escapeMarkup(node.getAttribute('alt') ?? '').replace(/[[\]]/g, '\\$&')
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
  table: (node, h) => `\n\n${h({
    row: { n: 0 },
  })}\n\n`,
  tr: (node, h, ctx) => {
    // Every cell ends with ` |` itself, so the row only adds the leading pipe
    const row = `|${h()}\n`
    // GFM renders a table only with a delimiter row below the header, which
    // is the first row and only that one
    const isFirst = !ctx?.row || ctx.row.n++ === 0
    const cells = node.childNodes.filter(c => isVElement(c) && ['td', 'th'].includes(c.tagName.toLowerCase())) as VElement[]
    if (isFirst && cells.length > 0 && cells.every(c => c.tagName.toLowerCase() === 'th'))
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
    const handleChildren = (ctx?: Partial<SerializeContext>): string => (node.childNodes || []).map(c => serialize(c, {
      ...context,
      ...ctx,
    })).join('')
    if (context.options?.inlineStyles === false && INLINE_STYLE_TAGS.has(tag))
      return handleChildren()
    // Own properties only, `<constructor>` found `Object` before
    const fn = hasOwn(rules, tag)
      ? rules[tag]
      : undefined
    if (fn)
      return fn(node as VElement, handleChildren, context)
    else
      return handleChildren()
  }
  const text = node.textContent ?? ''
  return context.pre
    ? text
    : escapeMarkup(text)
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
  return options.wrap && options.wrap > 0
    ? wrapMarkdown(out, options.wrap)
    : out
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
