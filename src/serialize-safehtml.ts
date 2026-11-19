import type { VElement } from './vdom'
import { escapeHTML } from './encoding'
import { SERIALIZE_DROP_TAGS } from './tidy'
import { isVElement, VNode } from './vdom'
import { parseHTML } from './vdomparser'

export const SELECTOR_BLOCK_ELEMENTS = 'p,h1,h2,h3,h4,h5,h6,blockquote,div,ul,ol,li,article,section,footer,nav,hr,form'

const BLOCK_TAGS = new Set(SELECTOR_BLOCK_ELEMENTS.split(','))

const DEFAULT_INLINE_TAGS = [
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'small',
  'sub',
  'sup',
  'code',
  'pre',
  'kbd',
  'samp',
  'var',
  'mark',
  'span',
]

const DEFAULT_TABLE_TAGS = [
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
]

/**
 * Tags kept by default: block, inline and table elements, links, images and
 * line breaks. Other tags are unwrapped, their content stays. `form` is
 * unwrapped as well: the element is useless without its attributes and
 * controls, and its content (often a whole mail body) has to survive.
 */
export const DEFAULT_ALLOWED_TAGS: readonly string[] = [
  ...new Set([
    ...SELECTOR_BLOCK_ELEMENTS.split(',').filter(t => t !== 'form'),
    ...DEFAULT_INLINE_TAGS,
    ...DEFAULT_TABLE_TAGS,
    'a',
    'img',
    'br',
  ]),
]

/** Attributes kept by default, per tag. The key `'*'` applies to every tag. */
export const DEFAULT_ALLOWED_ATTRS: Readonly<Record<string, readonly string[]>> = {
  a: ['href', 'title'],
  img: [
    'src',
    'alt',
    'title',
    'width',
    'height',
  ],
  th: ['colspan', 'rowspan', 'scope'],
  td: ['colspan', 'rowspan'],
}

/**
 * Schemes for `allowedUrlSchemes` when only well known links should pass.
 * Not the default: without `allowedUrlSchemes` every scheme passes except
 * the ones that run script.
 */
export const DEFAULT_ALLOWED_URL_SCHEMES: readonly string[] = ['http:', 'https:', 'mailto:', 'tel:']

/** Attributes holding a URL, checked like `href` and `src` when allowed */
const URL_ATTRS = new Set([
  'href',
  'src',
  'action',
  'formaction',
  'xlink:href',
  'poster',
  'cite',
  'background',
  'data',
  'codebase',
  'longdesc',
  'ping',
])

/**
 * Attributes that never pass, whatever `allowedAttrs` says: event handlers
 * run script, `srcdoc` is a whole document. `style` passes when allowed
 * explicitly, it can't run script in current browsers but can restyle and
 * load URLs.
 */
function isForbiddenAttr(attr: string): boolean {
  return attr.startsWith('on') || attr === 'srcdoc'
}

const VOID_TAGS = new Set([
  'br',
  'hr',
  'img',
  'input',
  'meta',
  'link',
  'source',
  'col',
  'wbr',
  'area',
  'base',
  'embed',
  'param',
  'track',
])

export interface SafeHTMLOptions {
  /** Tag names to keep, others are unwrapped. Default {@link DEFAULT_ALLOWED_TAGS}. */
  allowedTags?: readonly string[]
  /** Attribute names to keep, per tag. The key `'*'` applies to every tag. Default {@link DEFAULT_ALLOWED_ATTRS}. */
  allowedAttrs?: Readonly<Record<string, readonly string[]>>
  /**
   * Schemes allowed in `href` and `src`, like `'https:'`. Default: every
   * scheme except `javascript:`, `vbscript:` and `data:`, which keeps `cid:`
   * images in mails and custom app schemes. See {@link DEFAULT_ALLOWED_URL_SCHEMES}.
   */
  allowedUrlSchemes?: readonly string[]
  /** Allow URLs without scheme: relative paths, fragments, protocol relative. Default `true`. */
  allowRelativeUrls?: boolean
  /** Allow `data:image/…` in the `src` of an image. Default `true`. */
  allowDataImages?: boolean
  /** `rel` added to every link. Default `'noopener noreferrer'`, `''` keeps the allowed `rel` of the source. */
  linkRel?: string
  /** `target` added to every link. Default `'_blank'`, `''` keeps the allowed `target` of the source. */
  linkTarget?: string
}

interface ResolvedOptions {
  allowedTags: Set<string>
  allowedAttrs: Map<string, string[]>
  allowedUrlSchemes?: Set<string>
  allowRelativeUrls: boolean
  allowDataImages: boolean
  linkRel: string
  linkTarget: string
}

function resolveOptions(opts: SafeHTMLOptions = {}): ResolvedOptions {
  const source = opts.allowedAttrs ?? DEFAULT_ALLOWED_ATTRS
  const global = (source['*'] ?? []).map(a => a.toLowerCase())
  const allowedAttrs = new Map<string, string[]>()
  for (const [tag, list] of Object.entries(source)) {
    if (tag !== '*') {
      allowedAttrs.set(tag.toLowerCase(), [
        ...new Set([
          ...list.map(a => a.toLowerCase()),
          ...global,
        ]),
      ])
    }
  }
  allowedAttrs.set('*', global)
  return {
    allowedTags: new Set((opts.allowedTags ?? DEFAULT_ALLOWED_TAGS).map(t => t.toLowerCase())),
    allowedAttrs,
    allowedUrlSchemes: opts.allowedUrlSchemes
      ? new Set(opts.allowedUrlSchemes.map(s => s.toLowerCase()))
      : undefined,
    allowRelativeUrls: opts.allowRelativeUrls ?? true,
    allowDataImages: opts.allowDataImages ?? true,
    linkRel: opts.linkRel ?? 'noopener noreferrer',
    linkTarget: opts.linkTarget ?? '_blank',
  }
}

