import { describe, expect, it } from 'vitest'
import { isVDocument, isVElement, isVTextElement, VDocument, VDocumentFragment, VElement, VHTMLDocument, VNode, VTextNode } from './vdom'
import { parseHTML } from './vdomparser'

// DOM API surface of the virtual DOM that is not covered by the other specs
describe('vdom api', () => {
  it('should report node names, types and values', () => {
    const frag = parseHTML('<!DOCTYPE html><html><body>x</body></html>') as VDocumentFragment
    expect(frag.nodeName).toBe('#document')
    expect(frag.docType?.nodeType).toBe(VNode.DOCUMENT_TYPE_NODE)
    expect(frag.docType?.render()).toBe('<!DOCTYPE html>')
    expect(new VDocumentFragment().nodeName).toBe('#document-fragment')
    expect(new VElement('div').nodeValue).toBeNull()
    expect(new VTextNode('t').nodeValue).toBe('t')
    expect(String(new VElement('div'))).toBe('DIV')
  })

  it('should provide type guards', () => {
    const el = new VElement('p')
    const text = new VTextNode('x')
    const doc = new VDocument()
    expect([
      isVElement(el),
      isVTextElement(el),
      isVDocument(el),
    ]).toEqual([true, false, false])
    expect([
      isVElement(text),
      isVTextElement(text),
      isVDocument(text),
    ]).toEqual([false, true, false])
    expect([
      isVElement(doc),
      isVTextElement(doc),
      isVDocument(doc),
    ]).toEqual([false, false, true])
  })

  it('should navigate siblings and parents', () => {
    const frag = parseHTML('<div><a>1</a>t<b>2</b></div>')
    const div = frag.querySelector('div')!
    const a = div.querySelector('a')!
    const b = div.querySelector('b')!
    expect(a.nextSibling?.nodeType).toBe(VNode.TEXT_NODE)
    expect(b.nextSibling).toBeNull()
    expect(a.previousSibling).toBeNull()
    expect(b.previousSibling?.textContent).toBe('t')
    expect(a.parentElement).toBe(div)
    expect(div.parentElement).toBeNull()
    expect(div.contains(b)).toBe(true)
    expect(a.contains(b)).toBe(false)
    expect(b.parent('div')).toBe(div)
    expect(b.parent('section')).toBeNull()
  })

  it('should return null siblings for a detached node', () => {
    const el = new VElement('p')
    expect(el.nextSibling).toBeNull()
    expect(el.previousSibling).toBeNull()
  })

  it('should find elements by name', () => {
    const frag = parseHTML('<form><input name="a"><input name="b"><p name="a">x</p></form>')
    expect(frag.getElementsByName('a').map(e => e.tagName)).toEqual(['INPUT', 'P'])
    expect(frag.getElementsByName('c')).toEqual([])
  })

  it('should expose and change attributes', () => {
    const el = new VElement('img')
    el.setAttribute('alt', 'A')
    el.id = 'x'
    el.src = 'a.png'
    expect(el.attributes).toEqual([
      { name: 'alt', value: 'A' },
      { name: 'id', value: 'x' },
      { name: 'src', value: 'a.png' },
    ])
    expect(el.id).toBe('x')
    expect(el.src).toBe('a.png')
    el.id = null
    el.src = null
    expect(el.id).toBeNull()
    expect(el.hasAttribute('src')).toBe(false)
  })

  it('should remove attributes case-insensitively like getAttribute', () => {
    const el = parseHTML('<div Data-X="1" class="c"></div>').querySelector('div')!
    expect(el.getAttribute('data-x')).toBe('1')
    el.removeAttribute('data-x')
    expect(el.hasAttribute('data-x')).toBe(false)
    el.removeAttribute('CLASS')
    expect(el.outerHTML).toBe('<div></div>')
  })

  it('should set className from arrays and objects', () => {
    const el = new VElement('div')
    el.className = ['a', '', 'b']
    expect(el.className).toBe('a b')
    el.className = { c: true, d: false, e: 1 } as any
    expect(el.className).toBe('c e')
    el.classList.add('f')
    el.classList.add('f')
    el.classList.remove('c')
    el.classList.remove('nope')
    expect(el.className).toBe('e f')
  })

  it('should set innerHTML and insert adjacent HTML', () => {
    const frag = parseHTML('<section><p>x</p></section>')
    const p = frag.querySelector('p')!
    p.innerHTML = '<b>y</b>'
    expect(p.outerHTML).toBe('<p><b>y</b></p>')
    p.insertAdjacentHTML('beforebegin', '<i>0</i>')
    p.insertAdjacentHTML('afterbegin', '1')
    p.insertAdjacentHTML('beforeend', '<u>2</u>')
    p.insertAdjacentHTML('afterend', '<s>3</s>')
    expect(frag.render()).toBe('<section><i>0</i><p>1<b>y</b><u>2</u></p><s>3</s></section>')
  })

  it('should ignore beforebegin and afterend on a detached element', () => {
    const el = new VElement('p')
    el.insertAdjacentHTML('beforebegin', 'a')
    el.insertAdjacentHTML('afterend', 'b')
    expect(el.outerHTML).toBe('<p></p>')
  })

  it('should create body and head in an empty document', () => {
    const doc = new VHTMLDocument()
    expect(doc.render()).toBe('<!DOCTYPE html><html><head><title></title></head><body></body></html>')
    expect(doc.body.parentNode).toBe(doc.documentElement)
    const bare = new VHTMLDocument(true)
    const body = bare.body
    expect(body.parentNode?.nodeName).toBe('HTML')
    expect(bare.body).toBe(body)
    const head = bare.head
    expect(head.parentNode).toBe(body.parentNode)
    expect(bare.render()).toBe('<!DOCTYPE html><html><head></head><body></body></html>')
  })

  it('should read and write the document title', () => {
    const doc = new VHTMLDocument()
    expect(doc.title).toBe('')
    doc.title = 'Hello'
    expect(doc.title).toBe('Hello')
    const bare = new VHTMLDocument(true)
    bare.title = 'ignored'
    expect(bare.title).toBe('')
  })

  it('should keep the text of unknown data and refuse to append a node to itself', () => {
    const el = new VElement('div')
    el.appendChild(el)
    el.appendChild(null)
    el.appendChild(42 as any)
    el.appendChild({ a: 1 } as any)
    expect(el.childNodes.length).toBe(2)
    expect(el.textContent).toBe('42{\n  "a": 1\n}')
  })

  it('should find the first match in document order and stop there', () => {
    const doc = parseHTML(`<div id="a"><p id="b"><i class="x" id="c"></i></p><i class="x" id="d"></i></div>${'<p></p>'.repeat(50_000)}`)
    const div = doc.querySelector('div') as VElement
    expect(doc.querySelector('.x')?.id).toBe('c')
    expect(doc.querySelector('div > .x')?.id).toBe('d')
    expect(doc.getElementById('d')?.id).toBe('d')
    expect(div.querySelector('div')).toBe(div) // includes the element itself, as before
    expect(doc.querySelector('span')).toBeUndefined()
    const started = performance.now()
    for (let i = 0; i < 1000; i++)
      doc.querySelector('i')
    // Collected all 50,000 elements per call before
    expect(performance.now() - started).toBeLessThan(200)
  })
})
