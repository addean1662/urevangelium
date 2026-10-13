# Header positions, vertical English order, and incomplete papyrus English

## Header layout

The word-stream header vertically centered each column's complete collection of labels, notes, and controls. Different content heights displaced the source names. All columns now start their name, edition, and date at the same position, with a reserved note slot and controls below. Browser geometry confirmed identical title, edition, and header-bottom coordinates for all seven columns.

## English reading modes

Translation order previously rendered a paragraph alongside the source word list. It now displays one immutable English occurrence per vertical line, with a 40-pixel minimum line height. Vulgate and Peshitta retain their complete published sequence, punctuation, and whitespace; their source streams retain their own order. Follow source keeps the existing word-associated phrase display. Switching does not alter either word bank. Phrase-level semantic alignment remains a separate unresolved task.

## Papyrus English

The attestation filter correctly suppresses missing Greek letters and wholly supplied words. It also removed English from every incomplete word. The previous TAGNT wording is retained in provenance as an archived gloss and proposed Greek reading.

The display now exposes that existing English with a dagger only when its recorded Greek reading matches the selected proposed reading, the saved attestation policy identifies a partial word, and the admitted character projection still contains both surviving letters and missing positions. The tooltip and column legend explicitly identify English for a proposed reading. Source Greek and corpus admission are unchanged. Fully lost words, mismatched readings, missing provenance, and generated/experimental archives receive no fallback gloss. Both word streams and comparison rows use the same projection. The verse checker reports the distinction rather than marking it independently certified.

The corpus display audit covers 30,593 admitted papyrus occurrences:

| English status | Count |
| --- | ---: |
| Existing word gloss | 24,554 |
| Matching archived TAGNT English for proposed reading, marked † | 3,983 |
| Incomplete word without matching English | 787 |
| Complete word without matching English | 1,269 |

The 2,056 remaining occurrences are listed in `papyrus-english-display-2026-10-12.json`. Reproduce with `node scripts/audit-papyrus-english-display.mjs <output-path>`. This is a display eligibility and provenance check, not independent certification of the source translation or manuscript images.

## Validation

282 tests passed across 27 files. TypeScript, targeted ESLint, and the production build passed. Prebuild attestation and source-fingerprint checks passed for 3,779 verses. The full suite identified a verse with an absent papyrus cell; the reporting code now handles it, and the complete suite passed after repair. Browser inspection confirmed vertical English order for both affected traditions, marked English beside incomplete P1 words, and equal header baselines. Production verification is recorded separately after publication.