const DEFAULT_OPTIONS = resolveOptions()

/** Browsers ignore control characters inside the scheme (`java\tscript:`) and whitespace around the URL */
function normalizeUrl(url: string): string {
  // eslint-disable-next-line no-control-regex
  return url.replace(/[\x00-\x1F\x7F]/g, '').trim()
}

function isSafeUrl(url: string, attr: string, tag: string, opts: ResolvedOptions): boolean {
  if (url === '')
    return false
  const scheme = url.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase()
  if (!scheme)
    return opts.allowRelativeUrls
  if (scheme === 'data')
    return opts.allowDataImages && tag === 'img' && attr === 'src' && /^data:image\//i.test(url)
  if (opts.allowedUrlSchemes)
    return opts.allowedUrlSchemes.has(`${scheme}:`)
  return scheme !== 'javascript' && scheme !== 'vbscript'
}

/** Allowed attributes of `node`, URLs validated. Names in `skip` are rendered by the caller. */
function renderAttrs(node: VElement, tag: string, opts: ResolvedOptions, skip?: readonly string[]): string {
  let out = ''
  for (const attr of opts.allowedAttrs.get(tag) ?? opts.allowedAttrs.get('*')!) {
    if (skip?.includes(attr))
      continue
    if (isForbiddenAttr(attr))
      continue
    let value = node.getAttribute(attr)
    if (value == null)
      continue
    if (attr === 'srcset') {
      // Every candidate URL must be safe, `url 2x, url 640w`
      const urls = value.split(',').map(c => normalizeUrl(c).split(/\s+/)[0] ?? '').filter(Boolean)
      if (!urls.every(u => isSafeUrl(u, 'src', tag, opts)))
        continue
    }
    else if (URL_ATTRS.has(attr)) {
      value = normalizeUrl(value)
      if (!isSafeUrl(value, attr, tag, opts))
        continue
    }
    out += ` ${attr}="${escapeHTML(value)}"`
  }
  return out
}

function renderElement(node: VElement, tag: string, children: string, opts: ResolvedOptions): string {
  // `href` of a link and `src` of an image are the point of the element, so
  // they are written whatever the allowed attributes say. A link with an
  // unsafe target is unwrapped, an image without a safe source dropped.
  if (tag === 'a') {
    const href = normalizeUrl(node.getAttribute('href') ?? '')
    if (!isSafeUrl(href, 'href', 'a', opts))
      return children
    // `rel` and `target` of the source must not override the enforced ones
    const skip = ['href']
    if (opts.linkRel)
      skip.push('rel')
    if (opts.linkTarget)
      skip.push('target')
    const rel = opts.linkRel
      ? ` rel="${escapeHTML(opts.linkRel)}"`
      : ''
    const target = opts.linkTarget
      ? ` target="${escapeHTML(opts.linkTarget)}"`
      : ''
    return `<a href="${escapeHTML(href)}"${renderAttrs(node, 'a', opts, skip)}${rel}${target}>${children}</a>`
  }
  if (tag === 'img') {
    const src = normalizeUrl(node.getAttribute('src') ?? '')
    if (!isSafeUrl(src, 'src', 'img', opts))
      return ''
    return `<img src="${escapeHTML(src)}"${renderAttrs(node, 'img', opts, ['src'])}>`
  }
  const attrs = renderAttrs(node, tag, opts)
  if (VOID_TAGS.has(tag))
    return `<${tag}${attrs}>`
  const inner = BLOCK_TAGS.has(tag)
    ? children.trim()
    : children
  return `<${tag}${attrs}>${inner}</${tag}>`
}

function serialize(node: VNode, opts: ResolvedOptions): string {
  // A document (`parseHTML` of a complete page) is walked like a fragment,
  // otherwise it fell through to `textContent` below and lost all markup
  if (node.nodeType === VNode.DOCUMENT_FRAGMENT_NODE || node.nodeType === VNode.DOCUMENT_NODE)
    return (node.childNodes || []).map(c => serialize(c, opts)).join('')
  if (isVElement(node)) {
    const tag = node.tagName.toLowerCase()
    if (SERIALIZE_DROP_TAGS.has(tag))
      return ''
    const children = (node.childNodes || []).map(c => serialize(c, opts)).join('')
    if (!opts.allowedTags.has(tag))
      return children
    return renderElement(node, tag, children, opts)
  }
  return escapeHTML(node.textContent ?? '')
}

/**
 * HTML of untrusted origin reduced to the allowed tags and attributes, see
 * {@link SafeHTMLOptions}. Scripts, styles, embedded documents and event
 * handlers never pass, links get `rel="noopener noreferrer" target="_blank"`.
 */
export function serializeSafeHTML(node: VNode, options?: SafeHTMLOptions): string {
  return serialize(node, options
    ? resolveOptions(options)
    : DEFAULT_OPTIONS).trim()
}

export function safeHTML(html: string, options?: SafeHTMLOptions): string {
  return serializeSafeHTML(parseHTML(html), options)
}
