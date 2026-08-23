#!/usr/bin/env node
/* Check npm for newer versions of the vendored libraries; if any, bump vendor.json.
   Exits 0 always; prints `updated=true` (consumed by the GitHub workflow) when a
   bump was written. The workflow then re-vendors and opens a PR gated by CI. */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'vendor.json');
const manifest = JSON.parse(await readFile(path, 'utf8'));

let updated = false;
for (const [name, lib] of Object.entries(manifest.libraries)) {
  const res = await fetch(`https://registry.npmjs.org/${lib.npm}/latest`);
  if (!res.ok) { console.error(`registry lookup failed for ${name}: ${res.status}`); continue; }
  const latest = (await res.json()).version;
  if (latest && latest !== lib.version) {
    console.log(`${name}: ${lib.version} -> ${latest}`);
    lib.version = latest;
    updated = true;
  } else {
    console.log(`${name}: ${lib.version} (current)`);
  }
}

if (updated) await writeFile(path, JSON.stringify(manifest, null, 2) + '\n');
console.log(`updated=${updated}`);
