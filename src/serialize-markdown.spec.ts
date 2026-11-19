import { serializeMarkdown } from './serialize-markdown'
import { parseHTML } from './vdomparser'

describe('serialize markdown', () => {
  it('should serialize a simple unordered list', () => {
    const doc = parseHTML(`<ul><li>A</li><li>B</li></ul>`)
    expect(serializeMarkdown(doc)).toBe(`- A\n- B\n`)
  })

  it('should indent nested lists', () => {
    const doc = parseHTML(`<ul><li>A<ul><li>A1</li><li>A2<ul><li>A2a</li></ul></li></ul></li><li>B</li></ul>`)
    expect(serializeMarkdown(doc)).toBe(
      `- A\n  - A1\n  - A2\n    - A2a\n- B\n`,
    )
  })

  it('should number ordered lists', () => {
    const doc = parseHTML(`<ol><li>A</li><li>B</li><li>C</li></ol>`)
    expect(serializeMarkdown(doc)).toBe(`1. A\n2. B\n3. C\n`)
  })

  it('should indent nested ordered lists', () => {
    const doc = parseHTML(`<ol><li>A<ol><li>A1</li><li>A2</li></ol></li><li>B</li></ol>`)
    expect(serializeMarkdown(doc)).toBe(`1. A\n   1. A1\n   2. A2\n2. B\n`)
  })

  it('should mix ordered and unordered lists', () => {
    const doc = parseHTML(`<ol><li>A<ul><li>a</li><li>b</li></ul></li><li>B</li></ol>`)
    expect(serializeMarkdown(doc)).toBe(`1. A\n   - a\n   - b\n2. B\n`)
  })

  it('should reset counter for ordered list inside unordered', () => {
    const doc = parseHTML(`<ul><li>A<ol><li>x</li><li>y</li></ol></li><li>B</li></ul>`)
    expect(serializeMarkdown(doc)).toBe(`- A\n  1. x\n  2. y\n- B\n`)
  })

  it('should ignore whitespace and newlines between list items', () => {
    const doc = parseHTML(`<ul>\n  <li>A</li>\n  <li>B</li>\n</ul>`)
    expect(serializeMarkdown(doc)).toBe(`- A\n- B\n`)
  })

  it('should collapse newlines inside text content', () => {
    const doc = parseHTML(`<p>foo\n  bar\n\tbaz</p>`)
    expect(serializeMarkdown(doc)).toBe(`foo bar baz\n`)
  })

  it('should preserve whitespace inside <pre>', () => {
    const doc = parseHTML(`<pre>foo\n  bar</pre>`)
    expect(serializeMarkdown(doc)).toBe('```\nfoo\n  bar\n```\n')
  })

  it('should ignore <p> wrappers inside list items', () => {
    const doc = parseHTML(`<ul><li><p>A</p></li><li><p>B</p></li></ul>`)
    expect(serializeMarkdown(doc)).toBe(`- A\n- B\n`)
  })

  it('should ignore <p> wrappers inside ordered list items', () => {
    const doc = parseHTML(`<ol><li><p>A</p></li><li><p>B</p></li></ol>`)
    expect(serializeMarkdown(doc)).toBe(`1. A\n2. B\n`)
  })

  it('should not wrap by default', () => {
    const long = 'word '.repeat(40).trim()
    const doc = parseHTML(`<p>${long}</p>`)
    const out = serializeMarkdown(doc)
    expect(out.trim().split('\n').length).toBe(1)
  })

  it('should wrap paragraphs at the given column', () => {
    const long = 'word '.repeat(40).trim()
    const doc = parseHTML(`<p>${long}</p>`)
    const out = serializeMarkdown(doc, { wrap: 40 })
    for (const line of out.split('\n'))
      expect(line.length).toBeLessThanOrEqual(40)
    expect(out.trim().split('\n').length).toBeGreaterThan(1)
  })

  it('should wrap list items with continuation indent', () => {
    const long = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor'
    const doc = parseHTML(`<ul><li>A<ul><li>${long}</li></ul></li></ul>`)
    const out = serializeMarkdown(doc, { wrap: 40 })
    const lines = out.split('\n').filter(Boolean)
    expect(lines[0]).toBe('- A')
    expect(lines[1]!.startsWith('  - ')).toBe(true)
    for (let i = 2; i < lines.length; i++)
      expect(lines[i]!.startsWith('    ')).toBe(true)
    for (const line of lines)
      expect(line.length).toBeLessThanOrEqual(40)
  })

  it('should render links as inline by default', () => {
    const doc = parseHTML(`<p>See <a href="https://example.com">example</a> here.</p>`)
    expect(serializeMarkdown(doc).trim()).toBe(`See [example](https://example.com) here.`)
  })

  it('should render links as autolink when linkStyle is autolink', () => {
    const doc = parseHTML(`<p>See <a href="https://example.com">example</a> here.</p>`)
    expect(serializeMarkdown(doc, { linkStyle: 'autolink' }).trim())
      .toBe(`See example <https://example.com> here.`)
  })

  it('should collapse autolink when text equals href', () => {
    const doc = parseHTML(`<a href="https://example.com">https://example.com</a>`)
    expect(serializeMarkdown(doc, { linkStyle: 'autolink' }).trim())
      .toBe(`<https://example.com>`)
  })

  it('should render images as inline by default', () => {
    const doc = parseHTML(`<img src="logo.png" alt="Logo">`)
    expect(serializeMarkdown(doc).trim()).toBe(`![Logo](logo.png)`)
  })

  it('should render images as autolink when linkStyle is autolink', () => {
    const doc = parseHTML(`<img src="logo.png" alt="Logo">`)
    expect(serializeMarkdown(doc, { linkStyle: 'autolink' }).trim())
      .toBe(`Logo <logo.png>`)
  })

  it('should collapse autolink image when alt is empty', () => {
    const doc = parseHTML(`<img src="logo.png">`)
    expect(serializeMarkdown(doc, { linkStyle: 'autolink' }).trim())
      .toBe(`<logo.png>`)
  })

  it('should render images as alt-only when imageStyle is alt', () => {
    const doc = parseHTML(`<img src="logo.png" alt="Logo">`)
    expect(serializeMarkdown(doc, { imageStyle: 'alt' }).trim()).toBe(`[Logo]`)
  })

  it('should omit alt-only image when alt is empty', () => {
    const doc = parseHTML(`<p>before<img src="logo.png">after</p>`)
    expect(serializeMarkdown(doc, { imageStyle: 'alt' }).trim()).toBe(`beforeafter`)
  })

  it('should strip images entirely when imageStyle is none', () => {
    const doc = parseHTML(`<p>before<img src="logo.png" alt="Logo">after</p>`)
    expect(serializeMarkdown(doc, { imageStyle: 'none' }).trim()).toBe(`beforeafter`)
  })

  it('should append heading anchor when enabled and id attribute is present', () => {
    const doc = parseHTML(`<h2 id="intro">Intro</h2>`)
    expect(serializeMarkdown(doc, { headingAnchors: true }).trim()).toBe(`## Intro {#intro}`)
    expect(serializeMarkdown(doc).trim()).toBe(`## Intro`)
  })

  it('should not append anchor when heading has no id', () => {
    const doc = parseHTML(`<h2>Intro</h2>`)
    expect(serializeMarkdown(doc).trim()).toBe(`## Intro`)
  })

  it('should preserve inline styles by default', () => {
    const doc = parseHTML(`<p>A <b>bold</b> and <i>italic</i> and <code>code</code> word.</p>`)
    expect(serializeMarkdown(doc).trim()).toBe(`A **bold** and *italic* and ==code== word.`)
  })

  it('should strip inline styles when inlineStyles is false', () => {
    const doc = parseHTML(`<p>A <b>bold</b> and <i>italic</i> and <code>code</code> word.</p>`)
    expect(serializeMarkdown(doc, { inlineStyles: false }).trim())
      .toBe(`A bold and italic and code word.`)
  })

  it('should keep block structure when stripping inline styles', () => {
    const doc = parseHTML(`<h1>Title <em>emph</em></h1><ul><li><strong>X</strong></li></ul>`)
    expect(serializeMarkdown(doc, { inlineStyles: false }))
      .toBe(`# Title emph\n\n- X\n`)
  })

  it('should not wrap fenced code blocks', () => {
    const code = 'a'.repeat(120)
    const doc = parseHTML(`<pre>${code}</pre>`)
    const out = serializeMarkdown(doc, { wrap: 40 })
    expect(out).toContain(code)
  })

  it('should convert a real world page', () => {
    const html = `<!DOCTYPE html><html lang="en" data-beasties-container><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Press | Receipts Mac App</title><link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/logo.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png"><link rel="search" type="application/opensearchdescription+xml" title="Receipts Space" href="/opensearch.xml"><link rel="search" type="application/opensearchdescription+xml" title="Receipts Space (de)" href="/opensearch-de.xml"><script>const theme=localStorage.getItem("vueuse-color-scheme");("dark"===theme||"light"!==theme&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)&&document.documentElement.classList.add("dark")</script><style>:where(.dark body){background:#000;color:#fff}</style><script type="module" async crossorigin src="/assets/jdg7jd5l8pt0z0.js"></script><style>.app-header{z-index:100;background:var(--bg);-webkit-backdrop-filter:saturate(180%) blur(20px);backdrop-filter:saturate(180%) blur(20px);background:rgba(255,255,255,.8);border-bottom:1px solid transparent;transition:all .2s;position:-webkit-sticky;position:sticky;top:0}.app-header-inner{font-size:1.25rem;font-family:var(--font-sans);padding-top:1.5rem;padding-bottom:1.5rem;padding-left:var(--grid-gutter);padding-right:var(--grid-gutter);color:var(--s2-fg);gap:var(--grid-gutter);grid-template-columns:min-content auto min-content;line-height:1;transition:all .2s;display:grid}.app-header-title a{flex-direction:row;display:flex}.app-header-title-text{justify-content:center;align-items:center;padding-left:.5rem;font-weight:600;display:flex}.app-header-title img{width:3rem;height:3rem;transition:all .2s;display:block}.app-header-helpers,.app-header-nav{flex-direction:row;align-items:center;display:flex}.app-header-helpers>*,.app-header-nav>*{margin-right:1rem;margin-right:var(--space-s)}.app-header-helpers>:last-child,.app-header-nav>:last-child{margin-right:0}.app-header-nav{flex:auto;justify-content:flex-end;overflow:hidden}.app-header-helpers{justify-content:flex-end}.app-header-helpers>*{margin-right:1rem;margin-right:var(--space-s)}.app-header-helpers>:last-child{margin-right:0}@media (max-width:760px){.app-header{grid-template-columns:auto min-content;transition:all .2s}.app-header-inner{gap:0;transition:all .2s}.app-header-nav{background:var(--s2-bg);color:var(--fg);background:var(--p1-bg);border-radius:.5rem;flex-wrap:wrap;order:1;grid-column:1/3;justify-content:center;gap:0;height:auto;max-height:400px;margin-top:1rem;font-size:1rem;transition:all .2s}.app-header-nav>*{flex:auto;margin:0;padding:1.5rem;overflow:hidden}.app-header-menu{max-width:100%}.app-header-helpers{order:0}}.app-header a{color:var(--s2-fg);display:flex}.app-header a.app-header-menu{color:var(--s2-fg);cursor:pointer;white-space:nowrap;flex-direction:row;justify-content:center;align-items:center;height:1.5rem;font-weight:600;display:flex}.app-header a.app-header-menu>*{margin-right:.25rem;margin-right:var(--space-3xs)}.app-header a.app-header-menu>:last-child{margin-right:0}.app-header a.app-header-menu svg{display:inline}.app-header a.app-header-menu span{justify-content:center;align-items:center;height:1.5rem;display:flex}.app-header a.app-header-menu:hover{color:var(--link-fg)}.app-header a.app-header-menu-locale{border:.09375rem solid;border-radius:.25rem;margin-left:.25rem;padding:.15625rem .21875rem;font-size:70%}.app-header a.app-header-menu-locale:hover{border-color:var(--link-fg);color:var(--link-fg)}:where(.oui-text) *{-webkit-user-select:text;-moz-user-select:text;-ms-user-select:text;user-select:text}:where(.oui-text) h1{color:inherit;font-weight:var(--text-font-weight-bold);margin-top:var(--text-paragraph-spacing);margin-bottom:var(--text-paragraph-spacing);line-height:1.2}:where(.oui-text) h2{color:inherit;font-weight:var(--text-font-weight-bold);margin-top:var(--text-paragraph-spacing);margin-bottom:var(--text-paragraph-spacing);line-height:1.2}:where(.oui-text) h1{font-size:2rem}:where(.oui-text) h2{font-size:1.6rem}:where(.oui-text) p{margin-top:var(--text-paragraph-spacing);margin-bottom:var(--text-paragraph-spacing)}:where(.oui-text) ul{margin-top:var(--text-paragraph-spacing);margin-bottom:var(--text-paragraph-spacing)}:where(.oui-text) a{text-decoration-skip:ink edges}:where(.oui-text) a{color:var(--link-fg)}:where(.oui-text) a:hover{color:var(--link-fg-hover);text-decoration:underline}:where(.oui-text) a:active{color:var(--link-fg-active)}:where(.oui-text) ul{margin:0 0 0 2rem;padding:0;list-style-position:outside}:where(.oui-text) ul li{margin:0}:where(.oui-text) ul{list-style:outside}:where(.oui-text)>:first-child{margin-top:0}:where(.oui-text)>:last-child{margin-bottom:0}:where(.oui-text) img{margin-top:var(--text-paragraph-spacing);margin-bottom:var(--text-paragraph-spacing);display:block}:root{--modal-radius:.5rem;--modal-separator:transparent;--modal-bg:var(--dialog-bg,var(--s2-bg));--modal-speed:.4s;--modal-blur:2px;--modal-backdrop:rgba(0,0,0,.5)}@media (max-width:960px){.app-header-nav svg{display:none!important}}:root{--step--2:min(max(.6944rem, .6913rem + .0157vw), .7035rem);--step--1:min(max(.8333rem, .797rem + .1816vw), .9377rem);--step-0:min(max(1rem, .913rem + .4348vw), 1.25rem);--step-1:min(max(1.2rem, 1.0378rem + .8109vw), 1.6663rem);--step-2:min(max(1.44rem, 1.1683rem + 1.3585vw), 2.2211rem);--step-3:min(max(1.728rem, 1.2992rem + 2.1439vw), 2.9607rem);--step-4:min(max(2.0736rem, 1.4221rem + 3.2575vw), 3.9467rem);--step-5:min(max(2.4883rem, 1.5239rem + 4.8219vw), 5.2609rem);--space-3xs:min(max(.25rem, .2283rem + .1087vw), .3125rem);--space-2xs:min(max(.5rem, .4565rem + .2174vw), .625rem);--space-xs:min(max(.75rem, .6848rem + .3261vw), .9375rem);--space-s:min(max(1rem, .913rem + .4348vw), 1.25rem);--space-m:min(max(1.5rem, 1.3696rem + .6522vw), 1.875rem);--space-l:min(max(2rem, 1.8261rem + .8696vw), 2.5rem);--space-xl:min(max(3rem, 2.7391rem + 1.3043vw), 3.75rem);--space-xxl:min(max(4rem, 3.6522rem + 1.7391vw), 5rem);--space-xxxl:min(max(6rem, 5.4783rem + 2.6087vw), 7.5rem);--space-3xs-2xs:min(max(.25rem, .1196rem + .6522vw), .625rem);--space-2xs-xs:min(max(.5rem, .3478rem + .7609vw), .9375rem);--space-xs-s:min(max(.75rem, .5761rem + .8696vw), 1.25rem);--space-s-m:min(max(1rem, .6957rem + 1.5217vw), 1.875rem);--space-m-l:min(max(1.5rem, 1.1522rem + 1.7391vw), 2.5rem);--space-l-xl:min(max(2rem, 1.3913rem + 3.0435vw), 3.75rem);--space-xl-xxl:min(max(3rem, 2.3043rem + 3.4783vw), 5rem);--space-xxl-xxxl:min(max(4rem, 2.7826rem + 6.087vw), 7.5rem);--space-s-l:min(max(1rem, .4783rem + 2.6087vw), 2.5rem);--grid-max-width:77.5rem;--grid-gutter:var(--space-s-l,min(max(1rem, .4783rem + 2.6087vw), 2.5rem));--grid-columns:12}.prose{--text-font-weight-bold:600;--text-list-indent:var(--space-m);--text-paragraph-spacing:var(--space-xs);--text-table-cell-padding:.5rem;font-size:1rem;font-size:var(--step-0);line-height:1.5}.prose,.prose *{-webkit-user-select:text;-moz-user-select:text;-ms-user-select:text;user-select:text}.prose h1,.prose h2{clear:both;color:inherit;font-weight:var(--text-font-weight-bold);margin-top:var(--space-m);margin-bottom:var(--text-paragraph-spacing);text-wrap:balance;outline:0;scroll-padding-top:5.5rem;line-height:1.2;position:relative}.prose h1 :where(a){color:inherit;text-decoration:none}.prose h2 :where(a){color:inherit;text-decoration:none}.prose h1 :where(a):hover{color:var(--link-fg)}.prose h2 :where(a):hover{color:var(--link-fg)}.prose h1 :where(a):active{color:var(--link-fg)}.prose h2 :where(a):active{color:var(--link-fg)}.prose h1:first-child,.prose h2:first-child{margin-top:0;padding-top:0}.prose h1{margin-top:var(--space-xl);font-size:1.728rem;font-size:var(--step-3)}.prose h2{margin-top:var(--space-xl);font-size:1.44rem;font-size:var(--step-2)}.prose p{margin-top:var(--text-paragraph-spacing);margin-bottom:var(--text-paragraph-spacing)}.prose a{text-decoration-skip:ink edges}.prose :where(a){color:var(--link-fg);text-underline-offset:.125rem;text-decoration:underline;text-decoration-thickness:1px;-webkit-text-decoration-color:var(--link-fg);text-decoration-color:var(--link-fg);font-weight:500}.prose :where(a):hover{color:var(--link-fg-hover);text-decoration:underline}.prose :where(a):active{color:var(--link-fg-active)}.prose>:not(div):first-child{margin-top:0;padding-top:0}.prose>:last-child{margin-bottom:0}.prose img{margin-top:var(--text-paragraph-spacing);margin-bottom:var(--text-paragraph-spacing);max-width:100%;display:block}html{text-rendering:optimizelegibility;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;box-sizing:border-box;-webkit-text-size-adjust:100%;scroll-behavior:smooth;line-height:1}a,article,body,div,footer,h1,h2,header,html,img,li,nav,p,span,ul{font:inherit;vertical-align:baseline;border:0;margin:0;padding:0}article,footer,header,nav{display:block}ul{list-style:none}body,h1,h2,html,li,p,ul{margin:0;padding:0}h1,h2{font-size:100%;font-weight:400}ul{list-style:none}a{color:inherit;background-color:transparent;outline:0;text-decoration:none}img{height:auto;display:block}*,:after,:before{box-sizing:inherit}html{text-rendering:optimizelegibility;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;box-sizing:border-box;-webkit-text-size-adjust:100%;scroll-behavior:smooth;scrollbar-gutter:stable;height:100%;margin:0;padding:0;overflow-x:hidden}body{color:var(--fg);background:var(--bg);font-family:var(--font-sans);height:100%;margin:0;padding:0;font-size:1rem}main a{color:var(--link-fg)}#app{flex-direction:column;min-height:100%;display:flex}.app-content,.app-footer,.app-header-inner{width:100%;max-width:var(--grid-max-width);flex-shrink:0;margin-left:auto;margin-right:auto}.app-content,.app-footer{padding-left:var(--grid-gutter);padding-right:var(--grid-gutter)}.app-content{padding-top:var(--space-l);flex-grow:1}.app-footer{gap:var(--grid-gutter);line-height:1.5;font-family:var(--font-sans);font-size:1rem;font-size:var(--step-0);padding-top:var(--space-m);padding-bottom:var(--space-m);padding-top:var(--space-xl);white-space:nowrap;line-height:1.5rem;display:grid;position:relative}.app-footer ul{gap:var(--space-xs)}.app-footer li{padding-right:var(--space-xs);display:block}@media (min-width:40rem){.app-footer{font-size:.8333rem;font-size:var(--step--1);grid-template-columns:auto min-content}.app-footer li{display:inline-block}}img[alt*=right]{float:right;clear:right;max-width:33%;margin-top:.5rem;margin-bottom:2rem;margin-left:2rem}img{border-radius:.25rem}.prose h1,h1{font-size:1.728rem;font-size:var(--step-3);color:inherit;line-height:1.2;font-weight:var(--prose-font-weight-bold,600);margin-top:var(--space-m);margin-bottom:var(--space-m)}.app-content{position:relative}.post{max-width:50rem;margin-left:auto;margin-right:auto}h1,h2{text-wrap:balance}:root{--n0-50:#f5f6f6;--n0-100:#e6e7e7;--n0-200:#d0d1d1;--n0-300:#aeb0b2;--n0-400:#7d8082;--n0-500:#6b6e6f;--n0-600:#5b5d5f;--n0-700:#4e4f50;--n0-800:#444546;--n0-900:#3c3d3d;--n0-950:#252527;--p1-50:#ebffff;--p1-100:#cefeff;--p1-200:#a3fbfe;--p1-300:#63f6fd;--p1-400:#1de6f3;--p1-500:#01c9d9;--p1-600:#03a0b7;--p1-700:#0a798c;--p1-800:#126678;--p1-900:#145565;--p1-950:#063846;--p1:#03a0b7;--p1-rgb:3,160,183;--fg:var(--n0-950,#000);--bg:#fefefe;--p1-fg:var(--p1-700);--p1-bg:#e5f0f2;--s2-fg:var(--n0-800);--s2-bg:var(--n0-50);--t3-fg:var(--n0-700);--t3-bg:var(--n0-100)}:root{--font-sans:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",sans-serif;--font-serif:ui-serif,Georgia,Cambria,Times New Roman,Times,serif;--font-mono:Menlo,SFMono-Regular,monospace;--font:var(--font-sans);--control-color:var(--p1-500);--control-inner:#fff;--control-hover:var(--p1-600);--control-active:var(--p1-700);--button-fg:#fff;--button-bg:var(--p1-700);--button-bg-hover:var(--p1-800);--button-bg-active:var(--p1-900);--input-fg:var(--fg);--input-bg:#fff;--input-border:var(--n0-200);--input-border-hover:var(--p1-300);--input-border-focus:#4299e1;--input-shadow-focus:0 0 0 3px rgba(66,153,225,.5);--input-radius:4px;--panel-bg:var(--n0-100);--panel-bg-hover:var(--p1-100);--tag-fg:var(--n0-50);--tag-bg:var(--n0-500);--tag-bg-hover:var(--n0-900)}:root{--link-fg:var(--p1-700);--link-fg-hover:var(--p1-800);--link-fg-active:var(--p1-900);--mark-bg:#ff0}</style><link rel="preload" crossorigin href="/assets/g9cr75uh1uopcyd.css" as="style"><script type="module">import'data:text/javascript,if(!import.meta.resolve)throw Error("import.meta.resolve not supported")';import.meta.url,import("_").catch(()=>1),async function*(){}().next(),window.__vite_is_modern_browser=!0</script><script type="module">!function(){if(!window.__vite_is_modern_browser){console.warn("vite: loading legacy chunks, syntax error above and the same error below should be ignored");var e=document.getElementById("vite-legacy-polyfill"),t=document.createElement("script");t.src=e.src,t.onload=function(){System.import(document.getElementById("vite-legacy-entry").getAttribute("data-src"))},document.body.appendChild(t)}}()</script><link rel="modulepreload" crossorigin href="/assets/dz73b7lf1cif4hd-legacy.js"><link rel="modulepreload" crossorigin href="/assets/gwhiiind1cif4hd.js"><link rel="preload" href="/assets/h4yeqpkk8xud6g.css" as="style"><link rel="modulepreload" crossorigin href="/assets/ob5eyz6o1lxu8bg-legacy.js"><link rel="modulepreload" crossorigin href="/assets/ixryj5vr1lxu8bg.js"><meta name="description" content="Receipts Space is a private, local document and receipt hub for macOS. Import from PDF/email/scans, OCR extraction, automation, and a clear financial overview. Try it now for free!"><meta name="generator" content="Proprietary tool based on Vite SSG, see https://holtwick.de/blog/website-ssg"><meta name="twitter:image" content="https://receipts-app.com/og/press.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Press | Receipts Mac App"><meta name="twitter:description" content="Receipts Space is a private, local document and receipt hub for macOS. Import from PDF/email/scans, OCR extraction, automation, and a clear financial overview. Try it now for free!"><meta name="fediverse:creator" content="@holtwick@mastodon.social"><meta property="og:type" content="website"><meta property="og:image" content="https://receipts-app.com/og/press.png"><meta property="og:url" content="https://receipts-app.com/press"><meta property="og:locale" content="en"><meta property="og:site_name" content="Receipts Mac App"><meta property="og:title" content="Press | Receipts Mac App"><meta property="og:description" content="Receipts Space is a private, local document and receipt hub for macOS. Import from PDF/email/scans, OCR extraction, automation, and a clear financial overview. Try it now for free!"><link rel="canonical" href="https://receipts-app.com/press"><link rel="alternate" hreflang="en" href="https://receipts-app.com/press"><link rel="alternate" hreflang="de" href="https://receipts-app.com/de/press"><link rel="alternate" hreflang="x-default" href="https://receipts-app.com/press"><link rel="alternate" type="application/rss+xml" title="Receipts Mac App (de)" href="/de/feed.xml"><script>!function(){const e=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches,t=localStorage.getItem("vueuse-color-scheme")||"auto";("dark"===t||e&&"light"!==t)&&document.documentElement.classList.toggle("dark",!0)}()</script><meta name="robots" content="index"><meta name="googlebot" content="index"></head><body><div id="app" data-server-rendered="true"><!--[--><header class="app-header"><nav class="app-header-inner"><div class="app-header-title"><a href="/" class aria-label="Homepage"><!--[--><img width="48" height="48" src="data:image/png;base64,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" srcset="/assets/mwglbl354e70q9.png 2x" alt="Logo"><!--]--><div class="app-header-title-text"><!--[-->Receipts Space<!--]--></div></a></div><div class="app-header-nav"><!--[--><a href="/help" class="app-header-menu"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-question-mark-icon lucide-circle-question-mark" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg><span>How it works</span></a><a href="/support" class="app-header-menu"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-user-icon lucide-circle-user" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></svg><span>Support</span></a><a href="/buy" class="app-header-menu"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-coins-icon lucide-coins" aria-hidden="true"><path d="M13.744 17.736a6 6 0 1 1-7.48-7.48"/><path d="M15 6h1v4"/><path d="m6.134 14.768.866-.5 2 3.464"/><circle cx="16" cy="8" r="6"/></svg><span>Pricing</span></a><a href="/download" class="app-header-menu _beta"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-down-to-line-icon lucide-arrow-down-to-line" aria-hidden="true"><path d="M12 17V3"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/></svg><span>Download</span></a><!--]--></div><div class="app-header-helpers"><!----><a href="/de/press" class="app-header-menu app-header-menu-locale" aria-label="Change Language" tooltip="Change language" data-lang="en" data-path="/press"><!--[-->DE<!--]--></a></div></nav></header><main class="app-content"><!----><!--[--><!----><article data-priority="1" data-slug="press" class="post prose"><h1 class="post-title">Press</h1><!----><div class="post-body"><div class="markdown-body"><h2 id="contact" tabindex="-1"><a class="header-anchor" href="#contact">Contact</a></h2><p><a href="mailto:press@holtwick.de" target="_blank" rel="noopener noreferrer" class="external">press@holtwick.de</a></p><h2 id="press-kit-download" tabindex="-1"><a class="header-anchor" href="#press-kit-download">Press Kit Download</a></h2><p><a href="/download/other/Receipts-Space-Press-Kit-3.zip">Receipts-Space-Press-Kit-3.zip</a></p><h2 id="sample-data-and-license" tabindex="-1"><a class="header-anchor" href="#sample-data-and-license">Sample data and license</a></h2><p><img src="/assets/iwvikstfo5fweo.png" alt="right" width="214" height="160" loading="lazy">Sample data can be created in the Receipts Space app via the Help menu.</p><p>All functions are activated during the 14-day trial period. We will be happy to provide individual licenses on request.</p></div><!----></div><!----></article><!--]--></main><footer class="app-footer"><div class="app-footer-left"><a href="https://holtwick.de" target="_blank">©&nbsp;Dirk&nbsp;Holtwick</a></div><nav class="app-footer-right"><ul><!--[--><li><a href="/changelog" class>Changelog</a></li><li><a href="/social" class>Social</a></li><!--]--><li><a href="/imprint" class="app-header-menu">Imprint</a></li><li><a href="/privacy" class="app-header-menu">Privacy</a></li><li><a href="/license" class="app-header-menu">License</a></li><li><a href="/support" class="app-header-menu">Support</a></li><li><a aria-current="page" href="/press" class="router-link-active router-link-exact-active app-header-menu">Press</a></li><!----><!----><!----><li><a href="/blog" class="app-header-menu">Blog</a></li><li><a href="/feed.xml" rel="noopener noreferrer" type="application/rss+xml" target="_blank">RSS</a></li></ul></nav></footer><!----><!--]--></div><script nomodule>!function(){var e=document,t=e.createElement("script");if(!("noModule"in t)&&"onbeforeload"in t){var n=!1;e.addEventListener("beforeload",function(e){if(e.target===t)n=!0;else if(!e.target.hasAttribute("nomodule")||!n)return;e.preventDefault()},!0),t.type="module",t.src=".",e.head.appendChild(t),t.remove()}}()</script><script nomodule crossorigin id="vite-legacy-polyfill" src="/assets/kvezhr0k14e6buf-legacy.js"></script><script nomodule crossorigin id="vite-legacy-entry" data-src="/assets/f0zwdy5f8pt0z0-legacy.js">System.import(document.getElementById("vite-legacy-entry").getAttribute("data-src"))</script><link rel="stylesheet" crossorigin href="/assets/g9cr75uh1uopcyd.css"><link rel="stylesheet" href="/assets/h4yeqpkk8xud6g.css"></body></html>`

    const doc = parseHTML(html)
    expect(serializeMarkdown(doc, { inlineStyles: false, imageStyle: 'none' }))
      .toMatchInlineSnapshot(`
        "[LogoReceipts Space](/)

        [How it works](/help)[Support](/support)[Pricing](/buy)[Download](/download)

        [DE](/de/press)

        # Press

        ## Contact

        [press@holtwick.de](mailto:press@holtwick.de)

        ## Press Kit Download

        [Receipts-Space-Press-Kit-3.zip](/download/other/Receipts-Space-Press-Kit-3.zip)

        ## Sample data and license

        Sample data can be created in the Receipts Space app via the Help menu.

        All functions are activated during the 14-day trial period. We will be happy to provide individual licenses on request.

        [©\u00A0Dirk\u00A0Holtwick](https://holtwick.de)

        - [Changelog](/changelog)
        - [Social](/social)
        - [Imprint](/imprint)
        - [Privacy](/privacy)
        - [License](/license)
        - [Support](/support)
        - [Press](/press)
        - [Blog](/blog)
        - [RSS](/feed.xml)
        "
      `)
  })
})

