import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  define: { "import.meta.env.VITE_APP_VERSION": JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? "development") },
  base: process.env.VITE_BASE_URL ?? '/',
  build: {
    sourcemap: false,
    minify: true,
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', '@supabase/supabase-js'],
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '5173'),
    strictPort: true,
  },
})
