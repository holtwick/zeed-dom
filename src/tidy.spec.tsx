// (C)opyright 2021-07-20 Dirk Holtwick, holtwick.it. All rights reserved.

import { tidyDOM } from "./tidy"
import { createHTMLDocument, h } from "./vdom"

// let _keepH = h

describe("Tidy", () => {
  it("should look nicer", () => {
    let document = createHTMLDocument()
    document.head.appendChild(
      <fragment>
        <link rel="alternate" hrefLang="de" href="https://holtwick.de/de/" />
        <meta name="twitter:site" content="@holtwick" />
      </fragment>
    )
    document.body.appendChild(
      <fragment>
        <h1>Hello</h1>
        <p>
          This is a <b>sample</b>. And a link <a href="example">example</a>.
        </p>
        <p>
          Some lines <br /> line <br /> line{" "}
        </p>
        <ol>
          <li>One</li>
          <li>Two</li>
        </ol>
        <pre>
          <p>Do nothing</p>
        </pre>
      </fragment>
    )

    expect(document.render()).toEqual(
      '<!DOCTYPE html>\n<html><head><title></title><link rel="alternate" hrefLang="de" href="https://holtwick.de/de/"><meta name="twitter:site" content="@holtwick"></head><body><h1>Hello</h1><p>This is a <b>sample</b>. And a link <a href="example">example</a>.</p><p>Some lines <br> line <br> line </p><ol><li>One</li><li>Two</li></ol><pre><p>Do nothing</p></pre></body></html>'
    )

    tidyDOM(document)

    expect(document.render()).toEqual(`<!DOCTYPE html>
<html>
  <head>
    <title></title>
    <link rel="alternate" hrefLang="de" href="https://holtwick.de/de/">
    <meta name="twitter:site" content="@holtwick">
  </head>
  <body>
    <h1>
      Hello
    </h1>
    <p>
      This is a <b>sample</b>. And a link <a href="example">example</a>.
    </p>
    <p>
      Some lines <br> line <br> line 
    </p>
    <ol>
      <li>
        One
      </li>
      <li>
        Two
      </li>
    </ol>
<pre><p>Do nothing</p></pre>
  </body>
</html>`)
  })
})
