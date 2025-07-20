/* eslint-disable no-console */
import { createHtmlParser } from '../src/htmlparser.ts'

// Minimal scanner that does nothing
const scanner = {
  comment() {},
  startElement() {},
  endElement() {},
  characters() {},
}

function makeHTML(repeats = 10000) {
  return `<div>${'<span simple some="123">Hello</span><hr>'.repeat(repeats)}</div>`
}

const html = makeHTML(20000)
const parser = createHtmlParser(scanner)

const ITERATIONS = 100
console.log('🚀 Benchmarking HtmlParser...')
let totalTime = 0
for (let i = 0; i < ITERATIONS; i++) {
  const start = Date.now()
  parser(html)
  const end = Date.now()
  totalTime += (end - start)
}
const avgTime = totalTime / ITERATIONS
console.log(`📄 Parsed ${html.length} chars, ${ITERATIONS} times.`)
console.log(`⏱️ Total time: ${totalTime} ms`)
console.log(`⚡ Average time per run: ${avgTime.toFixed(2)} ms`)
