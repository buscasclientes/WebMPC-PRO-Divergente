# WebMCP Extension — Guía de Publicación en Chrome Web Store

Esta guía detalla los pasos necesarios para publicar oficialmente la extensión **WebMCP – Model Context Tool Inspector** en la Chrome Web Store.

---

## 1. Preparación de Recursos Gráficos e Iconos

### Iconos del Bundle
Los siguientes iconos se encuentran generados en la carpeta `dist/icons/` y cumplen los requisitos de tamaño:
- `icon16.png` (16x16 px): Para el favicon y menús contextuales.
- `icon32.png` (32x32 px): Para visualizaciones de páginas de extensiones.
- `icon48.png` (48x48 px): Para la página de configuración de extensiones.
- `icon128.png` (128x128 px): Icono principal para la ficha en la tienda.

### Capturas de Pantalla de la Tienda (1280x800 px)
Se han generado 5 capturas promocionales premium ubicadas en el directorio de la conversación para subir en la ficha:
1. `screenshot_inspector_*.png` — El Inspector en acción con respuesta en Markdown.
2. `screenshot_mcp_servers_*.png` — Servidores MCP conectados en estado activo y lista de herramientas.
3. `screenshot_extraction_*.png` — Flujo visual de extracción de texto y contexto web en un clic.
4. `screenshot_history_*.png` — Historial detallado con tokens, duración de peticiones y árbol JSON.
5. `screenshot_multi_provider_*.png` — Configuración de API Keys cifradas para Gemini, Claude y OpenAI.

---

## 2. Cuenta de Desarrollador en Chrome Web Store

1. Ve a la consola de desarrollador: [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Inicia sesión con una cuenta de Google (se recomienda una cuenta de organización o profesional).
3. Acepta los términos de servicio del desarrollador de la Chrome Web Store.
4. Realiza el pago único de registro de **$5 USD** (exigido por Google para prevenir spam y cuentas duplicadas).
5. Completa tu perfil de desarrollador con un correo de contacto público y enlace web.

---

## 3. Empaquetar la Extensión en ZIP

La extensión se empaqueta comprimiendo la carpeta `dist/` resultante del comando `npm run build`. 
Para simplificar esta tarea, se incluye un script `archive.js` en Node.js que genera un archivo `.zip` limpio y sin archivos basura temporales.

Para generar el archivo:
```bash
node archive.js
```
Esto creará `webmcp-extension-v1.0.0.zip` en la raíz del proyecto.

---

## 4. Subida y Configuración de la Ficha en la Consola

En el Chrome Developer Dashboard, haz clic en **"Add new item"** y selecciona tu archivo ZIP.

### Sección: Store Listing (Ficha de la Tienda)
- **Product Name**: `WebMCP – Model Context Tool Inspector` (Inglés / Español)
- **Summary**: `Inspector y depurador de prompts para flujos de IA con soporte MCP, Gemini, Claude y OpenAI`
- **Description**: Copia y pega el contenido correspondiente de [store_description.txt](file:///c:/Users/dario/Desktop/WebMCP-Extension/webmcp-extension/store_description.txt).
- **Category**: `Developer Tools`
- **Graphics**: 
  - Arrastra y suelta el icono `icon128.png` (128x128).
  - Sube las 5 capturas de pantalla de 1280x800 generadas en la sección de capturas.

### Sección: Privacy (Prácticas de Privacidad)
*Esta sección es crítica para la aprobación y revisión de extensiones con permisos de lectura:*

1. **Single Purpose**:
   > "WebMCP is a developer tool that inspects and debugs AI prompt workflows. It allows developers to extract web page content as context, send prompts to AI APIs (Gemini, Claude, OpenAI), and connect to MCP (Model Context Protocol) servers to monitor the complete request-response cycle. All AI API Keys are stored encrypted on the user's device."
2. **Permission Justification**:
   - `scripting`: Necesario para ejecutar de manera segura el content script encargado de extraer el texto del artículo y la selección activa en la pestaña del usuario, con el fin de insertarlo como contexto en el prompt.
   - `storage`: Requerido para almacenar localmente las API Keys del usuario (cifradas con AES-256), los logs de depuración (máx 50) y el historial de llamadas.
   - `activeTab`: Permite solicitar acceso temporal y seguro a la pestaña del navegador activa para realizar la captura del contexto solo cuando el usuario haga clic en los botones "Extraer" o "Selección".
3. **Data Usage**:
   - Declara que **no** recopilas datos de uso ni información personal.
   - Declara que **no** compartes datos con terceros externos (excepto la transmisión directa de prompts a las APIs de IA seleccionadas por el usuario).
   - Confirma que la extensión **no** monetiza ni vende datos de usuario bajo ninguna circunstancia.
   - **Privacy Policy URL**: Introduce la dirección URL HTTPS donde hayas publicado el archivo [privacy_policy.md](file:///c:/Users/dario/Desktop/WebMCP-Extension/webmcp-extension/privacy_policy.md).

---

## 5. Publicación y Revisión

- Selecciona el tipo de visibilidad: **Public** (Público), **Unlisted** (Oculto - accesible por enlace), o **Private** (Privado).
- Haz clic en **"Submit for Review"** (Enviar a revisión).
- La revisión de Google suele tardar de **24 horas a 5 días hábiles**. 
- Si los revisores rechazan la extensión por políticas de permisos, comprueba que has rellenado las justificaciones de `scripting` y `activeTab` detalladamente siguiendo esta guía.
