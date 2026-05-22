// ============================================================
// WebMCP – Extractor inteligente de contexto de página (T-18)
// Estrategia semántica + heurística de densidad de texto
// ============================================================
import type { PageContext } from '../shared/types'
import { MAX_PAGE_TEXT_CHARS, MAX_SELECTED_TEXT } from '../shared/constants'

// ── Selectores semánticos por prioridad ───────────────────
const MAIN_CONTENT_SELECTORS = [
  'article',
  'main',
  '[role="main"]',
  '.post-content',
  '.article-body',
  '.article-content',
  '.entry-content',
  '.post-body',
  '#content',
  '#main-content',
  '.content-body',
] as const

// ── Elementos a excluir siempre ───────────────────────────
const EXCLUDED_TAGS = new Set([
  'script', 'style', 'noscript', 'meta', 'link',
  'nav', 'header', 'footer', 'aside', 'form',
  'button', 'select', 'option', 'input', 'textarea',
  'iframe', 'object', 'embed', 'video', 'audio',
  'advertisement', 'cookie-banner',
])

export function extractPageContext(): PageContext {
  const mainContent = extractMainContent()
  const selectedText = getSelectedText()

  return {
    url:         window.location.href,
    title:       document.title,
    description: getMeta('description') ?? getMeta('og:description') ?? '',
    author:      getMeta('author') ?? getMeta('og:author') ?? undefined,
    publishDate: getMeta('article:published_time') ?? getMeta('datePublished') ?? undefined,
    mainContent: mainContent.slice(0, MAX_PAGE_TEXT_CHARS),
    selectedText: selectedText || undefined,
    images:      extractImageAlts(),
    links:       extractInternalLinks(),
    wordCount:   mainContent.split(/\s+/).filter(Boolean).length,
    lang:        document.documentElement.lang || navigator.language || 'es',
    timestamp:   Date.now(),
    tabId:       0,
  }
}

// ── Extracción semántica del contenido principal ───────────
function extractMainContent(): string {
  // 1. Intentar selectores semánticos en orden de prioridad
  for (const selector of MAIN_CONTENT_SELECTORS) {
    const el = document.querySelector(selector)
    if (el && isContentRich(el)) {
      return cleanText(extractVisibleText(el))
    }
  }

  // 2. Heurística de densidad: el div con más texto limpio
  const divs = Array.from(document.querySelectorAll('div, section'))
  let best: Element = document.body
  let bestLength = 0

  for (const div of divs) {
    const text = extractVisibleText(div).trim()
    if (text.length > bestLength && !isBoilerplate(div)) {
      bestLength = text.length
      best = div
    }
  }

  // 3. Fallback: body completo
  return cleanText(extractVisibleText(best || document.body))
}

// ── Extracción de texto visible (sin scripts/styles ocultos) ─
function extractVisibleText(root: Element): string {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node): number {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT

      const tag = parent.tagName.toLowerCase()
      if (EXCLUDED_TAGS.has(tag)) return NodeFilter.FILTER_REJECT

      const style = window.getComputedStyle(parent)
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return NodeFilter.FILTER_REJECT
      }

      return NodeFilter.FILTER_ACCEPT
    },
  })

  const chunks: string[] = []
  let node: Node | null
  let total = 0

  while ((node = walker.nextNode()) && total < MAX_PAGE_TEXT_CHARS) {
    const text = node.textContent?.trim()
    if (text && text.length > 1) {
      chunks.push(text)
      total += text.length
    }
  }

  return chunks.join(' ')
}

// ── Heurísticas de contenido ───────────────────────────────
function isContentRich(el: Element): boolean {
  const text = el.textContent?.trim() ?? ''
  return text.length > 300
}

function isBoilerplate(el: Element): boolean {
  const classes = el.className?.toLowerCase() ?? ''
  const id      = el.id?.toLowerCase() ?? ''
  const combined = classes + ' ' + id
  return /nav|menu|sidebar|footer|header|cookie|banner|ad|popup|modal|overlay/.test(combined)
}

// ── Limpieza de texto ──────────────────────────────────────
function cleanText(text: string): string {
  return text
    .replace(/[ \t]+/g, ' ')          // múltiples espacios → uno
    .replace(/\n{3,}/g, '\n\n')        // máx 2 saltos de línea
    .replace(/[^\S\n]+\n/g, '\n')      // espacios antes de salto de línea
    .trim()
}

// ── Texto seleccionado ─────────────────────────────────────
function getSelectedText(): string {
  return (window.getSelection()?.toString() ?? '').slice(0, MAX_SELECTED_TEXT)
}

// ── Meta tags ──────────────────────────────────────────────
function getMeta(name: string): string | undefined {
  return (
    document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ??
    document.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ??
    undefined
  )
}

// ── Imágenes relevantes ────────────────────────────────────
function extractImageAlts(): string[] {
  return Array.from(document.querySelectorAll('img[alt]'))
    .slice(0, 5)
    .map(img => (img as HTMLImageElement).alt.trim())
    .filter(alt => alt.length > 2)
}

// ── Links internos ─────────────────────────────────────────
function extractInternalLinks(): Array<{ text: string; href: string }> {
  const host = window.location.hostname
  return Array.from(document.querySelectorAll('a[href]'))
    .filter(a => {
      const anchor = a as HTMLAnchorElement
      const text   = anchor.textContent?.trim()
      return anchor.href.includes(host) && text && text.length > 2
    })
    .slice(0, 10)
    .map(a => ({
      text: (a as HTMLAnchorElement).textContent!.trim(),
      href: (a as HTMLAnchorElement).href,
    }))
}