describe('serialize markdown whitespace and structure', () => {
  const md = (html: string, opts = {}) => serializeMarkdown(parseHTML(html), opts)

  it('should not leave space-only lines between pretty printed blocks', () => {
    expect(md('<p>a</p>\n<p>b</p>')).toBe('a\n\nb\n')
    expect(md('<ul>\n <li>a</li>\n</ul>\n<p>  x</p>')).toBe('- a\n\nx\n')
  })

  it('should not indent paragraphs from source whitespace', () => {
    expect(md('<div>\n    <p>    indented a lot</p>\n</div>')).toBe('indented a lot\n')
  })

  it('should keep word boundaries around inline styles', () => {
    expect(md('foo<b> bar</b>baz')).toBe('foo **bar**baz\n')
    expect(md('see<em> this </em>now')).toBe('see *this* now\n')
    expect(md('a<b></b>b')).toBe('ab\n')
  })

  it('should keep whitespace between inline elements in table cells', () => {
    expect(md('<table><tr><td><b>a</b> <i>b</i></td></tr></table>')).toBe('| **a** *b* |\n')
  })

  it('should render a header delimiter row and no doubled pipes', () => {
    expect(md('<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2|3</td></tr></table>'))
      .toBe('| A | B |\n| --- | --- |\n| 1 | 2\\|3 |\n')
  })

  it('should indent nested lists to the content of the parent item', () => {
    expect(md('<ol><li>a</li><li>b<ol><li>c</li></ol></li><li>d</li></ol>'))
      .toBe('1. a\n2. b\n   1. c\n3. d\n')
    expect(md('<ul><li>a<ol><li>b<ul><li>c</li></ul></li></ol></li></ul>'))
      .toBe('- a\n  1. b\n     - c\n')
  })

  it('should indent a list nested directly in a list', () => {
    expect(md('<ul><li>a</li><ul><li>b</li></ul></ul>')).toBe('- a\n  - b\n')
  })

  it('should keep whitespace inside inline code', () => {
    expect(md('x <code>a   b</code> y')).toBe('x ==a   b== y\n')
    expect(md('<p><code>a\nb</code></p>')).toBe('==a b==\n')
    expect(md('x <code>a   b</code> y', { wrap: 4 })).toBe('x\n==a   b==\ny\n')
  })

  it('should keep content wrapped in a form', () => {
    expect(md('<form><p>hello</p><input name="x"></form>')).toBe('hello\n')
  })
})

describe('serialize markdown fixes', () => {
  const md = (html: string) => serializeMarkdown(parseHTML(html))

  it('should serialize a complete document', () => {
    expect(md('<!DOCTYPE html><html><head><title>T</title><style>p{color:red}</style></head><body><h1>Hi</h1><p>a <b>b</b></p><script>x()</script></body></html>'))
      .toBe('# Hi\n\na **b**\n')
  })

  it('should move whitespace outside of inline markers', () => {
    expect(md('foo<b> bar</b>baz')).toBe('foo **bar**baz\n')
    expect(md('see<em> this </em>now')).toBe('see *this* now\n')
    expect(md('a<b>b</b>c')).toBe('a**b**c\n')
    expect(md('a<b></b>b')).toBe('ab\n')
  })

  it('should render tables without doubled pipes and with a header delimiter row', () => {
    expect(md('<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2|3</td></tr></table>'))
      .toBe('| A | B |\n| --- | --- |\n| 1 | 2\\|3 |\n')
  })
})
