import { hArgumentParser } from './h'
import { HTMLString, markup } from './html'

export { HTMLString }

/**
 * Mark `html` as trusted markup, so `htmlStrict()` and the strict JSX runtime
 * insert it as it is. Never pass untrusted input.
 */
export function raw(html: string | HTMLString): HTMLString {
  return html instanceof HTMLString
    ? html
    : new HTMLString(html)
}

/**
 * Like `html()`, but safe for untrusted text: every string child is escaped,
 * only the results of `htmlStrict()` and `raw()` are inserted as markup. In
 * `html()` a string that starts with `<` and ends with `>` is taken as markup,
 * so `html('div', null, userInput)` lets `<img src=x onerror=…>` through.
 *
 * Returns an `HTMLString`, use `String(result)` or `` `${result}` `` to get a
 * plain string. The `html` prop still inserts raw markup. Strings inside
 * `<script>` and `<style>` are not escaped, but `</` becomes `<\/`, so they
 * can't end the element.
 */
export function htmlStrict(
  tag: string | ((props: any) => any),
  attrs?: Record<string, unknown> | unknown[] | null,
  ...children: unknown[]
): HTMLString {
  const parsed = hArgumentParser(tag as any, attrs, ...children)
  const flat = (parsed.children as unknown[]).flat(Number.POSITIVE_INFINITY)
  if (typeof parsed.tag === 'function')
    return (parsed.tag as (props: any) => any)({ ...parsed.attrs, children: flat })
  return new HTMLString(markup(false, parsed.tag as string, parsed.attrs, flat, true))
}
