import { context, build } from 'esbuild';
const options = { entryPoints: ['src/main.ts'], outfile: 'main.js', bundle: true, external: ['obsidian', 'electron', 'node:*'], platform: 'node', format: 'cjs', target: 'es2022', sourcemap: false, logLevel: 'info', banner: { js: '/* ZotSight | Copyright (C) 2026 Napreth | AGPL-3.0-or-later. Third-party terms: THIRD-PARTY-NOTICES.md. */' } };
if (process.argv.includes('--watch')) await (await context(options)).watch();
else await build(options);
