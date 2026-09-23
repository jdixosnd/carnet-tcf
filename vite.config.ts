/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

const RES = path.resolve(import.meta.dirname, 'src-tauri/resources');
const TYPES: Record<string, string> = { '.json': 'application/json', '.mp3': 'audio/mpeg' };

// Serves the generated resources (words, audio packs) at /resources in dev and preview,
// so the browser build works without copying 89 MB into public/ (and into the Tauri binary).
function serveResources(): Plugin {
  const mw = (req: { url?: string }, res: import('node:http').ServerResponse, next: () => void) => {
    if (!req.url?.startsWith('/resources/')) return next();
    const p = path.join(RES, decodeURIComponent(req.url.slice('/resources/'.length).split('?')[0]));
    if (!p.startsWith(RES) || !fs.existsSync(p)) { res.statusCode = 404; res.end(); return; }
    res.setHeader('Content-Type', TYPES[path.extname(p)] ?? 'application/octet-stream');
    fs.createReadStream(p).pipe(res);
  };
  return {
    name: 'serve-resources',
    configureServer: s => { s.middlewares.use(mw); },
    configurePreviewServer: s => { s.middlewares.use(mw); },
  };
}

export default defineConfig({
  plugins: [react(), tailwind(), serveResources()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  test: { environment: 'jsdom', globals: true, include: ['src/**/*.test.{ts,tsx}'], setupFiles: ['src/test/setup.ts'] },
});
