import type { Extensions, JSONContent } from '@tiptap/core'
import { getSchema } from '@tiptap/core'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import TextStyle from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import { generateHTML, generateJSON } from '@tiptap/html'
import { DOMSerializer, DOMParser as PMDOMParser, Node as PMNode } from '@tiptap/pm/model'
import StarterKit from '@tiptap/starter-kit'
import { VDocumentFragment } from './vdom'
import { parseHTML } from './vdomparser'

// tiptap 2 renders and parses HTML on the server with zeed-dom: `generateHTML`
// serializes into a fragment of `createHTMLDocument()` and renders that,
// `generateJSON` feeds `parseHTML()` into ProseMirror's `DOMParser`. Most
// dependents of zeed-dom use it this way. vitest.config.ts points the
// `zeed-dom` import of @tiptap/html at ./src, so these tests run the real
// tiptap code against this checkout.
//
// The reference is the browser's own DOM when the tests run in a browser,
// jsdom otherwise, like in differential.spec.ts.

async function referenceDocument(): Promise<Document> {
  if (typeof window !== 'undefined' && typeof window.document?.createElement === 'function')
    return window.document
  // Variable specifier, so the browser build doesn't try to bundle jsdom
  const name = 'jsdom'
  const { JSDOM } = await import(/* @vite-ignore */ name)
  return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document
}

let ref: Document

beforeAll(async () => {
  ref = await referenceDocument()
})

const extensions: Extensions = [
  StarterKit,
  Underline,
  Link.configure({ openOnClick: false }),
  Image,
  Table,
  TableRow,
  TableHeader,
  TableCell,
  TaskList,
  TaskItem.configure({ nested: true }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
]

const schema = getSchema(extensions)

/** What `generateHTML` would return with a real DOM */
function referenceHTML(doc: JSONContent): string {
  const node = PMNode.fromJSON(schema, doc)
  const wrap = ref.createElement('div')
  DOMSerializer.fromSchema(schema).serializeFragment(node.content, { document: ref }, wrap)
  return wrap.innerHTML
}

/**
 * HTML as the real DOM serializes it. zeed-dom escapes a little more, e.g.
 * `"` as `&quot;` in text, and doesn't rewrite inline styles like a real
 * DOM does (`#ff0000` to `rgb(255, 0, 0)`), which is equivalent.
 */
function normalize(html: string): string {
  const wrap = ref.createElement('div')
  wrap.innerHTML = html
  for (const el of Array.from(wrap.querySelectorAll<HTMLElement>('[style]')))
    el.style.cssText = el.getAttribute('style')!
  return wrap.innerHTML
}

/** What `generateJSON` would return with a real DOM */
function referenceJSON(html: string): JSONContent {
  const wrap = ref.createElement('div')
  wrap.innerHTML = html
  return PMDOMParser.fromSchema(schema).parse(wrap).toJSON()
}

function text(t: string, marks?: JSONContent['marks']): JSONContent {
  return marks
    ? { type: 'text', text: t, marks }
    : { type: 'text', text: t }
}
const p = (...content: JSONContent[]): JSONContent => ({ type: 'paragraph', content })

/** A document that uses every node and mark of the schema above, except task lists */
const kitchenSink: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [
        text('Title'),
      ],
    },
    {
      type: 'heading',
      attrs: { level: 3 },
      content: [
        text('Sub '),
        text('title', [
          { type: 'italic' },
        ]),
      ],
    },
    p(
      text('Plain, '),
      text('bold', [
        { type: 'bold' },
      ]),
      text(', '),
      text('italic', [
        { type: 'italic' },
      ]),
      text(', '),
      text('both', [
        { type: 'bold' },
        { type: 'italic' },
      ]),
      text(', '),
      text('strike', [
        { type: 'strike' },
      ]),
      text(', '),
      text('underline', [
        { type: 'underline' },
      ]),
      text(', '),
      text('code', [
        { type: 'code' },
      ]),
      text(' and '),
      text('a link', [
        {
          type: 'link',
          attrs: { href: 'https://example.com/?a=1&b="2"', target: '_blank' },
        },
      ]),
      text('.'),
    ),
    p(
      text('Line one'),
      { type: 'hardBreak' },
      text('line two with '),
      text('red', [
        {
          type: 'textStyle',
          attrs: { color: '#ff0000' },
        },
      ]),
      text(' and '),
      text('highlighted', [
        {
          type: 'highlight',
          attrs: { color: '#ffff00' },
        },
      ]),
      text(' text'),
    ),
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            p(text('One')),
          ],
        },
        {
          type: 'listItem',
          content: [
            p(text('Two')),
            {
              type: 'orderedList',
              attrs: { start: 3 },
              content: [
                {
                  type: 'listItem',
                  content: [
                    p(text('Nested')),
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'blockquote',
      content: [
        p(text('Quoted')),
      ],
    },
    {
      type: 'codeBlock',
      attrs: { language: 'ts' },
      content: [
        text('const a = 1 < 2 && "x"\n  return a'),
      ],
    },
    { type: 'horizontalRule' },
    {
      type: 'image',
      attrs: { src: 'https://example.com/a.png', alt: 'An "image"', title: 'Title' },
    },
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableHeader',
              attrs: { colspan: 1, rowspan: 1, colwidth: null },
              content: [
                p(text('Head')),
              ],
            },
            {
              type: 'tableHeader',
              attrs: {
                colspan: 1,
                rowspan: 1,
                colwidth: [120],
              },
              content: [
                p(text('Wide')),
              ],
            },
          ],
        },
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableCell',
              attrs: { colspan: 2, rowspan: 1, colwidth: null },
              content: [
                p(text('Spanning')),
              ],
            },
          ],
        },
      ],
    },
  ],
}

