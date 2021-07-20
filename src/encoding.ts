// Copyright (c) 2020 Dirk Holtwick. All rights reserved. https://holtwick.de/copyright

const rxEscape = /[\-\[\]\/{}()*+?.^$|]/g

export function escapeRegExp(value: RegExp | string): string {
  if (!value) return ""
  if (value instanceof RegExp) {
    return value.source
  }
  return value.replace(rxEscape, "\\$&")
}

export { escape as escapeHTML, unescape as unescapeHTML } from "he"

// export function escapeHTML(s) {
//   if (!s) return s
//   return s
//     .replace(/&/g, '&amp;')
//     .replace(/</g, '&lt;')
//     .replace(/>/g, '&gt;')
//     .replace(/'/g, '&apos;')
//     .replace(/"/g, '&quot;')
// }
//
// export function unescapeHTML(s) {
//   if (!s) return s
//   return s
//     .replace(/&lt;/gi, '<')
//     .replace(/&gt;/gi, '>')
//     .replace(/&quot;/gi, '"')
//     .replace(/&apos;/gi, '\'')
//     .replace(/&amp;/gi, '&')
// }
