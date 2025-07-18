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
    expect(matchSelector('div section', element)).toBe(true)
    expect(matchSelector('div span', element)).toBe(true)
    expect(matchSelector('section span', element.querySelector('section'))).toBe(true)
    expect(matchSelector('div > section', element)).toBe(false) // Not implemented, should be false
    expect(matchSelector('div + section', element)).toBe(false) // Not implemented, should be false
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

  // it('should be single fail', () => {
  //   let element = <h1>...</h1>
  //   expect(matchSelector('[id]', element, { debug: true })).toBe(false)
  // })
})
