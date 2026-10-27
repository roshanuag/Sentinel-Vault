import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tailwind v4 plugs straight into Vite - no tailwind.config.js or postcss needed.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
})
