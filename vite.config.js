import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vercel serves api/ in production; this gives `npm run dev` the same route.
const devApi = () => ({
  name: 'dev-api',
  configureServer(server) {
    try {
      process.loadEnvFile('.env');
    } catch {
      // No .env: the route answers "not playing" and the site falls back to the local track.
    }
    server.middlewares.use('/api/now-playing', async (_req, res) => {
      const { GET } = await server.ssrLoadModule('/api/now-playing.js');
      const response = await GET();
      res.statusCode = response.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(await response.text());
    });
  },
});

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/; the deploy workflow sets BASE_PATH. Locally and elsewhere it's /.
  base: process.env.BASE_PATH || '/',
  plugins: [react(), devApi()],
});
