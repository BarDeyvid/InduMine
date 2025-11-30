import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // This forces all libraries to use the ONE copy of React in your root node_modules
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'styled-components': path.resolve(__dirname, 'node_modules/styled-components'),
    },
  },
  optimizeDeps: {
    // Forces Vite to pre-bundle these dependencies to avoid CommonJS/ESM mismatches
    include: ['react', 'react-dom', 'styled-components', '@mui/material', '@emotion/react', '@emotion/styled'],
  },
  server: {
    watch: {
      usePolling: true
    },
    base: mode === 'deploy' ? '/WEGMine/' : '/',
  }
})