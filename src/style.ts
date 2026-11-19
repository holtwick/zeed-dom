function isSpace(c: number) {
  return c === 32 || (c >= 9 && c <= 13) || (c >= 0xA0 && /\s/.test(String.fromCharCode(c)))
}

function isNameChar(c: number) {
  // `[\w-]`
  return (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || c === 45
}

/**
 * Declarations of a `style` attribute as `[name, value]` pairs.
 *
 * The same result as `/\s*([\w-]+)\s*:\s*((url\(.*?\)[^;]*|[^;]+))/gi`, which
 * was used before, but linear in the length of the input. The regular
 * expression searched from every position again when no match followed,
 * which took seconds for a `style` of some 10 KB without a colon.
 */
export function parseStyleDeclarations(style: string): [string, string][] {
  const result: [string, string][] = []
  const length = style.length
  let pos = 0
  let noMoreParen = false
  while (pos < length) {
    const colon = style.indexOf(':', pos)
    if (colon < 0)
      break

    // The name directly before the colon, whitespace in between is allowed
    let nameEnd = colon
    while (nameEnd > pos && isSpace(style.charCodeAt(nameEnd - 1)))
      nameEnd--
    let nameStart = nameEnd
    while (nameStart > pos && isNameChar(style.charCodeAt(nameStart - 1)))
      nameStart--
    if (nameStart === nameEnd) {
      pos = colon + 1
      continue
    }

    let valueStart = colon + 1
    while (valueStart < length && isSpace(style.charCodeAt(valueStart)))
      valueStart++

    let valueEnd = -1
    // `url(…)` may contain `;`, up to the first `)` on the same line
    if (!noMoreParen && style.slice(valueStart, valueStart + 4).toLowerCase() === 'url(') {
      const close = style.indexOf(')', valueStart + 4)
      if (close < 0) {
        noMoreParen = true
      }
      else if (!/[\n\r\u2028\u2029]/.test(style.slice(valueStart + 4, close))) {
        valueEnd = style.indexOf(';', close + 1)
        if (valueEnd < 0)
          valueEnd = length
      }
    }
    if (valueEnd < 0) {
      valueEnd = style.indexOf(';', valueStart)
      if (valueEnd < 0)
        valueEnd = length
      if (valueEnd === valueStart && valueStart === colon + 1) {
        // `a:;` is no declaration, but `a: ;` is one with an empty value
        pos = colon + 1
        continue
      }
    }

    result.push([
      style.slice(nameStart, nameEnd),
      style.slice(valueStart, valueEnd).trim(),
    ])
    pos = valueEnd
  }
  return result
}
