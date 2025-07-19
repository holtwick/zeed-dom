import { removeBodyContainer } from './utils'
import { createHTMLDocument } from './vdom'

describe('utils', () => {
  it('should remove doc stuff', () => {
    const doc = createHTMLDocument()
    doc.body?.appendChild(['Hello ', 'world'])
    doc.title = 'Hello Title'
    expect(doc.render()).toMatchInlineSnapshot(
      `"<!DOCTYPE html><html><head><title>Hello Title</title></head><body>Hello world</body></html>"`,
    )

    const body = removeBodyContainer(doc)
    expect(body.render()).toMatchInlineSnapshot(
      `"<title>Hello Title</title>"`,
    )
  })
})
