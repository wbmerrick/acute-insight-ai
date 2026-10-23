// Bundles the Express API app into api/index.js for Vercel.
// Run: npm run build:api  (required after any change under src/server or src/lib/auth)
import { build } from 'esbuild';

await build({
  entryPoints: ['src/server/vercel-entry.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: 'api/index.js',
  external: ['pg-native'],
  banner: {
    js: [
      "import { createRequire as __createRequire } from 'node:module';",
      "import { fileURLToPath as __fileURLToPath } from 'node:url';",
      "import __node_path from 'node:path';",
      'const require = __createRequire(import.meta.url);',
      'const __filename = __fileURLToPath(import.meta.url);',
      'const __dirname = __node_path.dirname(__filename);',
    ].join('\n'),
  },
  logLevel: 'warning',
});
console.log('api/index.js built');
