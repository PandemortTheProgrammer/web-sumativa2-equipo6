import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Prototipo sin servidor: el sitio público (index.html) y el panel (admin/index.html) en el puerto 5500.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: true, port: 5500, strictPort: true },
  preview: { host: true, port: 5500, strictPort: true },
  // Dos páginas: el sitio público y el panel, cada una con su CSS
  build: {
    rollupOptions: {
      input: { sitio: 'index.html', panel: 'admin/index.html', acceso: 'admin/login.html' },
    },
  },
});
