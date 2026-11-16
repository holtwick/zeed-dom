import { describe, expect, it } from 'vitest'
import { Fragment, jsx, jsxDEV, jsxs } from './jsx-runtime'

// Calls as emitted by TypeScript / esbuild with `"jsx": "react-jsx"`
describe('jsx-runtime', () => {
  it('should take children from props', () => {
    expect(jsx('div', { id: 'x', children: 'hi' })).toBe('<div id="x">hi</div>')
  })

  it('should render multiple and nested children', () => {
    const html = jsxs('ul', {
      className: 'list',
      children: [
        jsx('li', { children: 'a' }),
        jsx('li', { children: ['b', ' & ', jsx('b', { children: 'c' })] }),
        ['d', 'e'].map(s => jsx('li', { children: s }, s)),
      ],
    })
    expect(html).toBe('<ul class="list"><li>a</li><li>b &amp; <b>c</b></li><li>d</li><li>e</li></ul>')
  })

  it('should render elements without children', () => {
    expect(jsx('br', {})).toBe('<br>')
    expect(jsx('span', { title: 'x' })).toBe('<span title="x"></span>')
    expect(jsxDEV('p', null)).toBe('<p></p>')
  })

  it('should render fragments as their children only', () => {
    expect(jsxs(Fragment, { children: [jsx('i', { children: '1' }), '2'] })).toBe('<i>1</i>2')
  })
})
