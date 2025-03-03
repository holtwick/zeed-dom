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
          else if (action === 'contains') {
            success = !!element.getAttribute(name)?.includes(value)
            if (debug)
              log('Attribute contains', success)
          }
          else if (action === 'not') {
            success = element.getAttribute(name) !== value
            if (debug)
              log('Attribute not', success)
          }
          else if (action === 'has') {
            success = element.hasAttribute(name)
            if (debug)
              log('Attribute has', success)
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
          else if (name === 'first-child') {
            success = element.parentNode?.firstChild === element
            if (debug)
              log('Is :first-child', success)
          }
          else if (name === 'last-child') {
            success = element.parentNode?.lastChild === element
            if (debug)
              log('Is :last-child', success)
          }
          else if (name === 'nth-child') {
            const index = parseInt(data, 10)
            success = Array.from(element.parentNode?.childNodes || []).indexOf(element) === index - 1
            if (debug)
              log('Is :nth-child', success)
          }
          if (debug)
            log('Is :not', success)
        }
        else if (type === 'child') {
          const parent = element.parentNode
          if (parent) {
            success = handleRules(parent, [part])
            if (debug)
              log('Is child', success)
          }
        }
        else if (type === 'combinator') {
          if (name === '>') {
            const parent = element.parentNode
            if (parent) {
              success = handleRules(parent, [part])
              if (debug)
                log('Is child combinator', success)
            }
          }
          else if (name === ' ') {
            let ancestor = element.parentNode
            while (ancestor) {
              if (handleRules(ancestor, [part])) {
                success = true
                break
              }
              ancestor = ancestor.parentNode
            }
            if (debug)
              log('Is descendant combinator', success)
          }
          else if (name === '+') {
            const previousSibling = element.previousSibling
            if (previousSibling) {
              success = handleRules(previousSibling, [part])
              if (debug)
                log('Is sibling combinator', success)
            }
          }
        }
        else {
          console.warn('Unknown CSS selector type', type, selector, rules)
        }
        if (!success)
          break
      }
      return success
    }

    if (handleRules(element, rules))
      return true
  }
  return false
}
