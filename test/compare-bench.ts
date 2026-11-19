/* eslint-disable no-console */
/**
 * Compare zeed-dom with linkedom, happy-dom and jsdom.
 *
 * Setup once: `cd test && npm install --no-package-lock`
 * Run: `npm run perf:compare` (from the project root)
 *
 * Options: `--runs=3` (best of n), `--only=zeed-dom,linkedom`
 *
 * Each library runs in its own process, so they don't share heap and JIT.
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { Window } from 'happy-dom'
import { JSDOM, VirtualConsole } from 'jsdom'
import { parseHTML as linkedomParseHTML } from 'linkedom'
import { DOMParser as PMDOMParser, DOMSerializer as PMDOMSerializer } from 'prosemirror-model'
import { schema } from 'prosemirror-schema-basic'
import { createHTMLDocument, parseHTML as zeedParseHTML } from '../src/index.node.ts'

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=')
  return [k, v ?? 'true']
}))
const RUNS = Number(args.runs ?? 3)
const ONLY = args.only?.split(',')
/** Set in the child processes, which print their results as JSON */
const CHILD = args.child === 'true'

interface Adapter {
  name: string
  /** Parse a complete HTML page */
  parse: (html: string) => any
  /** Serialize a parsed page */
  serialize: (doc: any) => string
  /** A new empty HTML document */
  create: () => any
  /** Free the resources of a document from `parse` or `create` */
  close?: (doc: any) => void | Promise<void>
}

const EMPTY_PAGE = '<!DOCTYPE html><html><head></head><body></body></html>'

const happySettings = {
  disableJavaScriptEvaluation: true,
  disableJavaScriptFileLoading: true,
  disableCSSFileLoading: true,
  disableIframePageLoading: true,
  disableComputedStyleRendering: true,
}

const happyWindows = new WeakMap<any, Window>()

// jsdom reports CSS it can't parse to the console otherwise
const silentConsole = new VirtualConsole()

const allAdapters: Adapter[] = [
  {
    name: 'zeed-dom',
    parse: html => zeedParseHTML(html),
    serialize: doc => doc.render(),
    create: () => createHTMLDocument(),
  },
  {
    name: 'linkedom',
    parse: html => linkedomParseHTML(html).document,
    serialize: doc => doc.toString(),
    create: () => linkedomParseHTML(EMPTY_PAGE).document,
  },
  {
    name: 'happy-dom',
    parse: (html) => {
      const window = new Window({ settings: happySettings })
      const doc = new window.DOMParser().parseFromString(html, 'text/html')
      happyWindows.set(doc, window)
      return doc
    },
    serialize: doc => doc.documentElement.outerHTML,
    create: () => {
      const window = new Window({ settings: happySettings })
      happyWindows.set(window.document, window)
      return window.document
    },
    close: doc => happyWindows.get(doc)?.happyDOM.close(),
  },
  {
    name: 'jsdom',
    parse: html => new JSDOM(html, { virtualConsole: silentConsole }).window.document,
    serialize: doc => doc.documentElement.outerHTML,
    create: () => new JSDOM(EMPTY_PAGE, { virtualConsole: silentConsole }).window.document,
    close: doc => doc.defaultView?.close(),
  },
]
const adapters = allAdapters.filter(a => !ONLY || ONLY.includes(a.name))

// Test data

const filesDir = join(import.meta.dirname, '..', 'files')
const files = readdirSync(filesDir)
  .filter(f => f.endsWith('.html'))
  .map(f => readFileSync(join(filesDir, f), 'utf-8'))
const filesSize = files.reduce((n, f) => n + f.length, 0)

const PM_PARAGRAPHS = 5000
const pmDoc = schema.node('doc', null, Array.from({ length: PM_PARAGRAPHS }, (_, i) => schema.node('paragraph', null, [
  schema.text(`Paragraph ${i} with `),
  schema.text('bold', [
    schema.marks.strong.create(),
  ]),
  schema.text(' and a '),
  schema.text('link', [
    schema.marks.link.create({ href: `https://example.com/${i}` }),
  ]),
  schema.text('.'),
])))
const pmSerializer = PMDOMSerializer.fromSchema(schema)
const pmParser = PMDOMParser.fromSchema(schema)

const BUILD_CHILDREN = 50_000

/** Count all nodes below `node` with firstChild/nextSibling */
function walk(node: any) {
  let count = 0
  const stack = [node]
  while (stack.length) {
    for (let n = stack.pop().firstChild; n; n = n.nextSibling) {
      count++
      if (n.firstChild)
        stack.push(n)
    }
  }
  return count
}

