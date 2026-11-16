import { describe, expect, it } from 'vitest'
import { hArgumentParser } from './h'
import { CDATA, html, markup } from './html'
import { serializeMarkdown } from './serialize-markdown'
import { serializePlaintext } from './serialize-plaintext'
import { safeHTML, serializeSafeHTML } from './serialize-safehtml'
import { h } from './vdom'
import { parseHTML } from './vdomparser'

const md = (s: string) => serializeMarkdown(parseHTML(s))

describe('markdown rules', () => {
  it('should render every inline style', () => {
    expect(md('<i>i</i> <em>em</em> <u>u</u> <mark>m</mark>')).toBe('*i* *em* <u>u</u> ==m==\n')
    expect(md('<tt>tt</tt> <code>c</code> <strike>s</strike> <del>d</del> <ins>n</ins>')).toBe('==tt== ==c== ~~s~~ ~~d~~ ++n++\n')
    expect(md('a<sub>2</sub> b<sup>3</sup> c<super>4</super>')).toBe('a~2~ b^3^ c^4^\n')
  })

  it('should render all heading levels', () => {
    expect(md('<h1>1</h1><h2>2</h2><h3>3</h3><h4>4</h4><h5>5</h5><h6>6</h6>'))
      .toBe('# 1\n\n## 2\n\n### 3\n\n#### 4\n\n##### 5\n\n###### 6\n')
  })

  it('should render blocks', () => {
    expect(md('<blockquote>q</blockquote><pre>a\n  b</pre><hr><div>d</div>'))
      .toBe('> q\n\n```\na\n  b\n```\n\n---\n\nd\n')
  })

  it('should render a table caption', () => {
    expect(md('<table><caption>C</caption><tr><td>1</td></tr></table>')).toBe('C\n| 1 |\n')
  })
})

describe('plaintext and safe html rules', () => {
  it('should drop script and style in plaintext', () => {
    expect(serializePlaintext(parseHTML('<p>a<script>x()</script><style>p{}</style>b</p>'))).toBe('ab\n')
  })

  it('should drop invisible content and keep line breaks in safe html', () => {
    expect(safeHTML('<p>a<br>b</p><title>T</title><script>x()</script><style>p{}</style>')).toBe('<p>a<br>b</p>')
    expect(serializeSafeHTML(parseHTML('<head><title>T</title></head><p>x</p>'))).toBe('<p>x</p>')
  })
})

describe('h and html', () => {
  it('should create a div for an empty tag and handle on and className', () => {
    expect((h('', null) as any).tagName).toBe('DIV')
    const el = h('button', {
      className: 'btn',
      on: { click: 'go()' },
    }) as any
    expect(el.outerHTML).toBe('<button class="btn" onclick="go()"></button>')
  })

  it('should take tag, attrs and children from an object', () => {
    const parsed = hArgumentParser({
      attrs: { id: 'x' },
      children: ['a'],
    } as any)
    expect(parsed.tag).toBe('fragment')
    expect(parsed.attrs).toEqual({ id: 'x' })
    expect(parsed.children).toEqual(['a'])
  })

  it('should render raw html, skip empty attribute names and escape nested array children', () => {
    expect(html('div', { html: '<b>raw</b>' })).toBe('<div><b>raw</b></div>')
    expect(markup(false, 'p', { '': 'x', 'id': 'y' }, [
      ['a', null, false, '<b>b</b>', 1],
    ])).toBe('<p id="y">a<b>b</b>1</p>')
    expect(markup(false, 'p', {}, [
      ['a < b'],
    ])).toBe('<p>a &lt; b</p>')
    expect(CDATA('x')).toBe('<![CDATA[x]]>')
  })
})

describe('parser edge cases', () => {
  it('should parse unquoted and empty attributes', () => {
    const el = parseHTML('<input value=abc disabled data-x="">').querySelector('input')!
    expect(el.getAttribute('value')).toBe('abc')
    expect(el.hasAttribute('disabled')).toBe(true)
    expect(el.getAttribute('data-x')).toBe('')
  })

  it('should insert plain text with insertAdjacentHTML', () => {
    const el = parseHTML('<p>x</p>').querySelector('p')!
    el.insertAdjacentHTML('beforeend', ' & more')
    expect(el.textContent).toBe('x & more')
  })

  it('should close uppercase single letter elements', () => {
    // The original case of the tag name is kept on render, what matters is that
    // ` after` is no longer swallowed by an unclosed `B`
    const frag = parseHTML('<B>bold</B> after <I>x</I><P>p</P>')
    expect(frag.render()).toBe('<B>bold</B> after <I>x</I><P>p</P>')
    expect(frag.querySelector('b')?.textContent).toBe('bold')
    expect(frag.childNodes.length).toBe(4)
  })
})

describe('review fixes', () => {
  it('should forget the style cache when the attribute is removed', () => {
    const el = parseHTML('<p style="color: red" data-a="1">x</p>').querySelector('p')!
    expect(el.style.color).toBe('red')
    expect(el.dataset.a).toBe('1')
    el.removeAttribute('style')
    el.removeAttribute('data-a')
    expect(el.style.color).toBeUndefined()
    expect(el.dataset.a).toBeUndefined()
  })

  it('should keep block boundaries inside inline styles', () => {
    expect(md('<b><p>x</p></b>y')).toBe('**x**\n\ny\n')
    expect(md('foo<code> bar</code>')).toBe('foo ==bar==\n')
  })

  it('should add the table delimiter only below the first row', () => {
    expect(md('<table><tr><th>h</th></tr><tr><th>b</th></tr><tr><td>1</td></tr></table>'))
      .toBe('| h |\n| --- |\n| b |\n| 1 |\n')
    expect(md('<table><tr><td>1</td></tr><tr><th>b</th></tr></table>'))
      .toBe('| 1 |\n| b |\n')
  })
})
