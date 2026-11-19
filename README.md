# 🌱 zeed-dom

[![npm](https://img.shields.io/npm/v/zeed-dom)](https://www.npmjs.com/package/zeed-dom) [![CI](https://github.com/holtwick/zeed-dom/actions/workflows/main.yml/badge.svg)](https://github.com/holtwick/zeed-dom/actions/workflows/main.yml) [![license](https://img.shields.io/npm/l/zeed-dom)](LICENSE)

> **A lightweight offline DOM for Node.js, Bun and browsers: HTML parser, CSS selectors, JSX and serializers to HTML, XML, Markdown, plain text and safe HTML.**

Parses real-world pages several times faster than linkedom, happy-dom and jsdom, stays linear on hostile input, and has only two small dependencies. Made for server-side rendering, static site generation, post-processing HTML, and cleaning up user content.

- ⚡️ **Fast**: parsing and serialization several times faster than the alternatives, see [Performance](#-performance)
- 🔍 **CSS selectors**: `querySelector`, `querySelectorAll`, `matches` and the `.handle()` helper
- 🧩 **JSX**: build HTML strings or a DOM tree with JSX/TSX, no React needed
- 📝 **Serializers**: HTML, XML, Markdown, plain text, pretty printed HTML
- 🔒 **Safe HTML**: reduce untrusted HTML to allowed tags, attributes and URLs
- 🛡 **Robust**: no recursion and linear time, so no input can block the event loop or overflow the stack
- 🦾 **TypeScript**: full typings, ESM and CommonJS

zeed-dom does not aim to be a complete browser DOM. It covers what static content, SSR and offline DOM manipulation need, and where it differs from a browser it moves towards what the browser does.

## 🚀 Get Started

```sh
npm i zeed-dom
```

Requires Node.js 22 or later, Bun, or any modern browser.

```ts
import { parseHTML, serializeMarkdown } from 'zeed-dom'

const doc = parseHTML('<h1>Hello</h1><p>Read the <a href="/docs">docs</a>.</p>')

for (const a of doc.querySelectorAll('a'))
  a.setAttribute('href', `https://example.com${a.getAttribute('href')}`)

doc.render()
// <h1>Hello</h1><p>Read the <a href="https://example.com/docs">docs</a>.</p>

serializeMarkdown(doc)
// # Hello
//
// Read the [docs](https://example.com/docs).
```

## 🛠 Usage

### Parse and manipulate

`parseHTML(html)` returns a document (for a full page) or a fragment, `vdom(html)` does the same and also accepts an existing node or a `Buffer`. The nodes offer the usual DOM methods: `querySelector`, `querySelectorAll`, `getAttribute`, `setAttribute`, `classList`, `style`, `textContent`, `innerHTML`, `appendChild`, `insertBefore`, `replaceWith`, `remove` and more.

`handleHTML(html, fn)` parses, hands you the document and returns the HTML again, handy for post-processing:

```ts
import { handleHTML } from 'zeed-dom'

const newHTML = handleHTML(html, (document) => {
  const img = document.querySelector('.img-wrapper img')
  if (img)
    img.setAttribute('title', img.getAttribute('src'))
})
```

In Node.js `handleHTMLFile(path, fn, outPath?)` does the same for a file and writes it back only when something changed.

`.handle(selector, fn)` calls `fn` for every matching element:

```ts
dom.handle('a[href^="http"]', (a) => {
  a.setAttribute('rel', 'noopener')
})
```

### Serialize

Take any node or document and turn it into another format:

```ts
import { serializeMarkdown, serializePlaintext, tidyDOM, vdom, xml } from 'zeed-dom'

const dom = vdom('<div>Hello <b>World</b></div>')

dom.render() // <div>Hello <b>World</b></div>
dom.render(xml) // XML syntax, e.g. <br /> instead of <br>
serializeMarkdown(dom) // Hello **World**
serializePlaintext(dom) // Hello World

tidyDOM(dom) // pretty prints in place
dom.render()
// <div>
//   Hello <b>World</b>
// </div>
```

<details>
<summary>Options of <code>serializeMarkdown(node, options?)</code></summary>

| Option | Default | Description |
| --- | --- | --- |
| `wrap` | `0` | Column to soft-wrap long lines at, e.g. `80`. `0` disables wrapping. Code fences and table rows are never wrapped, list-item continuations keep their indent. |
| `linkStyle` | `'inline'` | `'inline'` renders `[text](url)` / `![alt](src)`, `'autolink'` renders `text <url>` / `alt <src>`, or just `<url>` when the label is empty or equals the URL. |
| `inlineStyles` | `true` | `false` drops inline styling tags (`b`, `strong`, `i`, `em`, `u`, `mark`, `code`, `del`, `sub`, `sup`, …) and keeps their text. |
| `imageStyle` | `'full'` | `'full'` renders `![alt](src)`, `'alt'` only `[alt]`, `'none'` drops images. |
| `headingAnchors` | `false` | `true` appends the `id` of a heading as ` {#id}` (Pandoc / kramdown). |

</details>

### Safe HTML

`safeHTML(html, options?)` and `serializeSafeHTML(node, options?)` reduce untrusted HTML to allowed tags and attributes. Scripts, styles, embedded documents (`iframe`, `object`, `svg`, …), event handlers and `javascript:` URLs never pass, links get `rel="noopener noreferrer" target="_blank"`:

```ts
import { safeHTML } from 'zeed-dom'

safeHTML('<p onclick="steal()">Hi <a href="https://example.com">there</a><script>bad()</script></p>')
// <p>Hi <a href="https://example.com" rel="noopener noreferrer" target="_blank">there</a></p>
```

<details>
<summary>Options of <code>safeHTML()</code> and <code>serializeSafeHTML()</code></summary>

| Option | Default | Description |
| --- | --- | --- |
| `allowedTags` | `DEFAULT_ALLOWED_TAGS` | Tags to keep: block, inline and table elements, `a`, `img`, `br`. Other tags are unwrapped, their content stays. |
| `allowedAttrs` | `DEFAULT_ALLOWED_ATTRS` | Attributes to keep per tag, the key `'*'` applies to every tag. Default: `href`, `title` on links, `src`, `alt`, `title`, `width`, `height` on images, `colspan`, `rowspan`, `scope` on table cells. |
| `allowedUrlSchemes` | all but `javascript:`, `vbscript:`, `data:` | Schemes allowed in `href` and `src`, like `['https:', 'mailto:']` or `DEFAULT_ALLOWED_URL_SCHEMES`. The default keeps `cid:` images in mails working. |
| `allowRelativeUrls` | `true` | Allow URLs without a scheme. |
| `allowDataImages` | `true` | Allow `data:image/…` as `src` of an image. |
| `linkRel`, `linkTarget` | `'noopener noreferrer'`, `'_blank'` | Added to every link. `''` keeps the allowed values of the source. |

</details>

### Build a DOM tree

`h(tag, attrs, ...children)` creates elements of the virtual DOM, which you can query and change before rendering:

```ts
import { h, xml } from 'zeed-dom'

const dom = h('ol', { class: 'projects' }, [
  h('li', null, 'zeed ', h('img', { src: 'logo.png' })),
  h('li', null, 'zeed-dom'),
])

dom.render()
// <ol class="projects"><li>zeed <img src="logo.png"></li><li>zeed-dom</li></ol>

dom.render(xml)
// <ol class="projects"><li>zeed <img src="logo.png" /></li><li>zeed-dom</li></ol>
```

## ⚛️ JSX

There are two ways to use JSX, depending on what you need back.

### HTML strings: automatic runtime

The JSX runtime returns plain HTML strings, which is all a static page or an email template needs. In `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "zeed-dom"
  }
}
```

```tsx
const Card = ({ title, children }) => (
  <div className="card">
    <h2>{title}</h2>
    {children}
  </div>
)

const page = <Card title="Hello">Welcome</Card>
// <div class="card"><h2>Hello</h2>Welcome</div>
```

The same functions are available as `html()` (strings) and `xml()` (XML strings) for use without JSX.

### DOM tree: classic runtime with `h`

To get elements you can query and change, use the classic runtime with the `h` of the virtual DOM:

```json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "h"
  }
}
```

```tsx
import { h } from 'zeed-dom'

const dom = (
  <ol className="projects">
    <li>zeed</li>
    <li>zeed-dom</li>
  </ol>
)

dom.handle('li', (e) => {
  if (!e.textContent.endsWith('-dom'))
    e.remove()
  else
    e.innerHTML = '<b>zeed-dom</b> - great DOM helper for static content'
})

dom.render()
// <ol class="projects"><li><b>zeed-dom</b> - great DOM helper for static content</li></ol>
```

For esbuild use `jsxFactory: 'h'` or `--jsx-factory=h`. To create real elements of the browser DOM with the same JSX, make your own `h`:

```ts
import { hFactory } from 'zeed-dom'

export const h = hFactory({ document })
```

If TypeScript complains about unknown elements, add this to a `shims.d.ts`:

```ts
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any
  }
}
```

### Tips

- Use a double underscore for namespaces: `<xhtml__link />` → `<xhtml:link />`
- `CDATA` inserts raw data: `<div>{CDATA(yourRawData)}</div>`
- `style` can be an object: `<span style={{ backgroundColor: 'red' }} />` → `<span style="background-color:red"></span>`

### ⚠️ Untrusted text in `html()` and JSX

`html()` and the automatic JSX runtime return plain strings, so a nested element can't be told apart from text. A string child that starts with `<` and ends with `>` is therefore inserted as markup, not escaped. With untrusted input this is an XSS hole:

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

It returns an `HTMLString` (a `String` object), use `String(result)` or `` `${result}` `` for a plain string. For the automatic JSX runtime set `"jsxImportSource": "zeed-dom/strict"`. The VDOM `h()` and `hFactory()` as well as `render()` always escape text.

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

## ✅ Tests

The same test suite runs on Node.js (`npm test`), Bun (`npm run test:bun`) and in Chromium, Firefox and WebKit (`npm run test:browser`, needs `npx playwright install` once). Besides the unit tests it contains:

- **Golden files**: the rendered HTML, Markdown, plaintext, safe HTML and text content of 258 real-world pages in `files/` are compared to a snapshot, so output changes can't slip in unnoticed.
- **Differential tests**: random well-formed HTML is parsed by zeed-dom and by a real DOM (the browser's or jsdom) and the trees must match. Random sequences of `appendChild`, `insertBefore`, `replaceWith`, `replaceChildren` and other mutations must give the same trees as the real DOM.
- **Timing checks** for hostile input, so a regression to quadratic time fails the suite.

Security issues: see [SECURITY.md](SECURITY.md).

## 🔗 Related Projects

- [zeed](https://github.com/holtwick/zeed) – Foundation library
- [zerva](https://github.com/holtwick/zerva) – Event-driven server

## License

[MIT](LICENSE) © Dirk Holtwick
