# Per-verse integrity checker: implementation and evidence limits

The governing requirement is faithful representation of each independent tradition so that real differences can be studied. Neither source text nor scholarly English wording may be authored or harmonized by the checker. English occurrence placement is a separate, constrained operation.

Both authoritative word banks and their canonical orders are locked. The user then authorized a switch between **Translation order** and **Follow source**. Translation order renders the complete scholarly English independently of the source rows. Follow source places existing English phrases beside their assigned source occurrences; phrases may occupy a different display sequence, but their wording and internal order remain fixed. The original English bank is never rewritten. The proposal guard defaults to strict translation order; only a trusted caller may select the follow-source policy. Model output cannot select the policy. These invariants govern new proposals and do not certify existing semantic allocations.

## Implemented locally

- The verse page loads pinned source expectations and checks the same word-stream model used by the display. The checks run when that model loads, including browser hydration and navigation. No external model call runs on a page visit.
- The expandable report separates source wording, source order, English occurrence accounting, English placement, and evidence limits for nine streams (including alternate Sinaiticus and both Bezae sides).
- Expectation preparation covers all 3,779 stored verses. A build gate verifies 173 pinned source files and the four derived indexes using SHA-256 over UTF-8 with LF line endings. Only newline encoding is canonicalized for hashes; letters and punctuation are not harmonized.
- Source checks use each declared authority. Coptic word groups, Vaticanus documented word divisions, Sinaiticus glyph projection, Clementine and Peshitta verse-boundary concordances, and papyrus attestation projection remain distinct. Bezae uses an independent XML extraction that excludes running titles and notes and retains verse continuations.
- Source-word comparison uses Unicode NFC only. An elision mark missing from RP2018 display can therefore produce a difference even when a normalized lexical check passes. A spelling/coverage difference leaves source order open rather than falsely asserting a transposition.
- Peshitta, Vulgate and Sinaiticus offer both English views where their admitted complete translation is available. An occurrence bank retains every character, including punctuation and whitespace. Invalid, overlapping or unallocated assignments remain visible as English awaiting alignment. A translation unit spanning several verses is displayed whole and labeled with its scope; source grouping is withheld. Other columns retain their source-specific lexical glosses rather than having a continuous translation manufactured from them.
- The page report checks the actual display projection for character and occurrence conservation. The separate raw-corpus audit continues to expose historical allocation defects, such as held Vulgate English. A preserved bank is not evidence that every semantic association is right.
- The AI proposal guard accepts only assignments of existing English occurrence IDs to existing source occurrence IDs, bound to the entire source/English packet and current assignments. It rejects stale, cross-verse, cross-column, inserted, duplicated or omitted occurrences and replacement-text fields. Validation proves conservation, not semantic correctness. It performs no writes and is not an automatic correction endpoint.

## Findings supporting this design

The Peshitta Matthew 1:2 allocator passes its existing certificate and retains all 12 published English words. Nevertheless, it assigns both Isaac occurrences to one Syriac parent, places “his” on the second Isaac, combines both Jacob occurrences, and places “and” on the second Jacob. The root cause is the allocator's adjacent anchor merging and phrase-context redistribution, combined with a certificate that validates inventory and allocation constraints without independently checking the source meaning. A read-only corpus audit found 54 heuristic review candidates in 49 verses and no lexical occurrence-accounting failures. These are review candidates, not 54 confirmed errors.

A separate, reversible display review now corrects Matthew 1:2 in both word streams and comparison rows. Its index-only assignments are bound by SHA-256 to the reference, source authority, exact source occurrences and provenance, exact English bank and authority, translation-unit scope, and prior allocation. Isaac and Jacob remain distinct occurrences; the final Syriac word receives the existing “and his brothers:” phrase. Evidence includes the admitted Murdock unit, source sequence, SEDRA lexical evidence and ETCBC morphology. The review was prepared by Codex and is not labeled human scholarly certification. A stale review is rejected and reported. No source corpus, translation file or historical allocation certificate is rewritten.

The Matthew 1:3–4 comparison preserves Zare/Zara and the distinct Amminadab/Ameinadab spellings. The Vaticanus “System” badge denotes English provenance, not an erroneous Greek reading. CNTR and INTF differ on supplied-letter classification at four P1 occurrences in these verses. Their raw comparison and image observation remain separate; the manuscript image inspection did not resolve those readings confidently. No text was silently replaced with either authority's restoration.

The full page-checker run also exposes selected-source/display differences in Bezae, held or unallocated Vulgate English, and Byzantine elision marks. The regression report is an investigation inventory, not a count of confirmed textual errors. Its results must be adjudicated against each pipeline's declared reading layer and presentation policy before correction.

