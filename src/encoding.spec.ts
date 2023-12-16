import { escapeHTML } from './encoding'

describe('encoding', () => {
  it('should encoding', () => {
    expect(escapeHTML('</')).toEqual('&lt;/')
    expect(escapeHTML('<and> &')).toEqual('&lt;and&gt; &amp;')
  })
})
