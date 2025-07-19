import type { VElement } from './vdom'
import { parse } from 'css-what'

function log(..._args: any) { console.log(..._args) }

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
  // css-what returns an array of arrays (for selector groups)
  for (const rules of parseSelector(selector)) {
    if (debug) {
      log('Selector:', selector)
      log('Rules:', rules)
      log('Element:', element)
    }

    // Right-to-left matching for combinators
    function matchRule(el: VElement | null, ruleParts: any[], idx: number): boolean {
      if (debug) {
        log('matchRule', {
          el,
          tagName: el?.tagName,
          nodeType: el?.nodeType,
          idx,
          part: ruleParts[idx],
        })
      }
      while (el && el.nodeType !== 1) {
        el = el.parentNode
      }
      if (!el || idx < 0) return false
      const part = ruleParts[idx]
      if (part.type === 'descendant') {
        // Walk up ancestors, skip non-element nodes
        let parent = el.parentNode
        while (parent) {
          if (parent.nodeType === 1 && matchRule(parent, ruleParts, idx - 1)) return true
          parent = parent.parentNode
        }
        return false
      } else if (part.type === 'child') {
        // Direct parent, must be the immediate element parent
        let parent = el.parentNode
        while (parent && parent.nodeType !== 1) parent = parent.parentNode
        return parent ? matchRule(parent, ruleParts, idx - 1) : false
      } else if (part.type === 'sibling') {
        // Any previous element sibling
        let prev = el.previousSibling
        while (prev) {
          if (prev.nodeType === 1 && matchRule(prev, ruleParts, idx - 1)) return true
          prev = prev.previousSibling
        }
        return false
      } else if (part.type === 'adjacent') {
        // Immediately previous element sibling
        let prev = el.previousSibling
        while (prev && prev.nodeType !== 1) prev = prev.previousSibling
        return prev ? matchRule(prev, ruleParts, idx - 1) : false
      } else {
        // Simple selector (tag, attribute, pseudo, etc.)
        if (!matchSimple(el, part)) return false
        if (idx === 0) return true
        // If next part is a combinator, handle in next call
        if (["descendant", "child", "sibling", "adjacent"].includes(ruleParts[idx - 1]?.type)) {
          return matchRule(el, ruleParts, idx - 1)
        }
        // Otherwise, keep matching left
        return matchRule(el, ruleParts, idx - 1)
      }
    }

    function matchSimple(element: VElement, part: any): boolean {
      const { type, name, action, value, _ignoreCase = true, data } = part
      let success = false
      switch (type) {
        case 'attribute': {
          const attrValue = element.getAttribute(name)
          switch (action) {
            case 'equals':
              success = attrValue === value
              break
            case 'start':
              success = !!attrValue?.startsWith(value)
              break
            case 'end':
              success = !!attrValue?.endsWith(value)
              break
            case 'element':
              if (name === 'class') {
                success = element.classList.contains(value)
              } else {
                success = !!attrValue?.includes(value)
              }
              break
            case 'exists':
              success = element.hasAttribute(name)
              break
            case 'any':
              success = !!attrValue?.includes(value)
              break
            default:
              success = false
          }
          break
        }
        case 'tag':
          success = element.tagName === name.toUpperCase()
          break
        case 'universal':
          success = true
          break
        case 'pseudo':
          if (name === 'not') {
            let ok = true
            data.forEach((rules: any) => {
              if (!rules.every((p: any) => matchSimple(element, p))) ok = false
            })
            success = !ok
          } else if (name === 'first-child') {
            const parent = element.parentNode
            if (parent && parent.childNodes) {
              const elementChildren = parent.childNodes.filter((n: any) => n.nodeType === 1)
              success = elementChildren[0] === element
            } else {
              success = false
            }
          } else if (name === 'last-child') {
            const parent = element.parentNode
            if (parent && parent.childNodes) {
              const elementChildren = parent.childNodes.filter((n: any) => n.nodeType === 1)
              success = elementChildren[elementChildren.length - 1] === element
            } else {
              success = false
            }
          } else if (name === 'nth-child') {
            const parent = element.parentNode
            if (parent && parent.childNodes) {
              const elementChildren = parent.childNodes.filter((n: any) => n.nodeType === 1)
              const idx = elementChildren.indexOf(element)
              let nth = 0
              if (data && data.length > 0) {
                nth = Number.parseInt(data[0], 10) - 1
              }
              success = idx === nth
            } else {
              success = false
            }
          }
          break
        default:
          success = false
      }
      return success
    }

    if (matchRule(element, rules, rules.length - 1)) return true
  }
  return false
}
