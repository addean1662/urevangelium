# Urevangelium

Word-by-word alignment of the four Gospels across six manuscript witnesses, displayed in fixed chronological column order.

## License

This project is licensed under [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/).

The ShareAlike obligation arises from the CNTR transcriptions of Vaticanus (03), Sinaiticus (01), and the Gospel papyri (P1, P45, P66, P75), which are CC BY-SA 4.0. Rather than mitigate around this obligation, the project accepts it: the full alignment dataset is released under CC BY-SA 4.0, consistent with the project's open-scholarship intent.

See `LICENSE` for the full license text and `/docs/SOURCE_DATA.md` for per-source attribution requirements.

---

## Domain

**Target domain:** urevangelium.com (not yet purchased — Cloudflare DNS + Vercel deployment, same pattern as ProtoVorlage)

---

## Six-Column Architecture

Columns appear in this fixed chronological order and may not be rearranged:

| # | Witness | Identifier | Date | Script |
|---|---------|------------|------|--------|
| 1 | **Earliest Papyrus** | P45, P52, P64+P67, P66, P75, etc. | c. 125–250 CE (per fragment) | Greek |
| 2 | **Vaticanus** | B / 03 | c. 325 CE | Greek uncial |
| 3 | **Sinaiticus** | ℵ / 01 | c. 350 CE | Greek uncial |
| 4 | **Vulgate** | Stuttgart / Weber-Gryson | c. 400 CE | Latin |
| 5 | **Peshitta** | Pinned scrollmapper electronic Peshitta | c. 400–450 CE tradition; digital revision 2024 | Syriac |
| 6 | **Byzantine** | Robinson-Pierpont 2005 | Medieval | Greek |

Column headers display the witness name and its date.

---

## Architectural Locks

These constraints are fixed and may not be deviated from without a documented decision record:

1. **Desktop-only.** Minimum viewport 1440 px. No mobile responsive logic. No column collapse. No horizontal scroll fallback.

2. **Fixed chronological column order.** The six-column sequence listed above is immutable.

3. **Every word gets its own row.** No merged cells for multi-word phrases. Equivalent words across columns land on the same row; non-corresponding words (particles, connectives, enclitics with no cross-witness counterpart) get their own row with dashes in every other column.

4. **All source text is local pre-built JSON.** Zero API calls for source text. The role of any AI in this project is word alignment only; manuscript text itself is pre-loaded data in `/data/`.

5. **Earliest Papyrus column behavior:**
   - When a papyrus is extant for that word: display the Greek word with its fragment identifier(s) (e.g., "P45", "P66 · P75").
   - When no papyrus is extant: display red lost-dots (same visual pattern as ProtoVorlage's DSS lost-dot rendering).

6. **Lacuna handling:** When a witness has no extant text due to physical damage, display red lost-character dots in that column's cell.

7. **Alignment rule:** Align by propositional content (semantic contribution to meaning), not by morphology. See `/docs/ALIGNMENT_RULE.md`.

8. **Syriac column RTL:** `dir="rtl"` scoped to the Syriac column only. Page direction remains LTR.

9. **Nomina sacra:** Display the contraction (e.g., ΘΣ, ΚΣ, ΙΣ, ΧΣ) with hover-expansion to the full form. Do not silently expand.

10. **Greek display:** Normalizes to modern lowercase polytonic with accents. Diplomatic-display toggle (majuscule, scriptio continua) is a v2 feature — hook is present in font config but not implemented.

---

## Tech Stack

- **Framework:** Next.js 16+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **Deployment:** Vercel + Cloudflare DNS
- **Fonts:** locally hosted from `/public/fonts/` — no CDN calls at runtime

### Typography

| Script | Primary | Fallback |
|--------|---------|----------|
| Greek | Cardo | serif |
| Latin | EB Garamond | Cardo, serif |
| Syriac | Beth Mardutho Estrangelo Edessa (OFL) | Serto Jerusalem (OFL), serif |
| UI chrome | system-ui | sans-serif |

**v2 hook:** SBL Greek is reserved as the future Greek primary pending written license clarification from the Society of Biblical Literature. See `/public/fonts/LICENSES.md`.

---

## Data Source Workstream (separate sessions)

The following sources need to be licensed/acquired and converted to the local JSON schema defined in `/lib/types.ts`:

- **Greek (Vaticanus, Sinaiticus, Byzantine):** CNTR / Nestle-Aland apparatus; Robinson-Pierpont 2005
- **Latin:** Stuttgart Vulgate (Weber-Gryson)
- **Syriac:** pinned scrollmapper electronic Peshitta; exact printed exemplar unverified
- **Papyri:** per-fragment diplomatic transcriptions

---

## Routing

```
/matthew/[chapter]/[verse]   — e.g., /matthew/1/1
/mark/[chapter]/[verse]
/luke/[chapter]/[verse]
/john/[chapter]/[verse]
```

---

## Development

```bash
npm run dev     # development server on http://localhost:3000
npm run build   # production build
npm run test    # Vitest test suite (must pass twice consecutively)
npm run lint    # ESLint
```

---

## Project Siblings

- **ProtoVorlage** — `C:\Users\addea\proto-vorlage` (separate codebase — do not touch from this repo)
