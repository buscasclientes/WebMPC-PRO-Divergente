// ============================================================
// WebMCP – Content Script (T-06)
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

console.log('[WebMCP Content] Script de extracción inteligente inyectado en:', window.location.hostname)
