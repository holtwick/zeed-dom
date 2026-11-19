/* eslint-disable no-console */
/**
 * Compare zeed-dom with linkedom, happy-dom and jsdom on Node.js and Bun.
 *
 * Setup once: `cd test && npm install --no-package-lock`
 * Run: `npm run perf:compare` (from the project root)
 *
 * Options:
 * - `--write` updates the tables in PERFORMANCE.md and README.md
 * - `--runs=3` best of n runs
 * - `--only=zeed-dom,linkedom` compare only some libraries
 * - `--runtimes=node,bun` default is Node.js, plus Bun if installed
 *
 * Every combination of runtime and library runs in its own process, so they
 * don't share heap and JIT.
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { arch, cpus, platform } from 'node:os'
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
const ONLY: string[] | undefined = args.only?.split(',')
/** Set in the child processes, which print their results as JSON */
const CHILD = args.child === 'true'

const ROOT = join(import.meta.dirname, '..')

// Libraries

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
    // Async, the window is only freed after the promise resolved
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

const filesDir = join(ROOT, 'files')
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

// Benchmarks. Each returns the measured time in ms per operation.

const OP = {
  parse: `Parse ${files.length} real-world pages (${(filesSize / 1e6).toFixed(1)} MB)`,
  serialize: 'Serialize the pages',
  query: '`querySelectorAll("a[href]")` on the pages',
  walk: 'Walk the pages with `firstChild` / `nextSibling`',
  build: `\`appendChild\` ${BUILD_CHILDREN.toLocaleString('en')} elements to one parent`,
  pmSerialize: `ProseMirror \`DOMSerializer\`, ${PM_PARAGRAPHS.toLocaleString('en')} paragraphs`,
  pmParse: `ProseMirror \`DOMParser\`, ${PM_PARAGRAPHS.toLocaleString('en')} paragraphs`,
}

const HOSTILE = {
  tags: 'Parse `\'<a\\n\'.repeat(2000)`, 6 KB of unclosed tags',
  comments: 'Parse 20,000 unclosed `<!--`',
  firstChild: '`querySelectorAll("p:first-child")` among 20,000 siblings',
  body: '1,000 × `document.body` with 100,000 elements',
  deep: 'Parse 6,000 nested unclosed tags and serialize',
}

interface Benchmark {
  ops: string[]
  run: (a: Adapter) => Promise<Record<string, number>>
}

/** Benchmark of a single operation, `fn` returns the measured time */
function single(op: string, fn: (a: Adapter) => Promise<number>): Benchmark {
  return {
    ops: [op],
    run: async a => ({ [op]: await fn(a) }),
  }
}

const benchmarks: Benchmark[] = [
  {
    ops: [
      OP.parse,
      OP.serialize,
      OP.query,
      OP.walk,
    ],
    // Pages are freed one by one, keeping all in memory needs GBs for jsdom
    async run(a) {
      const t = {
        [OP.parse]: 0,
        [OP.serialize]: 0,
        [OP.query]: 0,
        [OP.walk]: 0,
      }
      for (const html of files) {
        let doc: any
        t[OP.parse] += time(() => doc = a.parse(html))
        t[OP.serialize] += time(() => a.serialize(doc))
        t[OP.query] += time(() => doc.querySelectorAll('a[href]'))
        t[OP.walk] += time(() => walk(doc))
        await a.close?.(doc)
      }
      return t
    },
  },
  single(OP.build, async (a) => {
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
    return t
  }),
  {
    ops: [OP.pmSerialize, OP.pmParse],
    async run(a) {
      const doc = a.create()
      const div = doc.createElement('div')
      const tSerialize = time(() => {
        div.appendChild(pmSerializer.serializeFragment(pmDoc.content, { document: doc }))
        if (!div.innerHTML)
          throw new Error('nothing serialized')
      })
      let node: any
      const tParse = time(() => node = pmParser.parse(div))
      if (!node.eq(pmDoc))
        throw new Error('ProseMirror round trip differs')
      await a.close?.(doc)
      return { [OP.pmSerialize]: tSerialize, [OP.pmParse]: tParse }
    },
  },
  single(HOSTILE.tags, async (a) => {
    let doc: any
    const t = time(() => doc = a.parse('<a\n'.repeat(2000)))
    await a.close?.(doc)
    return t
  }),
  single(HOSTILE.comments, async (a) => {
    let doc: any
    const t = time(() => doc = a.parse('x<!-- '.repeat(20_000)))
    await a.close?.(doc)
    return t
  }),
  single(HOSTILE.firstChild, async (a) => {
    const doc = a.parse(`<body>${'<p>x</p>'.repeat(20_000)}</body>`)
    const t = time(() => {
      if (doc.querySelectorAll('p:first-child').length !== 1)
        throw new Error('wrong number of matches')
    })
    await a.close?.(doc)
    return t
  }),
  single(HOSTILE.body, async (a) => {
    const doc = a.parse(`<!DOCTYPE html><html><head><title>t</title></head><body>${'<p>x</p>'.repeat(100_000)}</body></html>`)
    const t = time(() => {
      for (let i = 0; i < 1000; i++) {
        if (!doc.body)
          throw new Error('no body')
      }
    })
    await a.close?.(doc)
    return t
  }),
  single(HOSTILE.deep, async (a) => {
    let doc: any
    const t = time(() => {
      doc = a.parse(`${'<b>'.repeat(6000)}x`)
      a.serialize(doc)
    })
    await a.close?.(doc)
    return t
  }),
]

/** Time in ms, or an error message */
type Results = Record<string, number | string>

