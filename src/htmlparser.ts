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
    if (options.scanner)
      this.scanner = options.scanner
    this.options = Object.assign({}, this.defaults, options)
  }

  parse(html: string) {
    let treatAsChars = false
    let index, match, characters
    while (html.length) {
      // comment
      if (html.substring(0, 4) === '<!--') {
        index = html.indexOf('-->')
        if (index !== -1) {
          this.scanner.comment(html.substring(4, index))
          html = html.substring(index + 3)
          treatAsChars = false
        }
        else {
          treatAsChars = true
        }
      }

      // end tag
      else if (html.substring(0, 2) === '</') {
        match = this.endTagRe.exec(html)
        if (match) {
          html = RegExp.rightContext
          treatAsChars = false
          this.parseEndTag(RegExp.lastMatch, match[1])
        }
        else {
          treatAsChars = true
        }
      }

      // start tag
      else if (html.charAt(0) === '<') {
        match = this.startTagRe.exec(html)
        if (match) {
          html = RegExp.rightContext
          treatAsChars = false
          const tagName = this.parseStartTag(RegExp.lastMatch, match[1], match)
          if (tagName === 'script' || tagName === 'style') {
            index = html.search(new RegExp(`<\/${tagName}`, 'i'))
            if (index !== -1) {
              this.scanner.characters(html.substring(0, index))
              html = html.substring(index)
              treatAsChars = false
            }
            else {
              treatAsChars = true
            }
          }
        }
        else {
          treatAsChars = true
        }
      }

      if (treatAsChars) {
        index = html.indexOf('<')
        let offset = index

        if (index === 0) {
          // First char is a < so find the next one
          index = html.substring(1).indexOf('<')
          // We're at substring(1) so add 1 to the index
          offset = offset + 1
        }

        if (index === -1) {
          characters = html
          html = ''
        }
        else {
          characters = html.substring(0, offset)
          html = html.substring(offset)
        }

        if (!this.options.ignoreWhitespaceText || !/^\s*$/.test(characters))
          this.scanner.characters(characters)
      }

      treatAsChars = true
      match = null
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
    input.replace(this.attrRe, (...m: any[]) => {
      const [_attr, name, _c2, value, _c4, valueInQuote, _c6, valueInSingleQuote] = m
      attrs[name] = valueInSingleQuote ?? valueInQuote ?? value ?? true
      return undefined as any // hack
    })
    return attrs
  }
}
