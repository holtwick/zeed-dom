/* eslint-disable no-console */
import { createHtmlParser } from '../src/htmlparser.ts'

const ITERATIONS = 200

// Minimal scanner that does nothing
const scanner = {
  comment() {},
  startElement() {},
  endElement() {},
  characters() {},
}

const html = `<div>${'<span simple some="123" a=1 y=\'3\'>Hello</span><hr     soso=2354>'.repeat(20000)}</div>`
const parser = createHtmlParser(scanner)

console.log('🚀 Benchmarking HtmlParser...')
const start = performance.now()
for (let i = 0; i < ITERATIONS; i++) {
  parser(html)
}
const avgTime = (performance.now() - start) / ITERATIONS

console.log(`📄 Parsed ${html.length} chars, ${ITERATIONS} times.`)
console.log(`⚡ Average time per run: ${avgTime.toFixed(2)} ms`)
