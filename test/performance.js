import { hrtime } from 'node:process'
import { generateHTML } from '@tiptap/html'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'

const doc = {
  type: 'doc',
  content: Array.from({ length: 1000 }).fill({
    type: 'paragraph',
    content: [{ type: 'text', text: 'Hello world' }],
  }),
}

// function generateHTML(doc, extensions) {
//   const schema = getSchema(extensions)
//   const contentNode = Node.fromJSON(schema, doc)

//   const window = new Window()

//   const fragment = DOMSerializer.fromSchema(schema).serializeFragment(
//     contentNode.content,
//     {
//       document: window.document,
//     }
//   )

//   const serializer = new window.XMLSerializer()
//   return serializer.serializeToString(fragment)
// }

for (let i = 0; i < 100000; i++) {
  const start = hrtime.bigint()
  generateHTML(doc, [Document, Paragraph, Text])
  const end = hrtime.bigint()
  // eslint-disable-next-line no-console
  console.log(`Took ${(end - start) / BigInt(1e6)}ms`)
}
