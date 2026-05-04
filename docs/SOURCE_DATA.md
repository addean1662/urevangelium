# Source Data — Urevangelium

This document is the authoritative record of all source data acquired for the alignment pipeline.
Each section covers one column or gloss source: provenance, license, files, and pipeline notes.

**Last updated:** 2026-05-03

---

## License Summary

| Source | License | Constraint |
|--------|---------|------------|
| Byzantine (byztxt) | Unlicense | None |
| Clementine Vulgate | Public Domain | None |
| Peshitta (scrollmapper) | Public Domain | None |
| Sinaiticus (CNTR) | **CC BY-SA 4.0** | ShareAlike on derived works |
| Vaticanus (CNTR) | **CC BY-SA 4.0** | ShareAlike on derived works |
| Papyri (CNTR) | **CC BY-SA 4.0** | ShareAlike on derived works |
| TAGNT + TBESG (STEPBible) | CC BY 4.0 | Attribution required |
| Whitaker's Words | Public Domain | None |
| Payne Smith CSD | Public Domain | None |

**Licensing posture — resolved 2026-05-03:** This project accepts CC BY-SA 4.0 for the full
alignment dataset. The ShareAlike obligation arises from the CNTR transcriptions of Vaticanus
(03), Sinaiticus (01), and the Gospel papyri (P1, P45, P66, P75). Rather than mitigate around
this obligation (e.g. reconstructing text solely from TAGNT edition markers to avoid touching
CNTR files), the project embraces it: all alignment JSON and derived data are distributed under
CC BY-SA 4.0. This satisfies the upstream CNTR requirement and is consistent with the project's
open-scholarship intent. The root `LICENSE` file contains the full CC BY-SA 4.0 legal text.

---

## 1. Earliest Papyrus Column

**Directory:** `data/sources/earliest-papyrus/`
**Gloss source:** STEPBible TAGNT (see §7)

### Text source
CNTR (Center for New Testament Restoration) transcriptions, class 1.

| File | Papyrus | Gospel coverage | Approximate date |
|------|---------|----------------|-----------------|
| `P1.txt` | P1 | Matt fragments (1:1, 1:14–20) | c. 250 CE |
| `P45.txt` | P45 | Matt, Mark, Luke, John, Acts (fragmentary) | c. 250 CE |
| `P66.txt` | P66 | John (near-complete) | c. 200 CE |
| `P75.txt` | P75 | Luke + John | c. 175–225 CE |

**Source:** https://github.com/Center-for-New-Testament-Restoration/transcriptions
**License:** CC BY-SA 4.0

### Format
CNTR uses `BBCCCVVV` (book-chapter-verse) line prefix with unaccented Greek.
Markup characters: `/` (line break), `\` (paragraph), `^` (lacuna/uncertain), `~` (correction),
`=` (nomen sacrum), `+` (addition), `x{}` (scribal error + correction), `|` (section marker).

---

## 2. Vaticanus Column

**Directory:** `data/sources/vaticanus/`
**Gloss source:** STEPBible TAGNT (see §7)

### Text source
CNTR transcription of Codex Vaticanus (GA 03), class 1.

| File | Lines |
|------|-------|
| `03.txt` | 7,140 |

**Source:** https://github.com/Center-for-New-Testament-Restoration/transcriptions
**License:** CC BY-SA 4.0

### Format
Same CNTR format as papyri. `BBCCCVVV` prefix + unaccented Greek + apparatus markers.

---

## 3. Sinaiticus Column

**Directory:** `data/sources/sinaiticus/`
**Gloss source:** STEPBible TAGNT (see §7)

### Text source
CNTR transcription of Codex Sinaiticus (GA 01, "Aleph"), class 1.

| File | Lines |
|------|-------|
| `01.txt` | 7,959 |

**Source:** https://github.com/Center-for-New-Testament-Restoration/transcriptions
**License:** CC BY-SA 4.0

---

## 4. Vulgate Column

**Directory:** `data/sources/vulgate/`
**Gloss source:** Whitaker's Words DICTLINE.GEN (see §8)

### Text source
Clementine Vulgate (Biblia Sacra juxta Vulgatam Clementinam, 1592/1598).
The Clementine text is the standard received Latin text for Catholic use.

| File | Lines |
|------|-------|
| `VulgClementine.txt` | 37,489 |

**Source:** scrollmapper/bible_databases `formats/txt/VulgClementine.txt`
**License:** Public domain

### Format
Section headers `### BookName` followed by verse lines `[chapter:verse] Latin text.`

---

## 5. Peshitta Column

