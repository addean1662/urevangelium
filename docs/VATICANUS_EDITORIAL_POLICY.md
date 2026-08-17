# Vaticanus Editorial Policy

Status: pilot policy, adopted 2026-08-16. It governs the GA 03 rebuild and does not yet certify the live column.

## Textual identity

The Vaticanus column represents Codex Vaticanus, Gregory-Aland 03. CNTR Class 1 `03.txt` is the immediate machine-readable transcription. TAGNT and modern critical editions may assist alignment, morphology, accentuation, and glossing, but may not supply Vaticanus text.

Pinned source:

- CNTR commit: `4c0e9f94117ec3dc4ae40094aec044bb7a416a53`
- Local and upstream `03.txt` SHA-256: `cea945958d065699d3ab42f05d2afa3be54af4551a68e2e0a32090cd9fa0bb7f`
- License: CC BY-SA 4.0

## Reading layer

The default display projects the unlettered MES edited reading, representing the base transcription after correction by the original scribe. MES `x{...}` retains the original scribe's uncorrected form. MES `a{...}`, `b{...}`, and `c{...}` are retained as distinct later-corrector evidence and are never silently merged into the default reading.

## Archival and display forms

Every source word retains:

- the exact diplomatic MES token;
- page, column, and line breaks;
- damaged and missing-character conditions;
- supplied or *vid* status;
- nomina-sacra and numeric-abbreviation status;
- correction layers;
- the immutable source reference and revision.

The normalized display may use lowercase polytonic Greek, final sigma, and expanded comparison glyphs only when each operation is recorded in provenance. The diplomatic token remains authoritative and recoverable.

The CNTR macron `¯` represents an implied terminating nu. It may be expanded to `ν` for comparison and normalized display, but the diplomatic form remains unchanged. Manuscript ligatures may likewise be expanded for comparison while remaining preserved archivally.

Nomina sacra remain visibly contracted. Hover or secondary display may provide an expansion, but expansion may not replace the manuscript form.

## Loss and uncertainty

Physical loss, damaged characters, missing characters, supplied words, uncertain readings, scribal omission, and alignment emptiness are different states. None may be converted into another without an explicit editorial record.

## Alignment

GA 03 word order is inviolable. Alignment proceeds forward through the verse. A source word absent from the existing alignment requires a new row or a reviewed realignment; it may not be dropped. A current row absent from GA 03 receives an empty or absence state in Vaticanus and may not be filled from TAGNT.

## Release gate

A regenerated chapter remains shadow data until:

1. every GA 03 source word is represented exactly once;
2. no displayed Vaticanus word lacks GA 03 provenance;
3. all correction and uncertainty structures round-trip through the parser;
4. insertion and deletion alignments are reviewed;
5. selected difficult readings are checked against manuscript images or a second independent transcription;
6. the previous production deployment remains available for rollback.
