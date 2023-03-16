import { decode } from './encoding-he'

export const escapeHTML = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')

// encode(text, {
//   useNamedReferences: true,
// })

export const unescapeHTML = (html: string) => decode(html)
