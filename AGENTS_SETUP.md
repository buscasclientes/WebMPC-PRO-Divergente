# Guía de Conexión de Agentes de IA (Claude, Cursor y Antigravity) 🚀

Esta guía detalla cómo conectar agentes de IA locales con tu navegador a través de **WebMCP Agent Bridge**. El puente expone herramientas de automatización del navegador que permiten a la IA:

1. Leer el contexto de la pestaña activa (URL, título, contenido del DOM).
2. Simular clics en elementos HTML mediante selectores CSS.
3. Escribir texto en campos de formulario.
4. Ejecutar fragmentos de JavaScript personalizados y obtener el resultado.

---

## 🛠️ Configuración Rápida Automática (Recomendada)

Si tienes **Claude Desktop** instalado en tu sistema, puedes configurarlo de forma totalmente automática ejecutando:

```bash
npm run configure-mcp
```

Este script detectará tu sistema operativo, resolverá la ubicación exacta del bridge en tu máquina y creará/actualizará el archivo de configuración correspondiente de Claude Desktop de forma segura, sin tocar otras configuraciones existentes. Además, mostrará en consola la guía de configuración detallada para otros entornos.

---

## 🛸 Configuración Detallada por Agente

### 1. 💻 Cursor (Cursor Cascade o MCP en Configuración)

Cursor soporta la integración nativa de servidores MCP stdio. Para configurar WebMCP:

1. Abre Cursor.
2. Accede a la configuración: **Settings -> Models -> MCP** (o haz clic en el icono de la rueda de engranaje en la esquina superior derecha y busca la sección MCP).
3. Haz clic en el botón **"+ Add New MCP Server"**.
4. Completa el formulario con los siguientes campos:
   * **Name**: `webmcp`
   * **Type**: Selecciona `command`
   * **Command**: `node "C:/Ruta/Absoluta/A/webmcp-extension/webmcp-agent-bridge.js"` *(reemplaza con tu ruta real, puedes copiar la ruta exacta que imprime el script de configuración automática)*
5. Haz clic en **Save** para confirmar.

Una vez guardado, Cursor Cascade tendrá acceso inmediato a las herramientas de navegación de WebMCP.

---

### 2. 🤖 Claude Desktop

El script de configuración automática se encarga de crear o actualizar el archivo `claude_desktop_config.json`. 

Si prefieres añadirlo manualmente, edita el archivo correspondiente a tu sistema operativo:

* **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
* **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Linux**: `~/.config/Claude/claude_desktop_config.json`

Añade la siguiente sección bajo la clave `mcpServers`:

```json
{
  "mcpServers": {
    "webmcp": {
      "command": "node",
      "args": [
        "C:/Ruta/Absoluta/A/webmcp-extension/webmcp-agent-bridge.js"
      ]
    }
  }
}
```

*Nota: Asegúrate de reiniciar Claude Desktop tras aplicar la configuración para que el servidor se inicialice correctamente.*

---

### 3. ⌨️ Claude Code CLI

Si utilizas la interfaz de comandos oficial de Anthropic (**Claude Code**), puedes agregar el puente MCP con una sola línea en tu terminal:

```bash
claude mcp add webmcp -- node "C:/Ruta/Absoluta/A/webmcp-extension/webmcp-agent-bridge.js"
```

Alternativamente, puedes lanzar Claude Code y adjuntar el puente en la misma sesión ejecutando:

```bash
claude --mcp node "C:/Ruta/Absoluta/A/webmcp-extension/webmcp-agent-bridge.js"
```

---

### 4. 🧬 Antigravity (Este Agente)

Para permitirme interactuar con tu navegador durante nuestro desarrollo o pruebas:

1. Abre una terminal en la carpeta `webmcp-extension` y arranca el puente:
   ```bash
   npm run bridge
   ```
   *(Esto iniciará el servidor WebSocket en `ws://localhost:9000`)*.
2. Abre la extensión WebMCP en Chrome.
3. Ve a la pestaña **"Agentes"** en el panel lateral.
4. Escribe `ws://localhost:9000` en el campo del servidor y haz clic en **Conectar**.
5. ¡Listo! A partir de ese momento podré realizar inyecciones de script, capturas y clics a través del puente directamente sobre tu pestaña activa en tiempo real.

---

## 🛡️ Uso Seguro y Consentimiento

La extensión WebMCP implementa medidas de seguridad robustas para evitar acciones maliciosas:
* Cada vez que un agente de IA solicita ejecutar una herramienta (como hacer clic o inyectar código), se genera una alerta visual y un registro en la sección **Debug** de la extensión.
* El puente solo tiene acceso a las pestañas y dominios en los que la extensión de Chrome está activa y cargada.
* Las API Keys guardadas en la extensión están cifradas localmente con `AES-256-GCM` y **nunca** se envían al puente ni al agente MCP.
