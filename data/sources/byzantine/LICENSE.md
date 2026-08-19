# Source: Byzantine column

## Greek text
byztxt/byzantine-majority-text — a community-maintained digital edition of the
Robinson-Pierpont Byzantine Textform.

**License:** Unlicense (public domain dedication)
**Source repo:** https://github.com/byztxt/byzantine-majority-text
**Files acquired:** `MAT.csv`, `MAR.csv`, `LUK.csv`, `JOH.csv` from `csv-unicode/ccat/no-variants/`
**Access date:** 2026-05-03

**Pinned release:** `v3.3.2`
**Pinned commit:** `27a45ff1b7be6c17ccbfeac414f3f55732ae8e28`

All four local Gospel CSVs match that tag byte-for-byte. The pinned files
represent the **Robinson-Pierpont 2018 Byzantine Textform**; upstream identifies
releases 3.x as RP2018 and recommends them over RP2005.

The underlying Robinson-Pierpont text was released by its editors for free redistribution.
The byztxt repo places the digital transcription in the public domain via the Unlicense.

## Gloss source: STEPBible TAGNT + TBESG

The gloss import pipeline uses two STEPBible files located at `../greek-shared/`:

| File | Description |
|------|-------------|
| `TAGNT-Mat-Jhn-CC-BY.txt` | Translators Amalgamated Greek NT — per-word Strong's tags for Matthew–John |
| `TBESG-CC-BY.txt` | Translators Brief Lexicon of Extended Strongs for Greek — Strong's → English gloss |

**License:** CC BY 4.0
**Attribution:** "STEP Bible" — www.STEPBible.org
**Source repo:** https://github.com/STEPBible/STEPBible-Data
**License confirmed:** README.md header "STEPBible Data Repository CC BY 4.0" — verified 2026-05-02

Per CC BY 4.0: any redistribution or derivative must credit STEPBible and link to STEPBible.org.
No ShareAlike clause; commercial use permitted.

## English certification policy

The English layer is rebuilt by `scripts/build-byzantine-english-shadow.mjs` and
recorded in `docs/audits/byzantine-english-shadow.json`. It admits all 66,130
RP2018 Gospel tokens through a Byzantine-specific chain:

- exact RP2018 surface, token order, Strong identity, and parsing;
- TAGNT only where its apparatus explicitly identifies the Byzantine reading;
- TBESG / Abbott-Smith as the primary lexical bridge;
- MorphGNT, PROIEL, and the MorphGNT lexicon for deterministic secondary
  lemma adjudication.

TAGNT contextual English supported directly by the chain displays normally.
English selected through the site's secondary lexical rules displays in orange.
Orange therefore records Urevangelium's responsibility for the selection; it is
not represented as a separately published translation. No English meaning is
borrowed from another tradition column. The audit is internal process
certification and does not claim independent scholarly peer review.
