# Gloss Source: Whitaker's Words — DICTLINE.GEN

## Provenance
**Author:** William A. Whitaker (1924–2007)
**License:** Public domain (released by the author before his death)
**Mirror:** https://github.com/mk270/whitakers-words (Martin Keegan, maintainer)
**File acquired:** `DICTLINE.GEN` from https://github.com/mk270/whitakers-words
**Access date:** 2026-05-02 (earlier session)

## Description
DICTLINE.GEN is the core lexicon of Whitaker's Words, a Latin→English morphological parser.
Each line encodes a Latin dictionary head form with part-of-speech tags, English glosses,
frequency ratings, and source codes (Lewis & Short, OLD, etc.).

The file is used to resolve Vulgate Latin word tokens to their dictionary forms and
short English glosses for interlinear display.

## Format notes
Each entry is a fixed-width line encoding:
- Columns 1–76: dictionary head form (possibly two principal parts)
- Part of speech tag
- English gloss string
- Frequency and source codes

The Whitaker's Words parser (whitakers-words binary or forks) can query DICTLINE.GEN
directly; alternatively the file can be parsed line-by-line with knowledge of the format.
