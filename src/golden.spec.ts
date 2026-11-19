/// <reference types="vite/client" />
import { serializeMarkdown } from './serialize-markdown'
import { serializePlaintext } from './serialize-plaintext'
import { serializeSafeHTML } from './serialize-safehtml'
import { parseHTML } from './vdomparser'

// Golden files: the output for 258 real-world pages in `files/` must not
// change by accident. The full outputs would be about 100 MB, so the snapshot
// holds a hash per page and output. If a change is intended, check a few of
// the affected pages by hand and update the snapshot with `vitest -u`.
//
// `import.meta.glob` instead of `fs`, so this also runs in browsers.
const pages = import.meta.glob<string>('../files/*.html', { query: '?raw', import: 'default' })

/** 53-bit hash (cyrb53), the same in every runtime and synchronous */
function hash(text: string) {
  let h1 = 0xDEADBEEF
  let h2 = 0x41C6CE57
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

describe('golden files', () => {
  it('renders and serializes the real-world pages unchanged', async () => {
    const names = Object.keys(pages).sort()
    expect(names.length).toBe(258)
    const results: Record<string, string> = {}
    for (const path of names) {
      const html = await pages[path]!()
      const doc = parseHTML(html)
      const name = path.split('/').pop()!.slice(0, 16)
      // One line per page keeps the snapshot diff readable
      results[name] = [
        `render:${hash(doc.render())}`,
        `markdown:${hash(serializeMarkdown(doc))}`,
        `plaintext:${hash(serializePlaintext(doc))}`,
        `safehtml:${hash(serializeSafeHTML(doc))}`,
        `text:${hash(doc.textContent ?? '')}`,
      ].join(' ')
    }
    expect(results).toMatchSnapshot()
  }, 60_000)
})
