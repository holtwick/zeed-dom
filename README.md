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
- `serializeMarkdown(node, options?)`: Simple Markdown. Options:
  - `wrap`: column to soft-wrap long lines at (e.g. `80`); `0` or omitted disables wrapping. Code fences and table rows are not wrapped, and list-item continuations keep the proper indent.
  - `linkStyle`: how `<a href="…">…</a>` and `<img src="…" alt="…">` are rendered. `'inline'` (default) → `[text](url)` / `![alt](src)`, `'autolink'` → `text <url>` / `alt <src>` (or just `<url>` / `<src>` when the label is empty or equals the URL).
  - `inlineStyles`: when `false`, strips inline text-styling tags (`b`, `strong`, `i`, `em`, `u`, `mark`, `tt`, `code`, `strike`, `del`, `ins`, `sub`, `sup`) and emits their content as plain text. Default `true`.
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

### ⚠️ Untrusted text in `html()` and JSX

`html()` and the JSX runtime return plain strings, so a nested element can't be told apart from text. A string child that starts with `<` and ends with `>` is therefore inserted as markup, not escaped. With untrusted input this is an XSS hole:

```jsx
const name = '<img src=x onerror=alert(1)>'
html('p', null, name) // <p><img src=x onerror=alert(1)></p>
```

Escape such text yourself with `escapeHTML(name)`, or use the strict variant. `htmlStrict()` escapes every string and inserts only its own results and strings marked with `raw()` as markup:

```jsx
import { htmlStrict as h, raw } from 'zeed-dom'

h('p', null, name) // <p>&lt;img src=x onerror=alert(1)&gt;</p>
h('p', null, raw('<b>trusted</b>')) // <p><b>trusted</b></p>
```

It returns an `HTMLString` (a `String` object), use `String(result)` or `` `${result}` `` for a plain string. For the automatic JSX runtime set `"jsxImportSource": "zeed-dom/strict"`. The VDOM `h()` from `hFactory()` and `render()` always escape text.

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

- **Fast parsing**: zeed-dom parses real-world pages several times faster than linkedom, happy-dom and jsdom. It does not follow the HTML specification for broken markup, which is part of the reason.
- **Fast with ProseMirror and tiptap**: building documents with `appendChild` and serializing them with ProseMirror's `DOMSerializer` is on par with or faster than the alternatives.
- **Safe for user input**: parsing is linear in the length of the input, nesting is limited to 512 levels like in Chrome, and tree walks don't recurse, so no input can block the event loop for long or overflow the call stack.
- **Node.js and Bun**: measured on both runtimes.

<!-- perf-summary:start -->

| Node.js | zeed-dom | linkedom | happy-dom | jsdom |
| --- | ---: | ---: | ---: | ---: |
| Parse 258 real-world pages (24.6 MB) | 159 ms | 686 ms (4.3×) | 1,759 ms (11×) | 4,140 ms (26×) |
| `appendChild` 50,000 elements to one parent | 14 ms | 98 ms (7.2×) | 470 ms (34×) | 169 ms (12×) |
| ProseMirror `DOMSerializer`, 5,000 paragraphs | 14 ms | 21 ms (1.5×) | 141 ms (10×) | 67 ms (4.8×) |

| Bun | zeed-dom | linkedom | happy-dom | jsdom |
| --- | ---: | ---: | ---: | ---: |
| Parse 258 real-world pages (24.6 MB) | 89 ms | 288 ms (3.3×) | 1,122 ms (13×) | 3,287 ms (37×) |
| `appendChild` 50,000 elements to one parent | 5.1 ms | 41 ms (8.0×) | 244 ms (48×) | 142 ms (28×) |
| ProseMirror `DOMSerializer`, 5,000 paragraphs | 5.2 ms | 9.2 ms (1.8×) | 72 ms (14×) | 93 ms (18×) |

Generated by `npm run perf:compare -- --write` on 2026-11-19: best of 3 runs on Apple M4 (darwin arm64) with Node.js 24.22.3 and Bun 1.4.3. Libraries: zeed-dom 0.19.2 (6660eae), linkedom 0.18.15, happy-dom 21.0.4, jsdom 31.0.1. The factor in parentheses is the time relative to zeed-dom.

<!-- perf-summary:end -->

The full comparison, hostile input cases, known limits and how to run the benchmark yourself are in [PERFORMANCE.md](PERFORMANCE.md).

---

## ✅ Tests

The same test suite runs on Node.js (`npm test`), Bun (`npm run test:bun`) and in Chromium, Firefox and WebKit (`npm run test:browser`, needs `npx playwright install` once). Besides the unit tests it contains:

- **Golden files**: the rendered HTML, Markdown, plaintext, safe HTML and text content of 258 real-world pages in `files/` are compared to a snapshot, so output changes can't slip in unnoticed.
- **Differential tests**: random well-formed HTML is parsed by zeed-dom and by a real DOM (the browser's or jsdom) and the trees must match. Random sequences of `appendChild`, `insertBefore`, `replaceWith`, `replaceChildren` and other mutations must give the same trees as the real DOM.
- **Timing checks** for hostile input, so a regression to quadratic time fails the suite.

---

## 📝 Misc

- Use double underscore in JSX for namespaces: `<xhtml__link />` → `<xhtml:link />`
- Use `CDATA` helper for raw data: `<div>{CDATA(yourRawData)}</div>`
- `style` attributes can be objects: `<span style={{backgroundColor: 'red'}} />` → `<span style="background-color: red" />`
- Works in Node.js, browser, and serverless
- TypeScript-first, but works with plain JS too
