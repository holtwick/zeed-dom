/** @jsx h */

import { h, xml, vdom, tidyDOM } from "zeed-dom"

{
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
  console.log(dom.render(xml))
}

{
  let dom = (
    <ol className="projects">
      <li>hostic</li>
      <li>hostic-dom</li>
    </ol>
  )

  let projects = dom
    .querySelectorAll("li")
    .map((e: any) => e.textContent)
    .join(", ")
  console.log(projects)

  dom.handle("li", (e: any) => {
    if (!e.textContent.endsWith("-dom")) {
      e.remove()
    } else {
      e.innerHTML = "<b>hostic-dom</b> - great DOM helper for static content"
    }
  })

  console.log(dom.render())
  // Output: <ol class="projects"><li><b>hostic-dom</b> - great DOM helper for static content</li></ol>
}

{
  let dom = vdom("<div>Hello World</div>")
  console.log(dom.render())
  tidyDOM(dom as any)
  console.log(dom.render())
  // Output: <ol class="projects"><li><b>hostic-dom</b> - great DOM helper for static content</li></ol>
}
