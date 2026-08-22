# Peshitta source-text certification

## Result

The live four-Gospel Peshitta stream is internally **source-text verified**
against the pinned scrollmapper electronic edition. This is not a claim of
independent scholarly review or exact BFBS 1905 identity. Parallel and Murdock
English alignment are internally certified at the explicit row or bounded-span
levels described below; a certified span is not a one-to-one lexical claim.

| Gate | Result |
|---|---:|
| Gospel verse records | 3,779 / 3,779 |
| Source tokens displayed | 50,477 / 50,477 |
| Exact ordered verses | 3,779 / 3,779 |
| Missing, extra, reordered, or altered live tokens | 0 |
| Tokens with complete source-coordinate provenance | 50,477 / 50,477 |
| Provenance failures | 0 |
| Certified Murdock row cells | 50,477 / 50,477 |
| Published Murdock words accounted | 84,136 / 84,136 |
| English-alignment provenance failures | 0 |
| Existing non-Peshitta rows removed | 0 |
| Existing non-Peshitta field mutations | 0 |
| New Syriac-only rows | 728 |

## Governing source

- File: `data/sources/peshitta/Peshitta.txt`
- Upstream: `scrollmapper/bible_databases`, `formats/txt/Peshitta.txt`
- Commit: `ba07bc991644d82b24426b920245eb4422daa769`
- Commit date: 2024-11-19
- SHA-256: `6E6E13089148E2D9809103F4B0BBB602D95086C28B37F44B086E800C5690651B`
- Upstream identification: “Syriac Peshitta”; public domain

The local file is byte-identical to that upstream revision. The upstream
metadata does not identify a printed exemplar, so earlier project claims that
the file is exactly BFBS 1905/1920, Urmia, or Lee have been withdrawn.

## The 1,831-verse discrepancy

Before rebuilding, 1,948 verses already matched the governing source and 1,831
did not. The 1,831 mismatches classified as follows:

| Class | Verses | Decision |
|---|---:|---|
| Source tokens missing from display | 492 | Restore every missing governed token. |
| Display tokens absent from source | 147 | Remove unsupported legacy tokens from the Peshitta stream. |
| Substitution or mixed difference | 1,183 | Replace the legacy reading with the pinned governing reading; retain the comparison in this audit rather than silently treating it as the same edition. |
| Same token inventory, wrong order | 8 | Restore governing source order. |
| Silent samekh normalization only | 1 | Preserve the source code point; normalization is allowed only in a reversible comparison key. |

Representative mixed differences included Matthew 1:20 (`ܗܘ` in the source
versus legacy `ܗܐ`), Matthew 1:23 (`ܕܗܐ` versus `ܗܐ`), and Matthew
2:1 (source `ܟܕ` and `ܗܪܘܕܣ` versus legacy `ܕܝܢ`, `ܗܪܘܕܣ`,
and `ܗܐ`). These are genuine stream differences, not punctuation noise.

## Root cause

The former live column was not a lossless rendering of one controlled source.
Legacy scripts document four damaging behaviors:

1. positional assignment into a Greek-derived row count;
2. silent dropping of Syriac overflow words;
3. manual duplication or regrouping of Syriac forms to fit Greek rows; and
4. reuse of Greek or proportionally selected translation words as if they were
   Syriac lexical glosses.

Some manually curated cells also contained readings different from the pinned
electronic source but had no separately pinned Syriac authority. Because the
declared displayed object is the pinned electronic edition, those unsupported
readings could not govern the column.

## Boundary adjudication

The upstream file places the modern Mark 9:50 text at the end of its Mark 9:49
line after a literal numeric marker `50`, followed by an empty `[9:50]` record.
The importer splits at that marker, excludes the marker from the Syriac token
stream, and maps the following Syriac words to the local Mark 9:50 file. No
Syriac word is added, deleted, or changed.

## Placement method and limit

For each verse, the rebuild computes a longest-common-subsequence of exact
Syriac forms against the prior row stream. Surviving exact forms act as ordered
anchors. Intervening governed source tokens are allocated monotonically among
available rows; when no row is available, a Syriac-only row is inserted. This
produced:

| Gospel | Verses | Tokens | New Syriac-only rows |
|---|---:|---:|---:|
| Matthew | 1,071 | 13,998 | 219 |
| Mark | 678 | 8,809 | 110 |
| Luke | 1,151 | 15,244 | 169 |
| John | 879 | 12,426 | 230 |

This method proves source inventory, identity, and order. It does **not** prove
that every Syriac word has been placed beside its best semantic counterpart in
Greek, Latin, or Coptic. A separate semantic pass over all 728 inserted rows is
recorded below; held cases remain computational until stronger occurrence-level
evidence or qualified Syriacist review is available.

## Inserted-row semantic adjudication

Every inserted row was queried against the public SEDRA IV API and compared
within a plus/minus-six-row window against three evidence families: Greek,
Latin, and Coptic. The Vaticanus, Sinaiticus, Byzantine, and papyrus columns
count only once as the dependent Greek family. Generic auxiliary matches were
excluded. A candidate is strong only when the same lexical concept occurs in
at least two independent families and it has strictly more shared concepts
than every competing row in the window.

