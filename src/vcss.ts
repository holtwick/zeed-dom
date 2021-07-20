import { parse } from "css-what"
import { VNodeQuery } from "./vdom"

// Alternative could be https://github.com/leaverou/parsel

let cache = {}

export function parseSelector(selector: string) {
  let ast = cache[selector]
  if (ast == null) {
    ast = parse(selector)
    cache[selector] = ast
  }
  return ast
}

// Just a very small subset for now: https://github.com/fb55/css-what#api

export function matchSelector(
  selector: string,
  element: VNodeQuery,
  { debug = false } = {}
) {
  for (let rules of parseSelector(selector)) {
    if (debug) {
      console.log("Selector:", selector)
      console.log("Rules:", rules)
      console.log("Element:", element)
    }

    const handleRules = (element, rules) => {
      let success = false
      for (let part of rules) {
        const { type, name, action, value, ignoreCase = true, data } = part
        if (type === "attribute") {
          if (action === "equals") {
            success = element.getAttribute(name) === value
            if (debug) console.log("Attribute equals", success)
          } else if (action === "start") {
            success = element.getAttribute(name)?.startsWith(value)
            if (debug) console.log("Attribute start", success)
          } else if (action === "end") {
            success = element.getAttribute(name)?.endsWith(value)
            if (debug) console.log("Attribute start", success)
          } else if (action === "element") {
            if (name === "class") {
              success = element.classList.contains(value)
              if (debug) console.log("Attribute class", success)
            } else {
              success = element.getAttribute(name)?.includes(value)
              if (debug) console.log("Attribute element", success)
            }
          } else if (action === "exists") {
            success = element.hasAttribute(name)
            if (debug) console.log("Attribute exists", success)
          } else {
            console.warn("Unknown CSS selector action", action)
          }
        } else if (type === "tag") {
          success = element.tagName === name.toUpperCase()
          if (debug) console.log("Is tag", success)
        } else if (type === "universal") {
          success = true
          if (debug) console.log("Is universal", success)
        } else if (type === "pseudo") {
          if (name === "not") {
            let ok = true
            data.forEach((rules) => {
              if (!handleRules(element, rules)) {
                ok = false
              }
            })
            success = !ok
          }
          if (debug) console.log("Is :not", success)
          // } else if (type === 'descendant') {
          //   element = element.
        } else {
          console.warn("Unknown CSS selector type", type, selector, rules)
        }
        // console.log(success, selector, part, element)
        if (!success) break
      }
      return success
    }

    if (handleRules(element, rules)) {
      return true
    }
  }
  return false
}
