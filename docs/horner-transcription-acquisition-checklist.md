# Horner transcription acquisition checklist

A candidate source qualifies only if every required item can be documented.

## Required

- Exact Horner volume, edition, imprint, pages, and regions identified.
- Both Horner Coptic and Horner English available.
- Facsimile against which the transcription can be audited identified.
- Producer and transcription provenance statement recorded, including whether the transcription is OCR-derived.
- Public-use and redistribution rights confirmed in writing or by an applicable license.
- Digital files and facsimiles hashed.
- Editorial markup and supplied wording preserved or recoverable.
- No AI-authored translation in the authoritative data channel.
- OCR-derived text is marked provisional, linked to its facsimile page, and prevented from overriding the scan.

## Accepted acquisition classes

- `OCR_TRANSCRIPTION_FACSIMILE_CONTROLLED_PROVISIONAL`
- `HUMAN_TRANSCRIPTION_EXISTING_VERIFIED`
- `PUBLISHER_DIGITAL_TRANSCRIPTION_LICENSED`
- `SCHOLARLY_EDITION_DIGITAL_TRANSCRIPTION_LICENSED`
- `HUMAN_DOUBLE_KEY_NEW` — fallback when no qualified existing source is available

## Leads requiring investigation

- Logos SCNTE: request transcription-origin documentation and public redistribution permission.
- CrossWire `CopSahHorner`: investigate the “Slavic Bible for Windows” provenance chain; Coptic only, not Horner English.
- Libraries, Coptic digital-humanities projects, and scholarly editors: ask whether a human transcription exists and can be licensed.

Acquisition does not itself authorize translation display. Every Horner unit must still pass Horner-Coptic-to-Sahidica applicability rules.

For provisional OCR acquisition, admission additionally requires an exact volume/page locator, preservation of Horner's wording without modernization, and a fail-closed exception whenever OCR or Coptic applicability is uncertain.
