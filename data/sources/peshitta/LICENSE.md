# Source: Peshitta column

## Syriac text
BFBS (British and Foreign Bible Society) Peshitta edition, 1905/1920 (Lee text).
This edition is in the public domain (pre-1928 publication). The Peshitta text
itself (c. 400–450 CE) is unambiguously public domain.

## Gloss source: Payne Smith — manual curated TSV

| File | Description |
|------|-------------|
| `payne-smith-proof-verses.tsv` | Hand-curated Syriac→English glosses for all four proof verses |

**Primary reference:** Payne Smith, R. (ed. J. Payne Smith). *A Compendious Syriac Dictionary*.
Oxford: Clarendon Press, 1903. Public domain (pre-1928).

**Cross-reference:** CAL — Comprehensive Aramaic Lexicon, Hebrew Union College–Jewish Institute of
Religion (cal.huc.edu). Freely searchable; individual entry data referenced for verification only,
not redistributed.

**Access date:** 2026-05-02

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
