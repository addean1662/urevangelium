# Matthew 1:5, with the necessary Matthew 1:6 boundary check

This is a source-file and display audit, not certification of all seven traditions or of surviving ink. No ancient-language text, scholarly English wording, or canonical word bank was changed. The changes were local when this audit was prepared; deployment status is recorded separately.

## Confirmed Vulgate defect

The declared Clementine text contains 21 Latin tokens in 1:5, ending `Jesse autem genuit David regem`. Its declared Douay–Rheims 1899 translation places that clause at the beginning of **1:6**. See [Clementine Matthew 1](https://www.biblehub.com/vul/matthew/1.htm) and the governing [eBible engDRA Matthew 1](https://ebible.org/engDRA/MAT01.htm). Equal verse numbers do not establish equal translation scope.

The saved allocation assigns English occurrence e15, the Jesse in “Obed begot Jesse,” to the second Latin Jesse (source token 17) instead of the first (token 16). Contrary to the pasted assessment, the current saved data therefore gives one of the final five Latin words an English word, but from the wrong occurrence. The same boundary error affects 1:6: Salomonem is assigned “David.”

The implementation explains how this can happen:

- `build-vulgate-word-english-shadow.mjs`, `uniqueVersePairs`, makes one-to-one candidate matches within a presumed verse unit. It orders candidates partly by projected position and lets later Latin tokens displace an existing English owner recursively. Uniqueness does not establish the correct repeated-name occurrence.
- `adjudicate-vulgate-lexical-rows.mjs` labels an unassigned Latin token “compressed” when an English candidate already has an owner, and “unexpressed” when no English remains. Neither conclusion establishes that the two editions cover the same passage.
- The prepared English admission record calls both units source-concordant. The exact source banks are correct, but that label and the allocation counts do not prove semantic scope.

Local safeguards: e15 now belongs to the first Jesse through a hash-checked occurrence-only review. Both pages disclose the boundary mismatch. The confirmed bad 1:6 grouping is withheld, and its complete unchanged English remains visible. These are containment and a bounded occurrence correction, **not a completed cross-unit alignment repair**. A concordance over both published units is still required before grouping the final 1:5 clause and restoring 1:6 grouping. Historical allocations remain available for audit.

## P1

The CNTR record and original-hand INTF transcription each contain 21 token positions. The current display agrees with CNTR's admitted-character projection. Both transcriptions replace missing letters at token 3 (`εγενν·σεν`), token 16 (`ρ·υθ`), and token 17 (`ιω··δ`).

They disagree at token 6, the first `εκ`: CNTR marks neither letter missing, while INTF marks both supplied. This is now included in the page's source-conflict notices and integrity report. Their damaged/unclear classifications also differ at other positions; agreement on missing positions does not imply identical character certainty. Jesse is not supplied in either transcription, though INTF marks its two sigmas unclear.

The existing CSNTM image screenshot was inspected but does not resolve the disputed first `εκ`. Neither transcription was silently preferred as a physical adjudication. Raw CNTR and token-by-token INTF XML/character statuses are retained in `source-checks/matthew-1-5-papyrus-comparison.json`; regenerate with `python scripts/audit-matthew-1-5-evidence.py` while its archived INTF input is available.

## Other source streams and provenance

The page verifier compares the Matthew 1:5 Coptic, Vaticanus, Vulgate, Peshitta, and Byzantine sequences successfully against their **declared pinned electronic sources**. This establishes display fidelity to those inputs, not independent scholarly or image certification. The unused Sinaiticus alternative also matches its declared projection. Bezae has no extracted words here; no fresh folio certification was made.

The site's Byzantine source is RP **2018**, not the 2005 edition cited in the pasted assessment. Coptic words come from Sahidica NT 4.1.0 / Coptic SCRIPTORIUM; Horner is an English authority. Vaticanus follows the pinned INTF GA 03 original-hand ledger. Witness spellings remain distinct.

The Syriac source is scrollmapper's electronic Peshitta, pinned at commit `ba07bc991644d82b24426b920245eb4422daa769`. Its exact printed exemplar is unestablished. Murdock 1851 names the English translation. The unsupported “BFBS 1905” footer claim has been corrected locally to agree with the existing source manifest.

The detailed display-check results and original versus corrected/withheld Vulgate allocations are in `source-checks/matthew-1-5-6-display-audit.json`. Further corpus-wide semantic and verse-scope review remains necessary; no global accuracy claim follows from these two verses.

## Local validation

**Follow-up:** The temporary grouping hold described below is superseded by the completed [Matthew 1:5–6 alignment repair](vulgate-matthew-1-5-6-alignment-repair-2026-10-12.md). This document retains the earlier audit state for provenance.

The 27 targeted English-presentation and verse-verification tests passed. TypeScript, ESLint for the changed TS/TSX files, and the 3,779-verse prepared-source hash gate passed. Browser inspection confirmed the first Jesse owns the 1:5 English occurrence; the final five Latin tokens remain intact with their boundary note; 1:6 withholds all existing word assignments while preserving its complete English in both views. No browser console errors were observed. Proof: `images/matthew-1-5-vulgate-boundary-local.png`. No build or deployment was performed in this audit turn.
