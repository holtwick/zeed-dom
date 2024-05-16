import { serializeSafeHTML } from './serialize-safehtml'
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
                sample
                . &gt; And a link          
                <a href="https://example.com?x=a%20b&amp;y=1" rel="noopener noreferrer" target="_blank">example</a>
                .</p>
              <p>Some &amp; lines          
                <br>          
                line          
                <br>          
                line</p>
              <ol><li>One</li>
                <li>Two</li></ol>
              
                <p>Do nothing</p>"
    `)
  })
})
