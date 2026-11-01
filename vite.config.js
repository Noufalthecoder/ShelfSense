import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { apiMiddleware } from './server/api.js';

// serves /api/* (YouCam + product lookup) from the same dev server, keeping the key server-side
function shelfSenseApi(env) {
  const mw = apiMiddleware(env);
  return {
    name: 'shelfsense-api',
    configureServer(server) { server.middlewares.use(mw); },
    configurePreviewServer(server) { server.middlewares.use(mw); },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // `npm run dev:phone` serves over https so phones on the same Wi-Fi may use the camera
    plugins: [react(), shelfSenseApi(env), mode === 'phone' && basicSsl()].filter(Boolean),
    server: { host: true },
  };
});
