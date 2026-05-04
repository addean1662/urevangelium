# Source: Byzantine column

## Greek text
byztxt/byzantine-majority-text — a community-maintained digital edition of the
Robinson-Pierpont Byzantine Textform.

**License:** Unlicense (public domain dedication)
**Source repo:** https://github.com/byztxt/byzantine-majority-text
**Files acquired:** `MAT.csv`, `MAR.csv`, `LUK.csv`, `JOH.csv` from `csv-unicode/ccat/no-variants/`
**Access date:** 2026-05-03

The underlying Robinson-Pierpont text (RP 2005) was released by its editors for free redistribution.
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

## Note on TAGNT / Byzantine divergence

TAGNT is primarily aligned to the NA28 critical text. Where the Byzantine text form
diverges in word choice, the import pipeline should flag the gloss as needing manual
review. The `gloss_deviation` marker in the schema captures this.
