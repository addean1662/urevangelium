# Urevangelium English Plausibility Engine

## Purpose

The engine ranks possible English lexical annotations for a word already
transcribed in a particular witness or tradition. It never supplies witness
text, never transfers English from another column, and never certifies a result
solely from a probability.

## Non-negotiable boundaries

1. The governing transcription for the target column is always the first input.
2. Another Greek column may corroborate a Greek lemma, form, construction, or
   alignment. Its English annotation is not an input feature.
3. A translation explicitly derived from the target witness may be used as an
   interpretation witness, with translator, edition, date, and dependency
   recorded.
4. Ancient-version columns are comparative textual evidence. Their English
   annotations never cross into the target column.
5. OCR and AI image transcription are excluded.
6. AI probabilities are advisory. Certification is decided by explicit source
   and convergence rules after the probability is calculated.

## Evidence families

Correlated sources are grouped and capped so they cannot outvote independent
evidence by repetition.

| Family | Examples | Permitted claim |
|---|---|---|
| Target transcription | INTF and CNTR for GA 03 | Letters, word division, hand, damage, correction, lacuna |
| Morphology | MorphGNT, PROIEL, Tischendorf morphology, Morpheus | Lemma and grammatical possibilities |
| Historical lexicography | LSJ and cited ancient usages | Attested semantic range through time |
| NT lexicography | TBESG/corrected Abbott-Smith family | Koine/NT semantic range |
| Same-language corroboration | Matching Greek in Sinaiticus, Byzantine, papyri, or Bezae | Greek lexical or syntactic identity only |
| Target-witness translations | Identified translations based on Vaticanus | A scholar's interpretation of the target reading |
| Classical translations | Published translations of LSJ-cited passages | Contextual evidence that a proposed sense was used |
| Syntax and discourse | Target clause, dependencies, morphology | Compatibility of a candidate meaning with its context |

## Candidate record

Every candidate has:

- target witness and exact diplomatic form;
- normalized comparison form, with every transformation named;
- proposed lemma, morphology, and English gloss;
- supporting and contradicting evidence by dependency family;
- source versions and SHA-256 hashes;
- deterministic plausibility score;
- optional AI probability and stored structured response;
- calibrated probability;
- status: `certified`, `generated-provisional`, or `withheld`;
- rule and immutable decision hash.

## Deterministic score

The first model is an interpretable logistic score. Features are signed and
dependency-capped. Examples include independent transcription agreement,
unique lemma agreement, compatible inflection, lexicon-sense agreement,
same-Greek corroboration, target-translation agreement, source damage, partial
word markup, competing lemmas, and syntactic contradiction. Feature values and
weights are published with every result.

The score ranks candidates. It does not certify them.

## Optional AI adjudicator

The AI receives only the structured dossier and the finite candidate list. It
must return JSON containing a probability for every candidate, an abstention
probability, evidence used, counterevidence, and dependency warnings. It may not
invent a new manuscript reading or omit a candidate. Model identifier, prompt
version, response, and response hash are retained.

The AI distribution is an additional model output, not an evidence family.

## Calibration

Calibration uses cases excluded from model fitting:

1. stratified positive controls from the existing certified Vaticanus corpus;
2. alternative senses of the same lemma;
3. morphologically incompatible senses;
4. adjacent-word and similar-spelling distractors;
5. known textual variants and word-division cases;
6. damaged, partial, and currently withheld forms.

Results are reported with Brier score, multiclass log loss, top-one accuracy,
coverage at each abstention threshold, and reliability bins. Calibration is
reported separately for ordinary forms, orthographic variants, proper names,
fragments/damage, and substantive textual differences.

No threshold is described as certainty. A value such as 0.97 means that among
comparable held-out cases assigned approximately 0.97, about 97 percent were
correct under the recorded gold decisions.

## Certification gate

Probability never replaces the gate. Certification additionally requires:

- the target transcription is settled for the selected hand;
- one lexical identity survives all contradictory evidence;
- the proposed English belongs to that lemma's attested semantic range;
- morphology and target syntax permit the meaning;
- source dependencies are disclosed and not double-counted;
- no other tradition supplied the English;
- the complete dossier is reproducible from pinned sources.

Otherwise the word remains orange and provisional, or blank and withheld.
