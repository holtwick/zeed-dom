import { describe, expect, it } from 'vitest'
import { serializePlaintext } from './serialize-plaintext'
import { parseHTML } from './vdomparser'

describe('serializePlaintext', () => {
  it('keeps block boundaries in a fragment', () => {
    expect(serializePlaintext(parseHTML('<div>one</div><div>two</div>')))
      .toBe('one\n\ntwo\n')
  })

  it('treats a whole document like a fragment', () => {
    // `parseHTML` of a complete page returns a document node. That branch used
    // to fall through to bare `textContent`: no block boundaries, and the raw
    // text of `<title>` and `<style>` concatenated into the output - so the
    // plain-text view of an inbound mail was a single line starting with the
    // sender's CSS.
    const doc = `<!DOCTYPE html><html><head><title>T</title><style type="text/css">#q{color:red}</style></head><body><div>one</div><div>two</div></body></html>`
    const text = serializePlaintext(parseHTML(doc))
    expect(text).toBe('one\n\ntwo\n')
    expect(text).not.toContain('color:red')
    expect(text).not.toContain('T')
  })

  it('turns <br> into a line break', () => {
    expect(serializePlaintext(parseHTML('<p>one<br>two</p>'))).toBe('one\ntwo\n')
  })
})
