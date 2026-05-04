import { serializeMarkdown } from './serialize-markdown'
import { parseHTML } from './vdomparser'

describe('serialize markdown', () => {
  it('should serialize a simple unordered list', () => {
    const doc = parseHTML(`<ul><li>A</li><li>B</li></ul>`)
    expect(serializeMarkdown(doc)).toBe(`- A\n- B\n`)
  })

  it('should indent nested lists', () => {
    const doc = parseHTML(`<ul><li>A<ul><li>A1</li><li>A2<ul><li>A2a</li></ul></li></ul></li><li>B</li></ul>`)
    expect(serializeMarkdown(doc)).toBe(
      `- A\n  - A1\n  - A2\n    - A2a\n- B\n`,
    )
  })

  it('should indent nested ordered lists', () => {
    const doc = parseHTML(`<ol><li>A<ol><li>A1</li></ol></li><li>B</li></ol>`)
    expect(serializeMarkdown(doc)).toBe(`- A\n  - A1\n- B\n`)
  })
})
