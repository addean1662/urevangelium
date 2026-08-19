# Vulgate English source candidates

These files are pinned inputs for a fail-closed English certification shadow. They do not by
themselves authorize any English to appear beneath an individual Latin word.

## Primary translation authority

`challoner-1899/` contains the four Gospel files from eBible `engDRA`, the public-domain
Douay-Rheims American Edition of 1899. eBible identifies it as translated from the Latin Vulgate.
The downloaded source notice is preserved as `source-notice.html`.

- Upstream: https://ebible.org/find/show.php?id=engDRA
- Acquisition archive: https://ebible.org/Scriptures/engDRA_usfm.zip
- Acquired: 2026-08-18
- Role: primary published contextual English candidate

The embedded Strong-number markup is not certification evidence and must not govern the Latin
alignment. Only the published English wording is extracted.

`challoner-1750-biblecorps/` is a separately distributed public-domain electronic edition of the
Challoner revision. It is used to audit the acquisition of the English wording. Agreement between
the two digital copies validates transcription concordance; it does not create word-level Latin
alignment authority.

- Upstream: https://github.com/BibleCorps/ENG-B-DRC1750-pd-PSFM
- Role: independent digital Challoner collation source

`challoner-gutenberg/` preserves Project Gutenberg ebook 1582 as a third independent distribution
of the Challoner New Testament. Its verse text is used only for electronic-transcription collation.

- Upstream: https://www.gutenberg.org/ebooks/1582
- Role: third digital Challoner collation source

## Secondary published witness

`rheims-1582/` contains the four tagged Gospel JSON files from `janvier-s/original-douay-rheims`.
The repository describes them as the unmodified historic Rheims New Testament and releases the
dataset under CC0 1.0. Its license and upstream README are preserved locally.

- Upstream: https://github.com/janvier-s/original-douay-rheims
- Role: independent published Vulgate-translation witness

The 1582 Rheims New Testament predates the Clementine Vulgate. It can corroborate translation
tradition and expose differences, but it cannot silently replace or harmonize the primary source.

## Admission rule

English remains in whole published translation units. Urevangelium may map one unit across one or
more Latin cells, but it may not subdivide that English more finely than source-supported alignment
permits. Acquisition, matching verse numbers, dictionary agreement, or agreement between English
translations is not alone a word-level certification.
