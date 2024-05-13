import { escapeHTML, unescapeHTML } from './encoding'

describe('encoding', () => {
  it('should encode', () => {
    expect(escapeHTML('</')).toEqual('&lt;/')
    expect(escapeHTML('<and> &')).toEqual('&lt;and&gt; &amp;')
  })

  it("should decode",  () => {
    expect(unescapeHTML('&amp; &#x3A; &copy;')).toEqual('& : ©')
  })
})
