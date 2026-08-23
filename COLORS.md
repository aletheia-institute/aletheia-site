# The Colors of the Institute

*The livery of The Aletheia Institute, in the tradition of university colors: not a
theme, an identity. Universities own colors by exact shade and name — Berkeley Blue,
Tech Gold. These are ours.*

## Why navy and gold

University colors descend from heraldry, and heraldic tinctures carry fixed meanings:
**azure (blue) signifies truth**; **or (gold) signifies wisdom and elevation of the
mind**. For an institute named after the Greek word for truth, navy and gold are not
an aesthetic preference — they are the name rendered in tincture: *truth, illuminated
by wisdom*. The seal (a sunburst over an open book, gold on azure) and the site itself
(light revealing content from darkness) say the same sentence.

Market position: navy is the most-trusted color in healthcare and finance — the right
register for clinical software. And in AI, the premium territory is empty: the major labs
ship cream, grey-blue, monochrome, and indigo. Nobody in AI owns navy
and gold. In academia it is common; in AI it is whitespace.

## Revision II — azure becomes light

Leadership review judged the first cut right at the hero and too heavy below it:
full-strength navy gradients across every section read glossy-SaaS, and the gold
lost its punch against saturated blue. The correction is not to abandon azure but
to **promote it from ground to light**: the page ground is now desaturated ink —
the jeweler's cool black velvet under gold — and the brand's azure appears only
as soft ambient glow behind interactive elements. Heraldically this is *stronger*:
truth's color becomes the illumination itself. The seal and all identity artifacts
keep Midnight as their field, unchanged.

## The tinctures

| Name | Hex | Role | Law |
|---|---|---|---|
| **Aletheia Midnight** | `#0B1F33` | The brand azure | The seal's field. On the site: **light only** — low-opacity glows, never ground |
| **Midnight Ink** | `#0A0E14` | The ground | Desaturated blue-black; never lifts into cobalt |
| Slate Card | `#141A23` | Card fill | Off-black; elevation drawn by gold hairlines |
| **Veritas Gold** | `#E7C878` | The metal | Always foil (gradient), never flat. **≤ 15% coverage** |
| Gold Deep | `#B99549` | Foil mid-turn | Ramp interior only |
| Gold High | `#F7E3B0` | Foil hotspot | The brightest value on any page |
| **Ledger Bronze** | `#7A5E2A` | The metal's shadow | Anchors every foil ramp. Never text |
| **Institute Ivory** | `#F6F3EA` | The text tincture | A tint of the gold hue. AAA on every ground |
| **Verity Teal** | `#3FBFAE` | Signal | Live states, citations, evidence. **≤ 2% of viewport.** Never decoration |

The canonical foil ramp: `#7A5E2A → #B99549 → #E7C878 → #F7E3B0` — bronze shadow to
champagne light. Real metal turns dark; so does ours.

## The laws

1. **Pure white is never used.** White on midnight buys an irrelevant 11% contrast gain
   and maximizes halation for astigmatic readers; it also makes the champagne read
   dirty. Ivory is the ceiling.
2. **Gold is spent, not poured.** ≤ 15% of any composition. Restraint is the luxury.
3. **The metal always wins.** No accent may exceed the gold's luminance. Verity Teal
   was cut to `#3FBFAE` for exactly this reason.
4. **Elevation is drawn, not filled.** Surface steps on midnight are imperceptible by
   fill; 1px gold-hairline borders carry elevation.
5. **Every text token clears WCAG AAA (7:1) on both grounds.** The test suite verifies
   this arithmetic on every commit.

## Canonical source

`tokens.json` is the single source of truth. `css/main.css` declares the same values
as named custom properties (`--aletheia-midnight`, `--veritas-gold`, …) and the test
suite fails any commit where they drift apart.
