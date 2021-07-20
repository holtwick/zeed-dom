// Copyright (c) 2020 Dirk Holtwick. All rights reserved. https://holtwick.de/copyright
/** @jsx h */

import { html as h } from "./html"

describe("HTML", () => {
  it("should generate a string", () => {
    let s = h("a", { href: "example.com" }, "Welcome")
    expect(s).toEqual('<a href="example.com">Welcome</a>')
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
})
