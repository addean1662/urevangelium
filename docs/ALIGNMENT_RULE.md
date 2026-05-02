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

## Lacuna vs. Empty Cell Distinction

| Symbol | Meaning |
|--------|---------|
| `—` (em-dash) | The language has no word for this propositional unit (alignment gap) |
| Red dots (·····) | The manuscript is physically damaged or not extant for this passage |

These must not be confused. An empty dash is an editorial decision; red dots are a physical fact about the manuscript.

---

## Nomina Sacra Rule

Nomina sacra contractions (ΘΣ, ΚΣ, ΙΣ, ΧΣ, ΠΝΑ, etc.) are **displayed as they appear in the manuscript** (the contraction form), with hover-expansion to the full Greek word. They are never silently expanded in display.

---

## Scope

This rule applies to all six witnesses and all four Gospels (Matthew, Mark, Luke, John). It supersedes morphological alignment, syntactic parsing alignment, and word-count balancing.

---

*This document is an architectural lock. Changes require an explicit decision record.*
