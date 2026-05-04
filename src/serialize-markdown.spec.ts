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

  it('should not wrap by default', () => {
    const long = 'word '.repeat(40).trim()
    const doc = parseHTML(`<p>${long}</p>`)
    const out = serializeMarkdown(doc)
    expect(out.trim().split('\n').length).toBe(1)
  })

  it('should wrap paragraphs at the given column', () => {
    const long = 'word '.repeat(40).trim()
    const doc = parseHTML(`<p>${long}</p>`)
    const out = serializeMarkdown(doc, { wrap: 40 })
    for (const line of out.split('\n'))
      expect(line.length).toBeLessThanOrEqual(40)
    expect(out.trim().split('\n').length).toBeGreaterThan(1)
  })

  it('should wrap list items with continuation indent', () => {
    const long = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor'
    const doc = parseHTML(`<ul><li>A<ul><li>${long}</li></ul></li></ul>`)
    const out = serializeMarkdown(doc, { wrap: 40 })
    const lines = out.split('\n').filter(Boolean)
    expect(lines[0]).toBe('- A')
    expect(lines[1].startsWith('  - ')).toBe(true)
    for (let i = 2; i < lines.length; i++)
      expect(lines[i].startsWith('    ')).toBe(true)
    for (const line of lines)
      expect(line.length).toBeLessThanOrEqual(40)
  })

  it('should render links as inline by default', () => {
    const doc = parseHTML(`<p>See <a href="https://example.com">example</a> here.</p>`)
    expect(serializeMarkdown(doc).trim()).toBe(`See [example](https://example.com) here.`)
  })

  it('should render links as autolink when linkStyle is autolink', () => {
    const doc = parseHTML(`<p>See <a href="https://example.com">example</a> here.</p>`)
    expect(serializeMarkdown(doc, { linkStyle: 'autolink' }).trim())
      .toBe(`See example <https://example.com> here.`)
  })

  it('should collapse autolink when text equals href', () => {
    const doc = parseHTML(`<a href="https://example.com">https://example.com</a>`)
    expect(serializeMarkdown(doc, { linkStyle: 'autolink' }).trim())
      .toBe(`<https://example.com>`)
  })

  it('should render images as inline by default', () => {
    const doc = parseHTML(`<img src="logo.png" alt="Logo">`)
    expect(serializeMarkdown(doc).trim()).toBe(`![Logo](logo.png)`)
  })

  it('should render images as autolink when linkStyle is autolink', () => {
    const doc = parseHTML(`<img src="logo.png" alt="Logo">`)
    expect(serializeMarkdown(doc, { linkStyle: 'autolink' }).trim())
      .toBe(`Logo <logo.png>`)
  })

  it('should collapse autolink image when alt is empty', () => {
    const doc = parseHTML(`<img src="logo.png">`)
    expect(serializeMarkdown(doc, { linkStyle: 'autolink' }).trim())
      .toBe(`<logo.png>`)
  })

  it('should preserve inline styles by default', () => {
    const doc = parseHTML(`<p>A <b>bold</b> and <i>italic</i> and <code>code</code> word.</p>`)
    expect(serializeMarkdown(doc).trim()).toBe(`A **bold** and *italic* and ==code== word.`)
  })

  it('should strip inline styles when inlineStyles is false', () => {
    const doc = parseHTML(`<p>A <b>bold</b> and <i>italic</i> and <code>code</code> word.</p>`)
    expect(serializeMarkdown(doc, { inlineStyles: false }).trim())
      .toBe(`A bold and italic and code word.`)
  })

  it('should keep block structure when stripping inline styles', () => {
    const doc = parseHTML(`<h1>Title <em>emph</em></h1><ul><li><strong>X</strong></li></ul>`)
    expect(serializeMarkdown(doc, { inlineStyles: false }))
      .toBe(`# Title emph\n\n- X\n`)
  })

  it('should not wrap fenced code blocks', () => {
    const code = 'a'.repeat(120)
    const doc = parseHTML(`<pre>${code}</pre>`)
    const out = serializeMarkdown(doc, { wrap: 40 })
    expect(out).toContain(code)
  })
})
