// (C)opyright 2021-07-20 Dirk Holtwick, holtwick.it. All rights reserved.

import { hArgumentParser } from "./h.js"
import { markup } from "./html.js"

export function xml(itag: string, iattrs?: object, ...ichildren: any[]) {
  let { tag, attrs, children } = hArgumentParser(itag, iattrs, ichildren)
  return markup(true, tag, attrs, children)
}

xml.firstLine = '<?xml version="1.0" encoding="utf-8"?>'
xml.xml = true

export let h = xml
