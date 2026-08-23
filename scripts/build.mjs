#!/usr/bin/env node
/* Assemble the deployable site into dist/ — and stamp every asset reference
   with its content hash, so served HTML can never pair with a stale cached
   asset. The source tree stays clean; only dist/index.html carries hashes. */
import { cp, rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const entry of ['index.html', 'css', 'js', 'assets']) {
  await cp(join(root, entry), join(dist, entry), { recursive: true });
}

// content-hash cache busting: rewrite local href/src refs to path?v=<hash8>
let html = await readFile(join(dist, 'index.html'), 'utf8');
const hashed = [];
html = await (async () => {
  const refs = [...html.matchAll(/(href|src)="([^"#][^"?]*)"/g)]
    .map(m => m[2])
    .filter(u => !u.startsWith('http') && !u.startsWith('mailto:') && !u.startsWith('data:'));
  let out = html;
  for (const ref of [...new Set(refs)]) {
    const f = join(dist, ref);
    if (!existsSync(f)) continue;
    const h = createHash('sha256').update(await readFile(f)).digest('hex').slice(0, 8);
    out = out.replaceAll(`"${ref}"`, `"${ref}?v=${h}"`);
    hashed.push(`${ref}?v=${h}`);
  }
  return out;
})();
await writeFile(join(dist, 'index.html'), html);

console.log('dist/ ready —', hashed.length, 'assets stamped:');
hashed.forEach(h => console.log('  ', h));
