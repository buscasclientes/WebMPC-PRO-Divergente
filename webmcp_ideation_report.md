# WebMCP Extension — Reporte de Ideación y Mejores Prácticas 🚀

Este reporte analiza los repositorios oficiales de WebMCP (`webmcp-main` y `webmcp-tools-main`) y extrae ideas clave, arquitectura y mejores prácticas que podemos incorporar en nuestra extensión para convertirla en un cliente WebMCP completo y de alto rendimiento.

---

## 1. ¿Qué es WebMCP en profundidad?

**WebMCP (Model Context Protocol para la Web)** es una propuesta de estándar web desarrollada conjuntamente por ingenieros de Microsoft y Google. Su objetivo es permitir que las páginas web expongan sus funciones internas a los asistentes de IA directamente en JavaScript, sin necesidad de servidores intermedios o APIs complejas de backend.

Hoy en día, las páginas web se diseñan para humanos (UI visual, clicks, scroll). Con WebMCP, un desarrollador puede declarar:
> "Esta página web tiene una herramienta llamada `book_flight` que toma `date`, `destination` y `passengers` y la ejecuta llamando a nuestra función JavaScript `submitBooking()`".

Esto unifica la interfaz humana y de IA en el navegador:
- **Imperativo (JS)**: Llamando a `navigator.modelContext.registerTool(...)`.
- **Declarativo (HTML)**: Anotando formularios existentes con atributos especiales (p.ej. `toolname="search"`).

---

## 2. Estado Actual de nuestra Extensión vs. Especificación WebMCP

| Característica | Nuestra Extensión | Especificación WebMCP Oficial |
| :--- | :--- | :--- |
| **Conexión a Servidores MCP** | ✅ Soportado vía WebSocket (`ws://`) en la pestaña "Agentes". | No es el foco principal (está más orientada a herramientas locales). |
| **Extracción de Contexto** | ✅ Soportado (lector inteligente de texto, links, imágenes y selección). | Se hace a través del DOM y de capturas. |
| **Descubrimiento de herramientas en la Página** | ❌ No soportado. | **Core**: Lee herramientas de la pestaña activa vía `navigator.modelContext`. |
| **Ejecución de herramientas en la Página** | ❌ No soportado. | **Core**: El agente puede invocar callbacks de la página en tiempo de ejecución. |
| **Bucle de herramientas (Tool Loop) en Chat** | ❌ No soportado (solo envía contexto de texto plano). | **Core**: El modelo de IA recibe esquemas de herramientas y decide cuáles invocar recursivamente. |

---

## 3. Ideas Clave a Adoptar de los Repositorios Analizados

### 💡 Idea 1: Detección y Proxy de `navigator.modelContext` en la Página Activa
El repositorio `webmcp-main` describe que la página web registra herramientas en `navigator.modelContext` (o `navigator.modelContextTesting` en versiones de prueba de Chrome). 

- **Cómo aplicarlo**: 
  1. Inyectamos un script de contenido en el mundo principal (`world: 'MAIN'`) de la página.
  2. Este script detecta si existe `window.navigator.modelContext`. Si no existe, podemos crear un polyfill para interceptar los registros.
  3. Enviamos la lista de herramientas registradas por la página web al Service Worker (`background.ts`) y de ahí a la interfaz del Side Panel.
  4. Mostramos estas herramientas directamente bajo una sección "Herramientas de la Página" en el sidepanel.

### 💡 Idea 2: Reconocimiento Automático de Formularios Declarativos
En el repositorio `webmcp-studio`, los formularios HTML se marcan con:
```html
<form toolname="add_to_cart" tooldescription="Adds an item to the shopping bag">
  <input name="item_id" toolparamdescription="The ID of the item">
  <input name="qty" type="number" toolparamdescription="Quantity of items">
</form>
```
- **Cómo aplicarlo**: 
  - En nuestro extractor inteligente (`extractor.ts`), podemos buscar elementos `<form>` que tengan el atributo `toolname`.
  - Convertimos automáticamente esos formularios en esquemas de herramientas JSON-Schema.
  - Si el modelo de IA llama a la herramienta, simulamos la inserción de datos en los campos y llamamos al método `.submit()` del formulario o disparamos los eventos de click en el botón de envío. ¡Esto proporciona automatización instantánea y sin esfuerzo en cualquier página compatible!

### 💡 Idea 3: Implementar el Bucle de Herramientas (Tool Calling Loop) en el Chat
Tanto en `evals-cli` como en el comportamiento estándar de asistentes, el chat no se limita a responder texto. Utiliza las capacidades de function calling de Gemini (`gemini-2.5-flash` lo soporta nativamente) y Claude:

- **Cómo aplicarlo**:
  - Al enviar una consulta en el Side Panel, recuperamos todas las herramientas disponibles:
    1. Las herramientas del servidor WebSocket MCP local (p.ej. nuestro mock server).
    2. Las herramientas de la página activa (declarativas y `navigator.modelContext`).
  - Pasamos estas herramientas en el campo `tools` de la API de Gemini/Claude.
  - Si el modelo responde con una solicitud de llamada (`toolCall`), interceptamos la llamada en el Service Worker:
    - Si es de un servidor WebSocket, la redirigimos por el socket.
    - Si es de la página web, enviamos un mensaje al Content Script para ejecutar el callback correspondiente o completar el formulario.
  - Devolvemos el resultado al modelo de IA para que genere la respuesta final.

### 💡 Idea 4: Pruebas de Evaluación de Herramientas (`evals-cli`)
El repositorio `webmcp-tools-main` incluye una herramienta CLI de evaluación que corre pruebas utilizando Puppeteer sobre Chrome Canary para medir la precisión de la IA seleccionando herramientas.
- **Cómo aplicarlo**:
  - Podemos ampliar nuestra suite `run-tests.js` o crear un archivo `webmcp-evals.js` para simular prompts de usuario típicos (p.ej., *"Busca películas de comedia"*) y asegurar que el modelo de IA formule la llamada a la herramienta con los parámetros adecuados (p.ej. `query_content({ genre: 'comedy' })`).

---

## 4. Plan de Ruta Sugerido para una Futura Expansión (Fase 6)

Para llevar nuestra extensión al siguiente nivel, proponemos la adición de una nueva **Fase 6** en el desarrollo:

```markdown
### FASE 6 — Integración Profunda WebMCP (Propuesta)
- [ ] T-36 · Crear script de inyección en MAIN world para interceptar window.navigator.modelContext
- [ ] T-37 · Modificar extractor.ts para parsear formularios declarativos WebMCP
- [ ] T-38 · Implementar la API de llamadas a herramientas (function calling) en shared/aiClients.ts
- [ ] T-39 · Diseñar el orquestador de Tool Loop (petición -> llamada de herramienta -> ejecución -> respuesta final)
- [ ] T-40 · Mostrar el estado de ejecución y consentimiento de herramientas en la pantalla "Debug" y en el "Inspector"
```

## 5. Conclusión y Recomendación

La arquitectura actual de nuestra extensión es extremadamente sólida y limpia. Agregar la integración con `navigator.modelContext` y formularios declarativos nos alinearía 100% con los repositorios de desarrollo y especificaciones de Google/Microsoft.

> [!TIP]
> Dado que la clave de API de Gemini proporcionada por el usuario funciona correctamente, podemos utilizarla para habilitar y validar de manera segura flujos de llamadas a herramientas reales en entornos de prueba locales.
