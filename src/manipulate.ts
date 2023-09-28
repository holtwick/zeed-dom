import type { VDocumentFragment, VHTMLDocument } from './vdom'
import { parseHTML } from './vdomparser'

export function handleHTML(html: string, handler: (document: VHTMLDocument | VDocumentFragment) => void) {
  const document = parseHTML(html)
  handler(document)
  return document.render()
}