async function measure(a: Adapter): Promise<Results> {
  const best: Results = {}
  for (const benchmark of benchmarks) {
    try {
      for (let r = 0; r < RUNS; r++) {
        for (const [op, t] of Object.entries(await benchmark.run(a)))
          best[op] = Math.min(Number(best[op] ?? Infinity), t)
      }
    }
    catch (err) {
      for (const op of benchmark.ops) {
        best[op] = err instanceof RangeError
          ? 'stack overflow'
          : 'error'
      }
      console.error(`${a.name}: ${err instanceof Error
        ? err.message
        : err}`)
    }
  }
  return best
}

// Child process: measure and print the results as JSON

async function child() {
  const out: Record<string, Results> = {}
  for (const a of adapters)
    out[a.name] = await measure(a)
  console.log(JSON.stringify(out))
}

// Main process: run the children, print or write the tables

function output(command: string, args: string[]) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  }
  catch {
    return undefined
  }
}

function packageVersion(dir: string) {
  return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8')).version
}

function formatCell(value: number | string | undefined, base: number | string | undefined) {
  if (value == null)
    return '–'
  if (typeof value === 'string')
    return value
  const ms = value < 10
    ? value.toFixed(1)
    : Math.round(value).toLocaleString('en')
  if (typeof base !== 'number' || base === value)
    return `${ms} ms`
  const factor = value / base
  const rounded = factor < 0.1
    ? factor.toFixed(2)
    : factor < 10
      ? factor.toFixed(1)
      : Math.round(factor).toLocaleString('en')
  return `${ms} ms (${rounded}×)`
}

function table(results: Record<string, Results>, ops: string[], title = 'Operation') {
  const names = adapters.map(a => a.name)
  const lines = [
    `| ${title} | ${names.join(' | ')} |`,
    `| --- | ${names.map(() => '---:').join(' | ')} |`,
  ]
  for (const op of ops) {
    const base = results['zeed-dom']?.[op]
    lines.push(`| ${op} | ${names.map(n => formatCell(results[n]?.[op], base)).join(' | ')} |`)
  }
  return lines.join('\n')
}

/** Replace the text between `<!-- name:start -->` and `<!-- name:end -->` */
function replaceMarked(file: string, name: string, content: string) {
  const path = join(ROOT, file)
  const text = readFileSync(path, 'utf-8')
  const start = `<!-- ${name}:start -->`
  const end = `<!-- ${name}:end -->`
  const from = text.indexOf(start)
  const to = text.indexOf(end)
  if (from < 0 || to < from)
    throw new Error(`Markers ${start} … ${end} missing in ${file}`)
  writeFileSync(path, `${text.slice(0, from + start.length)}\n\n${content}\n\n${text.slice(to)}`)
  console.error(`Updated ${file}`)
}

function main() {
  const script = process.argv[1]!
  const runtimes = [
    {
      name: 'Node.js',
      command: 'node',
      args: ['--import', 'tsx', script],
    },
    {
      name: 'Bun',
      command: 'bun',
      args: [script],
    },
  ].filter(r => args.runtimes
    ? args.runtimes.split(',').includes(r.command)
    : output(r.command, ['--version']))

  const versions: string[] = []
  const all: Record<string, Record<string, Results>> = {}
  for (const runtime of runtimes) {
    versions.push(`${runtime.name} ${output(runtime.command, ['--version'])?.replace(/^v/, '')}`)
    const results: Record<string, Results> = {}
    for (const a of adapters) {
      console.error(`${runtime.name} / ${a.name} …`)
      const out = execFileSync(runtime.command, [
        ...runtime.args,
        `--only=${a.name}`,
        `--runs=${RUNS}`,
        '--child',
      ], {
        cwd: ROOT,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'inherit'],
        maxBuffer: 1e7,
      })
      Object.assign(results, JSON.parse(out.trim().split('\n').pop()!))
    }
    all[runtime.name] = results
  }

  // `+changes` if the measured sources differ from the commit
  const changed = output('git', [
    '-C',
    ROOT,
    'status',
    '--porcelain',
    '--',
    'src',
  ])
  const hash = output('git', [
    '-C',
    ROOT,
    'rev-parse',
    '--short',
    'HEAD',
  ])
  const commit = hash && `${hash}${changed ? '+changes' : ''}`
  const libraries = [
    `zeed-dom ${packageVersion(ROOT)}${commit
      ? ` (${commit})`
      : ''}`,
    ...adapters
      .filter(a => a.name !== 'zeed-dom')
      .map(a => `${a.name} ${packageVersion(join(ROOT, 'test', 'node_modules', a.name))}`),
  ]
  const environment = `Generated by \`npm run perf:compare -- --write\` on ${new Date().toISOString().slice(0, 10)}: best of ${RUNS} runs on ${cpus()[0]?.model ?? arch()} (${platform()} ${arch()}) with ${versions.join(' and ')}. Libraries: ${libraries.join(', ')}. The factor in parentheses is the time relative to zeed-dom.`

  const perRuntime = (ops: string[]) => Object.entries(all)
    .map(([runtime, results]) => `### ${runtime}\n\n${table(results, ops)}`)
    .join('\n\n')
  const comparison = `${environment}\n\n${perRuntime(Object.values(OP))}`
  const hostile = perRuntime(Object.values(HOSTILE))
  const summary = Object.entries(all)
    .map(([runtime, results]) => table(results, [OP.parse, OP.build, OP.pmSerialize], runtime))
    .join('\n\n')

  if (args.write === 'true') {
    replaceMarked('PERFORMANCE.md', 'perf-compare', comparison)
    replaceMarked('PERFORMANCE.md', 'perf-hostile', hostile)
    replaceMarked('README.md', 'perf-summary', `${summary}\n\n${environment}`)
  }
  else {
    console.log(`\n${comparison}\n\n## Hostile input\n\n${hostile}`)
  }
}

if (CHILD)
  void child()
else
  main()