## Outstanding work

### Matthew 1:4 character presentation follow-up

The gloss rule distinguishes missing letters from damaged traces, rather than assigning a recoverability score. Four P1 words in Matthew 1:4 have missing-character markers and no whole-word gloss; the other eleven retain matching archived glosses. CNTR's `%` condition records damaged traces, while `^` records a missing character. See the CNTR Technical Reference, section 1.2.1.4: https://greekcntr.org/resources/technical.pdf. These transcription judgments do not independently establish physical attestation.

The renderer now exposes each governing CNTR damaged character with a dotted underline and tint, retains missing-character dots, and discloses the existing glyph expansion convention on expanded characters. It requires exact equality with the already admitted display string before decorating it. Both comparison rows and word streams show the known CNTR/INTF supply conflicts beside the opening Aram, second Amminadab, and Salmon. The conflicting projections are respectively `αραμ` / `····`, `αμμ·ναδ·β` / `αμμ·να··β`, and `σαλ·ων` / `σαλ··ν`. Neither transcription was substituted for the other. The opening Aram remains a material unresolved attestation question. Other damage-versus-clear classifications also differ; the three notices are not a complete inventory of all condition differences.

Amminadab's distinct P1, Vaticanus, and Byzantine spellings remain intact. Vaticanus and Byzantine Nahshon have the same underlying letters here, apart from accents and capitalization. The separate web transcription quoted in the screenshot does not reproduce either pinned transcription consistently and was not adopted as a correction.

`node --experimental-strip-types scripts/audit-papyrus-display.mjs` checked all 3,779 verses and all 30,593 extant papyrus cells, with exact display-string conservation, no fallback cells, and no input mutations. This is a renderer audit, not manuscript certification. The full suite now passes 270 tests in 25 files; targeted lint, TypeScript and the production build passed. Local browser inspection verified the letter marks and all three notices in both reading views, with no console errors. The screenshot is `images/matthew-1-4-papyrus-character-evidence-local.png`; detailed character and gloss records are in `source-checks/papyrus-character-display.json`. These changes remain local and undeployed.

### Remaining review

- Independent English wording adapters for the remaining gloss authorities, including source-specific lexical aids and approved translation units.
- An evidence-backed AI semantic reviewer and storage of its scoped decisions. The current guard is a foundation; no autonomous AI review service has been enabled.
- Further evidence-backed placement reviews. The one stored Matthew 1:2 correction does not adjudicate the remaining candidates. Reviews cannot change corpus data; deleting a review restores the stored allocation on the next render.
- Complete papyrus coverage and independent occurrence-order certification, manuscript-image collation, and cross-witness correspondence certification.
- Adjudication of the source conflicts and candidate display differences. No all-column verse or corpus-wide scholarly/scribal sign-off is implied.

## Reproduction

```text
python scripts/audit-matthew-1-3-4-evidence.py
node scripts/audit-peshitta-gloss-integrity.mjs
node scripts/audit-english-views.mjs
npm run build:verse-verification
npm run audit:verse-verification
node --experimental-strip-types scripts/audit-verse-verification.mjs
npm test -- --maxWorkers=4
npm run build
```

Reports: `source-checks/matthew-1-3-4-source-comparison.json`, `source-checks/peshitta-gloss-integrity.json`, `source-checks/page-verification-regression.json`, and `source-checks/english-view-regression.json`. Prior source certificates remain historical records. No source corpus or scholarly translation file was changed by this implementation.

Validation: 266 tests passed in 25 files; TypeScript, targeted lint, source hash gates and the production build passed. The existing cache-regeneration test rewrote ten disposable cache files; those test-only changes were restored. The shared Clementine helper exactly reproduced all 3,781 prior mappings. Browser inspection of local Matthew 1:2 confirmed both English views, correct second-Isaac occurrence highlighting, corrected groups, separate accounting/placement results, and no browser console errors. Screenshots are saved in `images/matthew-1-2-english-*-local.png`. The production build retains its existing broad data-file tracing warnings. This implementation has not been pushed or deployed.

The new display-conservation audit covered 3,779 verses and 247,777 English occurrences across available Peshitta, Vulgate and Sinaiticus display units, with zero conservation failures or input mutations. Pending source assignments remain visible: 15 Peshitta, 19,153 Vulgate and 1,120 Sinaiticus occurrences. These counts include held whole translation units and do not count confirmed semantic errors. The audit does not certify correct source correspondence or manuscript-image fidelity.
