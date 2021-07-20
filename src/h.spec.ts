// (C)opyright 2021-07-20 Dirk Holtwick, holtwick.it. All rights reserved.

import { hArgumentParser } from "./h"

describe("h", () => {
  it("should flatten", () => {
    let values = hArgumentParser("div", ["a", ["b", ["c", "d"], "e"]])
    expect(values).toEqual({
      attrs: {},
      children: ["a", "b", "c", "d", "e"],
      tag: "div",
    })
  })

  it("should handle attrs", () => {
    let values = hArgumentParser(
      "div",
      {
        attrs: {
          a: 1,
          b: 2,
        },
        c: 3,
        d: 4,
      },
      "a",
      "b"
    )
    expect(values).toEqual({
      attrs: {
        a: 1,
        b: 2,
        c: 3,
        d: 4,
      },
      children: ["a", "b"],
      tag: "div",
    })
  })
})
