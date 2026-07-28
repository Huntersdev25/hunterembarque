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
    // Alvos compatíveis com Safari do iOS (esnext gerava JS que o iPhone não parseava → tela branca).
    target: ['es2019', 'safari12', 'chrome80', 'firefox72', 'edge79'],
    // Polyfill de modulepreload restaurado p/ Safari sem suporte nativo.
    modulePreload: {
      polyfill: true,
    },
    reportCompressedSize: false,
  },
  esbuild: {
    // Garante que o transform final também respeite os alvos legados.
    target: 'es2019',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
}));
