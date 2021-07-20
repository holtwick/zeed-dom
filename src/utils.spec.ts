// (C)opyright 2021-07-20 Dirk Holtwick, holtwick.it. All rights reserved.

import { removeBodyContainer } from "./utils.js"
import { createHTMLDocument } from "./vdom.js"

describe("Utils", () => {
  it("should remove doc stuff", () => {
    let doc = createHTMLDocument()
    doc.body.appendChild(["Hello ", "world"])
    doc.title = "Hello Title"
    expect(doc.render()).toEqual(
      "<!DOCTYPE html>\n<html><head><title>Hello Title</title></head><body>Hello world</body></html>"
    )

    let body = removeBodyContainer(doc)
    expect(body.render()).toEqual("<title>Hello Title</title>Hello world")
  })
})
