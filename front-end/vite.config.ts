import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";


export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()].filter(Boolean), 
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize chunk sizes for better loading on slow networks
    rollupOptions: {
      output: {
        // Code splitting strategy for better caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-navigation-menu'],
          'chart-vendor': ['recharts'],
          'query-vendor': ['@tanstack/react-query'],
        }
      }
    },
    // Compress assets more aggressively
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
      },
    },
    // Target modern browsers for smaller bundle
    target: 'ES2020',
    // Set chunk size warnings
    chunkSizeWarningLimit: 500,
    // Enable source maps in production for debugging
    sourcemap: mode === 'development',
    // Increase CSS code split threshold
    cssCodeSplit: true,
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react'
    ],
  },
}));