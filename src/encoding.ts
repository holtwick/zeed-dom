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
