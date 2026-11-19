import { describe, expect, it } from 'vitest'
import { VElement, VTextNode } from './vdom'
import { parseHTML } from './vdomparser'

function names(parent: VElement) {
  const out: string[] = []
  for (let n = parent.firstChild; n; n = n.nextSibling)
    out.push(n.textContent)
  return out
}

function namesBackwards(parent: VElement) {
  const out: string[] = []
  for (let n = parent.lastChild; n; n = n.previousSibling)
    out.push(n.textContent)
  return out.reverse()
}

function el(text: string) {
  const e = new VElement('p')
  e.appendChild(text)
  return e
}

// https://github.com/holtwick/zeed-dom/issues/18
describe('sibling navigation and child mutations', () => {
  it('keeps siblings and parents correct across mutations', () => {
    const parent = new VElement('div')
    const a = el('a')
    const b = el('b')
    const c = el('c')
    parent.appendChild([a, b, c])
    parent.appendChild('t')
    expect(names(parent)).toEqual(['a', 'b', 'c', 't'])
    expect(parent.lastChild).toBeInstanceOf(VTextNode)
    expect(parent.lastChild.parentNode).toBe(parent)

    const x = el('x')
    parent.insertBefore(x, b)
    expect(names(parent)).toEqual(['a', 'x', 'b', 'c', 't'])
    expect(c.previousSibling).toBe(b)
    expect(b.previousSibling).toBe(x)

    parent.removeChild(x)
    expect(x.parentNode).toBeNull()
    expect(x.nextSibling).toBeNull()
    expect(a.nextSibling).toBe(b)
    expect(namesBackwards(parent)).toEqual(['a', 'b', 'c', 't'])

    // Re-appending an existing child moves it to the end
    parent.appendChild(a)
    expect(names(parent)).toEqual(['b', 'c', 't', 'a'])
    expect(a.previousSibling?.textContent).toBe('t')
    expect(b.previousSibling).toBeNull()

    const y = el('y')
    const z = el('z')
    c.replaceWith(y, z)
    expect(c.parentNode).toBeNull()
    expect(names(parent)).toEqual(['b', 'y', 'z', 't', 'a'])
    expect(z.nextSibling?.textContent).toBe('t')

    parent.replaceChildren(c, 'u', b)
    expect(names(parent)).toEqual(['c', 'u', 'b'])
    expect(namesBackwards(parent)).toEqual(['c', 'u', 'b'])
  })

  it('moves a node from one parent to another', () => {
    const p1 = new VElement('div')
    const p2 = new VElement('div')
    const a = el('a')
    const b = el('b')
    p1.appendChild([a, b])
    p2.appendChild(el('c'))
    p2.appendChild(a)
    expect(a.parentNode).toBe(p2)
    expect(names(p1)).toEqual(['b'])
    expect(names(p2)).toEqual(['c', 'a'])
    expect(b.previousSibling).toBeNull()
  })

  it('handles siblings after insertAdjacentHTML and innerHTML', () => {
    const parent = new VElement('div')
    const b = el('b')
    parent.appendChild(b)
    b.insertAdjacentHTML('beforebegin', '<p>a</p>')
    b.insertAdjacentHTML('afterend', '<p>c</p>')
    expect(names(parent)).toEqual(['a', 'b', 'c'])
    expect(namesBackwards(parent)).toEqual(['a', 'b', 'c'])
    parent.innerHTML = '<p>1</p><p>2</p>'
    expect(names(parent)).toEqual(['1', '2'])
    expect(b.parentNode).toBe(parent) // as before: old children keep their stale parent
    expect(b.nextSibling).toBeNull()
  })

  it('builds, walks and parses large parents in linear time', () => {
    const count = 100_000
    const started = performance.now()
    const parent = new VElement('div')
    for (let i = 0; i < count; i++)
      parent.appendChild(new VElement('p'))
    let n = 0
    for (let node = parent.firstChild; node; node = node.nextSibling)
      n++
    for (let node = parent.lastChild; node; node = node.previousSibling)
      n++
    const frag = parseHTML('<p></p>'.repeat(count))
    expect(n).toBe(2 * count)
    expect(frag.childNodes.length).toBe(count)
    // Quadratic behaviour took many seconds here
    expect(performance.now() - started).toBeLessThan(2000)
  })
})
