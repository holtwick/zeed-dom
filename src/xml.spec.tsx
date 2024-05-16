// @tsx h

import { h } from './xml'

describe('hTML', () => {
  it('should xml', () => {
    const s = h(
      'a',
      {
        href: 'example.com',
        empty: null,
        x: true,
        false: false,
      },
      h('hr'),
      h('b', {}, 'Welcome'),
    )
    expect(s).toEqual('<a href="example.com" x><hr /><b>Welcome</b></a>')
  })

  it('should use JSX', () => {
    const spread = {
      title: 'Hello',
      id: 'greeting',
    }
    const s = (
      <a href="example.com" x {...spread}>
        <hr myCaseSensitiveAttribute="1" />
        <b>Welcome</b>
      </a>
    )
    expect(s).toEqual(
      '<a href="example.com" x title="Hello" id="greeting"><hr myCaseSensitiveAttribute="1" /><b>Welcome</b></a>',
    )
  })
})
