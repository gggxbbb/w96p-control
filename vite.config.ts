/// <reference types="vitest" />
import { execSync } from 'node:child_process'
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

function gitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return 'unknown'
  }
}

function buildTime(): string {
  return new Date().toISOString()
}

export default defineConfig({
  define: {
    'import.meta.env.VITE_COMMIT_HASH': JSON.stringify(gitHash()),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(buildTime()),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
  },
  resolve: {
    alias: {
      '@gggxbbb/w96p-ble-sdk': path.resolve(__dirname, 'packages/sdk/src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      manifest: {
        name: 'W96P 控制',
        short_name: 'W96P',
        description: 'Witrn W96P / W66D BLE 风扇控制面板',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        background_color: '#1A1A18',
        theme_color: '#1A1A18',
        categories: ['utilities'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
