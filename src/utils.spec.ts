// (C)opyright 2021-07-20 Dirk Holtwick, holtwick.it. All rights reserved.

import { removeBodyContainer } from "./utils"
import { createHTMLDocument } from "./vdom"

describe("Utils", () => {
  it("should remove doc stuff", () => {
    let doc = createHTMLDocument()
    doc.body?.appendChild(["Hello ", "world"])
    doc.title = "Hello Title"
    expect(doc.render()).toMatchInlineSnapshot(
      `"<!DOCTYPE html><html><head><title>Hello Title</title></head><body>Hello world</body></html>"`
    )

    let body = removeBodyContainer(doc)
    expect(body.render()).toMatchInlineSnapshot(
      `"<title>Hello Title</title>Hello world"`
    )
  })
})
