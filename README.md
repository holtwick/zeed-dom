# hostic-dom

- Lightweight virtual DOM in pure Javascript
- Generates HTML and XML
- Parses HTML
- Supports CSS selectors and queries
- Can be used with JSX
- Easy content manipulation (e.g. through `element.handle` helper)
- Pretty print HTML (`tidyDOM`)

**Does not aim for completeness!**

This is a side project of [hostic](https://github.com/holtwick/hostic), the static website generator.

## Example

A simple example without JSX:

```js
import { h, xml } from "hostic-dom"

let dom = h(
  "ol",
  {
    class: "projects",
  },
  [
    h("li", null, "hostic ", h("img", { src: "logo.png" })),
    h("li", null, "hostic-dom"),
  ]
)

console.log(dom.render())
// Output: <ol class="projects"><li>hostic <img src="logo.png"></li><li>hostic-dom</li></ol>

console.log(dom.render(xml))
// Output: <ol class="projects"><li>hostic <img src="logo.png" /></li><li>hostic-dom</li></ol>
```

And this one with JSX:

```jsx
import { h } from "hostic-dom"

let dom = (
  <ol className="projects">
    <li>hostic</li>
    <li>hostic-dom</li>
  </ol>
)

let projects = dom
  .querySelectorAll("li")
  .map((e) => e.textContent)
  .join(", ")

console.log(projects)
// Output: hostic, hostic-dom

dom.handle("li", (e) => {
  if (!e.textContent.endsWith("-dom")) {
    e.remove()
  } else {
    e.innerHTML = "<b>hostic-dom</b> - great DOM helper for static content"
  }
})

console.log(dom.render())
// Output: <ol class="projects"><li><b>hostic-dom</b> - great DOM helper for static content</li></ol>
```

In the second example you can see the special manipulation helper `.handle(selector, fn)` in action. You can also see HTML parsing works seamlessly. You can also parse directly:

```js
import { vdom, tidyDOM } from "hostic-dom"

let dom = vdom("<div>Hello World</div>")
tidyDOM(dom)
console.log(dom.render())
// Output is pretty printed like: <div>
//   Hello World
// </div>
```

These examples are available at [github.com/holtwick/hostic-dom-example](https://github.com/holtwick/hostic-dom-example).

## JSX

Usually JSX is optimized for React i.e. it expect `React.creatElement` to exist and be the factory for generating the nodes. You can of course get the same effect here if you set up a helper like this:

```js
import { html } from "hostic-dom"

var React = {
  createElement: html,
}
```

But more common is the use of `h` as the factory function. Here is how you can set up this behavior for various environments:

### Babel.js

Add required plugins:

```shell script
npm i -D @babel/plugin-syntax-jsx @babel/plugin-transform-react-jsx
```

Then add this to `.babelrc`:

```json
{
  "plugins": [
    "@babel/plugin-syntax-jsx",
    [
      "@babel/plugin-transform-react-jsx",
      {
        "pragma": "h"
      }
    ]
  ]
}
```

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

### ESBuild

In options:

```js
{
  jsxFactory: "h"
}
```

Or alternatively as [command line option](https://github.com/evanw/esbuild#command-line-usage): `--jsx-factory=h`

### Browser DOM

The JSX factory can also be used to directly create HTML DOM nodes in the browser. Just create the `h` function and let it use the browser's `document` object:

```js
const { hFactory } = require("hostic-dom")

export let h = hFactory({ document })
```

### Unpkg

`hostic-dom` is also available via **unpkg** via <https://unpkg.com/hostic-dom>. The global name provided here is `hosticDOM` i.e. you can easily use it like this:

```html
<script crossorigin src="https://unpkg.com/hostic-dom"></script>
<script>
  const { h } = hosticDOM
  // Your code here
</script>
```

## Misc

- To set namespace colons in JSX use double underscore i.e. `<xhtml__link />` becomes `<xhtml:link />`
- To allow `CDATA` use the helper function e.g. `<div>{ CDATA(yourRawData) }</div>`
- `style` attributes can handle objects e.g. `<span style={{backgroundColor: 'red'}} />` becomes `<span style="background-color: red" />`
