# Alignment Rule

## Primary Rule: Propositional Content (Semantic Contribution)

Alignment in Urevangelium is governed by **propositional content** — the semantic contribution a word makes to the meaning of the clause — not by morphological form, word order, or syntactic category.

Two words in different witnesses align on the same row if and only if they carry **the same propositional role** in their respective clause structures. A Greek participle, a Latin ablative absolute, and a Syriac verb form align when they express the same proposition, regardless of how different their grammatical packaging is.

### Consequences of this rule

- A Greek definite article (τοῦ, τόν, ὁ, etc.) that has no morphological counterpart in Latin or Syriac **gets its own row** with dashes in the Latin and Syriac columns. It is not folded into the noun row, because the article itself carries a propositional contribution in Greek.
- A Syriac enclitic particle or a Latin connective with no cross-witness equivalent **gets its own row** with dashes in every other column.
- Some cells will be **empty (dashes)** when a language cannot express a given propositional unit with a discrete word. This is intentional editorial information: the empty cell is the scholar's read-across signal showing exactly where each tradition adds, omits, or differs.

---

## Word-Row Rule (derived from ProtoVorlage)

> **Every word from every column gets its own row. Equivalent words across columns land on the same row.**

This is stated precisely:

1. For each witness, every space-separated token (word) occupies exactly one row.
2. If a word in witness A corresponds semantically to a word in witness B, they share a row.
3. If a word in witness A has no semantic counterpart in any other witness, it occupies its own row with dashes (`—`) in every other column.
4. If a language expresses one semantic unit as multiple words (e.g., a Latin compound verb *conati sunt* for one Greek verb), each word gets its own row. The second word's row has dashes in all columns except the one that uses it.

### Example: "Ἐν ἀρχῇ" (John 1:1)

Greek has two words; Syriac has one (ܒܪܫܝܬ, *b-reshit*, "in-the-beginning"). The alignment is:

| Row | Papyrus | Vaticanus | Sinaiticus | Vulgate | Peshitta | Byzantine |
|-----|---------|-----------|------------|---------|----------|-----------|
| 1 | Ἐν | Ἐν | Ἐν | In | — | Ἐν |
| 2 | ἀρχῇ | ἀρχῇ | ἀρχῇ | principio | ܒܪܫܝܬ | ἀρχῇ |

The Syriac word is placed on row 2 (the semantic head, "beginning"). Row 1 has a dash in the Syriac column because the prepositional force is incorporated into the Syriac word as a prefix.

---

## Structural Guide and Transposition Rule

The table requires one shared visual row sequence. **Vaticanus (GA 03) is the primary structural guide** because it is an early, Greek, nearly complete Gospel witness. This is an alignment function only: Vaticanus never supplies, reconstructs, corrects, or selects the displayed wording of another witness.

1. Align each source token to the row carrying the same propositional contribution, even when its spelling, inflection, syntax, or manuscript position differs from Vaticanus.
2. Preserve each witness's source-token order in provenance. A transposed word is aligned to its semantic row and explicitly recorded as a transposition; it is not silently reordered as though the witness followed Vaticanus.
3. When Vaticanus lacks the relevant contribution or is itself uncertain, use Sinaiticus and Byzantine as corroborating or fallback Greek guides. TAGNT may assist lexical identification and glossing but is not a manuscript witness and cannot supply displayed text.
4. Create a new row only for a source token that makes a genuine additional propositional contribution for which no existing row is available. Surface-form mismatch, a displaced word, or a wider alignment interval is not sufficient evidence for a new row.
5. Every source token must be represented exactly once. Missing tokens, duplicate use, and out-of-order source-token mappings are validation failures unless the last is explicitly recorded as an attested transposition.
6. For the Earliest Papyrus composite, only papyrus transcriptions determine the displayed reading. The established earliest-dated/tie-breaker rule governs disagreements among papyri; no guide column may break a papyrus-reading disagreement.

The guide hierarchy controls row location, not textual authority. Each column remains governed by its own declared source and editorial rules.

---

## Lacuna vs. Empty Cell Distinction

| Symbol | Meaning |
|--------|---------|
| `—` (em-dash) | The language has no word for this propositional unit (alignment gap) |
| Red dots (·····) | The manuscript is physically damaged or not extant for this passage |

These must not be confused. An empty dash is an editorial decision; red dots are a physical fact about the manuscript.

CNTR character damage (`%`) is not equivalent to loss: traces of the character remain, and a readable word may be displayed with a `damaged` label. CNTR missing (`^`) and supplied (`~` or supplied `+`) characters remain explicitly distinguished from physically extant characters.

---

## Nomina Sacra Rule

Nomina sacra contractions (ΘΣ, ΚΣ, ΙΣ, ΧΣ, ΠΝΑ, etc.) are **displayed as they appear in the manuscript** (the contraction form), with hover-expansion to the full Greek word. They are never silently expanded in display.

---

## Scope

This rule applies to all six witnesses and all four Gospels (Matthew, Mark, Luke, John). It supersedes morphological alignment, syntactic parsing alignment, and word-count balancing.

---

*This document is an architectural lock. Changes require an explicit decision record.*
