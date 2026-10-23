/**
 * Source entry for the Vercel serverless function bundle.
 *
 * `npm run build:api` bundles this (plus the whole API app graph) into
 * api/index.js — a single committed ESM file with zero runtime dependencies.
 * Vercel serves it for /api/*, /sitemap.xml and /llms.txt via vercel.json
 * rewrites; the static SPA in dist/client is built remotely by `vite build`.
 *
 * Regenerate api/index.js after any server-side change: npm run build:api
 */
import app from './app';

export default app;
