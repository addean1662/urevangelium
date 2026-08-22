# Urevangelium Column Certification Program

## Objective

Certify every displayed column as an honest representation of its declared textual object across Matthew, Mark, Luke, and John. No column may borrow readings from another tradition merely to create visual completeness.

## Universal gates

Every column must pass all of these gates before it is labeled source-verified:

1. The governing source, version or revision, license, and local file hash are recorded.
2. Every source token is represented exactly once and remains in source order.
3. Every displayed token is traceable to its governing source or visibly labeled as provisional.
4. Lacunae, editorial gaps, supplied text, corrections, and alignment-empty cells remain distinct.
5. Normalization is reversible and recorded; it never silently changes the archival reading.
6. Alignment sources and glossaries cannot supply the displayed text.
7. A decision ledger records insertions, omissions, substitutions, word divisions, and uncertain mappings.
8. Regeneration cannot alter another column.
9. Schema validation, source concordance, tests, and the production build pass.
10. The public Sources page states the precise textual object and certification level.

## Column-specific governing objects

| Column | Governing object | Text authority | Required treatment | Current gate |
|---|---|---|---|---|
| Earliest Papyri | Governed composite of extant papyrus witnesses | CNTR papyrus transcriptions, checked against cached INTF data where available | Preserve each siglum independently; distinguish physical loss, unattested text, and provisional TAGNT stubs | Provisional |
| Sahidic | Normalized Sahidica NT edition | Sahidica NT 4.1.0 | Preserve Coptic token groups; audit all computational row placements; do not infer native meanings from Greek alignment | Provisional |
| Vaticanus | Individual manuscript, GA 03 | Pinned CNTR Class 1 transcription | Preserve base hand, MES conditions, corrections, nomina sacra, and explicit absence | Full four-Gospel shadow built |
| Sinaiticus | Individual manuscript, GA 01 | CNTR Class 1 transcription | Pin the source; select and declare the hand; preserve corrections and physical loss | Requires rebuild |
| Vulgate | Clementine received edition | Biblia Sacra juxta Vulgatam Clementinam | Exact token concordance; preserve Latin-only words; contextual lexical review | Provisional |
| Bezae | Bilingual manuscript, GA 05 / VL 5 | ITSEE/IGNTP Greek and Latin TEI | Preserve both sides and their separate losses, hands, corrections, and supplied text | Provisional |
| Peshitta | Pinned scrollmapper electronic Peshitta text | `Peshitta.txt` at commit `ba07bc991644d82b24426b920245eb4422daa769` | Exact token concordance and RTL order; certify row/span relations; align complete Murdock units to bounded Syriac row phrases | Source text, governed alignment, and Murdock row-phrase English verified |
| Byzantine | Edited Byzantine Textform | Local byztxt CSV after revision pin | Exact token concordance; prohibit TAGNT fallback; treat gaps as edition-level, not physical lacunae | Provisional |

## Rollout order

The work proceeds by source readiness, while retaining one common certification ledger:

1. Finish the Vaticanus candidate as the reference implementation, without publishing it alone.
2. Rebuild Sinaiticus from GA 01 using the same lossless MES engine.
3. Pin and certify the Byzantine CSV and remove every silent fallback.
4. Certify exact source-token concordance for the Clementine Vulgate and Peshitta.
5. Preserve and certify both Bezae TEI sides and correction layers.
6. Audit Sahidic row placement and lexical provenance.
7. Complete the papyrus composite witness-by-witness, replacing or visibly isolating every provisional stub.
8. Assemble a complete candidate dataset, verify cross-column invariants, and publish all newly certified states together.

## Certification labels

- **Source-verified:** complete displayed-text concordance with the pinned governing source.
- **Source-transcription verified:** source-verified from a diplomatic transcription, without an image claim.
- **Provisional:** the source is identified but alignment, exemplar, or fallback work remains.
- **Requires rebuild:** the displayed text is currently governed by a proxy rather than the declared object.

Image verification is not a gate. Where unavailable, the site must say `source-transcription verified` and identify the transcription and revision.
