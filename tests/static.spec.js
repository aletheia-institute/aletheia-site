// Static guarantees: files on disk keep their promises before a browser ever runs.
import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const RUNTIME_FILES = ['index.html', 'css/main.css', 'js/main.js', 'js/particles.js', 'js/palette.js'];

test.describe('static: the livery', () => {
  const tokens = JSON.parse(read('tokens.json'));
  const css = read('css/main.css');

  const NAMED = {
    'aletheia-midnight': tokens.color['aletheia-midnight'].$value,
    'midnight-ink': tokens.color['midnight-ink'].$value,
    'veritas-gold': tokens.color['veritas-gold'].$value,
    'ledger-bronze': tokens.color['ledger-bronze'].$value,
    'institute-ivory': tokens.color['institute-ivory'].$value,
    'verity-teal': tokens.color['verity-teal'].$value,
  };

  for (const [name, hex] of Object.entries(NAMED)) {
    test(`css declares --${name} exactly ${hex}`, () => {
      const re = new RegExp(`--${name}\\s*:\\s*${hex}`, 'i');
      expect(css).toMatch(re);
    });
  }

  test('functional vars alias the named tinctures', () => {
    expect(css).toMatch(/--navy\s*:\s*var\(--aletheia-midnight\)/);
    expect(css).toMatch(/--gold\s*:\s*var\(--veritas-gold\)/);
    expect(css).toMatch(/--ivory\s*:\s*var\(--institute-ivory\)/);
    expect(css).toMatch(/--teal\s*:\s*var\(--verity-teal\)/);
    expect(css).toMatch(/--gold-shadow\s*:\s*var\(--ledger-bronze\)/);
  });

  test('law: pure white is never used as a color', () => {
    // #fff / #ffffff / rgb(255,255,255) must not appear as a color value
    expect(css).not.toMatch(/#fff\b/i);
    expect(css).not.toMatch(/#ffffff/i);
    expect(css).not.toMatch(/rgb\(\s*255\s*,\s*255\s*,\s*255/);
  });

  test('law: every text tincture clears WCAG AAA on both grounds', () => {
    const lum = (hex) => {
      const c = hex.replace('#', '');
      const [r, g, b] = [0, 2, 4].map(i => {
        const v = parseInt(c.slice(i, i + 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => {
      const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (l1 + 0.05) / (l2 + 0.05);
    };
    for (const ground of [NAMED['aletheia-midnight'], NAMED['midnight-ink']]) {
      expect(ratio(NAMED['institute-ivory'], ground)).toBeGreaterThanOrEqual(7);
      expect(ratio(NAMED['veritas-gold'], ground)).toBeGreaterThanOrEqual(7);
      expect(ratio(NAMED['verity-teal'], ground)).toBeGreaterThanOrEqual(7);
    }
  });

  test('law: the metal always wins — teal luminance below gold', () => {
    const lum = (hex) => {
      const c = hex.replace('#', '');
      const [r, g, b] = [0, 2, 4].map(i => {
        const v = parseInt(c.slice(i, i + 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    expect(lum(NAMED['verity-teal'])).toBeLessThan(lum(NAMED['veritas-gold']));
  });
});

test.describe('static: the promise', () => {
  test('zero external URLs in runtime code', () => {
    for (const f of RUNTIME_FILES) {
      const matches = (read(f).match(/https?:\/\/[^"'` )\\]+/g) || [])
        .filter(u => !u.includes('w3.org'));           // SVG namespace, never fetched
      expect(matches, `${f} references external URLs`).toEqual([]);
    }
  });

  test('every local href/src in index.html resolves to a real file', () => {
    const html = read('index.html');
    const refs = [...html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)]
      .map(m => m[1])
      .filter(u => !u.startsWith('mailto:') && !u.startsWith('http') && !u.startsWith('data:'));
    expect(refs.length).toBeGreaterThan(5);
    for (const r of refs) {
      expect(existsSync(join(root, r)), `missing: ${r}`).toBe(true);
    }
  });

  test('preloaded fonts exist and are genuine woff2', () => {
    const html = read('index.html');
    const preloads = [...html.matchAll(/rel="preload" href="([^"]+)"/g)].map(m => m[1]);
    expect(preloads.length).toBeGreaterThanOrEqual(3);
    for (const p of preloads) {
      const buf = readFileSync(join(root, p));
      expect(buf.subarray(0, 4).toString('latin1'), `${p} is not woff2`).toBe('wOF2');
    }
  });

  test('vendored libraries match the pinned versions in vendor.json', () => {
    const manifest = JSON.parse(read('vendor.json'));
    const gsap = read('js/gsap.min.js');
    expect(gsap).toContain(`GSAP ${manifest.libraries.gsap.version}`);
    const lenis = read('js/lenis.min.js');
    expect(lenis).toContain(`"${manifest.libraries.lenis.version}"`);
  });

  test('the colophon keeps the collaboration on the record', () => {
    const html = read('index.html');
    expect(html).toContain('A human architect');
    expect(html).toContain('Claude');
    expect(html).toContain('This site calls no one');
  });

  test('required structure: every section, both nav systems, the seal', () => {
    const html = read('index.html');
    for (const id of ['hero', 'manifesto', 'services', 'method', 'demo', 'principles', 'contact', 'colophon',
                      'palette', 'mobile-menu', 'vitals', 'term-body', 'term-live', 'constellation']) {
      expect(html, `missing #${id}`).toContain(`id="${id}"`);
    }
    expect(html).toContain('assets/seal.svg');
    expect(html).toContain('lang="en"');
    expect(html).toMatch(/<meta name="description"/);
  });
});
