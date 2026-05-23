/**
 * WebMCP - Auto-Configurator for Claude and Cursor
 * Resolves the absolute path to webmcp-agent-bridge.js and adds it to Claude Desktop's config file.
 * Also prints step-by-step instructions for Cursor, Claude Code, and Antigravity.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('\x1b[36m%s\x1b[0m', '=== WebMCP Agent Bridge Auto-Configurator ===\n');

// 1. Resolve path to webmcp-agent-bridge.js
const bridgePath = path.resolve(__dirname, 'webmcp-agent-bridge.js');
console.log(`Resolviendo ruta absoluta del bridge:\n👉 ${bridgePath}\n`);

// Check if the bridge file exists
if (!fs.existsSync(bridgePath)) {
  console.error('\x1b[31m%s\x1b[0m', `Error: No se encontró '${bridgePath}'. Asegúrate de ejecutar este script desde la carpeta webmcp-extension.`);
  process.exit(1);
}

// 2. Identify Claude Desktop config file path
let claudeConfigDir;
let claudeConfigPath;

if (process.platform === 'win32') {
  claudeConfigDir = path.join(process.env.APPDATA || '', 'Claude');
  claudeConfigPath = path.join(claudeConfigDir, 'claude_desktop_config.json');
} else if (process.platform === 'darwin') {
  claudeConfigDir = path.join(os.homedir(), 'Library', 'Application Support', 'Claude');
  claudeConfigPath = path.join(claudeConfigDir, 'claude_desktop_config.json');
} else {
  claudeConfigDir = path.join(os.homedir(), '.config', 'Claude');
  claudeConfigPath = path.join(claudeConfigDir, 'claude_desktop_config.json');
}

console.log(`Detectando ruta de configuración de Claude Desktop:\n📂 ${claudeConfigPath}\n`);

// 3. Update or create Claude Desktop config
try {
  // Ensure the directory exists
  if (!fs.existsSync(claudeConfigDir)) {
    fs.mkdirSync(claudeConfigDir, { recursive: true });
    console.log(`Creada la carpeta de configuración: ${claudeConfigDir}`);
  }

  let config = { mcpServers: {} };

  if (fs.existsSync(claudeConfigPath)) {
    try {
      const fileContent = fs.readFileSync(claudeConfigPath, 'utf8');
      config = JSON.parse(fileContent);
      if (!config.mcpServers) {
        config.mcpServers = {};
      }
      console.log('Archivo de configuración existente detectado.');
    } catch (parseError) {
      console.warn('\x1b[33m%s\x1b[0m', 'Advertencia: El archivo de configuración actual no tiene formato JSON válido. Se creará uno nuevo.');
    }
  }

  // Update or set the webmcp entry
  // Using forward slashes for the path even on Windows to prevent backslash escaping issues in JSON
  const normalizedBridgePath = bridgePath.replace(/\\/g, '/');
  config.mcpServers.webmcp = {
    command: 'node',
    args: [normalizedBridgePath]
  };

  fs.writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2), 'utf8');
  console.log('\x1b[32m%s\x1b[0m', '✅ ¡Claude Desktop configurado con éxito! Reinicia Claude Desktop para aplicar los cambios.\n');
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', `No se pudo configurar Claude Desktop automáticamente: ${error.message}`);
  console.log('Continúa con los pasos de configuración manual a continuación.\n');
}

// 4. Print setup instructions for Cursor, Claude Code, and Antigravity
console.log('\x1b[35m%s\x1b[0m', '==================================================');
console.log('\x1b[35m%s\x1b[0m', '      GUÍA DE CONFIGURACIÓN DE AGENTES MCP');
console.log('\x1b[35m%s\x1b[0m', '==================================================\n');

console.log('\x1b[36m%s\x1b[0m', '1. 💻 CURSOR (Cursor Cascade / MCP Settings)');
console.log('Sigue estos sencillos pasos en Cursor:');
console.log('  a. Abre Cursor y ve a:');
console.log('     \x1b[1mSettings -> Models -> MCP\x1b[0m');
console.log('  b. Haz clic en \x1b[1m"+ Add New MCP Server"\x1b[0m');
console.log('  c. Rellena los datos de la siguiente manera:');
console.log('     - Name: \x1b[32mwebmcp\x1b[0m');
console.log('     - Type: \x1b[32mcommand\x1b[0m');
console.log(`     - Command: \x1b[32mnode "${bridgePath.replace(/\\/g, '/')}"\x1b[0m`);
console.log('  d. Haz clic en \x1b[1mSave\x1b[0m.\n');

console.log('\x1b[36m%s\x1b[0m', '2. 🤖 CLAUDE DESKTOP (Anthropic)');
console.log('¡Ya lo hemos configurado automáticamente!');
console.log('Si prefieres verificarlo o hacerlo manualmente, añade esto en tu archivo de configuración:');
console.log(JSON.stringify({
  mcpServers: {
    webmcp: {
      command: "node",
      args: [bridgePath.replace(/\\/g, '/')]
    }
  }
}, null, 2));
console.log('\nRecuerda reiniciar la aplicación de Claude Desktop para aplicar los cambios.\n');

console.log('\x1b[36m%s\x1b[0m', '3. ⌨️ CLAUDE CODE CLI');
console.log('Para usar el puente de automatización directamente desde Claude Code en tu terminal:');
console.log('Puedes añadirlo a la configuración global de Claude Code ejecutando:');
console.log(`  \x1b[32mclaude mcp add webmcp -- node "${bridgePath.replace(/\\/g, '/')}"\x1b[0m`);
console.log('O puedes ejecutar claude con el servidor MCP en línea:');
console.log(`  \x1b[32mclaude --mcp node "${bridgePath.replace(/\\/g, '/')}"\x1b[0m\n`);

console.log('\x1b[36m%s\x1b[0m', '4. 🛸 ANTIGRAVITY (Este Entorno de Agente)');
console.log('Como tu asistente Antigravity, puedo interactuar directamente con tu navegador si:');
console.log('  a. Dejas corriendo el puente ejecutando en tu terminal:');
console.log('     \x1b[32mnode webmcp-agent-bridge.js\x1b[0m');
console.log('  b. Conectas la extensión de Chrome al puente desde la pestaña "Agentes".');
console.log('  c. ¡Listo! Podré leer el contenido de tu pestaña activa o interactuar con ella.\n');

console.log('\x1b[33m%s\x1b[0m', '👉 IMPORTANTE: En todos los casos, recuerda abrir tu extensión WebMCP en Google Chrome,');
console.log('\x1b[33m%s\x1b[0m', 'ir a la pestaña "Agentes", introducir "ws://localhost:9000" y hacer clic en "Conectar".');
console.log('\x1b[33m%s\x1b[0m', 'Esto enlaza el navegador al puente de automatización local.');
