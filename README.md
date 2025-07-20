# 🌱 zeed-dom

> **A modern, lightweight, TypeScript virtual DOM for Node.js, browser, and static content generation.**

---

- ⚡️ **Fast**: Efficient HTML parsing and serialization
- 🧩 **JSX Compatible**: Works seamlessly with JSX/TSX
- 🔍 **CSS Selectors**: Query with a subset of CSS selectors
- 🛠 **Easy Manipulation**: Chainable API, `.handle()` helper, and more
- 📝 **HTML, XML, Markdown, Plaintext**: Serialize to multiple formats
- 🧹 **Pretty Print**: Tidy up HTML with `tidyDOM`
- 🦾 **TypeScript**: Full typings, modern codebase
- 🔒 **Safe HTML**: Output sanitized HTML for user content

**Note:** This project does not aim for full browser DOM completeness, but covers most practical use cases for static content, SSR, and offline DOM manipulation.

---

## 🚀 Get Started

```sh
npm i zeed-dom
```

## 🔗 Related Projects

- [zeed](https://github.com/holtwick/zeed) – Foundation library
- [zerva](https://github.com/holtwick/zerva) – Event-driven server 

> **Used by [TipTap](https://www.tiptap.dev/) in its [html-package](https://github.com/ueberdosis/tiptap/tree/main/packages/html).**

---

## ✨ Features

- Virtual DOM tree with `VNode`, `VElement`, `VDocument`, etc.
- HTML parsing and serialization
- XML output support
- CSS selector engine (subset)
- JSX/TSX support (see below)
- Safe HTML serialization (`serializeSafeHTML`)
- Markdown and plaintext serialization
- Manipulation helpers: `.handle()`, `.replaceWith()`, `.remove()`, etc.
- Works in Node.js, browser, and serverless
- Pretty print HTML (`tidyDOM`)
- TypeScript-first API

---

## 🛠 Usage Examples

### Manipulation

Drop in HTML, query, and change it. Returns HTML again. Great for post-processing:

```ts
import { handleHTML } from 'zeed-dom'

const newHTML = handleHTML(html, (document) => {
  const img = document.querySelector('.img-wrapper img')
  if (img)
    img.setAttribute('title', img.getAttribute('src'))
})
```

### Serialization

Take any HTML node or document and serialize it to another format:

- `serializePlaintext(node)`: Readable and searchable plain text
- `serializeMarkdown(node)`: Simple Markdown
- `serializeSafeHTML(node)` or `safeHTML(htmlString)`: Allow only basic tags and attributes

### Virtual DOM Example (no JSX)

```js
import { h, xml } from 'zeed-dom'

const dom = h(
  'ol',
  { class: 'projects' },
  [
    h('li', null, 'zeed ', h('img', { src: 'logo.png' })),
    h('li', null, 'zeed-dom'),
  ]
)

console.log(dom.render())
// <ol class="projects"><li>zeed <img src="logo.png"></li><li>zeed-dom</li></ol>

console.log(dom.render(xml))
// <ol class="projects"><li>zeed <img src="logo.png" /></li><li>zeed-dom</li></ol>
```

### JSX Example

```jsx
import { h } from 'zeed-dom'

let dom = (
  <ol className="projects">
    <li>zeed</li>
    <li>zeed-dom</li>
  </ol>
)

dom.handle('li', (e) => {
  if (!e.textContent.endsWith('-dom')) {
    e.remove()
  } else {
    e.innerHTML = '<b>zeed-dom</b> - great DOM helper for static content'
  }
})

console.log(dom.render())
// <ol class="projects"><li><b>zeed-dom</b> - great DOM helper for static content</li></ol>
```

### HTML Parsing & Tidy

```js
import { tidyDOM, vdom } from 'zeed-dom'

const dom = vdom('<div>Hello World</div>')
tidyDOM(dom)
console.log(dom.render())
// Output is pretty printed like:
// <div>
//   Hello World
// </div>
```

---

## ⚛️ JSX Setup

JSX is supported out of the box. For TypeScript, add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "h"
  }
}
```

Add this to your `shims.d.ts`:

```ts
// https://www.typescriptlang.org/docs/handbook/jsx.html#intrinsic-elements
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any
  }
}
```

For ESBuild:

```js
{
  jsxFactory: 'h'
}
```

Or as a CLI option: `--jsx-factory=h`

For browser DOM:

```js
const { hFactory } = require('zeed-dom')
export const h = hFactory({ document })
```

---

## 🧪 API Highlights

- `vdom(htmlString)`: Parse HTML to virtual DOM
- `tidyDOM(node)`: Pretty print/format DOM
- `serializeSafeHTML(node)`: Output safe HTML
- `serializeMarkdown(node)`: Output Markdown
- `serializePlaintext(node)`: Output plain text
- `handleHTML(html, fn)`: Manipulate HTML with a callback
- `VElement`, `VNode`, `VDocument`, etc.: Core classes
- `.handle(selector, fn)`: Manipulate elements by selector
- `.querySelector`, `.querySelectorAll`: CSS selector queries
- `.replaceWith()`, `.remove()`, `.setAttribute()`, etc.: DOM-like methods

---

## 🚦 Performance

The parser is fast, as shown in [htmlparser-benchmark](https://github.com/AndreasMadsen/htmlparser-benchmark/blob/master/stats.txt)

---

## 📝 Misc

- Use double underscore in JSX for namespaces: `<xhtml__link />` → `<xhtml:link />`
- Use `CDATA` helper for raw data: `<div>{CDATA(yourRawData)}</div>`
- `style` attributes can be objects: `<span style={{backgroundColor: 'red'}} />` → `<span style="background-color: red" />`
- Works in Node.js, browser, and serverless
- TypeScript-first, but works with plain JS too
