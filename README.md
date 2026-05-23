# WebMCP – Model Context Tool Inspector 🔍

**WebMCP – Model Context Tool Inspector** es una extensión de Chrome de alto rendimiento diseñada para la barra lateral (Side Panel) nativa del navegador. Permite a los desarrolladores e ingenieros de prompts depurar, evaluar e interactuar con modelos de IA (Gemini, Claude y OpenAI) utilizando el estándar **Model Context Protocol (MCP)** mediante conexiones WebSocket persistentes y extracción contextual avanzada en tiempo real.

---

## 🚀 Características Principales

*   **🔍 Inspector de Prompts Contextual**: Captura el contenido visible (texto principal, imágenes relevantes y enlaces) o texto seleccionado de cualquier página activa con atajos rápidos y úsalo como contexto para tus consultas.
*   **🔧 Integración WebSocket MCP Persistente**: Conecta con servidores MCP locales o remotos (JSON-RPC sobre WebSockets). El Service Worker mantiene la conexión persistente en segundo plano incluso cuando el Side Panel se cierra.
*   **🔑 Multi-proveedor y Cifrado AES-256**: Soporta Google Gemini (`gemini-2.5-flash`), Anthropic Claude y OpenAI. Las claves de API se cifran localmente de forma segura en tu navegador utilizando `AES-256-GCM` a través de la Web Crypto API.
*   **📊 Historial y Monitorización de Costes**: Registra de forma local la latencia, los tokens consumidos y el estado de cada llamada.
*   **🛡️ Panel de Debug Integrado**: Muestra en tiempo real las trazas completas de comunicación de las APIs e interacciones MCP, con censura automática de claves de API y tokens de portador para prevenir filtraciones accidentales.

---

## 📦 Versiones y Licenciamiento

WebMCP se distribuye en dos modalidades para adaptarse a las necesidades de desarrolladores y equipos:

*   **WebMCP Community (Este repositorio)**:
    *   **Licencia**: Código abierto bajo la licencia [MIT](LICENSE).
    *   **Precio**: 100% Gratis.
    *   **Instalación**: Manual desde el código fuente clonando y compilando el proyecto localmente.
    *   **Funciones**: Cliente WebSocket MCP local, extracción inteligente de contexto de página, cifrado local de credenciales con AES-256-GCM y panel de depuración de trazas.

*   **WebMCP Pro (Versión Comercial)**:
    *   **Distribución**: Disponible oficialmente en la **Chrome Web Store** (instalación rápida en un clic con actualizaciones automáticas garantizadas).
    *   **Precio**: Pago único de $9.99 o planes de suscripción para equipos.
    *   **Funciones Avanzadas**: Sincronización cifrada en la nube de historial y credenciales, integración directa con modelos sin configurar API Keys locales (Token Billing), ejecución de bucles de agentes automáticos (Tool Loops) y presets MCP compartidos para equipos.

---

## 🛠️ Instalación y Desarrollo Local

Sigue estos pasos para ejecutar la extensión en tu entorno local en modo desarrollador:

### 1. Clonar el repositorio e instalar dependencias

```bash
# Entrar al directorio del proyecto
cd webmcp-extension

# Instalar dependencias
npm install
```

### 2. Ejecutar el servidor de desarrollo

```bash
# Iniciar el compilador Vite en modo watch
npm run dev
```

Esto generará la carpeta compilada `/dist` en la raíz del proyecto y vigilará cualquier cambio en el código fuente.

### 3. Cargar la extensión en Google Chrome

1.  Abre Chrome y navega a `chrome://extensions/`.
2.  Activa el **Modo de desarrollador** (esquina superior derecha).
3.  Haz clic en **Cargar descomprimida** (esquina superior izquierda).
4.  Selecciona el directorio `/dist` generado dentro de la carpeta `webmcp-extension`.
5.  ¡Listo! Ya puedes hacer clic en el icono de la extensión para abrir el **Side Panel** de WebMCP.

---

## 🧪 Pruebas y Servidor Mock MCP

El repositorio incluye herramientas integradas para realizar pruebas funcionales de la extensión:

### Ejecutar Servidor Mock MCP (WebSocket)
Para probar las conexiones WebSocket MCP locales, inicia el servidor simulado:

```bash
node mock-mcp-server.js
```
Este servidor correrá en `ws://localhost:8080` y registrará herramientas de simulación como `get_weather` y `calculate_hash`. Agrégalo en la pestaña **Agentes** del Side Panel para interactuar con él.

### Conectar Agentes de IA Locales (Cursor, Claude, Antigravity)
WebMCP Agent Bridge te permite conectar Cursor, Claude Desktop/Code o Antigravity directamente a tu navegador para realizar lecturas de contexto y automatizaciones.

1. **Configurar Agentes**: Sigue las instrucciones de la [Guía de Configuración de Agentes](AGENTS_SETUP.md) o ejecuta `npm run configure-mcp` para configurar Claude Desktop automáticamente.
2. **Iniciar el Bridge**:
   ```bash
   npm run bridge
   ```
3. **Conectar la Extensión**: En el Side Panel de WebMCP, ve a **Agentes**, introduce `ws://localhost:9000` y haz clic en **Conectar**.

### Ejecutar Suite de Pruebas Automatizadas
Verifica el correcto funcionamiento del cifrado de credenciales, la censura de seguridad y la comunicación WebSocket ejecutando:

```bash
node run-tests.js
```

---

## 📁 Estructura del Proyecto

*   `src/background/`: Service Worker encargado del ciclo de vida de la extensión, persistencia WebSocket y enrutamiento de mensajes.
*   `src/content/`: Scripts inyectados para la extracción inteligente y segura del DOM sin alterar el contexto de la página.
*   `src/sidepanel/`: Interfaz de usuario interactiva creada con React, Vite y Tailwind CSS.
*   `src/storage/`: Capa de almacenamiento seguro y cifrado con AES-256.
*   `src/shared/`: Modelos de clientes de IA, utilidades de criptografía y definiciones de tipos TypeScript.
*   `archive.js`: Script de compresión multiplataforma para generar el paquete de distribución `.zip`.

---

## 📄 Política de Privacidad y Publicación

Si deseas publicar la extensión, consulta los siguientes archivos preparados para la Chrome Web Store:
-   **Guía de Publicación paso a paso**: [publishing_guide.md](publishing_guide.md)
-   **Descripción de la Tienda (Español/Inglés)**: [store_description.txt](store_description.txt)
-   **Política de Privacidad Oficial**: [privacy_policy.md](privacy_policy.md) (te recomendamos alojarla en GitHub Pages o similar para enlazarla desde la consola).

---

## 📝 Licencia

Este proyecto está bajo la licencia [MIT](LICENSE).
