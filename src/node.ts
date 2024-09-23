import type { VHTMLDocument } from './vdom'
import { readFileSync, writeFileSync } from 'node:fs'
import { parseHTML } from './vdomparser'

/** Manipulate HTMl file directly on disk. Only writes back if there were significant changes. */
export function handleHTMLFile(filePath: string, handler: (document: VHTMLDocument) => void, outPath?: string): string {
  const html = readFileSync(filePath, 'utf-8')
  const document = parseHTML(html)
  const htmlIn = document.render()
  handler(document as VHTMLDocument)
  const htmlOut = document.render()
  if (outPath || htmlOut !== htmlIn) {
    writeFileSync(outPath ?? filePath, htmlOut, 'utf-8')
    return htmlOut
  }
  return html
}
