import type { VElement } from './vdom'
import { parse } from 'css-what'

const cache: Record<string, any> = {}

export function parseSelector(selector: string) {
  if (!(selector in cache)) {
    cache[selector] = parse(selector)
  }
  return cache[selector]
}

export function matchSelector(
  selector: string,
  element: VElement,
) {
  for (const rules of parseSelector(selector)) {
    function matchRule(el: VElement | null, ruleParts: any[], idx: number): boolean {
      while (el && el.nodeType !== 1) el = el.parentNode
      if (!el || idx < 0)
        return false
      const part = ruleParts[idx]
      switch (part.type) {
        case 'descendant': {
          let parent = el.parentNode
          while (parent) {
            if (parent.nodeType === 1 && matchRule(parent, ruleParts, idx - 1))
              return true
            parent = parent.parentNode
          }
          return false
        }
        case 'child': {
          let parent = el.parentNode
          while (parent && parent.nodeType !== 1) parent = parent.parentNode
          return !!parent && matchRule(parent, ruleParts, idx - 1)
        }
        case 'sibling': {
          let prev = el.previousSibling
          while (prev) {
            if (prev.nodeType === 1 && matchRule(prev, ruleParts, idx - 1))
              return true
            prev = prev.previousSibling
          }
          return false
        }
        case 'adjacent': {
          let prev = el.previousSibling
          while (prev && prev.nodeType !== 1) prev = prev.previousSibling
          return !!prev && matchRule(prev, ruleParts, idx - 1)
        }
        case 'general': { // general sibling combinator (~)
          let prev = el.previousSibling
          while (prev) {
            if (prev.nodeType === 1 && matchRule(prev, ruleParts, idx - 1))
              return true
            prev = prev.previousSibling
          }
          return false
        }
        default: {
          if (!matchSimple(el, part))
            return false
          if (idx === 0)
            return true
          return matchRule(el, ruleParts, idx - 1)
        }
      }
    }

    function matchSimple(element: VElement, part: any): boolean {
      const { type, name, action, value, data } = part
      if (type === 'attribute') {
        const attrValue = element.getAttribute(name)
        switch (action) {
          case 'equals': return attrValue === value
          case 'start': return !!attrValue?.startsWith(value)
          case 'end': return !!attrValue?.endsWith(value)
          case 'element':
            return name === 'class'
              ? element.classList.contains(value)
              : !!attrValue?.includes(value)
          case 'exists': return element.hasAttribute(name)
          case 'any': return !!attrValue?.includes(value)
          case 'hyphen': // [attr|=val]
            return attrValue === value || !!attrValue?.startsWith(`${value}-`)
          case 'contains': // [attr*=val]
            return !!attrValue?.includes(value)
          default: return false
        }
      }
      if (type === 'tag')
        return element.tagName === name.toUpperCase()
      if (type === 'universal')
        return true
      if (type === 'pseudo') {
        if (name === 'not') {
          return !data.some((rules: any) => rules.every((p: any) => matchSimple(element, p)))
        }
        const parent = element.parentNode
        if (!parent || !parent.childNodes)
          return false
        const elementChildren = parent.childNodes.filter((n: any) => n.nodeType === 1)
        if (name === 'first-child')
          return elementChildren[0] === element
        if (name === 'last-child')
          return elementChildren[elementChildren.length - 1] === element
        if (name === 'nth-child') {
          const idx = elementChildren.indexOf(element)
          const nth = data && data.length > 0 ? Number.parseInt(data[0], 10) - 1 : 0
          return idx === nth
        }
        return false
      }
      return false
    }

    if (matchRule(element, rules, rules.length - 1))
      return true
  }
  return false
}
