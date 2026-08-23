#!/usr/bin/env node
/* Assemble the deployable site into dist/ — exactly the files a visitor needs,
   nothing else. There is no compile step; the source IS the site. */
import { cp, rm, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const entry of ['index.html', 'css', 'js', 'assets']) {
  await cp(join(root, entry), join(dist, entry), { recursive: true });
}
console.log('dist/ ready');
