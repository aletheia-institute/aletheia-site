#!/usr/bin/env node
/* Re-download every vendored library at the exact versions pinned in vendor.json.
   Usage: npm run vendor  (add --fonts to also refresh font files) */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(join(root, 'vendor.json'), 'utf8'));
const withFonts = process.argv.includes('--fonts');

async function fetchTo(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) throw new Error(`suspiciously small download: ${url} (${buf.length}B)`);
  await mkdir(dirname(join(root, dest)), { recursive: true });
  await writeFile(join(root, dest), buf);
  console.log(`  ✓ ${dest}  (${(buf.length / 1024).toFixed(1)} KB)`);
}

for (const [name, lib] of Object.entries(manifest.libraries)) {
  console.log(`${name}@${lib.version}`);
  for (const [dest, tmpl] of Object.entries(lib.files)) {
    await fetchTo(tmpl.replace('{version}', lib.version), dest);
  }
}

if (withFonts) {
  console.log('fonts');
  for (const [dest, url] of Object.entries(manifest.fonts.files)) {
    await fetchTo(url, dest);
  }
}

console.log('vendor complete — run the test suite before committing.');
