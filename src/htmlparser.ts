export interface HtmlParserScanner {
  characters: (text: string) => void
  comment: (text: string) => void
  startElement: (tagName: string, attrs: Record<string, any>, isSelfColse: boolean, raw: string) => void
  endElement: (tagName: string) => void
}

// Character classes of the tokenizer, see `isSpace` etc. below
const CH_TAB = 9
const CH_CR = 13
const CH_SPACE = 32
const CH_BANG = 33 // !
const CH_DQUOTE = 34 // "
const CH_SQUOTE = 39 // '
const CH_SLASH = 47 // /
const CH_LT = 60 // <
const CH_EQ = 61 // =
const CH_GT = 62 // >
const CH_QUESTION = 63 // ?

// Same set as `\s` in regular expressions, which the parser used before
function isSpace(c: number) {
  if (c <= CH_SPACE)
    return c === CH_SPACE || (c >= CH_TAB && c <= CH_CR)
  if (c < 0xA0)
    return false
  return c === 0xA0 || c === 0x1680 || (c >= 0x2000 && c <= 0x200A) || c === 0x2028 || c === 0x2029 || c === 0x202F || c === 0x205F || c === 0x3000 || c === 0xFEFF
}

// A start tag begins with `<` and a letter, like in browsers. `!` and `?`
// cover `<!DOCTYPE …>` and `<?xml …?>`. `a < b` or `<3` stay text.
function isTagStart(c: number) {
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === CH_BANG || c === CH_QUESTION
}

/**
 * Simple HTML tokenizer. Reports text, comments, start and end tags to the
 * `scanner`.
 *
 * It scans the input once from left to right and never backtracks, so the
 * time is linear in the length of the input, whatever it contains. A start
 * tag that is still open at the end of the input (`<a href="x`) is reported
 * as text together with everything after it.
 *
 * Originally based on code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */
export function createHtmlParser(scanner: HtmlParserScanner) {
  const scriptEndRe = /<\/script/gi
  const styleEndRe = /<\/style/gi

  function parse(html: string) {
    const length = html.length
    let pos = 0
    // Set once no `>` follows anymore, so later `</x` fail without searching again
    let noMoreGt = false

    while (pos < length) {
      // Text up to the next `<`
      if (html.charCodeAt(pos) !== CH_LT) {
        let end = html.indexOf('<', pos)
        if (end < 0)
          end = length
        scanner.characters(html.slice(pos, end))
        pos = end
        continue
      }

      const next = html.charCodeAt(pos + 1)

      // Comment
      if (next === CH_BANG && html.startsWith('<!--', pos)) {
        // From `pos + 2`: `<!-->` and `<!--->` are empty comments, like in browsers
        const end = html.indexOf('-->', pos + 2)
        if (end >= 0) {
          scanner.comment(html.slice(pos + 4, end))
          pos = end + 3
        }
        else {
          scanner.characters('<')
          pos += 1
        }
        continue
      }

      // End tag
      if (next === CH_SLASH) {
        const c = html.charCodeAt(pos + 2)
        if (!noMoreGt && pos + 2 < length && !isSpace(c) && c !== CH_GT) {
          const end = html.indexOf('>', pos + 3)
          if (end < 0) {
            noMoreGt = true
          }
          else {
            let nameEnd = pos + 2
            while (nameEnd < end && !isSpace(html.charCodeAt(nameEnd)))
              nameEnd++
            scanner.endElement(html.slice(pos + 2, nameEnd))
            pos = end + 1
            continue
          }
        }
        scanner.characters('<')
        pos += 1
        continue
      }

      // Start tag
      if (isTagStart(next)) {
        const end = parseStartTag(html, pos)
        if (end < 0) {
          // Unterminated tag: the rest is text. Trying again at every later
          // `<` would rescan the rest each time, which is quadratic.
          scanner.characters(html.slice(pos))
          return
        }
        pos = end
        continue
      }

      scanner.characters('<')
      pos += 1
    }

    /** Parse the start tag at `start`, return the position after it or -1 if it is not closed */
    function parseStartTag(html: string, start: number): number {
      let i = start + 1

      // Tag name
      while (i < length) {
        const c = html.charCodeAt(i)
        if (isSpace(c) || c === CH_SLASH || c === CH_GT)
          break
        i++
      }
      const tagName = html.slice(start + 1, i)

      const attrs: Record<string, any> = {}
      let isSelfClose = false

      while (true) {
        // Skip whitespace and slashes (`<br />`) between attributes
        while (i < length) {
          const c = html.charCodeAt(i)
          if (c === CH_SLASH) {
            isSelfClose = true
          }
          else if (!isSpace(c)) {
            break
          }
          i++
        }
        if (i >= length)
          return -1

        if (html.charCodeAt(i) === CH_GT) {
          i++
          break
        }
        isSelfClose = false

        // Attribute name, may start with `=` or contain quotes like in browsers
        const nameStart = i
        i++
        while (i < length) {
          const c = html.charCodeAt(i)
          if (isSpace(c) || c === CH_GT || c === CH_EQ)
            break
          i++
        }
        let name = html.slice(nameStart, i)
        // `<a b/>` is self closing with attribute `b`
        if (html.charCodeAt(i) === CH_GT && name.length > 1 && name.endsWith('/')) {
          name = name.slice(0, -1)
          isSelfClose = true
        }

        // Optional value
        let j = i
        while (j < length && isSpace(html.charCodeAt(j)))
          j++
        if (html.charCodeAt(j) !== CH_EQ) {
          attrs[name] = true
          continue
        }
        j++
        while (j < length && isSpace(html.charCodeAt(j)))
          j++
        if (j >= length)
          return -1

        const q = html.charCodeAt(j)
        if (q === CH_DQUOTE || q === CH_SQUOTE) {
          const close = html.indexOf(q === CH_DQUOTE
            ? '"'
            : '\'', j + 1)
          if (close < 0)
            return -1
          attrs[name] = html.slice(j + 1, close)
          i = close + 1
        }
        else if (q === CH_GT) {
          // `<a b=>`
          attrs[name] = true
          i = j
        }
        else {
          const valueStart = j
          while (j < length) {
            const c = html.charCodeAt(j)
            if (isSpace(c) || c === CH_GT)
              break
            j++
          }
          let value = html.slice(valueStart, j)
          // `<img src=x/>` is self closing with `src="x"`, as before
          if (html.charCodeAt(j) === CH_GT && value.length > 1 && value.endsWith('/')) {
            value = value.slice(0, -1)
            isSelfClose = true
          }
          attrs[name] = value
          i = j
          if (isSelfClose) {
            i++
            break
          }
        }
      }

      scanner.startElement(tagName, attrs, isSelfClose, html.slice(start, i))

      // Raw text elements
      const lowerTagName = tagName.toLowerCase()
      const endRe = lowerTagName === 'script'
        ? scriptEndRe
        : lowerTagName === 'style'
          ? styleEndRe
          : null
      if (endRe) {
        endRe.lastIndex = i
        if (endRe.test(html)) {
          const textEnd = endRe.lastIndex - (lowerTagName.length + 2)
          if (textEnd > i)
            scanner.characters(html.slice(i, textEnd))
          return textEnd
        }
      }
      return i
    }
  }

  return parse
}