function time(fn: () => void) {
  const start = performance.now()
  fn()
  return performance.now() - start
}

// Operations. Each run returns the measured times in ms by operation name.

const OP_PARSE = `parse ${files.length} pages (${(filesSize / 1e6).toFixed(1)} MB)`
const OP_SERIALIZE = 'serialize the pages'
const OP_QUERY = 'querySelectorAll("a[href]") on the pages'
const OP_WALK = 'walk the pages with firstChild/nextSibling'
const OP_BUILD = `appendChild ${BUILD_CHILDREN / 1000}k elements to one parent`
const OP_PM_SERIALIZE = `ProseMirror DOMSerializer, ${PM_PARAGRAPHS / 1000}k paragraphs`
const OP_PM_PARSE = `ProseMirror DOMParser, ${PM_PARAGRAPHS / 1000}k paragraphs`

const runs: ((a: Adapter) => Promise<Record<string, number>>)[] = [
  // Pages are freed one by one, keeping all in memory needs GBs for jsdom
  async (a) => {
    const t = {
      [OP_PARSE]: 0,
      [OP_SERIALIZE]: 0,
      [OP_QUERY]: 0,
      [OP_WALK]: 0,
    }
    for (const html of files) {
      let doc: any
      t[OP_PARSE] += time(() => doc = a.parse(html))
      t[OP_SERIALIZE] += time(() => a.serialize(doc))
      t[OP_QUERY] += time(() => doc.querySelectorAll('a[href]'))
      t[OP_WALK] += time(() => walk(doc))
      await a.close?.(doc)
    }
    return t
  },
  async (a) => {
    const doc = a.create()
    const t = time(() => {
      const parent = doc.createElement('div')
      for (let i = 0; i < BUILD_CHILDREN; i++) {
        const p = doc.createElement('p')
        p.setAttribute('class', 'x')
        p.appendChild(doc.createTextNode(`Item ${i}`))
        parent.appendChild(p)
      }
      if (walk(parent) !== 2 * BUILD_CHILDREN)
        throw new Error('wrong number of nodes')
    })
    await a.close?.(doc)
    return { [OP_BUILD]: t }
  },
  async (a) => {
    const doc = a.create()
    const div = doc.createElement('div')
    const tSerialize = time(() => {
      div.appendChild(pmSerializer.serializeFragment(pmDoc.content, { document: doc }))
      div.innerHTML // eslint-disable-line ts/no-unused-expressions
    })
    let node: any
    const tParse = time(() => node = pmParser.parse(div))
    if (!node.eq(pmDoc))
      throw new Error('ProseMirror round trip differs')
    await a.close?.(doc)
    return { [OP_PM_SERIALIZE]: tSerialize, [OP_PM_PARSE]: tParse }
  },
]

// Run

async function measure(a: Adapter) {
  const best: Record<string, number> = {}
  for (const run of runs) {
    try {
      for (let r = 0; r < RUNS; r++) {
        for (const [op, t] of Object.entries(await run(a)))
          best[op] = Math.min(best[op] ?? Infinity, t)
      }
    }
    catch (err) {
      console.error(`${a.name}:`, err)
    }
  }
  return best
}

async function measureAll() {
  const out: Record<string, Record<string, number>> = {}
  for (const a of adapters)
    out[a.name] = await measure(a)
  console.log(JSON.stringify(out))
}

if (CHILD) {
  void measureAll()
}
else {
  const results: Record<string, Record<string, number>> = {}
  for (const a of adapters) {
    process.stderr.write(`${a.name}…\n`)
    const out = execFileSync(process.execPath, [
      ...process.execArgv,
      process.argv[1]!,
      `--only=${a.name}`,
      `--runs=${RUNS}`,
      '--child',
    ], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'inherit'],
      maxBuffer: 1e7,
    })
    Object.assign(results, JSON.parse(out.trim().split('\n').pop()!))
  }

  const ops = [
    OP_PARSE,
    OP_SERIALIZE,
    OP_QUERY,
    OP_WALK,
    OP_BUILD,
    OP_PM_SERIALIZE,
    OP_PM_PARSE,
  ]
  console.log(`\nBest of ${RUNS} runs, Node ${process.version}, ${process.platform} ${process.arch}\n`)
  console.log(`| Operation | ${adapters.map(a => a.name).join(' | ')} |`)
  console.log(`| --- | ${adapters.map(() => '---:').join(' | ')} |`)
  for (const op of ops) {
    const cells = adapters.map((a) => {
      const t = results[a.name]?.[op]
      return t == null
        ? 'error'
        : `${Math.round(t)} ms`
    })
    console.log(`| ${op} | ${cells.join(' | ')} |`)
  }
}
