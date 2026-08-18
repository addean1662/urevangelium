# Vaticanus English certification policy

## Object being certified

The English cells beside Vaticanus are word-level lexical annotations of the
INTF-controlled transcription of Codex Vaticanus (GA 03). They are not an
independent English Bible translation and do not reconstruct an eclectic Greek
text.

## Certifying source chain

1. INTF NTVMR document 20003, original hand, governs the displayed Greek word.
2. That word is aligned deterministically within its verse to a TAGNT word.
3. TAGNT supplies contextual English, morphology, and a disambiguated lexical
   identifier.
4. TBESG/Abbott-Smith verifies the lexical identity and brief definition.

INTF remains authoritative for presence, omission, order, and spelling in the
Vaticanus column. TAGNT and the lexicons may annotate an INTF word; they may not
add, remove, reorder, or replace it.

## Admission rules

An English gloss may be published only when:

- the INTF word maps uniquely to the TAGNT word under documented exact or
  declared normalization rules;
- the TAGNT lexical identifier resolves to the expected TBESG entry;
- no competing alignment has equal support; and
- all source versions and identifiers are retained in provenance.

TAGNT morphology is retained as evidence, but this audit does not yet claim an
independent morphological parse of the Vaticanus surface form.

## Current shadow result

The INTF transcription contains 63,511 source `<w>` tokens. Thirty-five tokens
have a uniquely corroborated two-word division and are displayed as 70 lexical
words, yielding 63,546 Vaticanus lexical words without adding, deleting, or
changing any INTF character. The initial four-Gospel shadow certifies 62,833 of
those lexical words. The first exception-ledger pass admits another 100 under
the unique exact transposition rule, for 62,933 certifiable words. The remaining
613 proceed to the independent secondary-source pass. No TBESG lexical lookup
failed. These figures describe the shadow audit only; it has not populated live
English cells.

The primary unresolved ledger classifies these without admitting them: 373 have
no exact TAGNT counterpart, 18 contain repeated or non-unique exact forms, 74
differ at the ending, 57 show a prefix or elision difference, and 91 contain an
internal surface-form difference.

## Independent secondary-source pass

The unresolved forms are next checked against pinned MorphGNT and PROIEL data.
An exact Vaticanus surface form is admitted only when both datasets assign one
and the same normalized lemma, the MorphGNT Morphological Lexicon connects that
lemma to a lexical identifier, and TBESG/Abbott-Smith resolves its English
meaning. Further registered rules use INTF/CNTR markup for explicit nomina
sacra and numerals, TAGNT verse context only where both morphology corpora
contain the selected lemma, and pinned MorphGNT Tischendorf data as a third
annotation witness. These passes certify 476 additional words, bringing the
shadow total to 63,409 of 63,546 displayed lexical words (99.784%). The ledger retains each source's
morphology as evidence but does not claim that their different morphology-code
systems have yet been cross-normalized. PROIEL and the MorphGNT Tischendorf
dataset share Tischendorf as their underlying text; that dependence is recorded
and neither controls the Vaticanus reading. The decision ledger is deterministic,
with SHA-256 `478c7c6529ec4820a1bcd0844c9a14c70bce86eb991b55594c9cff79cd184e54`.

The remaining 137 cases comprise 28 ambiguous analyses and 109 forms with no
exact analysis. All lemma disagreements, single-morphology-source results, and
missing English lexical bridges have been resolved through additional explicit
rules; all 137 residual cases remain withheld.

### Adjudication rule VEA-001

A word initially separated by sequence alignment may be admitted as a
transposition only if exactly one unresolved Vaticanus word and exactly one
otherwise-unused TAGNT word in that verse share the same declared comparison
form. TAGNT must supply a contextual gloss and its lexical identifier must
resolve in TBESG. Order may differ; identity may not. Every admission and
withholding is recorded in `adjudication-ledger.json` with its rule identifier.

Ambiguous, one-to-many, many-to-one, substituted, or unresolved mappings are
withheld and entered in an exception ledger. Omitted and lacunose Vaticanus
cells receive no lexical gloss.

## Excluded evidence

OCR and AI image transcription are excluded from certification. No vetted,
machine-readable Parker/Heinfetter transcription is available, so Parker is not
an input or comparison source in this process.

## Certification claim

Passing this process permits the claim: “English lexical annotations are
reproducibly aligned to the INTF transcription of GA 03 and checked against
named scholarly lexical sources.” It does not constitute external peer review
or certify a continuous English translation of Codex Vaticanus.
