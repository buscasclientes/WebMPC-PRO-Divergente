// ============================================================
// WebMCP – Content Script (T-06)
// Inyectado en cada página para extracción segura del DOM
// ============================================================
import type { Message, PageContext } from '../shared/types'
import { MAX_PAGE_TEXT_CHARS, MAX_SELECTED_TEXT } from '../shared/constants'

// ── Escuchar mensajes del Background / Side Panel ────────────
chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    if (message.type === 'GET_PAGE_CONTEXT') {
      sendResponse({
        type:    'PAGE_CONTEXT_RESPONSE',
        payload: buildPageContext(),
      } satisfies Message<PageContext>)
    }
    return true
  },
)

// ── Construir el contexto de la página actual ────────────────
function buildPageContext(): PageContext {
  return {
    url:          window.location.href,
    title:        document.title,
    selectedText: getSelectedText(),
    visibleText:  getVisibleText(),
    timestamp:    Date.now(),
    tabId:        0,
  }
}

function getSelectedText(): string {
  return (window.getSelection()?.toString() ?? '').slice(0, MAX_SELECTED_TEXT)
}

function getVisibleText(): string {
  const walker = document.createTreeWalker(
    document.body ?? document.documentElement,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node): number {
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT
        const tag = parent.tagName.toLowerCase()
        // Excluir elementos no visibles
        if (['script', 'style', 'noscript', 'meta', 'link'].includes(tag)) {
          return NodeFilter.FILTER_REJECT
        }
        const style = window.getComputedStyle(parent)
        if (style.display === 'none' || style.visibility === 'hidden') {
          return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      },
    },
  )

  const chunks: string[] = []
  let total = 0
  let node: Node | null

  while ((node = walker.nextNode()) && total < MAX_PAGE_TEXT_CHARS) {
    const text = node.textContent?.trim()
    if (text && text.length > 0) {
      chunks.push(text)
      total += text.length
    }
  }

  return chunks.join(' ').slice(0, MAX_PAGE_TEXT_CHARS)
}

console.log('[WebMCP Content] Script inyectado en:', window.location.hostname)
