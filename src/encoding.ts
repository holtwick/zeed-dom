// import { decode } from './encoding-he'
import { decodeHTML as decode } from 'entities'

const ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '\'': '&apos;',
  '"': '&quot;',
  '\xA0': '&nbsp;',
  '\xAD': '&shy;',
}
const ESCAPE_RE = /[&<>'"\xA0\xAD]/
const ESCAPE_RE_GLOBAL = /[&<>'"\xA0\xAD]/g

export function escapeHTML(text: string) {
  // One pass instead of one per character, and most texts need no escaping
  return ESCAPE_RE.test(text)
    ? text.replace(ESCAPE_RE_GLOBAL, c => ESCAPE[c]!)
    : text
}

// encode(text, {
//   useNamedReferences: true,
// })

export const unescapeHTML = (html: string) => decode(html)

/**
 * URLs that would run script when clicked or loaded. A blocklist on purpose:
 * everything else (relative paths, `cid:` images in mails, custom app schemes)
 * passes as before. Control characters and whitespace are ignored by browsers
 * inside the scheme (`java\tscript:`), so they are ignored here as well.
 */
export function isUnsafeUrl(url: string, allowDataImage = false): boolean {
  // eslint-disable-next-line no-control-regex
  const scheme = url.replace(/[\x00-\x20\x7F]/g, '').match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase()
  if (scheme === 'javascript' || scheme === 'vbscript')
    return true
  if (scheme === 'data')
    return !(allowDataImage && /^\s*data:image\//i.test(url))
  return false
}
