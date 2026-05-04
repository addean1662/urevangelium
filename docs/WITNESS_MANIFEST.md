# Witness Manifest

Documentation of each of the six textual witnesses used in Urevangelium: their identity, date, source data, and lacuna handling.

---

## Column 1: Earliest Papyrus

**Display name:** Earliest Papyrus  
**Date:** c. 125–250 CE (varies by fragment)

### What it represents

The earliest extant Greek papyrus manuscript for each word of each passage. When multiple papyri cover the same word, all relevant fragment identifiers are displayed (e.g., "P66 · P75").

### Principal fragments (Gospel coverage)

| Siglum | P-number | Contents | Date |
|--------|----------|----------|------|
| P1 | P. Oxy. 2 | Matthew 1:1–9, 12–20 | c. 250 CE |
| P45 | P. Chester Beatty I | Portions of all four Gospels | c. 250 CE |
| P52 | P. Rylands 457 | John 18:31–33, 37–38 | c. 125–175 CE |
| P64+P67 | P. Magdalen / P. Barcelona | Matthew 3:9,15; 5:20–22,25–28; 26:7–8,10,14–15,22–23,31–33 | c. 200 CE |
| P66 | P. Bodmer II | John 1:1–6:11; 6:35–14:26; fragments 14–21 | c. 175–225 CE |
| P75 | P. Bodmer XIV–XV | Luke 3:18–18:18; 22:4–John 15:8 | c. 175–225 CE |
| P77 | P. Oxy. 2683+4405 | Matthew 23:30–39 | c. 150–250 CE |

### Lacuna handling

- **Word extant in a papyrus:** Display Greek word + fragment identifier(s) in a badge.
- **Word not covered by any extant papyrus:** Display red lost-dots. This is the default for most words in most passages; early papyrus coverage is sparse.
- **Multiple papyri cover the same word:** Display all fragment IDs separated by ` · ` (centered dot with spaces).

### Source data

Diplomatic transcriptions from published critical editions and the Institut für Neutestamentliche Textforschung (INTF) / IGNTP. Data acquisition is a separate workstream from scaffold.

---

## Column 2: Vaticanus

**Display name:** Vaticanus  
**Siglum:** B / 03  
**Date:** c. 325 CE  
**Script:** Greek uncial (majuscule), no word spaces, no accents in original

### What it represents

Codex Vaticanus (Vat. gr. 1209), one of the oldest and most complete Greek Bible manuscripts. Greek text is normalized to modern lowercase polytonic with accents for display (per the architectural lock on Greek display).

### Coverage

Complete text of all four Gospels with very few lacunae.

### Source data

Critical text based on published facsimile and IGNTP collation. Data acquisition is a separate workstream.

### Lacuna handling

Physical damage to Vaticanus is rare in the Gospels. If a lacuna cell is needed, display red lost-dots.

---

## Column 3: Sinaiticus

**Display name:** Sinaiticus  
**Siglum:** ℵ / 01  
**Date:** c. 350 CE  
**Script:** Greek uncial, no word spaces, no accents in original

### What it represents

Codex Sinaiticus (British Library Add. MS 43725 + fragments). Complete New Testament. Greek text normalized to modern lowercase polytonic for display.

### Coverage

Complete text of all four Gospels.

### Source data

Transcription available at codexsinaiticus.org (CC BY-NC 4.0). Data acquisition is a separate workstream.

### Lacuna handling

Sinaiticus has corrections and corrector hands (ℵa, ℵb, ℵc). The base hand (ℵ*) is used. If a lacuna is encountered, display red lost-dots.

---

## Column 4: Vulgate

**Display name:** Vulgate  
**Edition:** Stuttgart Vulgate (Weber-Gryson, 5th ed.)  
**Date:** c. 400 CE  
**Script:** Latin

### What it represents

The Latin Vulgate as established by the Württembergische Bibelanstalt (now Deutsche Bibelgesellschaft) critical edition. Primary translation by Jerome (Hieronymus), with prior Old Latin influence in the Gospels.

### Coverage

Complete text of all four Gospels.

### Source data

Published critical edition (Weber-Gryson). Data acquisition is a separate workstream. Note: The Stuttgart Vulgate text is under copyright; sourcing and licensing must be verified before populating production data.

### Lacuna handling

The Vulgate is a fully established text; physical lacunae from its manuscript base do not affect the edition. Lacuna cells in this column indicate cases where the critical edition marks substantial textual uncertainty.

---

## Column 5: Peshitta

**Display name:** Peshitta  
**Edition:** BFBS 1905 / 1920 (British and Foreign Bible Society)  
**Date:** c. 400–450 CE  
**Script:** Syriac (Classical / Estrangela)

### What it represents

The Syriac Peshitta New Testament, the standard version of the Bible for Syriac Christianity. The BFBS 1905/1920 edition is the established scholarly reference text.

### Display

- Column cell has `dir="rtl"` scoped to that cell only. Page direction remains LTR.
- Word flow inside each Syriac cell reverses (right-to-left).
- Font: Beth Mardutho OFL Estrangela Edessa (primary), Serto Jerusalem OFL (fallback).

### Coverage

Complete Peshitta New Testament, all four Gospels.

### Source data

BFBS 1905/1920 text. Digital form available from various Syriac studies projects. Data acquisition is a separate workstream.

### Lacuna handling

The BFBS Peshitta is an established critical text. Lacuna cells would reflect only passages absent from the Peshitta canon (e.g., John 7:53–8:11, which is absent in most Peshitta manuscripts). These are marked with red lost-dots, not alignment gaps (em-dashes).

---

## Column 6: Byzantine

**Display name:** Byzantine  
**Edition:** Robinson-Pierpont 2005 (The New Testament in the Original Greek: Byzantine Textform)  
**Date:** c. 5th–9th c. (textform crystallized across multiple centuries)  
**Script:** Greek (minuscule in most manuscripts)

### What it represents

The Byzantine Majority Text as reconstructed by Maurice Robinson and William Pierpont in their 2005 critical edition. Represents the dominant textual tradition of the Greek Orthodox Church and the majority of surviving Greek manuscripts.

### Coverage

Complete text of all four Gospels.

### Source data

Robinson-Pierpont 2005 edition. Data acquisition is a separate workstream.

### Lacuna handling

The Byzantine text is a reconstructed textform; physical lacunae do not apply. Lacuna cells in this column would indicate passages where no Byzantine reading has been established.

---

## Summary of Lacuna vs. Absence Rules

| Situation | Display |
|-----------|---------|
| Papyrus not extant for this word | Red lost-dots in Earliest Papyrus column |
| Manuscript physically damaged (Vaticanus, Sinaiticus) | Red lost-dots in affected column |
| Language has no word for this propositional unit (alignment gap) | Em-dash (—) |
| Passage absent from the canonical form of the witness (e.g., Peshitta and John 7:53–8:11) | Red lost-dots |
| Critical edition marks passage as not in this textform | Red lost-dots |
