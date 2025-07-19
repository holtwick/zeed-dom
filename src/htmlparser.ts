// Taken from https://github.com/creeperyang/html-parser-lite
// and slightly modified. Original also under MIT license. Thanks.

// attribute, like href="javascript:void(0)"
// 1. start with name (not empty and not =)
// 2. and then \s*=\s*
// 3. and value can be "value" | 'value' | value
// 4. 2 and 3 are optional
const attrRe = /([^=\s]+)(\s*=\s*(("([^"]*)")|('([^']*)')|[^>\s]+))?/g
const endTagRe = /^<\/([^>\s]+)[^>]*>/m
// start tag, like <a href="link"> <img/>
// 1. must start with <tagName
// 2. optional attrbutes
// 3. /> or >
const startTagRe = /^<([^>\s/]+)((\s+[^=>\s]+(\s*=\s*(("[^"]*")|('[^']*')|[^>\s]+))?)*)\s*(?:\/\s*)?>/m
const selfCloseTagRe = /\s*\/\s*>\s*$/m

/**
 * This is a simple html parser. Will read and parse html string.
 *
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */
export class HtmlParser {
  scanner: any
  options: any
  attrRe = attrRe
  endTagRe = endTagRe
  startTagRe = startTagRe
  defaults = { ignoreWhitespaceText: false }

  constructor(options: {
    scanner?: any
    ignoreWhitespaceText?: boolean
  } = {}) {
    this.scanner = options.scanner
    // Faster object merge for simple case
    this.options = options.ignoreWhitespaceText !== undefined 
      ? options 
      : { ...this.defaults, ...options }
  }

  parse(html: string) {
    let treatAsChars = false
    let index, match, characters
    // Precompile regex for script/style end tags to avoid repeated creation
    let scriptEndRe: RegExp | null = null
    let styleEndRe: RegExp | null = null
    
    while (html.length) {
      treatAsChars = true // Set default early
      
      // comment - use startsWith for faster string comparison
      if (html.startsWith('<!--')) {
        index = html.indexOf('-->')
        if (index !== -1) {
          this.scanner.comment(html.substring(4, index))
          html = html.slice(index + 3)
          treatAsChars = false
        }
      }
      // end tag - use startsWith and avoid deprecated RegExp globals
      else if (html.startsWith('</')) {
        match = html.match(this.endTagRe)
        if (match) {
          html = html.slice(match[0].length)
          treatAsChars = false
          this.parseEndTag(match[0], match[1])
        }
      }
      // start tag - avoid charAt for better performance
      else if (html[0] === '<') {
        match = html.match(this.startTagRe)
        if (match) {
          html = html.slice(match[0].length)
          treatAsChars = false
          const tagName = this.parseStartTag(match[0], match[1], match)
          // Optimize script/style handling with precompiled regex
          if (tagName === 'script') {
            if (!scriptEndRe) scriptEndRe = /<\/script/i
            index = html.search(scriptEndRe)
            if (index !== -1) {
              this.scanner.characters(html.slice(0, index))
              html = html.slice(index)
              treatAsChars = false
            }
          } else if (tagName === 'style') {
            if (!styleEndRe) styleEndRe = /<\/style/i
            index = html.search(styleEndRe)
            if (index !== -1) {
              this.scanner.characters(html.slice(0, index))
              html = html.slice(index)
              treatAsChars = false
            }
          }
        }
      }

      if (treatAsChars) {
        index = html.indexOf('<')
        
        if (index === 0) {
          // Skip the first '<' and find the next one
          index = html.indexOf('<', 1)
          characters = html[0] // Just the '<' character
          html = html.slice(1)
        } else if (index === -1) {
          characters = html
          html = ''
        } else {
          characters = html.slice(0, index)
          html = html.slice(index)
        }

        // Faster whitespace check - avoid regex for empty strings
        if (characters && (!this.options.ignoreWhitespaceText || /[^\s]/.test(characters)))
          this.scanner.characters(characters)
      }

      match = null // Clear match for next iteration
    }
  }

  private parseStartTag(input: string, tagName: string, match: any) {
    const isSelfColse = selfCloseTagRe.test(input)
    let attrInput = match[2]
    if (isSelfColse)
      attrInput = attrInput.replace(/\s*\/\s*$/, '')
    const attrs = this.parseAttributes(tagName, attrInput)
    this.scanner.startElement(tagName, attrs, isSelfColse, match[0])
    return tagName.toLocaleLowerCase()
  }

  private parseEndTag(input: string, tagName: string) {
    this.scanner.endElement(tagName)
  }

  private parseAttributes(tagName: string, input: string) {
    const attrs: Record<string, any> = {}
    if (!input || !input.trim()) return attrs
    
    // Fast path for simple attributes without quotes
    if (!/["']/.test(input)) {
      const parts = input.trim().split(/\s+/)
      for (const part of parts) {
        const eqIndex = part.indexOf('=')
        if (eqIndex === -1) {
          attrs[part] = true
        } else {
          attrs[part.slice(0, eqIndex)] = part.slice(eqIndex + 1)
        }
      }
      return attrs
    }
    
    // Fallback to regex for complex attributes
    this.attrRe.lastIndex = 0
    let match
    while ((match = this.attrRe.exec(input)) !== null) {
      const [, name, , value, , valueInQuote, , valueInSingleQuote] = match
      attrs[name] = valueInSingleQuote ?? valueInQuote ?? value ?? true
    }
    return attrs
  }
}
