import type { VDocumentFragment, VElement } from './vdom'
import { hArgumentParser } from './h'
import { markup } from './html'
import './jsx-runtime'

export function xml(
  itag: string | ((props: any) => VElement | VDocumentFragment),
  iattrs?: Record<string, unknown> | unknown[] | null,
  ...ichildren: any[]
) {
  const { tag, attrs, children } = hArgumentParser(itag, iattrs, ...ichildren)
  return markup(true, tag as string, attrs, children)
}

// export const xmlVDOM = markup.bind(null, true)

xml.firstLine = '<?xml version="1.0" encoding="utf-8"?>'
xml.xml = true

export const h = xml
