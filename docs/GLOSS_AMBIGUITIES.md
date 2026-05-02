# Gloss Import Ambiguities

Known issues and decisions for the `scripts/import-glosses.js` pipeline.

---

## Greek witnesses (papyrus, vaticanus, sinaiticus, byzantine)

### TAGNT/TBESG position matching

The pipeline matches TAGNT words to alignment rows by **word position**, not by surface form.
The vaticanus cell drives the counter: the counter advances only when vaticanus has a `type: 'text'` cell.
Empty/lost vaticanus cells (alignment gaps, physical lacunae) do not advance the counter.

**Implication:** TAGNT must cover the same verse reference and word count as our alignment.
If a verse is attested differently in NA28 vs. Byzantine (e.g., a variant in Mark 1:1), the word
count may differ and the position match will break. Flag such verses for manual review.

**Verified correct for:**
- Matthew 1:1 (8 TAGNT words = 8 alignment rows)
- Mark 1:1 (7 TAGNT words = 7 alignment rows)
- Luke 1:1 (11 TAGNT words, 12 rows — 1 gap row "sunt" correctly skipped)
- John 1:1 (17 TAGNT words, 20 rows — 3 gap rows correctly skipped)

### Nomina sacra cells

Nomina sacra cells show the contraction (ΙΥ, ΧΥ, ΘΥ, ΘΝ, ΘΣ) but the TAGNT records the full
expanded form. The pipeline uses position matching so the text content is not compared —
the correct gloss is assigned by position regardless of contraction or full form.
No special handling needed.

### Byzantine variants

TAGNT aligns primarily to NA28. Some Byzantine variants differ in word choice (e.g., `Δαβίδ` vs
`Δαυίδ` in Mat 1:6). The pipeline assigns the same TAGNT gloss to the Byzantine cell even when
the Byzantine form differs slightly in spelling. For variants that change the lexeme itself,
mark the Byzantine gloss with `"deviation": true` and supply the correct TBESG gloss manually.

---

## Latin witness (vulgate)

### DICTLINE.GEN: lemmas only

DICTLINE.GEN stores dictionary headwords (lemmas), not inflected forms. The Whitaker's Words
program uses a separate morphological engine to strip inflections before lookup. This pipeline
performs **exact lemma matching only**. Most inflected forms will fail to match and are reported
as warnings. Known failures for proof verses:

| Inflected form | Headword | Issue |
|---|---|---|
| `generationis` | `generatio` | gen. sg. ending |
| `Iesu` | `Iesus` | gen. sg. of Greek name |
| `Christi` | `Christus` | gen. sg. |
| `filii` / `Filii` | `filius` | gen. sg. |
| `evangelii` | `evangelium` | gen. sg. |
| `ordinare` | `ordino` | infinitive |
| `narrationem` | `narratio` | acc. sg. |
| `completarum` | `completo` | gen. pl. pf. part. |
| `quidem` | `quidem` | indeclinable particle ✓ (may be in DICTLINE) |
| `principio` | `principium` | abl. sg. |
| `erat` | `sum` | imperfect 3sg (irregular) |
| `apud` | `apud` | indeclinable prep ✓ |

**Resolution:** The pipeline warns on all failures. For proof verses, use the Douay-Rheims
translation to supply glosses manually and set `source: "DouayRheims"`.

### Proper nouns in Vulgate

Proper names (David, Abraham, Iesu, Christi) are rarely in DICTLINE with useful glosses.
Assign these manually with `source: "DouayRheims"` or use the Greek/Syriac form as guidance.

---

## Syriac witness (peshitta)

### Payne Smith TSV: proof verses only

The `data/sources/peshitta/payne-smith-proof-verses.tsv` covers only the 26 unique Syriac
tokens appearing in Matthew 1:1, Mark 1:1, Luke 1:1, and John 1:1. For non-proof verses, the
TSV lookup will miss all tokens and the pipeline will warn. Extend the TSV or add CAL lookups
for scale.

### Prefixed forms

Syriac tokens in the alignment often carry grammatical prefixes (ܕ-, ܒ-, ܠ-, ܘ-). These are
stored as single tokens in the JSON (e.g., ܕܝܫܘܥ, ܒܪܫܝܬ) and must be listed in the TSV as
**complete tokens including prefixes**, not just the lemma. The TSV entries do include the
prefixed forms where they appear in the data.

### Compound tokens

John 1:1 row 20 has `ܗܘ ܡܠܬܐ` as a single Peshitta cell (two Syriac words written as one
token in our data). The TSV has a single entry for this compound. This is intentional — the
Peshitta here expresses the subject-predicate structure differently from Greek.

---

## Earliest Papyrus column

### Coverage gaps

For papyrus rows where `type: 'lost'`, no gloss is assigned (correct — there is no text).
For `type: 'extant'` rows, the pipeline uses the same TAGNT position as vaticanus.
The TBESG gloss is the same for both (they share the lexeme) unless the papyrus shows a
significant variant — in which case, flag and fix manually.

---

## GlossSource selection guide

| Witness | Default source | Override for proper nouns | Override for variants |
|---|---|---|---|
| Earliest Papyrus | `TAGNT` | manual + `TAGNT` | `TAGNT` with `deviation: true` |
| Vaticanus | `TAGNT` | `TAGNT` | `TAGNT` |
| Sinaiticus | `TAGNT` | `TAGNT` | `TAGNT` |
| Vulgate | `Whitaker` | `DouayRheims` | `LewisShort` |
| Peshitta | `PayneSmith` | `PayneSmith` | `CAL` with `deviation: true` |
| Byzantine | `TAGNT` | `TAGNT` | `TAGNT` with `deviation: true` |

---

## Alignment-orphan glosses

Rows where a witness has `type: 'empty'` (alignment gap) receive no gloss.
Rows where a witness has `type: 'lost'` or `type: 'lacuna'` receive no gloss.
If you ever need to indicate in the GLOSS column that a word is absent, use
`source: 'alignment-orphan'` with `gloss: '—'` (em-dash). The component renders
this as a dash in the gloss cell.
