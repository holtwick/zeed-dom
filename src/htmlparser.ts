export interface HtmlParserScanner {
  characters: (text: string) => void
  comment: (text: string) => void
  startElement: (tagName: string, attrs: Record<string, any>, isSelfColse: boolean, raw: string) => void
  endElement: (tagName: string) => void
}

/**
 * This is a simple html parser. Will read and parse html string.
 *
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */
export function createHtmlParser(scanner: HtmlParserScanner) {
  const attrRe = /([^=\s]+)(\s*=\s*(("([^"]*)")|('([^']*)')|[^>\s]+))?/g
  const endTagRe = /^<\/([^>\s]+)[^>]*>/m
  const startTagRe = /^<([^>\s/]+)((\s+[^=>\s]+(\s*=\s*(("[^"]*")|('[^']*')|[^>\s]+))?)*)\s*(?:\/\s*)?>/m
  const selfCloseTagRe = /\s*\/\s*>\s*$/m

  function parse(html: string) {
    let treatAsChars = false
    let index, match, characters
    let scriptEndRe: RegExp | null = null
    let styleEndRe: RegExp | null = null

    while (html.length) {
      treatAsChars = true

      if (html.startsWith('<!--')) {
        index = html.indexOf('-->')
        if (index !== -1) {
          scanner.comment(html.substring(4, index))
          html = html.slice(index + 3)
          treatAsChars = false
        }
      }
      else if (html.startsWith('</')) {
        match = html.match(endTagRe)
        if (match) {
          html = html.slice(match[0].length)
          treatAsChars = false
          scanner.endElement(match[1])
        }
      }
      else if (html[0] === '<') {
        match = html.match(startTagRe)
        if (match) {
          html = html.slice(match[0].length)
          treatAsChars = false
          const tagName = parseStartTag(match[0], match[1], match)
          if (tagName === 'script') {
            if (!scriptEndRe)
              scriptEndRe = /<\/script/i
            index = html.search(scriptEndRe)
            if (index !== -1) {
              scanner.characters(html.slice(0, index))
              html = html.slice(index)
              treatAsChars = false
            }
          }
          else if (tagName === 'style') {
            if (!styleEndRe)
              styleEndRe = /<\/style/i
            index = html.search(styleEndRe)
            if (index !== -1) {
              scanner.characters(html.slice(0, index))
              html = html.slice(index)
              treatAsChars = false
            }
          }
        }
      }

      if (treatAsChars) {
        index = html.indexOf('<')

        if (index === 0) {
          index = html.indexOf('<', 1)
          characters = html[0]
          html = html.slice(1)
        }
        else if (index === -1) {
          characters = html
          html = ''
        }
        else {
          characters = html.slice(0, index)
          html = html.slice(index)
        }

        if (characters)
          scanner.characters(characters)
      }

      match = null
    }
  }

  function parseStartTag(input: string, tagName: string, match: any) {
    const isSelfColse = selfCloseTagRe.test(input)
    let attrInput = match[2]
    if (isSelfColse)
      attrInput = attrInput.replace(/\s*\/\s*$/, '')
    const attrs = parseAttributes(attrInput)
    scanner.startElement(tagName, attrs, isSelfColse, match[0])
    return tagName.toLocaleLowerCase()
  }

  function parseAttributes(input: string) {
    const attrs: Record<string, any> = {}

    if (!input || !input.trim())
      return attrs

    // If there are no quotes in the input, split by whitespace and parse attributes simply
    if (!/["']/.test(input)) {
      const parts = input.trim().split(/\s+/)
      for (const part of parts) {
        const eqIndex = part.indexOf('=')
        if (eqIndex === -1) {
        // Attribute without value (boolean attribute)
          attrs[part] = true
        }
        else {
        // Attribute with value (unquoted)
          attrs[part.slice(0, eqIndex)] = part.slice(eqIndex + 1)
        }
      }
      return attrs
    }

    // Otherwise, use regex to extract attributes with quoted values
    attrRe.lastIndex = 0
    let match
    // eslint-disable-next-line no-cond-assign
    while ((match = attrRe.exec(input)) !== null) {
      // Destructure the match to get attribute name and value (quoted or unquoted)
      const [, name, , value, , valueInQuote, , valueInSingleQuote] = match
      // Prefer single-quoted, then double-quoted, then unquoted, then true (boolean attribute)
      attrs[name] = valueInSingleQuote ?? valueInQuote ?? value ?? true
    }
    return attrs
  }

  return parse
}
