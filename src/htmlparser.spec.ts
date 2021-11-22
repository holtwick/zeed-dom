import { createHTMLDocument, parseHTML, VHTMLDocument, VTextNode } from "."

describe("htmlparser", () => {
  it("should parse without errors", async () => {
    let dom = parseHTML(sample) as VHTMLDocument
    expect(dom != null).toBe(true)
    expect(dom.render()).toEqual(sample)
    expect(dom.head != null).toBe(true)
  })

  it("should escape correctly", () => {
    let dom = createHTMLDocument()
    dom.body?.appendChild("</")
    dom.body?.appendChild(new VTextNode("</"))
    expect(dom.body?.firstChild?._text).toMatchInlineSnapshot(`"</"`)
    expect(dom.body?.textContent).toMatchInlineSnapshot(`"</</"`)
    expect(dom.body?.innerHTML).toMatchInlineSnapshot(`"&lt;/&lt;/"`)
    expect(dom.body?.outerHTML).toMatchInlineSnapshot(
      `"<body>&lt;/&lt;/</body>"`
    )
    expect(dom.render()).toMatchInlineSnapshot(
      `"<!DOCTYPE html><html><head><title></title></head><body>&lt;/&lt;/</body></html>"`
    )
  })
})

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
