/** @jsx h */

import { hArgumentParser } from './h'
import { CDATA, html as h, markup } from './html'

describe('html', () => {
  it('should generate a string', () => {
    const s = h('a', { href: 'example.com' }, 'Welcome & Hello &amp; Ciao')
    expect(s).toEqual(
      '<a href="example.com">Welcome &amp; Hello &amp;amp; Ciao</a>',
    ) // the second & is correct, because plain string should be unescaped
  })

  it('should nest', () => {
    const s = h('a', { href: 'example.com' }, h('hr'), h('b', {}, 'Welcome'))
    expect(s).toEqual('<a href="example.com"><hr><b>Welcome</b></a>')
  })

  it('should use JSX', () => {
    const spread = {
      title: 'Hello',
      id: 'greeting',
    }
    const s = (
      <a href="example.com" x="x" hidden={false} {...spread}>
        <hr myCaseSensitiveAttribute="1" />
        {false && 'This is invisible'}
        <b>Welcome</b>
      </a>
    )

    expect(s).toEqual(
      '<a href="example.com" x="x" title="Hello" id="greeting"><hr myCaseSensitiveAttribute="1"><b>Welcome</b></a>',
    )
  })

  it('should keep cdata', () => {
    const s = <cdata>{'<b>Do not escape! & </b>'}</cdata>
    expect(s).toMatchInlineSnapshot(`"<![CDATA[<b>Do not escape! & </b>]]>"`)

    const s2 = <div>{CDATA('<b>Do not escape! & </b>')}</div>
    expect(s2).toMatchInlineSnapshot(
      `"<div><![CDATA[<b>Do not escape! & </b>]]></div>"`,
    )
  })

  it('should handle style attribute with various cases', () => {
    // Style with null/undefined values
    expect(
      h('div', { style: { color: 'red', margin: null, padding: undefined } }),
    ).toBe('<div style="color:red"></div>')
    // Style with number (should add px)
    expect(h('div', { style: { width: 10, height: 0 } })).toBe(
      '<div style="width:10px;height:0px"></div>',
    )
    // Style with camelCase (should convert to kebab-case)
    expect(h('div', { style: { backgroundColor: 'blue' } })).toBe(
      '<div style="background-color:blue"></div>',
    )
    // Style with empty object (should not add style)
    expect(h('div', { style: {} })).toBe('<div></div>')
  })

  it('should handle children as arrays, nested arrays, and skip null/false', () => {
    expect(h('div', null, ['a', null, false, h('b', null, 1)])).toBe(
      '<div>a<b>1</b></div>',
    )
  })

  it('should not escape children that are strings starting/ending with < >', () => {
    expect(h('div', null, '<b>raw</b>')).toBe('<div><b>raw</b></div>')
  })

  it('should not escape children for script/style tags', () => {
    expect(h('script', null, 'if (a < b) { alert(1) }')).toBe(
      '<script>if (a < b) { alert(1) }</script>',
    )
    expect(h('style', null, 'body { color: red; }')).toBe(
      '<style>body { color: red; }</style>',
    )
  })

  it('should stringify and escape children that are objects or numbers', () => {
    expect(h('div', null, 123)).toBe('<div>123</div>')
    expect(h('div', null, { toString: () => '<foo>' })).toBe('<div>&lt;foo&gt;</div>')
  })

  it('should handle xmlMode and self-closing tags', () => {
    // xmlMode true, no children
    expect(hArgumentParser('img', { src: 'x.png' })).toBeDefined()
    expect(markup(true, 'img', { src: 'x.png' }, undefined)).toBe('<img src="x.png" />')

    // xmlMode true, with children
    expect(markup(true, 'div', {}, ['foo'])).toBe('<div>foo</div>')

    // xmlMode false, self-closing tag
    expect(markup(false, 'img', { src: 'x.png' }, undefined)).toBe('<img src="x.png">')

    // cdata
    expect(markup(false, 'cdata', {}, 'foo')).toBe('<![CDATA[foo]]>')
  })
})
