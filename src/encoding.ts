import { decode } from './encoding-he'

export function escapeHTML(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
    .replace(/\xA0/g, '&nbsp;')
    .replace(/\xAD/g, '&shy;')
}

// encode(text, {
//   useNamedReferences: true,
// })

export const unescapeHTML = (html: string) => decode(html)
