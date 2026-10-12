# Independent source sequences with explicit correspondence

Date: 2026-10-11. Status: preview implementation, authorized by the project owner.

The owner requested ProtoVorlage-style independent source columns: each source word and its existing English appear in sequence, without horizontal word rules. Hover reveals counterparts across sources. A genuine source-specific word highlights alone; a correspondence shared by only some sources leaves the other sources untouched.

This decision supersedes the **visual shared-row requirement** in `docs/ALIGNMENT_RULE.md` for the Word streams view. The existing Comparison rows view and stored corpus remain available. It does not relax any source selection, manuscript hand, transcription, absence, English admission, or semantic correspondence rule.

## Three independent responsibilities

1. Source occurrences: one displayed source word-group per existing occurrence, with provenance and manuscript form intact. Source-token indexes determine order. Bezae Greek and Latin use separate certified occurrence indexes. The papyrus composite respects each attesting manuscript's sequence where their constraints are compatible. An unavailable/conflicting sequence is visibly flagged; comparative order is retained as a fallback.
2. English: preserve the existing source-parent allocation, approved phrase identifier, and translation-only expansion. No newly generated English, segmentation or matching by translated spelling. Bezae's Latin is a separate manuscript text, never an English gloss of its Greek.
3. Correspondence: explicit groups keyed by witness and occurrence, independent of visual position. Source-specific and unresolved are distinct states. Loss, omission, comparison padding and unpopulated data cannot become word nodes or correspondence members.

## Evidence and limits

- Eligible existing Peshitta decisions are contextual lexical correspondences and multirow lexical spans with at least two recorded evidence families. Boundary spans and verse-level units are excluded. These are inherited project certificates, not newly claimed independent scholarship.
- Five pilot passages have project-authored contextual decisions in `scripts/streams/pilot-links.mjs`: Matthew 1:1; Mark 1:1; Luke 1:1 (two difficult groups); John 1:1; Matthew 12:19 (streets/voice). They need independent scholarly review. Snapshot guards reject regeneration against changed source/English identities.
- Automatic Greek links are explicitly **form correspondences**, not semantic certification. Declared normalization handles case, accents, sigma, the kai sign, and a finite contraction dictionary. Ambiguous repeated occurrences are left unresolved. Unique displaced forms can correspond without moving either source. Explicit contextual decisions take precedence.
- Existing rows are provisional evidence only. The initial preview disabled them by default. The [corpus highlighting correction](2026-10-11-corpus-highlighting.md) enables them by default with dashed highlights; they never override documented counterpart choices or known source-specific words.
- Groups may contain multiple intact words for an attested compound (e.g. `conati sunt`). Incorporated grammatical material does not manufacture a separate source token: John 1:1 Syriac `b-reshit` follows the existing semantic-head rule and links to “beginning,” not the separate preposition.
- Highlighting follows direct groups. No transitive closure joins different meanings through an overlapping phrase. Documented targets may gain unambiguous Greek form equivalents; semantic links are not propagated into other semantic links.
- Runtime fingerprints invalidate stale links and Bezae indexes after a corpus change. The base corpus is never rewritten by these scripts.

## Review and rollback

The default preview offers Word streams with Comparison rows one click away. It labels correspondence review as incomplete. Hover, keyboard focus, click/Enter/Space pinning, Escape clearing and Alexandrian source switching are supported. The existing data API/transcript remains the unchanged corpus projection.

Complete the remaining semantic adjudication source by source before treating this as a fully aligned corpus. The code supports adding decisions without reformatting source text. Reverting the passage page's `AlignmentExplorer` use restores the old display; no data rollback is needed.

Generated inventory: `docs/audits/alignment-streams/readiness.json`. Runtime coverage and sequence exceptions: `docs/audits/alignment-streams/model-coverage.json`. These measure implementation coverage; they are not scholarly certification.
