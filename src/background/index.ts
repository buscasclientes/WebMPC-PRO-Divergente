// ============================================================
// WebMCP – Background Service Worker (T-05)
// Gestiona eventos globales: tab change, icon click, MCP WS
// ============================================================
import type { Message, PageContext } from '../shared/types'
import { getActiveProvider, getDebugMode } from '../storage'

// ── Abrir Side Panel al hacer clic en el icono ───────────────
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error)

// ── Escuchar mensajes de Side Panel y Content Script ─────────
chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse)
    return true  // mantiene el canal abierto para respuestas async
  },
)

async function handleMessage(
  message: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: Message) => void,
) {
  const debugMode = await getDebugMode()

  if (debugMode) {
    console.log('[WebMCP BG]', message.type, message.payload)
  }

  switch (message.type) {
    case 'GET_PAGE_CONTEXT': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        sendResponse({ type: 'PAGE_CONTEXT_RESPONSE', payload: null, error: 'No active tab' })
        return
      }
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractPageContext,
        })
        const context = results[0]?.result as PageContext | null
        sendResponse({ type: 'PAGE_CONTEXT_RESPONSE', payload: context })
      } catch (err) {
        sendResponse({
          type: 'PAGE_CONTEXT_RESPONSE',
          payload: null,
          error: String(err),
        })
      }
      break
    }

    case 'RUN_PROMPT': {
      // El Side Panel gestiona la llamada directamente vía fetch
      // El BG solo registra en debug
      if (debugMode) {
        console.log('[WebMCP BG] RUN_PROMPT recibido – gestionado por el panel')
      }
      break
    }

    case 'DEBUG_LOG': {
      if (debugMode) {
        console.log('[WebMCP DEBUG]', message.payload)
      }
      break
    }

    default:
      break
  }
}

// ── Función inyectada para extraer contexto (corre en la página) ─
function extractPageContext(): PageContext {
  const MAX_CHARS = 8_000

  // Texto visible: excluir scripts y estilos
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT
        const tag = parent.tagName.toLowerCase()
        if (['script', 'style', 'noscript'].includes(tag)) {
          return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      },
    },
  )

  let visibleText = ''
  let node: Node | null
  while ((node = walker.nextNode()) && visibleText.length < MAX_CHARS) {
    visibleText += node.textContent?.trim() + ' '
  }

  return {
    url:          window.location.href,
    title:        document.title,
    selectedText: window.getSelection()?.toString().slice(0, 2_000) ?? '',
    visibleText:  visibleText.trim().slice(0, MAX_CHARS),
    timestamp:    Date.now(),
    tabId:        0,  // el BG lo sobrescribe con el tabId real
  }
}

// ── Limpiar conexiones al cerrar tabs ────────────────────────
chrome.tabs.onRemoved.addListener((tabId) => {
  console.log('[WebMCP BG] Tab cerrado:', tabId)
})

console.log('[WebMCP BG] Service Worker iniciado.')
