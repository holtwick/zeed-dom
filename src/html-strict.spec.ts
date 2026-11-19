import { html } from './html'
import { htmlStrict as h, HTMLString, raw } from './html-strict'
import { Fragment, jsx, jsxs } from './jsx-runtime-strict'

const evil = '<img src=x onerror=alert(1)>'

describe('htmlStrict', () => {
  it('escapes every string child', () => {
    expect(String(h('div', null, evil))).toBe('<div>&lt;img src=x onerror=alert(1)&gt;</div>')
    expect(String(h('div', null, [
      evil,
      [evil],
    ]))).toBe('<div>&lt;img src=x onerror=alert(1)&gt;&lt;img src=x onerror=alert(1)&gt;</div>')
    // `html()` lets it through, that is why the strict variant exists
    expect(html('div', null, evil)).toBe(`<div>${evil}</div>`)
  })

  it('inserts nested results and raw() as markup', () => {
    const s = h('ul', { class: 'x' }, h('li', null, 'a & b'), raw('<li>raw</li>'), 1, null, false)
    expect(s).toBeInstanceOf(HTMLString)
    expect(`${s}`).toBe('<ul class="x"><li>a &amp; b</li><li>raw</li>1</ul>')
    expect(raw(s)).toBe(s)
    // `raw()` also works with the classic `html()`
    expect(html('p', null, raw('<b>x</b> y'))).toBe('<p><b>x</b> y</p>')
  })

  it('keeps the html prop and escapes attributes', () => {
    expect(String(h('div', { html: '<b>x</b>', title: evil }))).toBe('<div title="&lt;img src=x onerror=alert(1)&gt;"><b>x</b></div>')
  })

  it('does not let strings end a script or style', () => {
    expect(String(h('script', null, 'if (a < b && c) x("</script><img>")')))
      .toBe('<script>if (a < b && c) x("<\\/script><img>")</script>')
    expect(String(h('style', null, 'a{}</style><img>'))).toBe('<style>a{}<\\/style><img></style>')
  })

  it('calls function components', () => {
    const Item = ({ label }: any) => h('li', null, label)
    expect(String(h(Item, { label: evil }))).toBe('<li>&lt;img src=x onerror=alert(1)&gt;</li>')
  })
})

describe('strict jsx-runtime', () => {
  it('escapes text and nests elements', () => {
    const s = jsxs('ul', {
      children: [
        jsx('li', { children: evil }),
        jsx(Fragment, {
          children: [
            jsx('li', { children: 'b' }),
            'c',
          ],
        }),
      ],
    })
    expect(String(s)).toBe('<ul><li>&lt;img src=x onerror=alert(1)&gt;</li><li>b</li>c</ul>')
  })
})
