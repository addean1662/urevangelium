# Gloss Source: STEPBible TAGNT + TBESG

## Provenance
**Creator:** Tyndale House Cambridge; maintained by STEPBible.org
**License:** CC BY 4.0 (Creative Commons Attribution 4.0 International)
**Source repo:** https://github.com/STEPBible/STEPBible-Data
**License confirmed:** README.md header "STEPBible Data Repository CC BY 4.0" — verified 2026-05-02

## Files
The actual data files are stored at `../../greek-shared/` (shared across all Greek-witness columns):

| File | Description | Lines |
|------|-------------|-------|
| `TAGNT-Mat-Jhn-CC-BY.txt` | Translators Amalgamated Greek NT — per-word data for Matthew–John | 112,009 |
| `TBESG-CC-BY.txt` | Translators Brief Lexicon of Extended Strongs for Greek — Strong's → English gloss | 11,125 |

## License terms
Per CC BY 4.0: any redistribution or derivative must credit STEPBible and link to STEPBible.org.
No ShareAlike clause. Commercial use permitted.

**Required attribution in project UI:** "STEP Bible" — www.STEPBible.org

## What TAGNT provides
TAGNT gives per-word data for all major Greek textual traditions simultaneously:
- Word-by-word Greek text with morphological tags
- Edition markers (which editions each word appears in: NA28, NA27, SBL, WH, Treg, TR, Byz, Tyn)
- Strong's number for each word
- English gloss from the TBESG lexicon
- Variant readings (meaning variants, spelling variants)

The `editions` column in TAGNT allows the import pipeline to reconstruct the text form
for NA28 (≈ Vaticanus/Sinaiticus tradition), Byzantine, WH (≈ Vaticanus/Sinaiticus),
and TR (Textus Receptus) without separate raw text files for each witness.
