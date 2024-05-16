# 🌱 zeed-dom

- Lightweight virtual / offline DOM (Document Object Model)
- Great to use in node or exporting to plain strings
- Written in Typescript
- Generates HTML and XML
- Parses HTML
- Supports some CSS selectors and queries
- JSX compatible
- Easy content manipulation (e.g. through `element.handle` helper)
- Pretty print HTML (`tidyDOM`)

**Does not aim for completeness!**

## Get started

```sh
npm i zeed-dom
```

## Related projects

- [zeed](https://github.com/holtwick/zeed) - Foundation library
- [zerva](https://github.com/holtwick/zerva) - Event driven server
- [hostic](https://github.com/holtwick/hostic) - Static site generator

Used by [TipTap](https://www.tiptap.dev/) in its [html-package](https://github.com/ueberdosis/tiptap/tree/aac0193050228a8b6237d84f1eb587cfc0d08e24/packages/html).

## Utils

### Manipulation

Drop in HTML and query and change it. Returns HTML again. Nice for post processing.

```ts
const newHTML = handleHTML(html, (document) => {
  const img = document.querySelector('.img-wrapper img')
  if (img)
    img.setAttribute('title', img.getAttribute('src'))
})
```

### Serialization

Take any HTML node or document an serialize it so some other format:

- `serializePlaintext(node)`: Readable and searchable plain text
- `serializeMarkdown(node)`: Simple Markdown
- `serializeSafeHTML(node)` or `safeHTML(htmlString)`: Just allow some basic tags and attributes

## Example

A simple example without JSX:

```js
import { h, xml } from 'zeed-dom'

const dom = h(
  'ol',
  {
    class: 'projects',
  },
  [
    h('li', null, 'zeed ', h('img', { src: 'logo.png' })),
    h('li', null, 'zeed-dom'),
  ]
)

console.log(dom.render())
// Output: <ol class="projects"><li>zeed <img src="logo.png"></li><li>zeed-dom</li></ol>

console.log(dom.render(xml))
// Output: <ol class="projects"><li>zeed <img src="logo.png" /></li><li>zeed-dom</li></ol>
```

And this one with JSX:

```jsx
import { h } from "zeed-dom"

let dom = (
  <ol className="projects">
    <li>zeed</li>
    <li>zeed-dom</li>
  </ol>
)

let projects = dom
  .querySelectorAll("li")
  .map((e) => e.textContent)
  .join(", ")

console.log(projects)
// Output: zeed, zeed-dom

dom.handle("li", (e) => {
  if (!e.textContent.endsWith("-dom")) {
    e.remove()
  } else {
    e.innerHTML = "<b>zeed-dom</b> - great DOM helper for static content"
  }
})

console.log(dom.render())
// Output: <ol class="projects"><li><b>zeed-dom</b> - great DOM helper for static content</li></ol>
```

In the second example you can see the special manipulation helper `.handle(selector, fn)` in action. You can also see HTML parsing works seamlessly. You can also parse directly:

```js
import { tidyDOM, vdom } from 'zeed-dom'

const dom = vdom('<div>Hello World</div>')
tidyDOM(dom)
console.log(dom.render())
// Output is pretty printed like: <div>
//   Hello World
// </div>
```

These examples are available at [/example](/example).

## JSX

Usually JSX is optimized for React i.e. it expects `React.creatElement` to exist and be the factory for generating the nodes. You can of course get the same effect here if you set up a helper like this:

```js
import { html } from 'zeed-dom'

const React = {
  createElement: html,
}
```

But more common is the use of `h` as the factory function. Here is how you can set up this behavior for various environments:

> In case of error messages on JSX in your Typescript project, try to add `npm install -D @types/react`.
 

### TypeScript

In [`tsconfig.json`](https://www.typescriptlang.org/docs/handbook/compiler-options-in-msbuild.html#mappings):

```json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "h"
  }
}
```

To avoid type checking issues you should add this to you `shims.d.ts`:

```ts
// https://www.typescriptlang.org/docs/handbook/jsx.html#intrinsic-elements
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any
  }
}
```

### [ESBuild](https://github.com/evanw/esbuild)

In options:

```js
{
  jsxFactory: 'h'
}
```

Or alternatively as [command line option](https://github.com/evanw/esbuild#command-line-usage): `--jsx-factory=h`

### Browser DOM

The JSX factory can also be used to directly create HTML DOM nodes in the browser. Just create the `h` function and let it use the browser's `document` object:

```js
const { hFactory } = require('zeed-dom')

export const h = hFactory({ document })
```

## Performance

The parser isn't doing too bad, according to the benchmarks of [htmlparser-benchmark](https://github.com/AndreasMadsen/htmlparser-benchmark/blob/master/stats.txt) ;)

```
tl                 : 1.02699 ms/file ± 0.679139
htmlparser2        : 1.98505 ms/file ± 2.94434
node-html-parser   : 2.24176 ms/file ± 1.52112
neutron-html5parser: 2.36648 ms/file ± 1.38879
html5parser        : 2.39891 ms/file ± 2.83056
htmlparser2-dom    : 2.57523 ms/file ± 3.35587
html-dom-parser    : 2.84910 ms/file ± 3.61615
libxmljs           : 3.81665 ms/file ± 2.79295
zeed-dom           : 5.05130 ms/file ± 3.57184
htmljs-parser      : 5.58557 ms/file ± 6.47597
parse5             : 9.07862 ms/file ± 6.50856
htmlparser         : 21.2274 ms/file ± 150.951
html-parser        : 30.9104 ms/file ± 24.3930
saxes              : 49.5906 ms/file ± 141.194
html5              : 114.771 ms/file ± 148.345
```

## Misc

- To set namespace colons in JSX use double underscore i.e. `<xhtml__link />` becomes `<xhtml:link />`
- To allow `CDATA` use the helper function e.g. `<div>{ CDATA(yourRawData) }</div>`
- `style` attributes can handle objects e.g. `<span style={{backgroundColor: 'red'}} />` becomes `<span style="background-color: red" />`
