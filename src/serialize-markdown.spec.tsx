import { serializeMarkdown } from './serialize-markdown'
import { serializePlaintext } from './serialize-plaintext'
import { createHTMLDocument, h } from './vdom'

const _keepH = h

describe('serialize', () => {
  it('should create plaintext', () => {
    const document = createHTMLDocument()
    document.head?.appendChild(
      <fragment>
        <link rel="alternate" hrefLang="de" href="https://holtwick.de/de/" />
        <meta name="twitter:site" content="@holtwick" />
      </fragment>,
    )
    document.body?.appendChild(
      <fragment>
        <h1>Hello</h1>
        <p>
          This is a
          {' '}
          <b>sample</b>
          . &gt; And a link
          {' '}
          <a href="example">example</a>
          .
        </p>
        <p>
          Some lines
          {' '}
          <br />
          {' '}
          line
          {' '}
          <br />
          {' '}
          line
          {' '}
        </p>
        <ol>
          <li>One</li>
          <li>Two</li>
        </ol>
        <pre>
          <p>Do nothing</p>
        </pre>
      </fragment>,
    )

    const md = serializeMarkdown(document.documentElement)
    expect(md).toMatchInlineSnapshot(`
      "# Hello

      This is a **sample**. > And a link [example](example).

      Some lines 
       line 
       line 

      - One
      - Two

      \`\`\`

      Do nothing

      \`\`\`
      "
    `)

    const txt = serializePlaintext(document.documentElement)
    expect(txt).toMatchInlineSnapshot(`
      "Hello

      This is a sample. > And a link example.

      Some lines 
       line 
       line

      One

      Two

      Do nothing
      "
    `)
  })

  it('should serialize del, ins, span, and table elements', () => {
    // del
    expect(serializeMarkdown(h('del', null, 'strike'))).toBe('~~strike~~\n')
    // ins
    expect(serializeMarkdown(h('ins', null, 'inserted'))).toBe('++inserted++\n')
    // span (should just pass through)
    expect(serializeMarkdown(h('span', null, 'inline'))).toBe('inline\n')
    // table
    expect(serializeMarkdown(h('table', null,
      h('caption', null, 'Title'),
      h('tr', null, h('th', null, 'A'), h('th', null, 'B')),
      h('tr', null, h('td', null, '1'), h('td', null, '2')),
    ))).toContain('| A | B |')
    expect(serializeMarkdown(h('caption', null, 'Cap'))).toContain('Cap')
  })
})
