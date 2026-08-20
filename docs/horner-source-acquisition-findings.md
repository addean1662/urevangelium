# Horner source-acquisition findings

**Checked:** 2026-08-20

## Logos SCNTE

- Structured digital edition exists and is explicitly described as Horner's literal Sahidic English translation.
- Public product information does not establish whether the transcription was human-keyed or OCR-derived.
- Current Logos terms grant personal reading/reference use and require permission for reproduction or distribution.
- Official permissions contact: `permissions@logos.com`.
- Status: promising English source, not admissible until transcription origin and public-use permission are documented.

## CrossWire CopSahHorner

- Structured Horner Coptic module version 1.5 has been downloaded and SHA-256 pinned locally.
- Published module metadata names the immediate source only as “Slavic Bible for Windows.”
- Embedded metadata says it was updated to Unicode 5.0/OSIS and that misnumbered verses were corrected, but names no transcriber or facsimile verification process.
- No adequate transcription or correction provenance was located in the public documentation reviewed.
- Official module contact: `modules@crosswire.org`.
- Status: useful lead and possible comparison witness; not authoritative without a traceable chain to Horner's printed edition.

## Facsimile coverage

- All three Southern Dialect Gospel volumes now have confirmed Internet Archive page-image records and locally pinned evidence packages: volume 1 (Matthew and Mark), volume 2 (Luke), and volume 3 (John).
- The project owner's Volume 1 citation is Internet Archive item `HornerNTSV1Mt`, covering Matthew and Mark. Item `copticversionofn01unse` is retained as a complete-volume facsimile shadow for page-level comparison, not as a replacement source.
- Each primary package contains the PDF facsimile, CHOCR, plain OCR text, printed-page mapping, and scan metadata. SHA-256 values are recorded in `docs/horner-source-acquisition-manifest.json`.
- OCR is permitted as a provisional acquisition and alignment aid by project decision dated 2026-08-20. It is not independent textual evidence and cannot override the printed page image. Uncertain readings fail closed pending facsimile verification.

## Sahidica/SCRIPTORIUM

- The current SCRIPTORIUM licensing page directly reproduces permission for free use in free electronic New Testament editions with full title and copyright credit.
- This supports Urevangelium's free public display more directly than the earlier secondary documentation suggested.
- Clarification remains desirable for public repository storage, redistribution of pinned files, derived occurrence data, and exact attribution.
- Official contact: `contact@copticscriptorium.org`.

## Decision

The public-domain Horner facsimiles are the authoritative printed source. Their Internet Archive OCR derivatives may now be used to build provisional translation units, provided every admitted unit retains an exact facsimile locator and OCR status. OCR-derived wording is not yet eligible for an independently reviewed claim. Logos is neither required nor permitted in this acquisition path. Human correction or double-key transcription remains the preferred upgrade path for uncertain or high-risk units.
