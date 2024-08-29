import type { VHTMLDocument } from './vdom'
import { VTextNode, createHTMLDocument } from './vdom'
import { parseHTML } from './vdomparser'

describe('htmlparser', () => {
  it('should parse without errors', async () => {
    const sample = `<!DOCTYPE html>
    <html lang="de">
    <head>
    <title>Test</title>
    </head>
    <body>
    <pre><code class="lang-jsx">
      <span class="hljs-tag">&lt;/<span class="hljs-name">a</span>&gt;</span><span class="hljs-tag">&lt;/<span class="hljs-name">li</span>&gt;</span>)}
    </code></pre>
    </body>
    </html>`
    const dom = parseHTML(sample) as VHTMLDocument
    expect(dom != null).toBe(true)
    expect(dom.render()).toEqual(sample)
    expect(dom.head != null).toBe(true)
  })

  it('should escape correctly', () => {
    const dom = createHTMLDocument()
    dom.body?.appendChild('</')
    dom.body?.appendChild(new VTextNode('</'))
    expect(dom.body?.firstChild?._text).toMatchInlineSnapshot(`"</"`)
    expect(dom.body?.textContent).toMatchInlineSnapshot(`"</</"`)
    expect(dom.body?.innerHTML).toMatchInlineSnapshot(`"&lt;/&lt;/"`)
    expect(dom.body?.outerHTML).toMatchInlineSnapshot(
      `"<body>&lt;/&lt;/</body>"`,
    )
    expect(dom.render()).toMatchInlineSnapshot(
      `"<!DOCTYPE html><html><head><title></title></head><body>&lt;/&lt;/</body></html>"`,
    )
  })

  it('should handle entities correctly', () => {
    // https://github.com/holtwick/zeed-dom/issues/3
    const dom = parseHTML('<p>Let&#x27;s go</p>') as VHTMLDocument
    expect(dom.textContent).toMatchInlineSnapshot(`"Let's go"`)
    expect(dom.render()).toMatchInlineSnapshot(`"<p>Let&apos;s go</p>"`)
  })

  it('should ignore escape for script etc.', () => {
    const html = `<script>
var x = 1 & 4
window.addEventListener('load', function () {
if (x<1)
  $('body')
    .attr('data-spy', 'scroll')
    .attr('data-offset', '88')
    .attr('data-target', '#outline')
})
</script>`
    const dom = parseHTML(html) as VHTMLDocument
    expect(dom.textContent).toMatchInlineSnapshot(`
      "
      var x = 1 & 4
      window.addEventListener('load', function () {
      if (x<1)
        $('body')
          .attr('data-spy', 'scroll')
          .attr('data-offset', '88')
          .attr('data-target', '#outline')
      })
      "
    `)
    expect(dom).toMatchInlineSnapshot(`
      VDocumentFragment {
        "_childNodes": [
          VElement {
            "_attributes": {},
            "_childNodes": [
              VTextNode {
                "_childNodes": [],
                "_parentNode": [Circular],
                "_text": "
      var x = 1 & 4
      window.addEventListener('load', function () {
      if (x<1)
        $('body')
          .attr('data-spy', 'scroll')
          .attr('data-offset', '88')
          .attr('data-target', '#outline')
      })
      ",
                "append": [Function],
              },
            ],
            "_nodeName": "SCRIPT",
            "_originalTagName": "script",
            "_parentNode": [Circular],
            "_styles": null,
            "append": [Function],
          },
        ],
        "_parentNode": null,
        "append": [Function],
      }
    `)
    expect(dom.render()).toMatchInlineSnapshot(`
      "<script>
      var x = 1 & 4
      window.addEventListener('load', function () {
      if (x<1)
        $('body')
          .attr('data-spy', 'scroll')
          .attr('data-offset', '88')
          .attr('data-target', '#outline')
      })
      </script>"
    `)
  })

  it('should not recurse on bad fragment', () => {
    const tests = [
      '<',
      '<<',
      '<<<',
      '<<div',
      '<div<div',
      '>',
      '>>',
      '>>>',
      '>>div',
      '>div>div',
    ]

    for (const t of tests) {
      const { textContent: text } = parseHTML(t) as VHTMLDocument
      expect(text).toEqual(t)
    }
  })
})
