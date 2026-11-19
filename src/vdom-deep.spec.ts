import { describe, expect, it } from 'vitest'
import { serializeMarkdown } from './serialize-markdown'
import { serializePlaintext } from './serialize-plaintext'
import { serializeSafeHTML } from './serialize-safehtml'
import { VDocumentFragment, VElement } from './vdom'
import { MAX_PARSE_DEPTH, parseHTML } from './vdomparser'

function depth(node: any) {
  let n = 0
  while (node.firstElementChild) {
    node = node.firstElementChild
    n++
  }
  return n
}

// Recursion over the tree overflowed the call stack at a few thousand levels
describe('deeply nested trees', () => {
  it('handles deep trees built in code without recursion', () => {
    const count = 20_000
    const root = new VDocumentFragment()
    root.appendChild(new VElement('div'))
    let node: VElement = root.firstChild
    for (let i = 0; i < count; i++) {
      const child = new VElement(i % 2
        ? 'b'
        : 'i')
      node.appendChild(child)
      node = child
    }
    node.appendChild('x<')

    const html = root.render()
    expect(html.length).toBe('<div></div>'.length + count * '<b></b>'.length + 'x&lt;'.length)
    expect(html.startsWith('<div><i><b><i>')).toBe(true)
    expect(html).toContain('<i><b>x&lt;</b></i>')
    expect(html.endsWith('</b></i></div>')).toBe(true)
    expect((root.firstChild as VElement).outerHTML).toBe(html)
    expect(root.textContent).toBe('x<')
    expect(root.flatten().length).toBe(count + 1)
    expect(root.querySelector('span')).toBeUndefined()
    expect(root.querySelectorAll('b').length).toBe(count / 2)
    expect(root.contains(node)).toBe(true)
    expect(node.contains(root)).toBe(false)
    expect(node.ownerDocument).toBe(root)
    expect(node.parent('div')).toBe(root.firstChild)
    const clone = root.cloneNode(true)
    expect(clone.render()).toBe(html)
    expect(clone.contains(node)).toBe(false)
  })

  it('limits the nesting depth when parsing, like browsers', () => {
    const doc = parseHTML(`${'<b>'.repeat(20_000)}x${'</b>'.repeat(20_000)}<p>after</p>`)
    expect(depth(doc)).toBe(MAX_PARSE_DEPTH)
    expect(doc.textContent).toBe('xafter')
    expect(doc.lastChild.outerHTML).toBe('<p>after</p>')
    // The recursive serializers stay within the call stack
    expect(serializePlaintext(doc)).toBe('x\n\nafter\n')
    expect(serializeMarkdown(doc)).toContain('after')
    expect(serializeSafeHTML(doc)).toContain('<p>after</p>')
  })

  it('keeps nesting up to the limit', () => {
    const doc = parseHTML(`${'<i>'.repeat(MAX_PARSE_DEPTH)}x`)
    expect(depth(doc)).toBe(MAX_PARSE_DEPTH)
    expect(doc.render()).toBe(`${'<i>'.repeat(MAX_PARSE_DEPTH)}x${'</i>'.repeat(MAX_PARSE_DEPTH)}`)
  })
})
