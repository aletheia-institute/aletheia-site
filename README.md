# The Aletheia Institute — aletheiainstitute.ai

*Veritas ex datis.* The public site of The Aletheia Institute: a scroll-told story of
truth revealed from darkness, built as a fully static page that **makes zero external
requests** — every font, library, and asset is vendored into this repository. The
footer's promise ("This site calls no one. Neither will your data.") is not copy;
it is a test that fails the build if it ever stops being true.

Directed by a human architect. Engineered with an AI collaborator.
The footer keeps that collaboration on the record.

## Run it

```bash
npm run serve          # http://localhost:8123 — the site is the source; no build step
```

## The livery

University colors, formalized: **Aletheia Midnight** `#0B1F33`, **Veritas Gold**
`#E7C878`, **Ledger Bronze** `#7A5E2A`, **Institute Ivory** `#F6F3EA`, **Verity
Teal** `#3FBFAE`. `tokens.json` is canonical; `css/main.css` is held to it by the
suite; the rationale and laws live in [COLORS.md](COLORS.md).

## The regression net

```bash
npm ci
npx playwright install chromium
npm test
```

| Layer | File | Guards |
|---|---|---|
| Static | `tests/static.spec.js` | Livery ↔ tokens.json parity, WCAG-AAA arithmetic, **zero external URLs**, every href/src resolves, woff2 integrity, vendored versions match `vendor.json`, colophon on record |
| Rendering | `tests/rendering.spec.js` | Zero console errors, **zero external requests at runtime**, no failed requests, loader lifecycle + failsafe, hero/canvas, manifesto content |
| Interactions | `tests/interactions.spec.js` | Terminal typing/skip/sequence, ⌘K palette retrieval, easter egg, mobile menu, live-measured vitals, anchor focus handoff |
| Accessibility | `tests/accessibility.spec.js` | axe (no serious/critical), skip link, gold `:focus-visible`, SR-safe terminal, ARIA states, heading order |
| Reduced motion | `tests/reduced-motion.spec.js` | The Still Edition: static seal, instant content, no loader |
| Visual | `tests/visual.spec.js` | Screenshot regression on deterministic reduced-motion renders |

Both a desktop and an iPhone-13 profile run the whole net.

## Self-management

- **CI & Deploy** (`.github/workflows/ci.yml`) — every push/PR runs the full suite;
  green `main` deploys itself to GitHub Pages from `dist/`.
- **Vendor cadence** (`vendor-update.yml`) — runtime libraries are vendored, so a
  weekly job checks upstream (npm registry), bumps `vendor.json`, re-downloads, and
  opens a PR that only merges if the entire regression net passes.
- **Dependabot** (`.github/dependabot.yml`) — weekly PRs for dev tooling and the
  Actions themselves.
- **Lighthouse budgets** (`lighthouse.yml`) — PRs must hold ≥ 90 performance,
  ≥ 95 accessibility, ≥ 95 best-practices, ≥ 90 SEO.
- **Visual baselines** (`update-baselines.yml`) — manual dispatch after intentional
  design changes; regenerated baselines arrive as a reviewable PR.

## Custom domain

Point `aletheiainstitute.ai` DNS at GitHub Pages (A records → GitHub's IPs, or an
ALIAS/CNAME for the apex), then add the domain in **Settings → Pages** — GitHub will
provision the certificate. Optionally commit a `CNAME` file containing
`aletheiainstitute.ai` so the setting survives redeploys.

## License

© The Aletheia Institute. All rights reserved. The code is public for transparency —
nothing is concealed — but the brand, seal, and content are not licensed for reuse.
