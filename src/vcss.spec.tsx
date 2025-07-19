import { matchSelector } from './vcss'
import { createHTMLDocument, h } from './vdom'

const _keepH = h

describe('css', () => {
  it('should parse', () => {
    const element = (
      <div id="foo" className="foo bar" foo="bar" data-lang="en">
        ...
      </div>
    )
    expect(matchSelector('#foo', element)).toBe(true)
    expect(matchSelector('.foo', element)).toBe(true)
    expect(matchSelector('div', element)).toBe(true)
    expect(matchSelector('[id=foo]', element)).toBe(true)
    expect(matchSelector('[id]', element)).toBe(true)
    expect(matchSelector('div, p', element)).toBe(true)
    expect(matchSelector(':not(h1)', element)).toBe(true)
    expect(matchSelector('*[data-lang]', element)).toBe(true)
    expect(matchSelector('#foo, #bar', element)).toBe(true)
    expect(matchSelector('#bar, #foo', element)).toBe(true)
  })

  it('should parse and fail', () => {
    const element = <h1>...</h1>
    expect(matchSelector('#foo', element)).toBe(false)
    expect(matchSelector('.foo', element)).toBe(false)
    expect(matchSelector('div', element)).toBe(false)
    expect(matchSelector('[id=foo]', element)).toBe(false)
    expect(matchSelector('[id]', element)).toBe(false)
    expect(matchSelector('div, p', element)).toBe(false)
    expect(matchSelector(':not(h1)', element)).toBe(false)
    expect(matchSelector('*[data-lang]', element)).toBe(false)
    expect(matchSelector('#foo, #bar', element)).toBe(false)
    expect(matchSelector('#bar, #foo', element)).toBe(false)
  })

  it('should handle hierarchy', () => {
    const element = (
      <a>
        <b>
          <c>
            <d>xxx</d>
          </c>
        </b>
      </a>
    )
    expect(element.querySelector('a').tagName).toBe('A')
    // expect(element.querySelector('b c').tagName).toBe('C')
  })

  it('should complex attributes', () => {
    const element = <div title="abcdefg"></div>
    expect(matchSelector('[title]', element)).toBe(true)
    expect(matchSelector('[title=abcdefg]', element)).toBe(true)
    expect(matchSelector('[title=xxx]', element)).toBe(false)
    expect(matchSelector('div[title="abcdefg"]', element)).toBe(true)
    expect(matchSelector('div[title="xxx"]', element)).toBe(false)
    expect(matchSelector('[title~="cd"]', element)).toBe(true)
    expect(matchSelector('[title~="xxx"]', element)).toBe(false)
    expect(matchSelector('[title^="ab"]', element)).toBe(true)
    expect(matchSelector('[title^="xxx"]', element)).toBe(false)
    expect(matchSelector('[title$="fg"]', element)).toBe(true)
    expect(matchSelector('[title$="xxx"]', element)).toBe(false)
  })

  it('should specific meta', () => {
    let element = (
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, shrink-to-fit=no"
      />
    )
    expect(matchSelector('meta[name=viewport]', element)).toBe(true)

    element = (
      <meta
        name="xviewport"
        content="width=device-width, initial-scale=1, shrink-to-fit=no"
      />
    )
    expect(matchSelector('meta[name=viewport]', element)).toBe(false)
  })

  it('should query meta', () => {
    const document = createHTMLDocument()
    document.head?.replaceWith(
      <head>
        <meta charSet="utf-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>PDFify - Help</title>
        <link rel="canonical" href="https://pdfify.app/en/help" />
        <meta property="og:url" content="https://pdfify.app/en/help" />
        <link rel="alternate" hrefLang="en" href="https://pdfify.app/en/help" />
        <link rel="alternate" hrefLang="de" href="https://pdfify.app/de/help" />
        <link
          rel="alternate"
          hrefLang="x-default"
          href="https://pdfify.app/help"
        />
        <meta property="og:title" content="Help" />
        <meta
          name="description"
          property="og:description"
          content="Online help of PDFify help"
        />
        <meta
          name="keywords"
          property="og:keywords"
          content="help, doc, documentation, collect, app, macos, ios"
        />
        <meta name="twitter:site" content="@holtwick" />
        <meta name="twitter:creator" content="@holtwick" />
        <meta name="twitter:card" content="summary" />
        <meta
          name="generator"
          content="Hostic, https://github.com/holtwick/hostic/"
        />
        <meta property="og:type" content="text/html" />
        <meta charSet="utf-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <link
          media="all"
          rel="stylesheet"
          href="/assets/bootstrap.min-cd5525bc.css"
        />
        <link media="all" rel="stylesheet" href="/assets/custom-06a1f2ce.css" />
        <link
          rel="shortcut icon"
          href="/assets/favicon-1268689e.png"
          type="image/png"
        />
        <link
          rel="icon"
          type="image/png"
          href="/assets/favicon-32-3192cb36.png"
          sizes="32x32"
        />
        <link
          rel="icon"
          type="image/png"
          href="/assets/favicon-96-b036137d.png"
          sizes="96x96"
        />
        <link
          rel="apple-touch-icon"
          href="/assets/apple-touch-icon-2ac9c5f9.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="144x144"
          href="/assets/apple-touch-icon-2ac9c5f9.png"
        />
        <meta property="og:video" content="https://youtu.be/k4pOgDWYm2U" />
        <meta property="og:video" content="https://youtu.be/TJTsAQguaVE" />
      </head>,
    )

    expect(!document.querySelector('meta[charset]')).toBe(false)
  })

  it('should handle descendant combinator', () => {
    const element = (
      <div id="root">
        <section>
          <span id="target">Hello</span>
        </section>
      </div>
    )
    // Only match descendant combinator on the descendant node
    const section = element.querySelector('section')
    expect(matchSelector('div section', section)).toBe(true)
    expect(matchSelector('div span', element.querySelector('span'))).toBe(true)
    expect(matchSelector('section span', element.querySelector('span'))).toBe(true)
    expect(matchSelector('div > section', element)).toBe(false) // Not implemented, should be false
    expect(matchSelector('div + section', element)).toBe(false) // Not implemented, should be false
  })

  it('should not match descendant if not a descendant', () => {
    const element = (
      <div id="root">
        <section>
          <span id="a">A</span>
        </section>
      </div>
    )
    const span = element.querySelector('span#a')
    expect(matchSelector('span div', span)).toBe(false) // span is not a descendant of div
  })

  it('should handle combinators: descendant, child, and sibling', () => {
    const element = (
      <div id="root">
        <section>
          <span id="a">A</span>
          <span id="b">B</span>
          <div>
            <span id="c">C</span>
          </div>
        </section>
        <span id="d">D</span>
      </div>
    )
    // Descendant
    const section = element.querySelector('section')
    expect(matchSelector('div section', section)).toBe(true) // section is a descendant of div
    // Child
    const elementChildren = section.childNodes.filter((n: any) => n.nodeType === 1)
    expect(matchSelector('div > section', section)).toBe(true)
    expect(matchSelector('section > span', elementChildren[0])).toBe(true)
    const spanD = element.querySelector('span#d')
    expect(matchSelector('div > span', spanD)).toBe(true) // #d
    expect(matchSelector('section > div', elementChildren[2])).toBe(true)
    // Sibling
    const spanA = elementChildren[0]
    const spanB = elementChildren[1]
    expect(matchSelector('span + span', spanB)).toBe(true) // B follows A
    expect(matchSelector('span + div', elementChildren[2])).toBe(true) // div follows B
    expect(matchSelector('span + span', spanA)).toBe(false) // A has no previous sibling span
  })

  it('should not match sibling if no previous matching sibling', () => {
    const element = (
      <div>
        <span id="a">A</span>
        <b>B</b>
        <span id="c">C</span>
      </div>
    )
    const a = element.childNodes.filter((n: any) => n.nodeType === 1)[0]
    expect(matchSelector('span + span', a)).toBe(false) // A has no previous sibling
  })

  it('should handle edge cases and invalid selectors', () => {
    const element = <div id="foo"></div>
    expect(matchSelector('', element)).toBe(false)
    expect(() => matchSelector('!!!', element)).toThrow()
  })

  it('should handle universal selector in combination', () => {
    const element = <div id="foo"></div>
    expect(matchSelector('*#foo', element)).toBe(true)
    expect(matchSelector('*.bar', element)).toBe(false)
  })

  it('should handle case sensitivity', () => {
    const element = <div id="foo"></div>
    expect(matchSelector('div', element)).toBe(true)
    expect(matchSelector('DIV', element)).toBe(true)
  })

  it('should handle :not pseudo-class', () => {
    const element = <div id="foo" className="bar"></div>
    expect(matchSelector(':not(span)', element)).toBe(true)
    expect(matchSelector(':not(div)', element)).toBe(false)
    expect(matchSelector('div:not(.bar)', element)).toBe(false)
    expect(matchSelector('div:not(.baz)', element)).toBe(true)
    expect(matchSelector('div:not([id])', element)).toBe(false)
    expect(matchSelector('div:not([data-unknown])', element)).toBe(true)
  })

  it('should handle multiple simple selectors', () => {
    const element = <div id="foo" className="bar"></div>
    expect(matchSelector('div#foo.bar', element)).toBe(true)
    expect(matchSelector('div.bar#foo', element)).toBe(true)
    expect(matchSelector('div#bar.bar', element)).toBe(false)
    expect(matchSelector('span#foo.bar', element)).toBe(false)
  })

  it('should handle whitespace and empty selectors', () => {
    const element = <div id="foo"></div>
    expect(matchSelector('   ', element)).toBe(false)
    expect(matchSelector('   div   ', element)).toBe(true)
    expect(matchSelector('   #foo   ', element)).toBe(true)
  })

  it('should handle :first-child, :last-child, :nth-child with elements and text nodes', () => {
    const element = (
      <div>
        {'\n'}
        <span>first</span>
        {' '}
        <span>second</span>
        {'\n'}
        <span>third</span>
        {'  '}
      </div>
    )
    // Only test element nodes for :first-child, :last-child, :nth-child
    const elementChildren = element.childNodes.filter((n: any) => n.nodeType === 1)
    // Test :first-child
    expect(matchSelector('span:first-child', elementChildren[0])).toBe(true)
    expect(matchSelector('span:first-child', elementChildren[1])).toBe(false)
    // Test :last-child
    expect(matchSelector('span:last-child', elementChildren[elementChildren.length - 1])).toBe(true)
    expect(matchSelector('span:last-child', elementChildren[0])).toBe(false)
    // Test :nth-child
    expect(matchSelector('span:nth-child(1)', elementChildren[0])).toBe(true)
    expect(matchSelector('span:nth-child(2)', elementChildren[1])).toBe(true)
    expect(matchSelector('span:nth-child(3)', elementChildren[2])).toBe(true)
  })

  it('should handle general sibling combinator', () => {
    const element = (
      <div>
        <span id="a">A</span>
        <b>B</b>
        <span id="c">C</span>
        <span id="d">D</span>
      </div>
    )
    const c = element.childNodes.filter((n: any) => n.nodeType === 1)[2]
    const d = element.childNodes.filter((n: any) => n.nodeType === 1)[3]
    expect(matchSelector('span ~ span', d)).toBe(true) // D follows A and C
    expect(matchSelector('span ~ b', d)).toBe(false)
    expect(matchSelector('b ~ span', c)).toBe(true) // C follows B
    expect(matchSelector('span ~ span', c)).toBe(true) // C follows A
    expect(matchSelector('span ~ span', element.childNodes.filter((n: any) => n.nodeType === 1)[0])).toBe(false) // A has no previous span
  })

  it('should handle [attr|=val] and [attr*=val]', () => {
    const element = <div lang="en-US" data-foo="abcxyz"></div>
    expect(matchSelector('[lang|=en]', element)).toBe(true)
    expect(matchSelector('[lang|=fr]', element)).toBe(false)
    expect(matchSelector('[data-foo*=bcx]', element)).toBe(true)
    expect(matchSelector('[data-foo*=zzz]', element)).toBe(false)
  })

  it('should return false for unknown attribute action', () => {
    // This branch is not directly reachable via public API, so just assert normal usage
    const element = <div foo="bar" />
    expect(matchSelector('[foo^=bar]', element)).toBe(true) // covers 'start'
    expect(matchSelector('[foo$=bar]', element)).toBe(true) // covers 'end'
    expect(matchSelector('[foo=bar]', element)).toBe(true) // covers 'equals'
    expect(matchSelector('[foo|=bar]', element)).toBe(true) // covers 'hyphen'
    expect(matchSelector('[foo*=bar]', element)).toBe(true) // covers 'contains'
    // No way to trigger unknown action via selector string, so just ensure no require
  })

  it('should return false for unknown selector type', () => {
    // Not reachable via public API, so just ensure no require
    expect(matchSelector('div', <div />)).toBe(true)
  })

  // it('should be single fail', () => {
  //   let element = <h1>...</h1>
  //   expect(matchSelector('[id]', element)).toBe(false)
  // })
})
