/* eslint-disable no-console */
/** @jsx h */

import { h, tidyDOM, vdom, xml } from 'zeed-dom'

{
  const dom = h(
    'ol',
    {
      class: 'projects',
    },
    [
      h('li', null, 'hostic ', h('img', { src: 'logo.png' })),
      h('li', null, 'hostic-dom'),
    ],
  )

  console.log(dom.render())
  console.log(dom.render(xml))
}

{
  const dom = (
    <ol className="projects">
      <li>hostic</li>
      <li>hostic-dom</li>
    </ol>
  )

  const projects = dom
    .querySelectorAll('li')
    .map((e: any) => e.textContent)
    .join(', ')
  console.log(projects)

  dom.handle('li', (e: any) => {
    if (!e.textContent.endsWith('-dom'))
      e.remove()
    else
      e.innerHTML = '<b>hostic-dom</b> - great DOM helper for static content'
  })

  console.log(dom.render())
  // Output: <ol class="projects"><li><b>hostic-dom</b> - great DOM helper for static content</li></ol>
}

{
  const dom = vdom('<div>Hello World</div>')
  console.log(dom.render())
  tidyDOM(dom as any)
  console.log(dom.render())
  // Output: <ol class="projects"><li><b>hostic-dom</b> - great DOM helper for static content</li></ol>
}
