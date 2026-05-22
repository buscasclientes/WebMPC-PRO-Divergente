import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync, renameSync } from 'fs'

// Plugin para copiar el manifest.json y mover el HTML al lugar correcto
function chromeExtensionPlugin() {
  return {
    name: 'chrome-extension',
    closeBundle() {
      // 1. Copiar manifest
      if (!existsSync('dist')) mkdirSync('dist', { recursive: true })
      copyFileSync('manifest.json', 'dist/manifest.json')

      // 2. Mover HTML de dist/src/sidepanel/ → dist/sidepanel/
      const htmlSrc  = resolve(__dirname, 'dist/src/sidepanel/index.html')
      const htmlDest = resolve(__dirname, 'dist/sidepanel/index.html')
      if (existsSync(htmlSrc)) {
        mkdirSync(resolve(__dirname, 'dist/sidepanel'), { recursive: true })
        // Leer, reescribir rutas absolutas a relativas, y guardar
        const { readFileSync, writeFileSync } = require('fs')
        let html = readFileSync(htmlSrc, 'utf-8') as string
        // Chrome extensions necesitan rutas relativas, no absolutas
        html = html
          .replace(/src="\/sidepanel\//g,   'src="./')
          .replace(/href="\/sidepanel\//g,   'href="./')
          .replace(/href="\/chunks\//g,      'href="../chunks/')
          .replace(/src="\/chunks\//g,       'src="../chunks/')
        writeFileSync(htmlDest, html, 'utf-8')
      }
    },
  }
}


export default defineConfig({
  plugins: [
    react(),
    chromeExtensionPlugin(),
  ],
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel:         resolve(__dirname, 'src/sidepanel/index.html'),
        'background/index': resolve(__dirname, 'src/background/index.ts'),
        'content/index':    resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'sidepanel') return 'sidepanel/[name].js'
          return '[name].js'
        },
        chunkFileNames:  'chunks/[name]-[hash].js',
        assetFileNames: (asset) => {
          if (asset.name?.endsWith('.css')) return 'sidepanel/[name][extname]'
          return 'assets/[name][extname]'
        },
        manualChunks: undefined,
      },
    },
  },
})
