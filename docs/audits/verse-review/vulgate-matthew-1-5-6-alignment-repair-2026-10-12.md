# Vulgate Matthew 1:5–6: restore the aligned English display

The preceding containment release removed every English assignment from Matthew 1:6 and left its English in a paragraph. That preserved the words but failed the intended bilingual word-stream presentation. This repair replaces that hold with a reviewed mapping across the two editions' different verse boundaries.

## Evidence and allocation

- Clementine Latin: https://www.biblehub.com/vul/matthew/1.htm
- Douay–Rheims 1899 English: https://ebible.org/engDRA/MAT01.htm
- The final five Latin words of Clementine Matthew 1:5, `Jesse autem genuit David regem`, correspond to the opening six English occurrences in Douay–Rheims Matthew 1:6, `And Jesse begot David the king.`
- Follow source on Matthew 1:5 now allocates all 16 English occurrences from published 1:5 and the first six from published 1:6. Follow source on Matthew 1:6 allocates the remaining 15 English occurrences from published 1:6.
- `Salomonem` in 1:6 receives `Solomon,`; the earlier erroneous `David` assignment is not reused.
- Every displayed Latin word on both pages has an English group. Source Latin, its word order, and the original English translation banks are unchanged.
- Translation order retains the complete, unchanged English of each published verse. The collapsed Verse numbering note supplies both original units and explains the boundary difference.

`data/english-groups/concordances.json` stores only published references and occurrence intervals. Preparation resolves wording exclusively from admitted translation units and rejects missing, duplicated, reordered, overlapping, or invalid occurrence selections. Approved placement proposals contain occurrence IDs rather than authored English. Their input hashes include full concordance wording and provenance, invalidating stale reviews when either changes.

All 37 original English occurrences across both units are accounted for exactly once in the two Follow source displays. Each occurrence retains its original published reference and index. Historical corpus allocations remain available for audit; the reviewed display projection supersedes their erroneous placements.

## Validation

- 278 tests passed across 26 files, including conservation, invalid interval, stale review, both presentation modes, comparison rows, and the Solomon hover target.
- TypeScript and targeted ESLint checks passed.
- Production build passed. The prebuild gates checked papyrus attestation and prepared-source fingerprints across 3,779 verses.
- Local browser inspection confirmed every Latin word has an English group, no English-awaiting-alignment paragraph remains, and the verse-numbering note is collapsed. Screenshot: `images/matthew-1-6-vulgate-restored-local.png`.

This is a bounded English-placement repair, not independent manuscript-image or corpus-wide semantic certification. The separate P1 transcription conflict and other review notices remain intact. Deployment verification is recorded separately after production becomes ready.
