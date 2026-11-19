import type { VElement } from './vdom'
import { isUnsafeUrl } from './encoding'
import { SERIALIZE_DROP_TAGS } from './tidy'
import { hasOwn } from './utils'
import { isVElement, VNode } from './vdom'

interface SerializeContext {
  level: number
  mode?: 'ol' | 'ul'
  /** Item counter of the enclosing ordered list */
  counter?: { n: number }
  /** Indentation for list items, aligned to the content of the parent item */
  indent?: string
  inLi?: boolean
  /** Whitespace only text between elements is dropped, like between list items */
  blockOnly?: boolean
  /** Inside `<pre>` or inline code, text is literal */
  pre?: boolean
  /** Text only, for link labels and headings */
  plainOnly?: boolean
  /** Row counter of the enclosing table */
  row?: { n: number }
  /** Inline code collected during one run, see `protect` */
  codes?: string[]
  options?: SerializeMarkdownOptions
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

// Placeholder delimiter for inline code, removed from regular text so it
// cannot collide with the input
const CODE_MARK = '\u0000'
const RX_CODE_MARK = /\0/g
const RX_CODE_PLACEHOLDER = /\0(\d+)\0/g

// Whitespace as collapsed by browsers. Not `\s`, a no-break space is kept.
const RX_WHITESPACE = /[ \t\n\r\f]+/g
const RX_WHITESPACE_ONLY = /^[ \t\n\r\f]+$/

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
 * Attribute value without the placeholder delimiter of inline code, see
 * `protect`. Text has it removed already, but in `href` or `alt` a
 * `\0<n>\0` was replaced with the content of the n-th inline code, which
 * could end the link target and add a `javascript:` link.
 */
function attr(node: VElement, name: string): string | null {
  const value = node.getAttribute(name)
  return value == null
    ? null
    : value.replace(RX_CODE_MARK, '')
}

/** Text in `[…]`, a `]` would end the label */
function escapeLabel(text: string): string {
  return text.replace(/[[\]]/g, '\\$&')
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

/** Inline code is swapped for a placeholder, so collapsing whitespace and wrapping leave it alone */
function protect(code: string, ctx?: SerializeContext): string {
  const codes = ctx?.codes
  if (!codes)
    return code
  codes.push(code.replace(/\n/g, ' '))
  return `${CODE_MARK}${codes.length - 1}${CODE_MARK}`
}

// `==` is highlighting and not a code span, so markup in it has to be escaped
function inlineCode(node: VElement, h: (ctx?: Partial<SerializeContext>) => string, ctx?: SerializeContext): string {
  const code = h({ pre: true })
  // `<pre><code>` is a code block already, its text stays literal
  if (ctx?.pre)
    return code
  const start = code.length - code.trimStart().length
  const inner = code.trim()
  const lead = code.slice(0, start)
  const trail = code.slice(start + inner.length)
  if (!inner)
    return outside(lead + trail)
  return `${outside(lead)}==${protect(escapeMarkup(inner), ctx)}==${outside(trail)}`
}

function headingAnchor(node: VElement, ctx?: SerializeContext): string {
  if (!ctx?.options?.headingAnchors)
    return ''
  // Only characters that can't end the attribute block
  const id = (node.getAttribute('id') ?? '').replace(/[^\w\-.:]/g, '')
  return id
    ? ` {#${id}}`
    : ''
}

function heading(prefix: string) {
  return (node: VElement, h: (ctx?: Partial<SerializeContext>) => string, ctx?: SerializeContext) =>
    `\n\n${prefix} ${h({ plainOnly: true }).trim()}${headingAnchor(node, ctx)}\n\n`
}

function list(mode: 'ol' | 'ul') {
  return (node: VElement, h: (ctx?: Partial<SerializeContext>) => string, ctx?: SerializeContext) => {
    const level = (ctx?.level ?? 0) + 1
    // A list nested directly in a list (no `li` in between, invalid but
    // common) still has to be indented to show up as nested
    const indent = level > 1 && !ctx?.inLi
      ? `${ctx?.indent ?? ''}  `
      : ctx?.indent ?? ''
    // `<ol start="3">` counts from 3, like in browsers
    const start = Number.parseInt(node.getAttribute('start') ?? '', 10)
    const inner = h({
      level,
      mode,
      indent,
      counter: mode === 'ol'
        ? {
            n: Number.isFinite(start)
              ? start - 1
              : 0,
          }
        : undefined,
      inLi: false,
      blockOnly: true,
    })
    if (level === 1)
      return `\n\n${inner}\n\n`
    // Inside an item the list starts on a new line after the item text, a
    // directly nested list follows the previous item, which ends in one
    return ctx?.inLi
      ? `\n${inner}`
      : inner
  }
}

function cell(node: VElement, h: (ctx?: Partial<SerializeContext>) => string) {
  // A cell is one line in Markdown
  return ` ${h({ blockOnly: false }).trim().replace(/\n+/g, ' ').replace(/\|/g, '\\|')} |`
}

function block(node: VElement, h: (ctx?: Partial<SerializeContext>) => string, ctx?: SerializeContext) {
  // An item stays one line, but its blocks must not run into each other
  return ctx?.inLi
    ? ` ${h()} `
    : `\n\n${h()}\n\n`
}

// Build rules map only once for performance
const rules: Record<string, (node: VElement, handleChildren: (ctx?: Partial<SerializeContext>) => string, ctx?: SerializeContext) => string> = {
  b: (node, h) => wrapInline(h(), '**'),
  strong: (node, h) => wrapInline(h(), '**'),
  i: (node, h) => wrapInline(h(), '*'),
  em: (node, h) => wrapInline(h(), '*'),
  u: (node, h) => wrapInline(h(), '<u>', '</u>'),
  mark: (node, h) => wrapInline(h(), '=='),
  tt: inlineCode,
  code: inlineCode,
  strike: (node, h) => wrapInline(h(), '~~'),
  sub: (node, h) => wrapInline(h(), '~'),
  super: (node, h) => wrapInline(h(), '^'),
  sup: (node, h) => wrapInline(h(), '^'),
  li: (node, h, ctx) => {
    const indent = ctx?.indent ?? ''
    let marker = '- '
    if (ctx?.mode === 'ol' && ctx.counter) {
      ctx.counter.n += 1
      marker = `${ctx.counter.n}. `
    }
    // Nested lists line up with the content of this item: 2 spaces after
    // `- `, 3 after `1. `, otherwise CommonMark does not see them as nested
    const content = h({
      inLi: true,
      blockOnly: false,
      indent: indent + ' '.repeat(marker.length),
    }).trim()
    return `${indent}${marker}${content}\n`
  },
  br: () => `\n`,
  ol: list('ol'),
  ul: list('ul'),
  blockquote: (node, h) => {
    // Every line is quoted, not only the first
    const lines = h({ blockOnly: false }).trim().replace(/\n{3,}/g, '\n\n').split('\n')
    return `\n\n${lines.map(l => l.trim()
      ? `> ${l}`
      : '>').join('\n')}\n\n`
  },
  pre: (node, h) => {
    const content = h({ pre: true })
    const fence = fenceFor(content)
    return `\n\n${fence}\n${content}\n${fence}\n\n`
  },
  p: block,
  div: block,
  h1: heading('#'),
  h2: heading('##'),
  h3: heading('###'),
  h4: heading('####'),
  h5: heading('#####'),
  h6: heading('######'),
  hr: () => `\n\n---\n\n`,
  a: (node, h, ctx) => {
    const text = h({ plainOnly: true }).trim()
    // A `javascript:` link would run script when clicked in the rendered Markdown
    if (isUnsafeUrl(attr(node, 'href') ?? ''))
      return text
    const href = escapeUrl(attr(node, 'href') ?? '#')
    if (ctx?.options?.linkStyle === 'autolink') {
      if (!text || text === href)
        return `<${href}>`
      return `${text} <${href}>`
    }
    return `[${escapeLabel(text)}](${href})`
  },
  img: (node, _h, ctx) => {
    const style = ctx?.options?.imageStyle ?? 'full'
    if (style === 'none')
      return ''
    const alt = escapeLabel(escapeMarkup((attr(node, 'alt') ?? '').trim()))
    if (style === 'alt') {
      return alt
        ? `[${alt}]`
        : ''
    }
    if (isUnsafeUrl(attr(node, 'src') ?? '', true))
      return ''
    const src = escapeUrl(attr(node, 'src') ?? '')
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
    blockOnly: true,
    row: { n: 0 },
  })}\n\n`,
  tr: (node, h, ctx) => {
    // Every cell ends with ` |` itself, so the row only adds the leading pipe
    const row = `|${h({ blockOnly: true })}\n`
    // GFM renders a table only with a delimiter row below the header, which
    // is the first row and only that one
    const isFirst = !ctx?.row || ctx.row.n++ === 0
    const cells = node.childNodes.filter(c => isVElement(c) && ['td', 'th'].includes(c.tagName.toLowerCase())) as VElement[]
    if (isFirst && cells.length > 0 && cells.every(c => c.tagName.toLowerCase() === 'th'))
      return `${row}|${' --- |'.repeat(cells.length)}\n`
    return row
  },
  th: cell,
  td: cell,
  caption: (node, h) => `\n${h()}\n`,
}

function serialize(node: VNode | VElement, context: SerializeContext = {
  level: 0,
}): string {
  // A document (`parseHTML` of a complete page) is walked like a fragment,
  // otherwise it fell through to plain `textContent` below
  if (node.nodeType === VNode.DOCUMENT_FRAGMENT_NODE || node.nodeType === VNode.DOCUMENT_NODE) {
    return (node.childNodes || []).map(c => serialize(c, { ...context })).join('')
  }
  else if (isVElement(node)) {
    const tag: string = node.tagName.toLowerCase()
    if (SERIALIZE_DROP_TAGS.has(tag))
      return ''
    const handleChildren = (ctx?: Partial<SerializeContext>): string => (node.childNodes || []).map(c => serialize(c, {
      ...context,
      ...ctx,
    })).join('')
    if (context.plainOnly) {
      if (tag === 'img')
        return escapeMarkup((attr(node, 'alt') ?? '').trim())
      if (tag === 'br')
        return ' '
      return handleChildren()
    }
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
  const text = (node.textContent ?? '').replace(RX_CODE_MARK, '')
  if (context.pre)
    return text
  if (text === '')
    return ''
  // Whitespace collapses like in a browser
  if (RX_WHITESPACE_ONLY.test(text)) {
    return context.blockOnly
      ? ''
      : ' '
  }
  return escapeMarkup(text.replace(RX_WHITESPACE, ' '))
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
  /**
   * How `<img src="…" alt="…">` is rendered.
   * - `'full'` (default): `![alt](src)` (or autolink form when `linkStyle: 'autolink'`)
   * - `'alt'`: only the alt text in brackets (`[alt]`), no URL; empty alt → omitted
   * - `'none'`: image is stripped entirely
   */
  imageStyle?: 'full' | 'alt' | 'none'
  /**
   * Append the `id` of a heading as ` {#id}` (Pandoc / kramdown style anchor).
   * Not part of CommonMark or GFM, there it shows up as literal text.
   * Default `false`.
   */
  headingAnchors?: boolean
}

export function serializeMarkdown(node: VNode, options: SerializeMarkdownOptions = {}): string {
  const codes: string[] = []
  const raw = serialize(node, { level: 0, options, codes })
  let out = `${collapseWhitespace(raw).replace(/\n{3,}/g, '\n\n').trim()}\n`
  if (options.wrap && options.wrap > 0)
    out = wrapMarkdown(out, options.wrap)
  return codes.length
    ? out.replace(RX_CODE_PLACEHOLDER, (_, i) => codes[Number(i)] ?? '')
    : out
}

/**
 * Tracks fenced code blocks line by line. A fence closes only with a run of
 * at least as many backticks, so a line with ``` inside a longer fence stays
 * code. Returns `true` for lines that are part of a block, fences included.
 */
function createFenceTracker() {
  let open = 0
  return (line: string): boolean => {
    const m = line.match(/^\s*(`{3,})\s*$/) ?? (open
      ? null
      : line.match(/^\s*(`{3,})/))
    if (m) {
      const length = m[1]!.length
      if (!open) {
        open = length
        return true
      }
      if (length >= open) {
        open = 0
        return true
      }
    }
    return open > 0
  }
}

