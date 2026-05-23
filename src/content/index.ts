// ============================================================
// WebMCP – Content Script (T-06, T-38, T-43)
// Inyectado en cada página para extracción segura del DOM
// ============================================================
import type { Message, PageContext } from '../shared/types'
import { extractPageContext } from './extractor'

// ── Escuchar mensajes del Background / Side Panel ────────────
chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    if (message.type === 'GET_PAGE_CONTEXT') {
      try {
        const context = extractPageContext()
        sendResponse({
          type:    'PAGE_CONTEXT_RESPONSE',
          payload: context,
        } satisfies Message<PageContext>)
      } catch (err) {
        console.error('[WebMCP Content] Error al extraer contexto:', err)
        sendResponse({
          type: 'PAGE_CONTEXT_RESPONSE',
          payload: null as unknown as PageContext,
          error: String(err),
        } satisfies Message<PageContext>)
      }
    } else if (message.type === 'EXECUTE_AUTOMATION') {
      const { tool, arguments: args } = message.payload as { tool: string; arguments: any }
      try {
        let result: any

        if (tool === 'simulate_click') {
          const el = document.querySelector(args.selector) as HTMLElement
          if (!el) {
            sendResponse({ success: false, error: `Element not found: ${args.selector}` })
            return true
          }
          el.click()
          result = `Clicked element: ${args.selector}`

        } else if (tool === 'fill_input') {
          const el = document.querySelector(args.selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
          if (!el) {
            sendResponse({ success: false, error: `Element not found: ${args.selector}` })
            return true
          }
          el.value = args.value
          el.dispatchEvent(new Event('input', { bubbles: true }))
          el.dispatchEvent(new Event('change', { bubbles: true }))
          result = `Filled input ${args.selector} with: ${args.value}`

        } else if (tool === 'inject_script') {
          const runVal = (0, eval)(args.code)
          result = runVal

        } else if (tool === 'get_page_content') {
          // Return full raw HTML of the page
          result = document.documentElement.outerHTML

        } else if (tool === 'get_accessibility_tree') {
          // Build a semantic accessibility tree of interactive elements
          result = buildAccessibilityTree()

        } else {
          sendResponse({ success: false, error: `Unsupported tool: ${tool}` })
          return true
        }

        sendResponse({ success: true, result })
      } catch (err) {
        console.error('[WebMCP Content] Error en automatización:', err)
        sendResponse({ success: false, error: String(err) })
      }
    }
    return true
  },
)

// ── Árbol de Accesibilidad Semántico ─────────────────────────
// Genera una representación compacta y optimizada en tokens del DOM interactivo.
function buildAccessibilityTree() {
  const INTERACTIVE_SELECTORS = 'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [tabindex]:not([tabindex="-1"]), h1, h2, h3, h4, label'
  const MAX_NODES = 150

  const elements = [...document.querySelectorAll(INTERACTIVE_SELECTORS)].slice(0, MAX_NODES)

  const tree = elements.map((el) => {
    const tag = el.tagName.toLowerCase()
    const role = el.getAttribute('role') || tag
    const ariaLabel = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || null
    const textContent = el.textContent?.trim().slice(0, 80) || null
    const placeholder = (el as HTMLInputElement).placeholder || null
    const value = (el as HTMLInputElement).value?.slice(0, 80) || null
    const href = (el as HTMLAnchorElement).href || null
    const type = (el as HTMLInputElement).type || null
    const id = el.id || null
    const classList = [...el.classList].slice(0, 4).join('.')

    // Build a reliable CSS selector for this element
    let selector = tag
    if (id) {
      selector = `#${id}`
    } else if (classList) {
      selector = `${tag}.${classList}`
    }

    return {
      role,
      tag,
      selector,
      ...(ariaLabel && { ariaLabel }),
      ...(textContent && textContent !== value && { text: textContent }),
      ...(placeholder && { placeholder }),
      ...(value && { value }),
      ...(href && { href: href.replace(window.location.origin, '') }),
      ...(type && type !== 'text' && { type }),
    }
  })

  return {
    url: window.location.href,
    title: document.title,
    nodeCount: tree.length,
    nodes: tree,
  }
}

console.log('[WebMCP Content] Script de extracción inteligente inyectado en:', window.location.hostname)

