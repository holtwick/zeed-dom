import { Buffer } from 'node:buffer'
import { VElement, VNode } from './vdom'
import { parseHTML, vdom } from './vdomparser'

describe('vDOM Parser', () => {
  // it('should work with js', () => {
  //   const html = 'Xyz <script type="text/javascript">var foo = \'<<bar>>\';</script>'
  //   let frag = parseHTML(html)
  //   let rhtml = frag.render()
  //   expect(rhtml).toBe('Xyz <script type="text/javascript">var foo = \'<<bar>>\';</script>')
  //   expect(rhtml).toBe(html)
  // })

  it('should respect nested', () => {
    const html = `<!DOCTYPE html>
      <html lang="de">
     <body>
     <div><h1>Test</h1><p>&quot;Lorem <br> <a href="#" style="font-wAIGHT: &amp;bold;;">ipsum</a></p></div>
    <div class="embed-video-container embed-responsive embed-responsive-16by9">
        <iframe src="https://www.youtube.com/embed/TJTsAQguaVE" frameborder="0" allowfullscreen class="embed-responsive-item"></iframe>
    </div>
    <p class="img-wrapper"><img src="/assets/ocr@2x-97ede361.png" alt="" width="621" height="422"></p>
    </body>
    </html>
    `
    const frag = parseHTML(html)
    const rhtml = frag.render()
    // expect(rhtml).toBe('Xyz <script type="text/javascript">var foo = \'<<bar>>\';</script>')
    expect(rhtml).toEqual(html)
  })

  it('should ignore stray end tags for void elements', () => {
    // Real-world (mail) HTML emits closing tags for void elements, e.g.
    // `<meta charset="utf-8"></meta>`. The `</meta>` must pop nothing - meta is
    // never on the open-element stack. A regression here popped real ancestors
    // (head, then html, then the root), orphaning the entire <body>.
    const html = `<!DOCTYPE html><html><head><title>X</title><meta charset="utf-8"></meta><meta http-equiv="Content-Type" content="text/html"></meta></head><body><div>Hello</div></body></html>`
    const frag = parseHTML(html)
    expect(frag.querySelector('body')).not.toBeNull()
    expect(frag.querySelector('div')?.textContent).toBe('Hello')
  })

  it('should ignore an unmatched end tag instead of underflowing the stack', () => {
    // `</span>` has no matching open element; it must not pop the surrounding
    // `<div>` (or the root), which would drop every following sibling.
    const frag = parseHTML(`<div>a</span><p>b</p></div>`)
    const div = frag.querySelector('div')
    expect(div).not.toBeNull()
    expect(div?.querySelector('p')?.textContent).toBe('b')
  })

  it('vdom should handle VNode, Buffer, string, and fallback', () => {
    const node = new VNode()
    expect(vdom(node)).toBe(node)
    const buf = Buffer.from('<div>buf</div>', 'utf-8')
    expect(vdom(buf).render()).toBe('<div>buf</div>')
    expect(vdom('<div>str</div>').render()).toBe('<div>str</div>')
    expect(vdom(null).constructor.name).toBe('VDocumentFragment')
  })

  it('parseHTML should throw on non-string', () => {
    expect(() => parseHTML(123 as any)).toThrow('parseHTML requires string')
  })

  it('vElement.prototype.setInnerHTML should set children', () => {
    const el = new VElement('div')
    el.setInnerHTML('<span>abc</span>')
    expect(el._childNodes.length).toBe(1)
    expect(el._childNodes[0].tagName).toBe('SPAN')
    expect(el._childNodes[0].textContent).toBe('abc')
  })

  it('parseHTML should handle comments', () => {
    const frag = parseHTML('<div><!-- comment --></div>')
    expect(frag._childNodes[0]._childNodes.length).toBe(0) // comment is ignored
  })
  it('innerHTML round-trip never double-escapes entities (issue: &amp;lt; creep)', () => {
    // text with entities nested inside an inline element — the case where the
    // old `render(html)` path escaped the already-escaped children again
    let htmlStr = '<p>a <strong>x &lt;em&gt; y &amp; z</strong> b</p>'
    for (let i = 0; i < 3; i++) {
      const frag = parseHTML(htmlStr)
      expect(frag.innerHTML).toBe(htmlStr)
      const el = frag.children[0]
      expect(`<p>${el.innerHTML}</p>`).toBe(htmlStr)
      htmlStr = frag.innerHTML
    }
  })
})
