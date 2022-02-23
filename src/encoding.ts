import { decode, encode } from "he"

export const escapeHTML = (text: string) =>
  encode(text, {
    useNamedReferences: true,
  })

export const unescapeHTML = (html: string) => decode(html)
