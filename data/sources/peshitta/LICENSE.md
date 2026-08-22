# Source: Peshitta column

## Syriac text
Peshitta New Testament — public domain.
The Peshitta (c. 400–450 CE) is the standard Syriac Christian Bible.

**Source:** scrollmapper/bible_databases, `formats/txt/Peshitta.txt`
**Source repo:** https://github.com/scrollmapper/bible_databases
**Pinned commit:** `ba07bc991644d82b24426b920245eb4422daa769` (2024-11-19)
**SHA-256:** `6E6E13089148E2D9809103F4B0BBB602D95086C28B37F44B086E800C5690651B`
**Source README:** `sources/syr/Peshitta/README.md` — "License: Public Domain"
**Repo license:** MIT (for the database infrastructure; the text itself is public domain)
**File acquired:** `Peshitta.txt` (31,300 lines, full Bible)
**Access date:** 2026-05-03

The upstream metadata identifies this only as the Syriac Peshitta and public
domain. It does not document a printed exemplar. Urevangelium therefore
identifies the displayed object as this pinned electronic edition and does not
claim exact identity with BFBS 1905, the Urmia edition, or Lee's edition.

## Gloss source: Payne Smith — manual curated TSV

| File | Description |
|------|-------------|
| `payne-smith-proof-verses.tsv` | Hand-curated Syriac→English glosses for all four proof verses |

See `../glosses/payne-smith/LICENSE.md` for provenance and license details.

## Gloss pipeline (at scale)

For non-proof verses, the import pipeline will cross-reference CAL entry IDs rather than
reproducing Payne Smith text. CAL is used as a pointer/verification source only.

## TSV format

```
word <TAB> lemma <TAB> gloss <TAB> source <TAB> notes
```

- `word`: exact token as it appears in the peshitta cell of the alignment JSON
- `lemma`: dictionary base form (without grammatical prefixes/suffixes)
- `gloss`: short English gloss suitable for interlinear display
- `source`: GlossSource enum value ("PayneSmith")
- `notes`: Payne Smith CSD page reference, CAL entry id, morphological notes
