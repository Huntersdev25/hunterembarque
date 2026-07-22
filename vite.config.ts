import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;
          // Heavy export libraries - safe to isolate (no React deps)
          if (id.includes('exceljs') || id.includes('jspdf') || id.includes('html2canvas')) {
            return 'export-vendor';
          }
          // Supabase - safe to isolate
          if (id.includes('@supabase')) return 'supabase-vendor';
        },
      },
    },
    minify: 'esbuild',
    cssMinify: true,
    chunkSizeWarningLimit: 1000,
    target: 'esnext',
    modulePreload: {
      polyfill: false,
    },
    reportCompressedSize: false,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
}));