| Result | Rows |
|---|---:|
| Strong unique shared-concept review candidate | 194 |
| Held: multiple shared-concept candidates | 21 |
| Held: one evidence family only | 224 |
| Held: no nearby witness match | 225 |
| Held: no usable lexical evidence | 64 |

That diagnostic pass identified 194 high-confidence candidates and held 534
from false one-to-one assignment. A second occurrence-level certification pass
then represented those held cases with the relation type actually supported by
the evidence: direct correspondence, contextual correspondence, multirow
lexical span, morphosyntactic boundary span, or source-order boundary span.

The final certificate covers 728/728 governed rows with zero failures:

| Certified relation | Rows |
|---|---:|
| Direct lexical correspondence | 116 |
| Contextual lexical correspondence | 114 |
| Multirow lexical span | 14 |
| Morphosyntactic boundary span | 426 |
| Source-order boundary span | 58 |

The decrease from 194 diagnostic candidates to 116 direct correspondences is
intentional: 78 candidates fell outside their strict neighboring Syriac source
anchors and were downgraded to span relations. No foreign row was moved and no
English was introduced. The diagnostic ledger is
`docs/audits/peshitta-semantic-alignment.json`; the controlling alignment
certificate is `docs/audits/peshitta-alignment-certification.json`.

## English and lexical evidence

All unsupported legacy Peshitta glosses were withheld during the source rebuild.
The separately governed Murdock layer is now displayed in the left-aligned
English cell accompanying each right-aligned Syriac row.

- Payne Smith TSV material covers only four proof verses and must be remapped
  to certified source occurrences before republication.
- Etheridge and Murdock are verse-level published translations. They may be
  used as contextual witnesses or intact translation units, but proportional
  extraction cannot establish word-level meaning.
- `phonetics.json` is derived pronunciation data, not textual or lexical
  authority.
- SEDRA IV lexical analyses were acquired through its documented public API
  (OpenAPI metadata declares Apache-2.0) and are retained as review evidence,
  not as Peshitta English glosses.

The runtime proportional Etheridge/Murdock fallback remains disabled. Murdock
1851 English was first admitted as 3,677 intact published translation units:
3,660 single-verse units concordant across two digital transcriptions and 17
explicit boundary spans covering 119 references where the transcriptions
divide or omit numbered units differently. All 84,136 admitted English words
are accounted once; zero units are held.

Those complete units are then partitioned into 23,650 ordered row-phrase groups.
The certified Syriac row stream is the alignment spine. Existing Greek, Latin,
and Coptic English cells provide placement evidence only; the four Greek
witnesses count as one dependent evidence family. A lexical boundary anchor is
admitted only when the same normalized concept is corroborated by at least two
tradition families and remains monotonic within the Murdock unit. This yields
22,007 lexical anchors. Material between anchors remains intact in a bounded
phrase span, so the procedure does not manufacture word equivalence or borrow
foreign-column wording. Only 53 units require a whole-unit fallback span.

The final row certificate accounts for all 50,477 Syriac rows and all 84,136
Murdock words exactly once, with zero failures. It contains 12,674 single-row
phrase owners and 10,976 multirow phrase spans with 26,827 continuation rows.
This is internal process certification, not independent Syriacist review.

## Reproducibility

- Shadow/apply/certification engine: `scripts/build-peshitta-source-shadow.mjs`
- Full current source-order ledger: `docs/audits/peshitta-source-order-shadow.json`
- Machine-readable certificate: `docs/audits/peshitta-live-certification.json`
- SEDRA evidence: `data/sources/peshitta/sedra-inserted-token-evidence.json`
- Inserted-row semantic ledger: `docs/audits/peshitta-semantic-alignment.json`
- Occurrence-morphology concordance: `docs/audits/peshitta-etcbc-morphology-concordance.json`
- Controlling alignment certificate: `docs/audits/peshitta-alignment-certification.json`
- Murdock English source collation: `data/sources/peshitta/murdock-gospels.json`
- Admitted English units: `data/sources/peshitta/murdock-admitted-units.json`
- English certificate: `docs/audits/peshitta-english-certification.json`
- Row-phrase adjudication: `docs/audits/peshitta-row-english-adjudication.json`
- Row application report: `docs/audits/peshitta-row-english-application.json`
- Commands: `npm run shadow:peshitta:source`, `npm run apply:peshitta:source`,
  `npm run certify:peshitta:live`, `npm run acquire:peshitta:sedra`,
  `npm run audit:peshitta:semantic-alignment`,
  `npm run audit:peshitta:etcbc-morphology`, `npm run certify:peshitta:alignment`,
  `npm run acquire:peshitta:murdock-english`, and
  `npm run certify:peshitta:english`, `npm run adjudicate:peshitta:row-english`,
  `npm run apply:peshitta:row-english`, and
  `npm run certify:peshitta:row-english`
