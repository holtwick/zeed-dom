import type { VElement } from './vdom'
import { parse } from 'css-what'

function log(..._args: any) { }

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

    const handleRules = (element: VElement, rules: any[], ruleIndex = 0): boolean => {
      if (!element || ruleIndex >= rules.length)
        return false
      const part = rules[ruleIndex]
      const { type, name, action, value, _ignoreCase = true, data } = part
      let success = false

      function findInDescendants(node: VElement, rules: any[], ruleIndex: number): boolean {
        if (!node || !node.childNodes)
          return false
        for (const child of node.childNodes) {
          if (handleRules(child, rules, ruleIndex + 1)) {
            return true
          }
          if (findInDescendants(child, rules, ruleIndex)) {
            return true
          }
        }
        return false
      }

      switch (type) {
        case 'attribute': {
          const attrValue = element.getAttribute(name)
          switch (action) {
            case 'equals':
              success = attrValue === value
              if (debug)
                log('Attribute equals', success)
              break
            case 'start':
              success = !!attrValue?.startsWith(value)
              if (debug)
                log('Attribute start', success)
              break
            case 'end':
              success = !!attrValue?.endsWith(value)
              if (debug)
                log('Attribute end', success)
              break
            case 'element':
              if (name === 'class') {
                success = element.classList.contains(value)
                if (debug)
                  log('Attribute class', success)
              }
              else {
                success = !!attrValue?.includes(value)
                if (debug)
                  log('Attribute element', success)
              }
              break
            case 'exists':
              success = element.hasAttribute(name)
              if (debug)
                log('Attribute exists', success)
              break
            case 'any':
              success = !!attrValue?.includes(value)
              if (debug)
                log('Attribute any', success)
              break
            default:
              if (debug)
                console.warn('Unknown CSS selector action', action)
          }
          break
        }
        case 'tag':
          success = element.tagName === name.toUpperCase()
          if (debug)
            log('Is tag', success)
          break
        case 'universal':
          success = true
          if (debug)
            log('Is universal', success)
          break
        case 'pseudo':
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
          break
        case 'descendant':
          // Recursively check all descendants for a match

          success = findInDescendants(element, rules, ruleIndex)
          if (debug)
            log('Is descendant', success)
          break
        default:
          if (debug)
            console.warn('Unknown CSS selector type', type, selector, rules)
      }
      if (!success)
        return false
      // If this was a combinator, we already advanced ruleIndex
      if (type === 'descendant')
        return success
      // Move to next rule part
      if (ruleIndex + 1 < rules.length) {
        return handleRules(element, rules, ruleIndex + 1)
      }
      return success
    }

    if (handleRules(element, rules))
      return true
  }
  return false
}
