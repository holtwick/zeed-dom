// import Sizzle from './sizzle'
import { createHTMLDocument, h, VDocument, VDocumentFragment, VElement } from './vdom'
import { parseHTML } from './vdomparser'
import { xml } from './xml'

describe('vDOM', () => {
  it('should mimic DOM', () => {
    const document = new VDocument()
    document.appendChild(document.createElement('p'))
    document.appendChild(document.createElement('p'))
    const html = document.render()
    expect(html).toBe('<p></p><p></p>')
  })

  it('should mimic DOM and class', () => {
    const document = new VDocument()
    const frag = new VDocumentFragment()
    const p = document.createElement('p')
    p.setAttribute('class', 'foo')
    p.textContent = 'Some'
    frag.appendChild(p)
    const html = frag.render()
    expect(html).toBe('<p class="foo">Some</p>')
  })

  it('should convert styles key to camel case', () => {
    const document = new VDocument()
    const frag = new VDocumentFragment()
    const p = document.createElement('p')
    p.setAttribute('style', 'text-align: center; background-color: red;')
    frag.appendChild(p)
    const html = frag.render()
    expect(p.style.textAlign).toBe('center')
    expect(p.style.backgroundColor).toBe('red')
    expect(html).toBe(
      '<p style="text-align: center; background-color: red;"></p>',
    )
  })

  it('should have functional factory', () => {
    const doc = createHTMLDocument()

    doc.body?.replaceChildren(
      h('p', { class: 'lorem' }, 'Hello ', h('b', { id: 'foo' }, 'World')),
      h('hr'),
    )

    const r = doc.body

    expect(r).not.toBeNull()
    if (!r)
      return

    expect(r.render()).toBe(
      '<body><p class="lorem">Hello <b id="foo">World</b></p><hr></body>',
    )

    const elements = r.flatten().map(e => e.tagName)
    expect(elements).toEqual(['BODY', 'P', 'B', 'HR'])

    const nodes = r.flattenNodes().map(e => e.nodeName)
    expect(nodes).toMatchInlineSnapshot(`
      [
        "BODY",
        "P",
        "#text",
        "B",
        "#text",
        "HR",
      ]
    `)

    expect(r.ownerDocument).toBe(doc)

    expect(r.getElementsByTagName('b')[0].outerHTML).toEqual(
      '<b id="foo">World</b>',
    )
    expect(r.getElementById('foo')?.outerHTML).toEqual('<b id="foo">World</b>')
    expect(r.getElementsByClassName('lorem')[0].outerHTML).toEqual(
      '<p class="lorem">Hello <b id="foo">World</b></p>',
    )

    expect(r.matches('body')).toBe(true)
    expect(r.matches('b')).toBe(false)

    expect(r.querySelector('b')?.outerHTML).toEqual('<b id="foo">World</b>')
    expect(r.querySelector('#foo')?.outerHTML).toEqual('<b id="foo">World</b>')
    expect(r.querySelector('.lorem')?.outerHTML).toEqual(
      '<p class="lorem">Hello <b id="foo">World</b></p>',
    )

    r.querySelector('#foo')?.replaceWith('Surprise')
    expect(r.render()).toBe(
      '<body><p class="lorem">Hello Surprise</p><hr></body>',
    )

    expect(doc.body?.tagName).toBe('BODY')
    expect(doc.head?.tagName).toBe('HEAD')
    expect(doc.documentElement.tagName).toBe('HTML')
    expect(doc.title).toBe('')
  })

  it('should use JSX', () => {
    const spread = {
      title: 'Hello',
      id: 'greeting',
    }
    const s = (
      <a
        href="example.com"
        x="x"
        hidden={false}
        onClick="return false"
        {...spread}
      >
        <hr />
        {false && 'This is invisible'}
        <b>Welcome</b>
      </a>
    )
    expect(s.render()).toEqual(
      '<a href="example.com" x="x" onClick="return false" title="Hello" id="greeting"><hr><b>Welcome</b></a>',
    )
    expect(s.render(xml)).toEqual(
      '<a href="example.com" x="x" onClick="return false" title="Hello" id="greeting"><hr /><b>Welcome</b></a>',
    )
  })

  it('should nested JSX', () => {
    const content = <div>Hello</div>
    const title = 'World'

    const doc = (
      <body>
        <h1>{title}</h1>
        {content}
      </body>
    )

    expect(doc.render()).toBe('<body><h1>World</h1><div>Hello</div></body>')
  })

  it('should JSX components', () => {
    function Welcome({ props, h }: any) {
      return (
        <h1>
          Hello,
          {' '}
          {props.name}
        </h1>
      )
    }

    const x = <Welcome name="Sara" />
    expect(x.render()).toEqual('<h1>Hello, Sara</h1>')
  })

  it('should JSX class magic', () => {
    const x = (
      <div
        className={{
          '-active': true,
          'foo': 'bar',
          'bar': '',
          'hidden': null,
          'name': 1,
        }}
      >
        ...
      </div>
    )
    expect(x.render()).toEqual('<div class="-active foo name">...</div>')
  })

  it('should support fragments', () => {
    const ff = (
      <fragment>
        <div>One</div>
        Middle
        <div>Two</div>
      </fragment>
    )
    expect(ff).toBeInstanceOf(VDocumentFragment)
    expect(ff.render()).toEqual('<div>One</div>Middle<div>Two</div>')
  })

  it('should remove', () => {
    const el = (
      <div>
        <div id="a"></div>
        <div id="b">
          Before
          <link rel="stylesheet" href="" />
          <span>After</span>
        </div>
      </div>
    )

    expect(el.render()).toEqual(
      '<div><div id="a"></div><div id="b">Before<link rel="stylesheet" href=""><span>After</span></div></div>',
    )

    const a = el.querySelector('#a')
    el.handle('link', (e: any) => a.appendChild(e))

    expect(el.render()).toEqual(
      '<div><div id="a"><link rel="stylesheet" href=""></div><div id="b">Before<span>After</span></div></div>',
    )
  })

  it('should handle dataSet stuff', () => {
    const el = <div data-lang="en">Test</div>

    expect(el.attributesObject).toEqual({ 'data-lang': 'en' })
    expect(el.render()).toEqual('<div data-lang="en">Test</div>')

    expect(el.querySelector('[data-lang]').textContent).toEqual('Test')

    const frag = parseHTML(el.render())
    expect(frag.firstChild.attributesObject).toEqual({ 'data-lang': 'en' })
    expect(frag.render()).toEqual('<div data-lang="en">Test</div>')
  })

  it('should insert', () => {
    const el = (
      <div>
        <p>Hallo</p>
      </div>
    )

    const w = <h1>Welcome</h1>
    el.insertBefore(w)

    expect(el.render()).toEqual('<div><h1>Welcome</h1><p>Hallo</p></div>')

    el.insertBefore(w, w) // fail

    el.insertBefore(<div>Subtitle</div>, el.querySelector('p'))

    expect(el.render()).toEqual(
      '<div><h1>Welcome</h1><div>Subtitle</div><p>Hallo</p></div>',
    )

    // Clone

    expect(el.cloneNode().render()).toEqual('<div></div>')
    expect(el.cloneNode(true).render()).toEqual(
      '<div><h1>Welcome</h1><div>Subtitle</div><p>Hallo</p></div>',
    )
  })

  it('should handle empty attrs', () => {
    const element = new VElement('img', { class: 'avatar', src: true, alt: true })
    const success = !!element.getAttribute('src')?.startsWith('data:')
    expect(success).toBe(false)

    const html = element.render()
    expect(html).toBe('<img class="avatar" src alt>')
  })

  it('should allow changing tag name with setTagName', () => {
    const el = new VElement('span')
    el.textContent = 'Hello'
    expect(el.render()).toBe('<span>Hello</span>')
    el.setTagName('strong')
    expect(el.render()).toBe('<strong>Hello</strong>')
    // Changing to an invalid tag should still work as a string
    el.setTagName('custom-tag')
    expect(el.render()).toBe('<custom-tag>Hello</custom-tag>')
  })

  it('should preserve attributes and children when changing tag name', () => {
    const el = new VElement('div', { class: 'foo', id: 'bar' })
    el.appendChild(new VElement('span', {}))
    el.setTagName('section')
    expect(el.render()).toBe('<section class="foo" id="bar"><span></span></section>')
  })

  it('should not change tagName if setTagName is called with the same value', () => {
    const el = new VElement('p')
    el.textContent = 'Test'
    el.setTagName('p')
    expect(el.render()).toBe('<p>Test</p>')
  })

  it('should handle setTagName on elements created via JSX', () => {
    const el = <div>Hello</div>
    el.setTagName('main')
    expect(el.render()).toBe('<main>Hello</main>')
  })

  it('should support HTML5 sectioning elements', () => {
    const doc = createHTMLDocument()
    const section = doc.createElement('section')
    const article = doc.createElement('article')
    const nav = doc.createElement('nav')
    const aside = doc.createElement('aside')
    section.textContent = 'Section'
    article.textContent = 'Article'
    nav.textContent = 'Nav'
    aside.textContent = 'Aside'
    doc.body?.appendChild(section)
    doc.body?.appendChild(article)
    doc.body?.appendChild(nav)
    doc.body?.appendChild(aside)
    expect(doc.body?.render()).toBe('<body><section>Section</section><article>Article</article><nav>Nav</nav><aside>Aside</aside></body>')
  })

  it('should support HTML5 global attributes', () => {
    const el = new VElement('div', { contenteditable: 'true', draggable: 'true', hidden: true })
    expect(el.render()).toBe('<div contenteditable="true" draggable="true" hidden></div>')
  })

  it('should support HTML5 boolean attributes', () => {
    const el = new VElement('input', { type: 'checkbox', checked: true, disabled: true })
    expect(el.render()).toBe('<input type="checkbox" checked disabled>')
  })

  it('should support HTML5 void elements', () => {
    const el = new VElement('br')
    expect(el.render()).toBe('<br>')
    const img = new VElement('img', { src: 'x.png', alt: 'x' })
    expect(img.render()).toBe('<img src="x.png" alt="x">')
  })

  it('should support <mark> and <time> elements', () => {
    const mark = new VElement('mark')
    mark.textContent = 'Highlight'
    const time = new VElement('time', { datetime: '2025-07-19' })
    time.textContent = 'Today'
    expect(mark.render()).toBe('<mark>Highlight</mark>')
    expect(time.render()).toBe('<time datetime="2025-07-19">Today</time>')
  })

  it('should mimic DOM', () => {
    const document = new VDocument()
    document.appendChild(document.createElement('p'))
    document.appendChild(document.createElement('p'))
    const html = document.render()
    expect(html).toBe('<p></p><p></p>')
  })

  it('should mimic DOM and class', () => {
    const document = new VDocument()
    const frag = new VDocumentFragment()
    const p = document.createElement('p')
    p.setAttribute('class', 'foo')
    p.textContent = 'Some'
    frag.appendChild(p)
    const html = frag.render()
    expect(html).toBe('<p class="foo">Some</p>')
  })

  it('should convert styles key to camel case', () => {
    const document = new VDocument()
    const frag = new VDocumentFragment()
    const p = document.createElement('p')
    p.setAttribute('style', 'text-align: center; background-color: red;')
    frag.appendChild(p)
    const html = frag.render()
    expect(p.style.textAlign).toBe('center')
    expect(p.style.backgroundColor).toBe('red')
    expect(html).toBe(
      '<p style="text-align: center; background-color: red;"></p>',
    )
  })

  it('should have functional factory', () => {
    const doc = createHTMLDocument()

    doc.body?.replaceChildren(
      h('p', { class: 'lorem' }, 'Hello ', h('b', { id: 'foo' }, 'World')),
      h('hr'),
    )

    const r = doc.body

    expect(r).not.toBeNull()
    if (!r)
      return

    expect(r.render()).toBe(
      '<body><p class="lorem">Hello <b id="foo">World</b></p><hr></body>',
    )

    const elements = r.flatten().map(e => e.tagName)
    expect(elements).toEqual(['BODY', 'P', 'B', 'HR'])

    const nodes = r.flattenNodes().map(e => e.nodeName)
    expect(nodes).toMatchInlineSnapshot(`
      [
        "BODY",
        "P",
        "#text",
        "B",
        "#text",
        "HR",
      ]
    `)

    expect(r.ownerDocument).toBe(doc)

    expect(r.getElementsByTagName('b')[0].outerHTML).toEqual(
      '<b id="foo">World</b>',
    )
    expect(r.getElementById('foo')?.outerHTML).toEqual('<b id="foo">World</b>')
    expect(r.getElementsByClassName('lorem')[0].outerHTML).toEqual(
      '<p class="lorem">Hello <b id="foo">World</b></p>',
    )

    expect(r.matches('body')).toBe(true)
    expect(r.matches('b')).toBe(false)

    expect(r.querySelector('b')?.outerHTML).toEqual('<b id="foo">World</b>')
    expect(r.querySelector('#foo')?.outerHTML).toEqual('<b id="foo">World</b>')
    expect(r.querySelector('.lorem')?.outerHTML).toEqual(
      '<p class="lorem">Hello <b id="foo">World</b></p>',
    )

    r.querySelector('#foo')?.replaceWith('Surprise')
    expect(r.render()).toBe(
      '<body><p class="lorem">Hello Surprise</p><hr></body>',
    )

    expect(doc.body?.tagName).toBe('BODY')
    expect(doc.head?.tagName).toBe('HEAD')
    expect(doc.documentElement.tagName).toBe('HTML')
    expect(doc.title).toBe('')
  })

  it('should use JSX', () => {
    const spread = {
      title: 'Hello',
      id: 'greeting',
    }
    const s = (
      <a
        href="example.com"
        x="x"
        hidden={false}
        onClick="return false"
        {...spread}
      >
        <hr />
        {false && 'This is invisible'}
        <b>Welcome</b>
      </a>
    )
    expect(s.render()).toEqual(
      '<a href="example.com" x="x" onClick="return false" title="Hello" id="greeting"><hr><b>Welcome</b></a>',
    )
    expect(s.render(xml)).toEqual(
      '<a href="example.com" x="x" onClick="return false" title="Hello" id="greeting"><hr /><b>Welcome</b></a>',
    )
  })

  it('should nested JSX', () => {
    const content = <div>Hello</div>
    const title = 'World'

    const doc = (
      <body>
        <h1>{title}</h1>
        {content}
      </body>
    )

    expect(doc.render()).toBe('<body><h1>World</h1><div>Hello</div></body>')
  })

  it('should JSX components', () => {
    function Welcome({ props, h }: any) {
      return (
        <h1>
          Hello,
          {' '}
          {props.name}
        </h1>
      )
    }

    const x = <Welcome name="Sara" />
    expect(x.render()).toEqual('<h1>Hello, Sara</h1>')
  })

  it('should JSX class magic', () => {
    const x = (
      <div
        className={{
          '-active': true,
          'foo': 'bar',
          'bar': '',
          'hidden': null,
          'name': 1,
        }}
      >
        ...
      </div>
    )
    expect(x.render()).toEqual('<div class="-active foo name">...</div>')
  })

  it('should support fragments', () => {
    const ff = (
      <fragment>
        <div>One</div>
        Middle
        <div>Two</div>
      </fragment>
    )
    expect(ff).toBeInstanceOf(VDocumentFragment)
    expect(ff.render()).toEqual('<div>One</div>Middle<div>Two</div>')
  })

  it('should remove', () => {
    const el = (
      <div>
        <div id="a"></div>
        <div id="b">
          Before
          <link rel="stylesheet" href="" />
          <span>After</span>
        </div>
      </div>
    )

    expect(el.render()).toEqual(
      '<div><div id="a"></div><div id="b">Before<link rel="stylesheet" href=""><span>After</span></div></div>',
    )

    const a = el.querySelector('#a')
    el.handle('link', (e: any) => a.appendChild(e))

    expect(el.render()).toEqual(
      '<div><div id="a"><link rel="stylesheet" href=""></div><div id="b">Before<span>After</span></div></div>',
    )
  })

  it('should handle dataSet stuff', () => {
    const el = <div data-lang="en">Test</div>

    expect(el.attributesObject).toEqual({ 'data-lang': 'en' })
    expect(el.render()).toEqual('<div data-lang="en">Test</div>')

    expect(el.querySelector('[data-lang]').textContent).toEqual('Test')

    const frag = parseHTML(el.render())
    expect(frag.firstChild.attributesObject).toEqual({ 'data-lang': 'en' })
    expect(frag.render()).toEqual('<div data-lang="en">Test</div>')
  })

  it('should insert', () => {
    const el = (
      <div>
        <p>Hallo</p>
      </div>
    )

    const w = <h1>Welcome</h1>
    el.insertBefore(w)

    expect(el.render()).toEqual('<div><h1>Welcome</h1><p>Hallo</p></div>')

    el.insertBefore(w, w) // fail

    el.insertBefore(<div>Subtitle</div>, el.querySelector('p'))

    expect(el.render()).toEqual(
      '<div><h1>Welcome</h1><div>Subtitle</div><p>Hallo</p></div>',
    )

    // Clone

    expect(el.cloneNode().render()).toEqual('<div></div>')
    expect(el.cloneNode(true).render()).toEqual(
      '<div><h1>Welcome</h1><div>Subtitle</div><p>Hallo</p></div>',
    )
  })

  it('should handle empty attrs', () => {
    const element = new VElement('img', { class: 'avatar', src: true, alt: true })
    const success = !!element.getAttribute('src')?.startsWith('data:')
    expect(success).toBe(false)

    const html = element.render()
    expect(html).toBe('<img class="avatar" src alt>')
  })

  it('should allow changing tag name with setTagName', () => {
    const el = new VElement('span')
    el.textContent = 'Hello'
    expect(el.render()).toBe('<span>Hello</span>')
    el.setTagName('strong')
    expect(el.render()).toBe('<strong>Hello</strong>')
    // Changing to an invalid tag should still work as a string
    el.setTagName('custom-tag')
    expect(el.render()).toBe('<custom-tag>Hello</custom-tag>')
  })

  it('should preserve attributes and children when changing tag name', () => {
    const el = new VElement('div', { class: 'foo', id: 'bar' })
    el.appendChild(new VElement('span', {}))
    el.setTagName('section')
    expect(el.render()).toBe('<section class="foo" id="bar"><span></span></section>')
  })

  it('should not change tagName if setTagName is called with the same value', () => {
    const el = new VElement('p')
    el.textContent = 'Test'
    el.setTagName('p')
    expect(el.render()).toBe('<p>Test</p>')
  })

  it('should handle setTagName on elements created via JSX', () => {
    const el = <div>Hello</div>
    el.setTagName('main')
    expect(el.render()).toBe('<main>Hello</main>')
  })
})
