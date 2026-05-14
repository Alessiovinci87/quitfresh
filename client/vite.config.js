import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // injectManifest: noi scriviamo il SW (src/sw.js), workbox inietta solo
      // self.__WB_MANIFEST con la lista degli asset da precachare.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      // Registriamo il SW manualmente in main.jsx, niente snippet auto.
      injectRegister: false,
      // Manifest gia' presente in public/manifest.json — non rigenerarlo.
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        // Esclude i .map per non gonfiare la precache
        globIgnores: ['**/*.map'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  base: '/quitfresh/',
  server: {
    port: 5173,
  },
});
