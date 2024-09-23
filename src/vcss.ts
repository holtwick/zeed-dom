import type { VElement } from './vdom'
import { parse } from 'css-what'

function log(..._args: any) {}

// Alternative could be https://github.com/leaverou/parsel

const cache: Record<string, any> = {}

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
  element: VElement,
  { debug = false } = {},
) {
  for (const rules of parseSelector(selector)) {
    if (debug) {
      log('Selector:', selector)
      log('Rules:', rules)
      log('Element:', element)
    }

    const handleRules = (element: VElement, rules: any[]) => {
      // let pos = 0
      let success = false
      for (const part of rules) {
        const { type, name, action, value, _ignoreCase = true, data } = part
        if (type === 'attribute') {
          if (action === 'equals') {
            success = element.getAttribute(name) === value
            if (debug)
              log('Attribute equals', success)
          }
          else if (action === 'start') {
            success = !!element.getAttribute(name)?.startsWith(value)
            if (debug)
              log('Attribute start', success)
          }
          else if (action === 'end') {
            success = !!element.getAttribute(name)?.endsWith(value)
            if (debug)
              log('Attribute start', success)
          }
          else if (action === 'element') {
            if (name === 'class') {
              success = element.classList.contains(value)
              if (debug)
                log('Attribute class', success)
            }
            else {
              success = !!element.getAttribute(name)?.includes(value)
              if (debug)
                log('Attribute element', success)
            }
          }
          else if (action === 'exists') {
            success = element.hasAttribute(name)
            if (debug)
              log('Attribute exists', success)
          }
          else if (action === 'any') {
            success = !!element.getAttribute(name)?.includes(value)
            if (debug)
              log('Attribute any', success)
          }
          else {
            console.warn('Unknown CSS selector action', action)
          }
        }
        else if (type === 'tag') {
          success = element.tagName === name.toUpperCase()
          if (debug)
            log('Is tag', success)
        }
        else if (type === 'universal') {
          success = true
          if (debug)
            log('Is universal', success)
        }
        else if (type === 'pseudo') {
          if (name === 'not') {
            let ok = true
            data.forEach((rules: any) => {
              if (!handleRules(element, rules))
                ok = false
            })
            success = !ok
          }
          if (debug)
            log('Is :not', success)
          // } else if (type === 'descendant') {
          //   element = element.
        }
        // else if (type === 'descendant') {
        //   for (const child of element.childNodes)
        //     handleRules(child, rules.slice(pos))
        // }
        else {
          console.warn('Unknown CSS selector type', type, selector, rules)
        }
        // log(success, selector, part, element)
        if (!success)
          break

        // pos += 1
      }
      return success
    }

    if (handleRules(element, rules))
      return true
  }
  return false
}
