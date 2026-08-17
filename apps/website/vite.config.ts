import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * Vite plugin to serve the Apple App Site Association file
 * with the correct content type during development.
 */
function aasaPlugin(): Plugin {
  return {
    name: 'aasa-content-type',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/.well-known/apple-app-site-association') {
          res.setHeader('Content-Type', 'application/json');
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), aasaPlugin()],
});
