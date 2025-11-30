import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'styled-components': path.resolve(__dirname, 'node_modules/styled-components'),
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'styled-components',
      '@mui/material',
      '@emotion/react',
      '@emotion/styled',
    ],
  },
  server: {
    watch: {
      usePolling: true,
    },
  },
  base: mode === 'deploy' ? '/WEGMine/' : '/',
}))
