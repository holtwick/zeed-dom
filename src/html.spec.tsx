// Copyright (c) 2020 Dirk Holtwick. All rights reserved. https://holtwick.de/copyright
/** @jsx h */

import { html as h, CDATA } from "./html"

describe("HTML", () => {
  it("should generate a string", () => {
    let s = h("a", { href: "example.com" }, "Welcome & Hello &amp; Ciao")
    expect(s).toEqual(
      '<a href="example.com">Welcome &amp; Hello &amp;amp; Ciao</a>'
    ) // the second & is correct, because plain string should be unescaped
  })

  it("should nest", () => {
    let s = h("a", { href: "example.com" }, h("hr"), h("b", {}, "Welcome"))
    expect(s).toEqual('<a href="example.com"><hr><b>Welcome</b></a>')
  })

  it("should use JSX", () => {
    let spread = {
      title: "Hello",
      id: "greeting",
    }
    let s = (
      <a href="example.com" x="x" hidden={false} {...spread}>
        <hr myCaseSensitiveAttribute="1" />
        {null && "This is invisible"}
        <b>Welcome</b>
      </a>
    )

    expect(s).toEqual(
      '<a href="example.com" x="x" title="Hello" id="greeting"><hr myCaseSensitiveAttribute="1"><b>Welcome</b></a>'
    )
  })

  it("should keep cdata", () => {
    let s = <cdata>{"<b>Do not escape! & </b>"}</cdata>
    expect(s).toMatchInlineSnapshot(`"<![CDATA[<b>Do not escape! & </b>]]>"`)

    let s2 = <div>{  CDATA("<b>Do not escape! & </b>") }</div>
    expect(s2).toMatchInlineSnapshot(`"<div><![CDATA[<b>Do not escape! & </b>]]></div>"`)

  })
})
