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
    }
    return true
  },
)

console.log('[WebMCP Content] Script de extracción inteligente inyectado en:', window.location.hostname)
