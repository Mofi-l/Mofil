import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// base must match the GitHub Pages sub-path (https://mofi-l.github.io/Mofil/).
export default defineConfig({
  base: '/Mofil/',
  plugins: [react()],
})
