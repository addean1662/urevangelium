# Horner–Sahidica translation-alignment pilots

This directory contains no translated Gospel text until Urevangelium acquires a legally reusable, provenance-qualified human transcription of both Horner's Coptic and English.

## Two-pilot design

- **Pilot A — control:** selected empirically after acquisition from a passage with substantial Horner–Sahidica Coptic agreement. It proves that the system can admit applicable published translation.
- **Pilot B — adversarial:** Mark 16. It proves that the system refuses translation where recension, ending, wording, or scope is unsafe.

## Authorship boundary

- Translation author: George W. Horner.
- Coptic source represented in the table: pinned Sahidica NT 4.1.0.
- Alignment author: Urevangelium.
- A Horner translation unit may map as a whole to one or more Sahidica groups.
- Urevangelium must not create finer English-to-Coptic semantic segmentation than the translation source supports.

## Qualified acquisition

Accepted acquisition classes are:

- `HUMAN_DOUBLE_KEY_NEW`
- `HUMAN_TRANSCRIPTION_EXISTING_VERIFIED`
- `PUBLISHER_DIGITAL_TRANSCRIPTION_LICENSED`
- `SCHOLARLY_EDITION_DIGITAL_TRANSCRIPTION_LICENSED`

Every class must establish human origin, exact source edition, sufficient facsimile auditability, and legal permission for public use. Fresh double-key transcription with human adjudication is the gold-standard fallback, not a universal requirement.

OCR, AI transcription, AI translation, unauthorized Logos extraction, TAGNT English, dictionary-generated translation, and English borrowed from another tradition are prohibited from the translation channel.

## Admission rule

The underlying Horner Coptic must be exact or differ only through recorded, whitelisted nonlexical operations. Broad “typographic equivalence,” spelling normalization, lemma equivalence, and morphological normalization are not admission rules.

Every operation stores its before and after values. Horner English is stored once, verbatim, as a translation unit spanning its complete supported Sahidica range.