const taskList: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: { checked: true },
          content: [
            p(text('Done')),
          ],
        },
        {
          type: 'taskItem',
          attrs: { checked: false },
          content: [
            p(text('Open')),
          ],
        },
      ],
    },
  ],
}

describe('tiptap', () => {
  it('uses zeed-dom from this checkout', () => {
    const render = vi.spyOn(VDocumentFragment.prototype, 'render')
    try {
      generateHTML({
        type: 'doc',
        content: [
          p(text('x')),
        ],
      }, extensions)
      expect(render).toHaveBeenCalled()
    }
    finally {
      render.mockRestore()
    }
  })

  describe('generateHTML', () => {
    it('renders a simple document', () => {
      expect(generateHTML({
        type: 'doc',
        content: [
          p(text('Hello '), text('world', [
            { type: 'bold' },
          ]), text('!')),
        ],
      }, extensions))
        .toBe('<p>Hello <strong>world</strong>!</p>')
    })

    it('renders an empty document', () => {
      expect(generateHTML({ type: 'doc', content: [] }, extensions)).toBe('')
    })

    it('renders every node and mark like a real DOM', () => {
      expect(normalize(generateHTML(kitchenSink, extensions))).toBe(referenceHTML(kitchenSink))
    })

    it('renders inline styles set through style.cssText', () => {
      // Color, Highlight, TextAlign and tables rely on this
      const html = generateHTML({
        type: 'doc',
        content: [
          p(text('red', [
            {
              type: 'textStyle',
              attrs: { color: '#ff0000' },
            },
          ])),
        ],
      }, extensions)
      expect(html).toBe('<p><span style="color: #ff0000">red</span></p>')
    })

    it('renders task items so their state survives a round trip', () => {
      // zeed-dom renders `setAttribute(name, true)` as a boolean attribute and
      // drops `false`, where a real DOM writes "true" and "false". tiptap
      // reads both forms.
      expect(generateHTML(taskList, extensions)).toBe(
        '<ul data-type="taskList">'
        + '<li data-checked data-type="taskItem"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Done</p></div></li>'
        + '<li data-type="taskItem"><label><input type="checkbox"><span></span></label><div><p>Open</p></div></li>'
        + '</ul>',
      )
      expect(generateJSON(generateHTML(taskList, extensions), extensions)).toEqual(PMNode.fromJSON(schema, taskList).toJSON())
    })

    it('escapes text and attributes', () => {
      const doc: JSONContent = {
        type: 'doc',
        content: [
          p(
            text('<script>alert("x")</script> & \'quotes\''),
            text('link', [
              {
                type: 'link',
                attrs: { href: 'https://example.com/"><script>x</script>' },
              },
            ]),
          ),
        ],
      }
      const html = generateHTML(doc, extensions)
      expect(html).not.toContain('<script>')
      expect(normalize(html)).toBe(referenceHTML(doc))
    })

    it('keeps unicode, emoji and non-breaking spaces', () => {
      const doc: JSONContent = {
        type: 'doc',
        content: [
          p(text('Grüße 👋🏽 a b — 日本語')),
        ],
      }
      expect(normalize(generateHTML(doc, extensions))).toBe(referenceHTML(doc))
    })

    it('renders large documents', () => {
      const doc: JSONContent = {
        type: 'doc',
        content: Array.from({ length: 5000 }, (_, i) => p(text(`Paragraph ${i} `), text('bold', [
          { type: 'bold' },
        ]))),
      }
      const html = generateHTML(doc, extensions)
      expect(html.startsWith('<p>Paragraph 0 <strong>bold</strong></p><p>Paragraph 1 ')).toBe(true)
      expect(html.match(/<p>/g)).toHaveLength(5000)
    })
  })

  describe('generateJSON', () => {
    it('parses a simple document', () => {
      expect(generateJSON('<p>Hello <b>world</b>!</p>', extensions)).toEqual({
        type: 'doc',
        content: [
          p(text('Hello '), text('world', [
            { type: 'bold' },
          ]), text('!')),
        ],
      })
    })

    it('round-trips every node and mark', () => {
      const doc: JSONContent = {
        type: 'doc',
        content: [
          ...kitchenSink.content!,
          ...taskList.content!,
        ],
      }
      expect(generateJSON(generateHTML(doc, extensions), extensions)).toEqual(PMNode.fromJSON(schema, doc).toJSON())
    })

    const samples: Record<string, string> = {
      'whitespace': '<p>  a   b\n c  </p>\n\n<p>\td</p>',
      'entities': '<p>&lt;tag&gt; &amp;amp; &quot;q&quot; &#39;s&#39; &nbsp; &euro; &#x1F600;</p>',
      'inline formatting': '<p><strong>b</strong><em>i</em><s>s</s><u>u</u><code>c</code><mark data-color="#ff0">m</mark><span style="color: rgb(255, 0, 0)">red</span></p>',
      'links': '<p><a href="https://example.com/?a=1&amp;b=2" target="_blank" rel="noopener">link</a></p>',
      'lists': '<ul><li><p>a</p><ol start="5"><li>b</li></ol></li><li>c</li></ul>',
      'task lists': '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked><span></span></label><div><p>done</p></div></li></ul>',
      'code block': '<pre><code class="language-js">if (a &lt; b) {\n  return "x"\n}</code></pre>',
      'table': '<table><tbody><tr><th>h</th><th colwidth="100">w</th></tr><tr><td colspan="2">x</td></tr></tbody></table>',
      'image and rule': '<p>before</p><img src="a.png" alt="alt" title="t"><hr><p>after</p>',
      'headings and quote': '<h1>One</h1><h2>Two</h2><blockquote><p>quote</p></blockquote>',
      'unknown markup': '<div><section><p>in section</p></section><span>loose</span><font color="red">font</font></div>',
      'comments and doctype': '<!DOCTYPE html><!-- comment --><p>after <!-- inner --> comment</p>',
      'style and script': '<style>p { color: red }</style><script>alert(1)</script><p>visible</p>',
      // Mis-nested tags like `<b><i></b></i>` are left out on purpose:
      // zeed-dom doesn't implement the HTML5 adoption agency algorithm.
      'unclosed tags': '<p>one<p>two <b>bold <i>both</i></b> italic',
      'br': '<p>a<br>b<br/>c</p>',
    }

    for (const [name, html] of Object.entries(samples)) {
      it(`parses ${name} like a real DOM`, () => {
        expect(generateJSON(html, extensions)).toEqual(referenceJSON(html))
      })
    }

    it('accepts a parsed zeed-dom document', () => {
      // tiptap hands the result of parseHTML() to ProseMirror unchanged
      const dom = parseHTML('<h2>Head</h2><p>text</p>')
      const json = PMDOMParser.fromSchema(schema).parse(dom as any).toJSON()
      expect(json).toEqual(referenceJSON('<h2>Head</h2><p>text</p>'))
    })
  })
})
