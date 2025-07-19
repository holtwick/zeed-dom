/* eslint-disable no-console */
import { HtmlParser } from '../src/htmlparser.ts'

// Minimal scanner that does nothing
const scanner = {
  comment() {},
  startElement() {},
  endElement() {},
  characters() {},
}

function makeHTML(repeats = 10000) {
  return `<div>${'<span>Hello</span>'.repeat(repeats)}</div>`
}

const html = makeHTML(20000)
const parser = new HtmlParser({ scanner })

console.log('Benchmarking HtmlParser...')
const start = Date.now()
parser.parse(html)
const end = Date.now()
console.log(`Parsed ${html.length} chars in ${end - start} ms`)
