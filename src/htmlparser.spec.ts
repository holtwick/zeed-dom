import type { VHTMLDocument } from './vdom'
import { createHTMLDocument, VTextNode } from './vdom'
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

  it('should handle inline base64', () => {
    // https://github.com/holtwick/zeed-dom/issues/12

    const dom = parseHTML(`<div
id="elem"
style="
width: 200px;
background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyNy41LjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHZpZXdCb3g9IjAgMCAzMTQ3IDIwMDAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDMxNDcgMjAwMDsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGc);
height: 100px;">Test</div>`) as VHTMLDocument
    const node = dom.querySelector('#elem')
    expect(node).not.toBeNull()
    expect(node?.style.length).toEqual(3)
    expect(node?.style.getPropertyValue('width')).toEqual('200px')
    expect(node?.style).toMatchInlineSnapshot(`
      {
        "background-image": "url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyNy41LjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHZpZXdCb3g9IjAgMCAzMTQ3IDIwMDAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDMxNDcgMjAwMDsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGc)",
        "backgroundImage": "url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyNy41LjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHZpZXdCb3g9IjAgMCAzMTQ3IDIwMDAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDMxNDcgMjAwMDsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGc)",
        "getPropertyValue": [Function],
        "height": "100px",
        "length": 3,
        "width": "200px",
      }
    `)
  })

  it('should handle dataset', () => {
    const dom = parseHTML(`<div id="elem" data-id="123" data-feel-good="yeah">Test</div>`) as VHTMLDocument
    const node = dom.querySelector('#elem')
    expect(node).not.toBeNull()
    expect(node?.dataset).toMatchInlineSnapshot(`
      {
        "feel-good": "yeah",
        "feelGood": "yeah",
        "id": "123",
      }
    `)
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
                "_index": 0,
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
            "_index": 0,
            "_nodeName": "SCRIPT",
            "_originalTagName": "script",
            "_parentNode": [Circular],
            "append": [Function],
          },
        ],
        "_index": -1,
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

  it('should not take a later line for a tag that does not parse', () => {
    // The regular expressions had the `m` flag, so `^` matched at any line
    expect(parseHTML('< x\n<b>y</b>').render()).toBe('&lt; x\n<b>y</b>')
    expect(parseHTML('a </ x\n</b>c').render()).toBe('a &lt;/ x\nc')
    expect(parseHTML('<p>A:<</p>\n<!-- x -->').render()).toBe('<p>A:&lt;</p>\n')
  })

  it('should parse attributes', () => {
    const attrs = (html: string) => (parseHTML(html).firstChild as any)._attributes
    expect(attrs('<a b c=1 d="2" e=\'3\' f = "4">')).toEqual({
      b: true,
      c: '1',
      d: '2',
      e: '3',
      f: '4',
    })
    expect(attrs('<a title="x > y" alt=\'"\'>')).toEqual({ title: 'x > y', alt: '"' })
    expect(attrs('<a href=>')).toEqual({ href: true })
    expect(attrs('<a path=a/b/c>')).toEqual({ path: 'a/b/c' })
    expect(attrs('<a\nb\n=\n"1"\n>')).toEqual({ b: '1' })
    expect(parseHTML('<img src=x/><br/><br /><hr b/><p>t</p>').render()).toBe('<img src="x/"><br><br><hr b><p>t</p>')
    // Like in browsers, the slash belongs to an unquoted value
    expect(parseHTML('<a href=http://x.com/>link</a>after').render()).toBe('<a href="http://x.com/">link</a>after')
    expect(parseHTML('x<!-->a<!--->b<!---->c').render()).toBe('xabc')
    expect(parseHTML('a<3 b').render()).toBe('a&lt;3 b')
    expect(parseHTML('<b><i>x</B>y</i></b>z').render()).toBe('<b><i>x</i></b>yz')
    expect(parseHTML('a<!-- b<!-- c').render()).toBe('a&lt;!-- b&lt;!-- c')
    // A quote that is never closed ends at the next `>`
    expect(parseHTML('<p>x<a href="y</p>').render()).toBe('<p>x<a href="y&lt;/p"></a></p>')
    expect(parseHTML('<p title="x>a</p><p>b</p>').render()).toBe('<p title="x">a</p><p>b</p>')
    expect(parseHTML('<p title=\'x>a</p><p>b</p>').render()).toBe('<p title="x">a</p><p>b</p>')
    // Without any `>` the rest is text
    expect(parseHTML('a<p title="x').render()).toBe('a&lt;p title=&quot;x')
  })

  it('should parse pathological input in linear time', () => {
    const cases = [
      '<a\n'.repeat(20_000),
      '<a href="x '.repeat(20_000),
      '<a b=1 '.repeat(20_000),
      '</a'.repeat(20_000),
      '< x\n<b>'.repeat(20_000),
      'x<!-- '.repeat(20_000),
      `${'<b>'.repeat(20_000)}${'</x>'.repeat(20_000)}`,
      '<script>'.repeat(40_000),
      '<style>'.repeat(40_000),
      '<a title="x>'.repeat(20_000),
      '<a title=\'x>'.repeat(20_000),
    ]
    for (const html of cases) {
      const started = performance.now()
      parseHTML(html)
      // Backtracking regular expressions took seconds to minutes here
      expect(performance.now() - started).toBeLessThan(500)
    }
  })
})
