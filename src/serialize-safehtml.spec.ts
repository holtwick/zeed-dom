import { safeHTML, serializeSafeHTML } from './serialize-safehtml'
import { parseHTML } from './vdomparser'

describe('serialize safe html', () => {
  it('should create safe html', () => {
    const document = parseHTML(`
      <html>
      <head>
      <title>Hello World</title>
      </head>
      <body>
        <h1>Hello</h1>
        <p>
          This is a          
          <b>sample</b>
          . &gt; And a link          
          <a href="https://example.com?x=a%20b&y=1" title="Will this be stripped?">example</a>
          .
        </p>
        <p>
          Some & lines          
          <br />          
          line          
          <br />          
          line          
        </p>
        <ol>
          <li>One</li>
          <li>Two</li>
        </ol>
        <pre>
          <p>Do nothing</p>
        </pre>
      </body>
    `)

    expect(document.render()).toMatchInlineSnapshot(`
      "
            <html>
            <head>
            <title>Hello World</title>
            </head>
            <body>
              <h1>Hello</h1>
              <p>
                This is a          
                <b>sample</b>
                . &gt; And a link          
                <a href="https://example.com?x=a%20b&amp;y=1" title="Will this be stripped?">example</a>
                .
              </p>
              <p>
                Some &amp; lines          
                <br>          
                line          
                <br>          
                line          
              </p>
              <ol>
                <li>One</li>
                <li>Two</li>
              </ol>
              <pre>
                <p>Do nothing</p>
              </pre>
            </body>
          </html>"
    `)

    const md = serializeSafeHTML(document)
    expect(md).toMatchInlineSnapshot(`
      "<h1>Hello</h1>
              <p>This is a          
                <b>sample</b>
                . &gt; And a link          
                <a href="https://example.com?x=a%20b&amp;y=1" title="Will this be stripped?" rel="noopener noreferrer" target="_blank">example</a>
                .</p>
              <p>Some &amp; lines          
                <br>          
                line          
                <br>          
                line</p>
              <ol><li>One</li>
                <li>Two</li></ol>
              <pre>
                <p>Do nothing</p>
              </pre>"
    `)
  })

  it('drops <head>, <title> and <style> contents in full <!DOCTYPE> documents', () => {
    const html = `<!DOCTYPE html><html><head><style type="text/css">body { color: red; } p { padding: 2px; }</style><title>Inbox notice</title></head><body><p>Hello</p></body></html>`
    const out = serializeSafeHTML(parseHTML(html))
    expect(out).toBe('<p>Hello</p>')
  })
})

describe('safe html attribute handling', () => {
  it('should keep the validated src of an image with a custom attribute list', () => {
    expect(safeHTML('<img src="a.png" alt="A">', {
      allowedAttrs: {
        a: ['href'],
      },
    })).toBe('<img src="a.png">')
    expect(safeHTML('<img src="javascript:x" alt="A">', {
      allowedAttrs: {
        a: ['href'],
      },
    })).toBe('')
  })

  it('should apply the allow list to links', () => {
    const html = '<a href="https://x.org" title="T" hreflang="de" rel="opener" target="_self">x</a>'
    expect(safeHTML(html)).toBe('<a href="https://x.org" title="T" rel="noopener noreferrer" target="_blank">x</a>')
    expect(safeHTML(html, {
      allowedAttrs: {
        a: ['href'],
      },
    })).toBe('<a href="https://x.org" rel="noopener noreferrer" target="_blank">x</a>')
    expect(safeHTML(html, {
      allowedAttrs: {
        a: ['href', 'hreflang'],
      },
    })).toBe('<a href="https://x.org" hreflang="de" rel="noopener noreferrer" target="_blank">x</a>')
    expect(safeHTML(html, {
      allowedAttrs: {
        a: ['href', 'rel', 'target'],
      },
      linkRel: '',
      linkTarget: '',
    })).toBe('<a href="https://x.org" rel="opener" target="_self">x</a>')
  })

  it('should keep the content of a form', () => {
    expect(safeHTML('<form><p>hello</p></form>')).toBe('<p>hello</p>')
  })
})

describe('safe html fixes', () => {
  it('should serialize a complete document', () => {
    expect(serializeSafeHTML(parseHTML('<!DOCTYPE html><html><head><title>T</title></head><body><p>a <b>b</b></p></body></html>')))
      .toBe('<p>a <b>b</b></p>')
  })

  it('should drop script urls from links and images', () => {
    for (const href of [
      'javascript:alert(1)',
      ' JavaScript:alert(1)',
      'java\tscript:alert(1)',
      'java&#x09;script:alert(1)',
      'javascript&#58;alert(1)',
      'vbscript:x',
      'data:text/html,<script>x</script>',
    ])
      expect(serializeSafeHTML(parseHTML(`<a href="${href}">x</a>`)), href).toBe('x')
    expect(serializeSafeHTML(parseHTML('<img src="javascript:x" alt="a">'))).toBe('')
  })

  it('should keep regular urls as before', () => {
    for (const href of [
      'https://x.org',
      'mailto:a@b.c',
      '/path',
      '#top',
      'other.html',
      'cid:123',
    ])
      expect(serializeSafeHTML(parseHTML(`<a href="${href}">x</a>`))).toBe(`<a href="${href}" rel="noopener noreferrer" target="_blank">x</a>`)
    expect(serializeSafeHTML(parseHTML('<img src="data:image/png;base64,AA==" alt="a">'))).toBe('<img src="data:image/png;base64,AA==" alt="a">')
    expect(serializeSafeHTML(parseHTML('<img src="cid:logo" alt="a">'))).toBe('<img src="cid:logo" alt="a">')
  })
})
