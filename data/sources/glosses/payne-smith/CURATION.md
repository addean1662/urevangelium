# Payne Smith Top-60 Curation

## Source

J. Payne Smith (ed.), *A Compendious Syriac Dictionary Founded upon the Thesaurus Syriacus of R. Payne Smith, D.D.* (Oxford: Clarendon Press, 1903). Public domain.

Archive.org scan: https://archive.org/details/compendioussyria0000jpay

## Methodology

Entries are to be hand-transcribed by **visually reading the archive.org scan** — not from OCR text (the DJVU plain-text OCR does not preserve Syriac Unicode characters) and not from Dukhrana (third-party infrastructure over the same public-domain data).

Process:
1. Identify the top-60 highest-frequency tokens from `peshitta-freq.txt` (frequency analysis of all four Gospels in `data/sources/peshitta/Peshitta.txt`)
2. For each token that has a standalone entry in Payne Smith (i.e., not a suffixed/compound form), navigate to the relevant page in the archive.org scan
3. Read the entry visually; type the gloss into the TSV
4. Record the scan page number in the `scan_page` column for verification

## Status

**Not yet populated.** Scan navigation was assessed as impractical for automated tools (646-page dictionary, no programmatic page index, each of ~40 entries requires downloading and inspecting individual JP2 page images). Awaiting decision on how to proceed.

Fallback currently active: all Peshitta cells are served by Etheridge (1846) and Murdock (1851) verse-level cross-reference.

## TSV columns

| Column | Description |
|---|---|
| `syriac_word` | Syriac token exactly as it appears in `Peshitta.txt` |
| `gloss_first_sense` | Shortest meaningful gloss (first comma-unit from Payne Smith) |
| `gloss_full` | Full entry text as it appears in the dictionary (for tooltip) |
| `pos` | Part of speech abbreviation (n., v., prep., part., pron., conj., adv.) |
| `scan_page` | Page number in the 1903 edition for citation and verification |
