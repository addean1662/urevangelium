# Source: Peshitta column

## Syriac text
Peshitta New Testament — public domain.
The Peshitta (c. 400–450 CE) is the standard Syriac Christian Bible.

**Source:** scrollmapper/bible_databases, `formats/txt/Peshitta.txt`
**Source repo:** https://github.com/scrollmapper/bible_databases
**Source README:** `sources/syr/Peshitta/README.md` — "License: Public Domain"
**Repo license:** MIT (for the database infrastructure; the text itself is public domain)
**File acquired:** `Peshitta.txt` (31,300 lines, full Bible)
**Access date:** 2026-05-03

The text represents the received Peshitta text (based on the Urmia/BFBS Lee tradition),
which is public domain in all jurisdictions by virtue of its antiquity.

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