const RX_LIST_ITEM = /^[ \t]*(?:[-*+]|\d+\.)[ \t]/

// Outside fenced code blocks: collapse runs of horizontal whitespace inside a
// line to a single space and drop whitespace at the end of a line. Leading
// whitespace is kept only where the serializer created it on purpose, the
// indentation of nested list items. Anywhere else it is a leftover of the
// source formatting, and 4 spaces would turn a paragraph into a code block.
// Inline code is protected by placeholders, see `protect`.
function collapseWhitespace(text: string): string {
  const inFence = createFenceTracker()
  const result: string[] = []
  for (const line of text.split('\n')) {
    if (inFence(line)) {
      result.push(line)
      continue
    }
    let i = 0
    if (RX_LIST_ITEM.test(line)) {
      while (i < line.length && (line[i] === ' ' || line[i] === '\t'))
        i++
    }
    const body = line.slice(i).replace(/[ \t]+/g, ' ').replace(/^ | $/g, '')
    result.push(body
      ? line.slice(0, i) + body
      : '')
  }
  return result.join('\n')
}

function wrapMarkdown(text: string, width: number): string {
  const inFence = createFenceTracker()
  const result: string[] = []
  for (const line of text.split('\n')) {
    if (inFence(line) || line.length <= width || /^\s*\|/.test(line)) {
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
