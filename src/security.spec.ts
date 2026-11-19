import { html } from './html'
import { h as vh } from './index.browser'
import { serializeMarkdown } from './serialize-markdown'
import { safeHTML } from './serialize-safehtml'
import { parseStyleDeclarations } from './style'
import { createHTMLDocument } from './vdom'
import { parseHTML } from './vdomparser'

// Untrusted HTML that is parsed and rendered again must not turn into markup
// it did not contain before, and no input may block the event loop for long.

describe('security', () => {
  describe('round trip of parsed HTML', () => {
    it('renders an `html` attribute as attribute, not as raw content', () => {
      expect(parseHTML('<div html="&lt;img src=x onerror=alert(1)&gt;">hi</div>').render())
        .toBe('<div html="&lt;img src=x onerror=alert(1)&gt;">hi</div>')
      expect(vh('div', { html: '<img src=x onerror=alert(1)>' }).render())
        .toBe('<div html="&lt;img src=x onerror=alert(1)&gt;"></div>')
      // The `html` prop of `html()` / JSX still inserts raw markup
      expect(html('div', { html: '<b>raw</b>' })).toBe('<div><b>raw</b></div>')
    })

    it('keeps entities in script and style as they are', () => {
      for (const tag of ['script', 'style', 'SCRIPT']) {
        const input = `<${tag}>&lt;/${tag}&gt;&lt;img src=x onerror=alert(1)&gt;</${tag}>`
        expect(parseHTML(input).render()).toBe(input)
        expect(parseHTML(input).textContent).toBe(`&lt;/${tag}&gt;&lt;img src=x onerror=alert(1)&gt;`)
      }
      // `&section` was decoded to `§ion` before
      expect(parseHTML('<script>f("?a=1&section=2")</script>').render()).toBe('<script>f("?a=1&section=2")</script>')
    })

    it('treats the rest of the input as content of an unclosed script', () => {
      const doc = parseHTML('<script>&lt;/script&gt;&lt;img src=x onerror=alert(1)&gt;')
      expect(doc.render()).toBe('<script>&lt;/script&gt;&lt;img src=x onerror=alert(1)&gt;</script>')
      expect(doc.childNodes.length).toBe(1)
    })
  })

  describe('names and values', () => {
    it('escapes style objects', () => {
      expect(html('div', {
        style: { color: '"><img src=x onerror=alert(1)>' },
      }))
        .toBe('<div style="color:&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"></div>')
    })

    it('drops attribute names that would end the tag', () => {
      expect(html('div', { 'x onmouseover=alert(1) y': 'v', 'id': 'a' })).toBe('<div id="a"></div>')
      const el = createHTMLDocument().createElement('div')
      el.setAttribute('a><img src=x onerror=alert(1)', 'v')
      expect(el.outerHTML).toBe('<div></div>')
      // Unusual names the parser produces like browsers still render
      expect(parseHTML('<a =x b"c=1 d/e>t</a>').render()).toBe('<a =x b"c="1" d/e>t</a>')
    })

    it('rejects tag names that would end the tag', () => {
      const doc = createHTMLDocument()
      expect(() => doc.createElement('img src=x onerror=alert(1)').outerHTML).toThrow('Invalid tag name')
      expect(() => html('a>b')).toThrow('Invalid tag name')
    })
  })

  describe('serializers', () => {
    it('does not look up rules on the prototype', () => {
      expect(safeHTML('<constructor><img src=x><script>alert(1)</script></constructor>')).toBe('<img src="x">')
      expect(serializeMarkdown(parseHTML('<constructor><b>x</b></constructor>'))).toBe('**x**\n')
      expect(parseHTML('<p>x</p>').querySelector('constructor')).toBeUndefined()
      expect(parseHTML('<p>x</p>').querySelectorAll('toString')).toEqual([])
    })

    it('does not let markup through to Markdown', () => {
      const md = (s: string) => serializeMarkdown(parseHTML(s))
      expect(md('<p>&lt;img src=x onerror=alert(1)&gt; a &lt; b</p>')).toBe('&lt;img src=x onerror=alert(1)> a < b\n')
      expect(md('<a href="javascript:alert(1)">x</a>')).toBe('x\n')
      expect(md('<img src="javascript:alert(1)" alt="x">')).toBe('\n')
      expect(md('<a href="x)<img src=x onerror=alert(1)>">t</a>')).toBe('[t](x%29%3Cimg%20src=x%20onerror=alert%281%29%3E)\n')
      expect(md('<a href=" http://x.com/a b ">t</a>')).toBe('[t](http://x.com/a%20b)\n')
      expect(md('<img src="a.png" alt="x](javascript:alert(1))">')).toBe('![x\\](javascript:alert(1))](a.png)\n')
      // Text in code blocks is literal and can't close the block
      expect(md('<pre>&lt;b&gt;\n```\n&lt;img src=x onerror=alert(1)&gt;</pre>'))
        .toBe('````\n<b>\n```\n<img src=x onerror=alert(1)>\n````\n')
    })
  })

  describe('denial of service', () => {
    it('parses long style attributes in linear time', () => {
      const started = performance.now()
      const el = parseHTML(`<p style="${'a'.repeat(200_000)}">x</p>`).firstChild as any
      expect(el.style.length).toBe(0)
      expect(performance.now() - started).toBeLessThan(1000)
      expect(parseStyleDeclarations('color: red; background: url(a;b) no-repeat; a: ;b:;c')).toEqual([
        ['color', 'red'],
        ['background', 'url(a;b) no-repeat'],
        ['a', ''],
      ])
    })

    it('serializes Markdown with long runs of whitespace in linear time', () => {
      const started = performance.now()
      serializeMarkdown(parseHTML(`<b>a${' '.repeat(200_000)}b</b><ul><li>${'\n'.repeat(200_000)}x</li></ul>`))
      expect(performance.now() - started).toBeLessThan(1000)
    })

    it('matches descendant selectors against deep trees in polynomial time', () => {
      const started = performance.now()
      const doc = parseHTML(`${'<div>'.repeat(500)}x`)
      expect(doc.querySelectorAll('span div div div div div').length).toBe(0)
      expect(doc.querySelectorAll('div ~ div div div').length).toBe(0)
      expect(doc.querySelectorAll('div div div div div').length).toBe(496)
      expect(performance.now() - started).toBeLessThan(2000)
    })
  })
})
