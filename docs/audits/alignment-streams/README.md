# Alignment stream readiness

The preview implements independent source sequences and hover/focus correspondence without changing any source or English corpus file. It is built from `origin/main` commit `e171a6868f2633fbba157e199ee6e644d88b0b92`, whose source-text projections matched the live site's four opening verses during setup. Work is isolated from the owner's existing modified checkout.

## What is ready

- Line-free, independently stacked columns, with English attached to its existing source word or phrase.
- Hover/focus across corresponding occurrences; click/Enter/Space pinning; Escape clearing.
- Source-specific, shared-by-a-subset, repeated-word, compound, displaced-word, absence and uncertain-link behavior.
- Independent Greek and Latin sequences within Bezae; Vaticanus/Sinaiticus switching; the original Comparison rows view.
- Five contextual pilot passages: Matthew 1:1, Mark 1:1, Luke 1:1, John 1:1 and Matthew 12:19. The Luke and Matthew 12 examples adjudicate selected difficult groups, not the full verse.
- Snapshot validation before using occurrence decisions; changed text/English/provenance invalidates stale evidence.

## Source readiness

Counts below come from `model-coverage.json`. “Linked” includes explicit project decisions and computational Greek form correspondences; **it is not a count of independently certified semantic alignments**. The unresolved counts deliberately avoid promoting old row placement into a claim of equivalence.

| Source | Preserved words | Linked | Unresolved | Remaining work |
|---|---:|---:|---:|---|
| Earliest Papyri | 35,405 | 32,459 | 2,946 | Review variant forms and composite ordering in 119 passages with conflicting/unavailable attestation sequence evidence. Those passages display an order notice. |
| Sahidic | 48,275 | 28 | 48,247 | Semantic adjudication of existing positional/loanword placements; preserve Coptic word-groups and admitted Horner phrase boundaries. |
| Vaticanus | 63,546 | 62,107 | 1,439 | Contextual adjudication of ambiguous/repeated and variant Greek forms. Existing certified display sequence supplies its order. |
| Sinaiticus | 63,917 | 56,568 | 7,349 | Preserve the admitted hand and Anderson allocation; adjudicate remaining variants and repeated forms. |
| Vulgate | 59,029 | 32 | 58,997 | Contextual Latin-to-source correspondence; source/English certification alone does not establish cross-source links. |
| Bezae Greek | 48,920 | 45,004 | 3,916 | Remaining variants and semantic counterparts, preserving its separately certified sequence. |
| Bezae Latin | 52,749 | 10 | 52,739 | Latin semantic mapping independent of its comparative Greek row. |
| Peshitta | 50,477 | 170 | 50,307 | Expand lexical decisions; do not mistake the existing boundary/verse certificates for word correspondence. Preserve 15 English-only expansions. |
| Byzantine | 66,130 | 58,970 | 7,159 | Remaining variants and ambiguous occurrences. One explicitly source-specific pilot word is separate from both linked and unresolved counts. |

All 488,448 displayed source occurrences are retained. Bezae certificate occurrence checks and eligible Peshitta decision identity checks found zero stale entries. Source order is recoverable for all non-papyrus streams in this snapshot; the papyrus exceptions require further adjudication.

## Reproduce and review

```powershell
npm ci
npm run build:alignment-streams
npm run audit:alignment-streams
npm test
npm run validate:sources
npm run build
npm run dev -- --port 3101
```

The generator reads existing certificates and the bounded pilot decisions. It writes only `data/alignment-streams` and this audit directory. The model audit requires Node with TypeScript stripping support (tested with Node 24).

Verification completed: 223 tests across 21 files; corpus occurrence/gloss preservation and schema-to-evidence fingerprints for all 3,779 verses; source policy validation with zero errors or blocker warnings; TypeScript and production build. The build reports existing broad file-tracing warnings in `lib/data.ts`.

Browser verification on the local Next server confirmed Mark 1:1 correspondence at independent vertical positions, displaced Luke 1:1 Latin `multi`, Bezae Latin sequence, zero horizontal word-cell borders, and no captured browser errors. Long Bezae Greek words were checked for overlap with the Latin column. The affected UI and full-corpus preservation tests were rerun after the final display refinements.

Local entry point: `http://localhost:3101/mark/1/1`. No production deployment was made. Automatic approval review rejected uploading the application/corpus payload to Vercel without explicit authorization for that destination and payload; a hosted preview awaits that authorization.

The preview is suitable for reviewing the interaction and the named examples. Full corpus semantic alignment remains an editorial workstream. The project-authored pilot decisions and inherited certificates must not be advertised as independent scholarly review.

See [the decision record](../../decisions/2026-10-11-word-streams.md) for the rule change and rollback procedure.
