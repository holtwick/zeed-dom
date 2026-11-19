# Changelog

All notable changes to zeed-dom. For versions up to 0.17.7 see the [GitHub releases](https://github.com/holtwick/zeed-dom/releases).

## 0.21.0

### Changed: Node.js 22 or newer

zeed-dom requires Node.js 22 or newer, `engines` said Node.js 18 before. Node.js 18 and 20 have reached their end of life and no longer get security updates. Bun and browsers are not affected.

### Security: untrusted HTML can no longer inject markup

Parsing untrusted HTML and rendering it again, for example after removing some elements, could produce markup that was not in the input. Update if you render HTML from users, mails or other sites.

- An `html` attribute in parsed HTML was inserted as raw content: `<div html="&lt;img src=x onerror=…&gt;">` rendered as `<div><img src=x onerror=…></div>`. It is an ordinary attribute now, also for elements built with the VDOM `h()`. The `html` prop of `html()` and the JSX runtime still inserts raw markup, as documented.
- Entities in `<script>` and `<style>` were decoded, so `&lt;/style&gt;&lt;img …&gt;` rendered as a real `</style><img …>`. Like in browsers their content is now taken as it is. This also stops the corruption of scripts like `?a=1&section=2`, which turned into `?a=1§ion=2`. 101 of the 258 real-world pages in the test suite render differently for this reason.
- A `<script>` or `<style>` without end tag contains the rest of the input, like in browsers. Before, the rest was parsed as markup inside it.
- Style objects in `html()` and JSX are escaped: `style={{ color: userInput }}` could end the attribute.
- Attribute names that would end the tag (with whitespace, `>` or `=`), for example from `setAttribute(name, …)` or `{...props}` with untrusted keys, are dropped when rendering. Tag names with whitespace, `/` or `>` throw an error, browsers throw an `InvalidCharacterError` for both.
- `safeHTML` and `serializeMarkdown` lost the content of a `<constructor>` element, and `querySelector('constructor')` threw: they found properties of `Object.prototype`.

### New: `htmlStrict()` and a strict JSX runtime

`html()` and the JSX runtime insert a string child that starts with `<` and ends with `>` as markup, because nested elements arrive as plain strings too. So `<p>{userInput}</p>` lets `<img src=x onerror=…>` through. This is unchanged to keep the API stable, the README now warns about it.

The new `htmlStrict()` escapes every string child and inserts only its own results and strings marked with the new `raw()` as markup. It returns an `HTMLString`, a `String` object: use `String(result)` for a plain string. With `"jsxImportSource": "zeed-dom/strict"` JSX uses it as well. Inside `<script>` and `<style>` strings are not escaped, but `</` becomes `<\/`, so they can't end the element. `raw()` also works with `html()`.

### Changed: `serializeMarkdown` escapes markup and unsafe links

Markdown passes HTML through, so the output of `serializeMarkdown` could contain markup that a Markdown renderer shows as HTML.

- `<` in text before a letter, `/`, `!` or `?` is written as `&lt;`, which a Markdown renderer shows as `<` again. `&lt;img onerror=…&gt;` in the HTML no longer becomes a real `<img onerror=…>`. Code blocks stay literal and use a longer fence when the code contains ```` ``` ````.
- Links to `javascript:` and `vbscript:` keep only their text, images with such a `src` or with `data:` other than images are dropped, like in `safeHTML`. Real-world pages use `javascript:void(0)` a lot, these links are now plain text.
- Spaces, `(`, `)`, `<` and `>` in link and image targets are percent-encoded, leading and trailing spaces removed. Before, `href="x)<img …>"` ended the link and left the rest as raw HTML. `[` and `]` in the alt text of images are escaped.

### New: options for `safeHTML`

`safeHTML(html, options)` and `serializeSafeHTML(node, options)` take `allowedTags`, `allowedAttrs`, `allowedUrlSchemes`, `allowRelativeUrls`, `allowDataImages`, `linkRel` and `linkTarget`, see the README. The defaults are exported as `DEFAULT_ALLOWED_TAGS`, `DEFAULT_ALLOWED_ATTRS` and `DEFAULT_ALLOWED_URL_SCHEMES`, the tags dropped with their content as `SERIALIZE_DROP_TAGS`, the option types as `SafeHTMLOptions` and `SerializeMarkdownOptions`.

Whatever `allowedAttrs` says, event handlers (`on…`) and `srcdoc` never pass. Every allowed attribute that holds a URL (`href`, `src`, `action`, `formaction`, `xlink:href`, `poster`, `cite` and others, each candidate of `srcset`) is checked like `href`, so allowing `formaction` can't let `javascript:` through. `style` passes when allowed: it runs no script in current browsers, but can restyle the page and load URLs.

### Changed: `safeHTML` keeps more of the text and less of the page

Without options the output changes for almost every page, for these reasons:

- Inline elements (`b`, `strong`, `em`, `code`, `span`, …) and tables are kept, they were unwrapped before. Links keep `title`, images `title`, `width` and `height`, table cells `colspan` and `rowspan`.
- An image without `alt` gets none, it got `alt=""` before, which marks an image as decorative.
- `iframe`, `object`, `embed`, `noscript`, `template`, `svg` and `math` are dropped with their content, like `script` and `style` before. Their text used to end up in the output.
- A link without `href` or with an empty one keeps only its text, it became `<a href="">` before. `<form>` is unwrapped, its content stays.
- `<hr>` is written without the invalid end tag `</hr>`.
- `href` and `src` are written without the control characters and surrounding whitespace that browsers ignore as well.

### Changed: `serializeMarkdown` output closer to the rendered page

- Ordered lists are numbered and start at the `start` attribute, they were bullet lists before. Nested lists are indented to the content of their item, so CommonMark sees them as nested also below `1.`.
- Whitespace collapses like in a browser: line breaks and indentation of the source no longer end up in the Markdown, and 4 spaces of indentation no longer turn a paragraph into a code block. A no-break space is kept.
- Paragraphs and `div`s inside a list item stay in the item.
- Every line of a block quote is quoted, not only the first.
- Link labels and headings are plain text, an image inside a link is replaced by its alt text, so `[![Logo](logo.png)](/)` becomes `[Logo](/)`. `[` and `]` in link labels are escaped.
- Inline code keeps its spaces when lines are wrapped, and markup in it is escaped like in other text.
- `<pre><code>…</code></pre>` is a plain code block, it had `==` markers around the code inside the block.
- `iframe`, `object`, `embed`, `noscript`, `svg` and `math` are dropped with their content, like in `safeHTML`.
- A line with ```` ``` ```` inside a longer code fence no longer ends the code block when wrapping.
- New options `imageStyle` (`'full'`, `'alt'`, `'none'`) and `headingAnchors`.

### New: text nodes can be changed

Setting `nodeValue`, `textContent` or the new `data` of a text node changes its text, like in the DOM. Before, there were only getters and the text could only be changed through the internal `_text`.

### Performance and robustness

- `element.style` of a `style` attribute of some 10 KB without a colon took about a second because of a quadratic regular expression. It is linear now, with the same result.
- `serializeMarkdown` was quadratic for long runs of whitespace in bold or italic text and of line breaks in list items.
- Selectors with several descendant or `~` combinators like `span div div div` took seconds on deeply nested elements, 28 seconds for four `div`s and 200 levels. Matching now remembers which elements failed, so it is fast for any depth.
- The cache of parsed selectors holds at most 1000 entries. Selectors built from data like `[data-id="…"]` grew it without end.

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
