import { VDocumentFragment, VNodeQuery } from "./vdom"

export function removeBodyContainer(body: VNodeQuery): VNodeQuery {
  let ehead = body.querySelector("head")
  let ebody = body.querySelector("body")
  if (ebody || ehead) {
    let body = new VDocumentFragment()
    ehead && body.appendChild(ehead.childNodes)
    ebody && body.appendChild(ebody.children)
    return body
  }
  return body
}
