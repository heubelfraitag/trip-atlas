import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// To deploy on GitHub Pages under a subpath, set VITE_BASE="/repo-name/" before build.
// On Vercel / Cloudflare Pages / Netlify root: leave as "/".
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/',
  server: { host: true },
});
