// Taken from https://github.com/creeperyang/html-parser-lite
// and slightly modified. Original also under MIT license. Thanks.

// attribute, like href="javascript:void(0)"
// 1. start with name (not empty and not =)
// 2. and then \s*=\s*
// 3. and value can be "value" | 'value' | value
// 4. 2 and 3 are optional
const attrRe = /([^=\s]+)(\s*=\s*(("([^"]*)")|('([^']*)')|[^>\s]+))?/gm
const endTagRe = /^<\/([^>\s]+)[^>]*>/m
// start tag, like <a href="link"> <img/>
// 1. must start with <tagName
// 2. optional attrbutes
// 3. /> or >
const startTagRe =
  /^<([^>\s\/]+)((\s+[^=>\s]+(\s*=\s*(("[^"]*")|('[^']*')|[^>\s]+))?)*)\s*\/?\s*>/m
const selfCloseTagRe = /\s*\/\s*>\s*$/m

const mustImplementMethod = (name: string) => {
  throw new Error(`Must implement the method ${name || ""}`)
}

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

  constructor(options) {
    options = options || {}
    if (options.scanner) {
      this.scanner = options.scanner
      options.scanner = null
    }
    this.options = Object.assign({}, this.defaults, options)
  }

  parse(html) {
    let treatAsChars = false
    let index, match, characters
    while (html.length) {
      // comment
      if (html.substring(0, 4) === "<!--") {
        index = html.indexOf("-->")
        if (index !== -1) {
          this.scanner.comment(html.substring(4, index))
          html = html.substring(index + 3)
          treatAsChars = false
        } else {
          treatAsChars = true
        }
      }
      // end tag
      else if (html.substring(0, 2) === "</") {
        match = this.endTagRe.exec(html)
        if (match) {
          // @ts-ignore
          html = RegExp.rightContext
          treatAsChars = false
          this.parseEndTag(RegExp.lastMatch, match[1])
        } else {
          treatAsChars = true
        }
      }
      // start tag
      else if (html.charAt(0) === "<") {
        match = this.startTagRe.exec(html)
        if (match) {
          // @ts-ignore
          html = RegExp.rightContext
          treatAsChars = false
          this.parseStartTag(RegExp.lastMatch, match[1], match)
        } else {
          treatAsChars = true
        }
      }

      if (treatAsChars) {
        index = html.indexOf("<")

        if (index === 0) {
          // First char is a < so find the next one
          index = html.substring(1).indexOf("<")
        }

        if (index === -1) {
          characters = html
          html = ""
        } else {
          characters = html.substring(0, index)
          html = html.substring(index)
        }

        if (!this.options.ignoreWhitespaceText || !/^\s*$/.test(characters)) {
          this.scanner.characters(characters)
        }
      }

      treatAsChars = true
      match = null
    }
  }

  parseStartTag(input, tagName, match) {
    const isSelfColse = selfCloseTagRe.test(input)
    let attrInput = match[2]
    if (isSelfColse) {
      attrInput = attrInput.replace(/\s*\/\s*$/, "")
    }
    const attrs = this.parseAttributes(tagName, attrInput)
    this.scanner.startElement(tagName, attrs, isSelfColse, match[0])
  }

  parseEndTag(input, tagName) {
    this.scanner.endElement(tagName)
  }

  parseAttributes(tagName, input) {
    const attrs = {}
    input.replace(
      this.attrRe,
      (attr, name, c2, value, c4, valueInQuote, c6, valueInSingleQuote) => {
        attrs[name] = valueInSingleQuote ?? valueInQuote ?? value ?? true
      }
    )
    return attrs
  }
}

// HtmlParser.defaults = {
//   ignoreWhitespaceText: false,
// }
// HtmlParser.prototype.scanner = {
//   startElement() {
//     mustImplementMethod("startElement")
//   },
//   endElement() {
//     mustImplementMethod("endElement")
//   },
//   characters() {
//     mustImplementMethod("characters")
//   },
//   comment() {
//     mustImplementMethod("comment")
//   },
// }
