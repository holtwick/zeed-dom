import type { VElement } from './vdom'
import { parse } from 'css-what'

// A `Map`, not an object: `'constructor' in {}` is true, so
// `querySelector('constructor')` returned `Object` and threw. Limited in size,
// selectors built from data like `[data-id="…"]` grew it without end.
const cache = new Map<string, any>()
const CACHE_SIZE = 1000

export function parseSelector(selector: string) {
  let parsed = cache.get(selector)
  if (parsed === undefined) {
    parsed = parse(selector)
    if (cache.size >= CACHE_SIZE)
      cache.delete(cache.keys().next().value!)
    cache.set(selector, parsed)
  }
  return parsed
}

function previousElement(node: VElement): VElement | null {
  let prev = node.previousSibling
  while (prev && prev.nodeType !== 1) prev = prev.previousSibling
  return prev
}

function nextElement(node: VElement): VElement | null {
  let next = node.nextSibling
  while (next && next.nodeType !== 1) next = next.nextSibling
  return next
}

// Failures known within one `matchSelector` call, as bitmasks over the index
// in the rule: `matchRule(el, idx)` is false, no ancestor of `el` matches
// `idx`, no previous sibling of `el` matches `idx`. Without them
// `span div div div` on deeply nested `div`s tried every combination of
// ancestors, which took seconds for four `div`s and 200 levels.
const failedSelf = new Map<object, number>()
const failedAncestors = new Map<object, number>()
const failedSiblings = new Map<object, number>()

function clearMemo() {
  if (failedSelf.size)
    failedSelf.clear()
  if (failedAncestors.size)
    failedAncestors.clear()
  if (failedSiblings.size)
    failedSiblings.clear()
}

/** Bit for `idx` in the maps above, 0 for very long selectors, which are not memoized */
function bitFor(idx: number): number {
  return idx < 30
    ? 1 << idx
    : 0
}

function matchRuleMemo(el: VElement, ruleParts: any[], idx: number, bit: number): boolean {
  if (bit && ((failedSelf.get(el) ?? 0) & bit))
    return false
  const result = matchRule(el, ruleParts, idx)
  if (!result && bit)
    failedSelf.set(el, (failedSelf.get(el) ?? 0) | bit)
  return result
}

/**
 * Is there a node in the chain after `el` (`parentNode` or `previousSibling`)
 * that matches `idx`? A node whose chain is known to fail ends the walk, and
 * all walked nodes are marked as failing, so each node is walked only once.
 */
function matchChain(el: VElement, ruleParts: any[], idx: number, failed: Map<object, number>, ancestors: boolean): boolean {
  const bit = bitFor(idx)
  const walked: any[] = [el]
  let node: any = ancestors
    ? el.parentNode
    : el.previousSibling
  while (node) {
    if (node.nodeType === 1 && matchRuleMemo(node, ruleParts, idx, bit))
      return true
    if (bit && ((failed.get(node) ?? 0) & bit))
      break
    walked.push(node)
    node = ancestors
      ? node.parentNode
      : node.previousSibling
  }
  if (bit) {
    for (const n of walked)
      failed.set(n, (failed.get(n) ?? 0) | bit)
  }
  return false
}

// Module level, not inside `matchSelector`: these were created anew on every
// call, which showed up in profiles of `querySelectorAll`
function matchRule(el: VElement | null, ruleParts: any[], idx: number): boolean {
  while (el && el.nodeType !== 1) el = el.parentNode
  if (!el || idx < 0)
    return false
  const part = ruleParts[idx]
  switch (part.type) {
    case 'descendant':
      return matchChain(el, ruleParts, idx - 1, failedAncestors, true)
    case 'child': {
      let parent = el.parentNode
      while (parent && parent.nodeType !== 1) parent = parent.parentNode
      return !!parent && matchRuleMemo(parent, ruleParts, idx - 1, bitFor(idx - 1))
    }
    case 'sibling':
    case 'general': // general sibling combinator (~)
      return matchChain(el, ruleParts, idx - 1, failedSiblings, false)
    case 'adjacent': {
      let prev = el.previousSibling
      while (prev && prev.nodeType !== 1) prev = prev.previousSibling
      return !!prev && matchRuleMemo(prev, ruleParts, idx - 1, bitFor(idx - 1))
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
    // Cached on the parsed selector, which is cached itself
    return element.tagName === (part.upperName ??= name.toUpperCase())
  if (type === 'universal')
    return true
  if (type === 'pseudo') {
    if (name === 'not') {
      return !data.some((rules: any) => rules.every((p: any) => matchSimple(element, p)))
    }
    const parent = element.parentNode
    if (!parent || !parent.childNodes)
      return false
    // Walk the siblings instead of collecting all element children, which
    // made `querySelectorAll('p:first-child')` quadratic for wide parents
    if (name === 'first-child')
      return !previousElement(element)
    if (name === 'last-child')
      return !nextElement(element)
    if (name === 'nth-child') {
      // `data` is the argument as string, e.g. `'12'`, not a list
      const nth = data && data.length > 0
        ? Number.parseInt(data, 10) - 1
        : 0
      if (!(nth >= 0))
        return false
      let idx = 0
      for (let prev = previousElement(element); prev && idx <= nth; prev = previousElement(prev))
        idx++
      return idx === nth
    }
    return false
  }
  return false
}

export function matchSelector(
  selector: string,
  element: VElement,
) {
  for (const rules of parseSelector(selector)) {
    try {
      if (matchRule(element, rules, rules.length - 1))
        return true
    }
    finally {
      // Also so the maps don't keep nodes alive
      clearMemo()
    }
  }
  return false
}
