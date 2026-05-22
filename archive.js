const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const zipName = 'webmcp-extension-v1.0.0.zip';
const distDir = path.join(__dirname, 'dist');
const zipPath = path.join(__dirname, zipName);

console.log('--- WebMCP Extension Packaging ---');

// Check if dist folder exists
if (!fs.existsSync(distDir)) {
  console.error('Error: "dist" directory not found. Please run "npm run build" first.');
  process.exit(1);
}

// Remove old zip if it exists
if (fs.existsSync(zipPath)) {
  console.log(`Removing old ${zipName}...`);
  fs.unlinkSync(zipPath);
}

console.log('Compressing "dist" directory into ZIP...');

try {
  if (process.platform === 'win32') {
    // On Windows, use PowerShell's Compress-Archive
    const cmd = `powershell -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipPath}' -Force"`;
    execSync(cmd, { stdio: 'inherit' });
  } else {
    // On Unix systems, use zip command
    const cmd = `zip -r '${zipName}' dist/*`;
    execSync(cmd, { stdio: 'inherit' });
  }
  
  if (fs.existsSync(zipPath)) {
    const stats = fs.statSync(zipPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\nSuccess! Created archive: ${zipName}`);
    console.log(`Size: ${sizeInMB} MB`);
  } else {
    throw new Error('ZIP file was not created.');
  }
} catch (error) {
  console.error('Error during compression:', error.message);
  process.exit(1);
}