**Directory:** `data/sources/peshitta/`
**Gloss source:** Payne Smith CSD, manually curated (see §9)

### Text source
Peshitta New Testament (received text, Urmia/BFBS Lee tradition, c. 400–450 CE).

| File | Lines |
|------|-------|
| `Peshitta.txt` | 31,300 |

**Source:** scrollmapper/bible_databases `formats/txt/Peshitta.txt`
**License:** Public domain

### Format
Section headers `### BookName` followed by verse lines `[chapter:verse] Syriac text ܀`
Text is Unicode Syriac (right-to-left). Verse separator ܀ (Syriac end mark).

### Proof-verse glosses
`payne-smith-proof-verses.tsv` — hand-curated TSV for Matt 1:1, Mark 1:1, Luke 1:1, John 1:1.

---

## 6. Byzantine Column

**Directory:** `data/sources/byzantine/`
**Gloss source:** STEPBible TAGNT (see §7)

### Text source
byztxt/byzantine-majority-text digital edition (community transcription of the Robinson-Pierpont
Byzantine Textform), verse-level CSV.

| File | Verses |
|------|--------|
| `MAT.csv` | 1,071 |
| `MAR.csv` | 678 |
| `LUK.csv` | 1,150 |
| `JOH.csv` | 879 |

**Source:** https://github.com/byztxt/byzantine-majority-text `csv-unicode/ccat/no-variants/`
**License:** Unlicense (public domain)

### Format
CSV: `chapter,verse,text` — full verse text as a single string, accented Greek with punctuation.

---

## 7. TAGNT + TBESG (Greek Gloss Source)

**Directory:** `data/sources/greek-shared/`
**Used by:** Earliest Papyrus, Vaticanus, Sinaiticus, Byzantine columns

### Files
| File | Lines | Description |
|------|-------|-------------|
| `TAGNT-Mat-Jhn-CC-BY.txt` | 112,009 | Per-word data: Greek, English, Strong's, grammar, editions |
| `TBESG-CC-BY.txt` | 11,125 | Strong's → English gloss lexicon |
| `tagnt-README-raw.md` | — | STEPBible repository README (CC BY license text) |

**Source:** https://github.com/STEPBible/STEPBible-Data
**License:** CC BY 4.0
**Required attribution:** "STEP Bible" — www.STEPBible.org

### TAGNT key columns
```
Reference#Word  Greek      English          dStrongs=Grammar  DictForm=Gloss  editions  ...
Mat.1.1#01=NKO  Βίβλος     [The] book       G0976=N-NSF       βίβλος=book     NA28+...+Byz
```
The `editions` column lists which text traditions include each word, enabling reconstruction
of each witness's text form without separate raw files.

---

## 8. Whitaker's Words (Latin Gloss Source)

**Directory:** `data/sources/glosses/whitaker/`
**Used by:** Vulgate column

| File | Lines |
|------|-------|
| `DICTLINE.GEN` | 39,338 |

**Source:** https://github.com/mk270/whitakers-words
**License:** Public domain (William Whitaker, released before his death in 2007)

---

## 9. Payne Smith (Syriac Gloss Source)

**Directory:** `data/sources/glosses/payne-smith/`
**Used by:** Peshitta column

**Primary reference:** Payne Smith, *A Compendious Syriac Dictionary*, Oxford 1903.
**License:** Public domain (pre-1928)

Proof-verse glosses: `../../peshitta/payne-smith-proof-verses.tsv`

At scale: the Comprehensive Aramaic Lexicon (CAL, cal.huc.edu) is used as a lookup
service for entry IDs; no CAL data is stored in this repository.

---

## Directory tree

```
data/sources/
├── earliest-papyrus/    P1.txt, P45.txt, P66.txt, P75.txt, LICENSE.md
├── vaticanus/           03.txt, LICENSE.md
├── sinaiticus/          01.txt, LICENSE.md
├── vulgate/             VulgClementine.txt, DICTLINE.GEN (copy), LICENSE.md
├── peshitta/            Peshitta.txt, payne-smith-proof-verses.tsv, LICENSE.md
├── byzantine/           MAT.csv, MAR.csv, LUK.csv, JOH.csv, LICENSE.md
├── greek-shared/        TAGNT-Mat-Jhn-CC-BY.txt, TBESG-CC-BY.txt, tagnt-README-raw.md
└── glosses/
    ├── tagnt/           LICENSE.md (data in ../../greek-shared/)
    ├── whitaker/        DICTLINE.GEN, LICENSE.md
    └── payne-smith/     LICENSE.md (proof data in ../../peshitta/)
```
