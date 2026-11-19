# Changelog

All notable changes to zeed-dom. For versions up to 0.17.7 see the [GitHub releases](https://github.com/holtwick/zeed-dom/releases).

## 0.21.0

### Changed: Node.js 22 or newer

zeed-dom requires Node.js 22 or newer, `engines` said Node.js 18 before. Node.js 18 and 20 have reached their end of life and no longer get security updates. Bun and browsers are not affected.

## 0.20.0

The public API is unchanged: the same exports, classes, methods and type signatures as in 0.19.2. Some behavior changed, almost always to what a browser DOM does. Of the 258 real-world pages in the test suite, 244 render exactly as before; the other 14 are covered by the parser fixes below.

### Performance and robustness

Parsing and DOM operations no longer become slow or crash on large or hostile input, see [PERFORMANCE.md](PERFORMANCE.md) for numbers and a comparison with linkedom, happy-dom and jsdom.

- `appendChild`, `nextSibling` and `previousSibling` are O(1) instead of O(n), so building and walking parents with many children is no longer quadratic ([#18](https://github.com/holtwick/zeed-dom/issues/18)). This speeds up ProseMirror and tiptap on the server.
- The HTML tokenizer is rewritten and linear in the length of the input. Before, about 6 KB of unclosed tags could block the parser for half a minute.
- Nesting of parsed elements is limited to 512 levels, like in Chrome. Deeper elements become siblings at that depth.
- `render`, `outerHTML`, `textContent`, `querySelector`, `querySelectorAll`, `cloneNode` and `contains` no longer recurse, so deep trees can't overflow the call stack.
- `querySelector`, `getElementById`, `document.body` and `document.head` stop at the first match.
- `:first-child`, `:last-child` and `:nth-child` are no longer quadratic for parents with many children.
- `removeChild`, `insertBefore`, `replaceWith` and `insertAdjacentHTML` no longer touch all siblings on each call.
- Rendering HTML is about twice as fast, `querySelectorAll` about four times, `serializePlaintext` almost three times, with the same output.

### Changed: DOM methods behave like in the DOM

- `insertBefore(node, null)` appends, it inserted at the start before. This is the common `parent.insertBefore(node, ref.nextSibling)` pattern when `ref` is the last child.
- `insertBefore` removes the node from its previous parent first, and inserting a `DocumentFragment` inserts its children.
- `replaceChildren`, setting `textContent` and setting `innerHTML` detach the old children: their `parentNode` is `null`.
- A node passed twice to `replaceChildren` or `replaceWith` is inserted once.
- `a.replaceWith(b)` works when `b` is a sibling of `a`, it left `a` in place before.
- Inserting a node into itself or one of its descendants is ignored with a console warning. Before it made the node its own ancestor and `render()` never returned. The DOM throws a `HierarchyRequestError` here.

Unchanged on purpose: `insertBefore(node)` without a second argument still inserts at the start, and an unknown reference node still inserts at the start instead of throwing.

### Changed: parsing

- A tag that could not be parsed is no longer replaced by a tag from a later line. The old tokenizer matched across lines, which lost text like `< x` or `ARTICLE:<` and duplicated the following tag. This changes 8 of the 258 test pages.
- Like in browsers, a trailing slash belongs to an unquoted attribute value: `<a href=http://example.com/>link</a>` keeps the URL and the link text, it became an empty link to `http://example.com` before. This changes 6 of the test pages.
- A start tag needs a letter, `!` or `?` after the `<`, like in browsers. `a<3 b` or `<&x>` are text now.
- A quoted attribute value that is never closed ends at the next `>`, so `<p title="x>a</p><p>b</p>` gives two paragraphs.
- A start tag that is still open at the end of the input is kept as text together with everything after it.
- `<!-->` and `<!--->` are empty comments.
- `<a b = c>` gives `b="c"`.

### Tests

- The test suite runs on Node.js, on Bun and in Chromium, Firefox and WebKit, also in CI.
- Golden files: the rendered HTML, Markdown, plaintext, safe HTML and text of 258 real-world pages are compared to a snapshot.
- Differential tests compare parsing and random DOM mutations with a real DOM (the browser's or jsdom).
- `npm run perf:compare` benchmarks against linkedom, happy-dom and jsdom on Node.js and Bun and writes the tables in PERFORMANCE.md and README.md.
