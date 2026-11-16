import { describe, expect, it } from 'vitest'
import { parseHTML } from './vdomparser'

const doc = parseHTML(`
<div id="root" class="box main">
  <h1 lang="en-US" title="big title">T</h1>
  <p class="a">1</p>
  <p class="b" data-x="foo-bar">2</p>
  <span>3</span>
  <ul><li>i1</li><li>i2</li><li>i3</li><li>i4</li><li>i5</li><li>i6</li><li>i7</li><li>i8</li><li>i9</li><li>i10</li><li>i11</li><li>i12</li></ul>
</div>
`)

const texts = (selector: string) => doc.querySelectorAll(selector).map(e => e.textContent)

describe('css selectors', () => {
  it('should match attribute operators', () => {
    expect(texts('[data-x^="foo"]')).toEqual(['2'])
    expect(texts('[data-x$="bar"]')).toEqual(['2'])
    expect(texts('[data-x*="o-b"]')).toEqual(['2'])
    expect(texts('[lang|="en"]')).toEqual(['T'])
    expect(texts('[lang|="e"]')).toEqual([])
    expect(texts('[title]')).toEqual(['T'])
    expect(texts('[data-x="nope"]')).toEqual([])
  })

  it('should match ~= as substring, except for class', () => {
    // Deliberately not CSS (whole word), existing users rely on it, see vcss.spec
    expect(texts('[title~="big"]')).toEqual(['T'])
    expect(texts('[title~="bi"]')).toEqual(['T'])
    expect(doc.querySelectorAll('[class~="box"]').length).toBe(1)
    expect(doc.querySelectorAll('[class~="bo"]').length).toBe(0)
  })

  it('should match sibling combinators', () => {
    expect(texts('p.a + p')).toEqual(['2'])
    expect(texts('h1 + p')).toEqual(['1'])
    expect(texts('h1 ~ span')).toEqual(['3'])
    expect(texts('span ~ p')).toEqual([])
  })

  it('should match the universal selector and child combinator', () => {
    expect(texts('#root > *').length).toBe(5)
    expect(texts('ul > *').length).toBe(12)
  })

  it('should match structural pseudo classes', () => {
    expect(texts('li:first-child')).toEqual(['i1'])
    expect(texts('li:last-child')).toEqual(['i12'])
    expect(texts('li:nth-child(2)')).toEqual(['i2'])
    expect(texts('li:nth-child(12)')).toEqual(['i12'])
    expect(texts('p:not(.a)')).toEqual(['2'])
  })

  it('should not match unsupported pseudo classes', () => {
    expect(texts('p:hover')).toEqual([])
  })
})
