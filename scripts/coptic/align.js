'use strict';
/**
 * align.js
 * Aligns Coptic norm_group words to existing Greek alignment row IDs.
 *
 * Strategy (three passes, highest-confidence first):
 *
 * Pass 1 — Greek loanwords
 *   Coptic preserves Greek loanwords in Coptic script (lang="Greek" in TT data).
 *   We transliterate the Coptic lemma to Greek characters and compare against
 *   the Vaticanus text for each row (after stripping diacritics).
 *
 * Pass 2 — Proper names (NPROP)
 *   Transliterate the Coptic name text (after stripping Coptic-specific prefixes
 *   like ⲛ-, ⲙ-, ⲁ-) and match against Vaticanus proper nouns using Levenshtein
 *   distance (≤30% of length allowed).
 *
 * Pass 3 — Positional fallback
 *   Remaining unmatched Coptic words are assigned in order to remaining unmatched
 *   rows, skipping rows whose Vaticanus is 'empty' or 'lacuna'. These are flagged
 *   as draft (low confidence) for human review.
 *
 * Rows with no Coptic assignment get coptic: { type: 'empty' } if their
 * Vaticanus is a Greek article (ὁ/ἡ/τό/τόν etc.) or conjunction (δέ/καί),
 * which Coptic typically subsumes into morpheme prefixes.
 */

// ── Coptic→Greek character table (Coptic block U+2C80-U+2CFF → Greek) ──────
const C2G = {
  'ⲁ':'α','ⲃ':'β','ⲅ':'γ','ⲇ':'δ','ⲉ':'ε','ⲍ':'ζ','ⲏ':'η',
  'ⲑ':'θ','ⲓ':'ι','ⲕ':'κ','ⲗ':'λ','ⲙ':'μ','ⲛ':'ν','ⲝ':'ξ',
  'ⲟ':'ο','ⲡ':'π','ⲣ':'ρ','ⲥ':'σ','ⲧ':'τ','ⲩ':'υ','ⲫ':'φ',
  'ⲭ':'χ','ⲯ':'ψ','ⲱ':'ω',
  // uppercase
  'Ⲁ':'α','Ⲃ':'β','Ⲅ':'γ','Ⲇ':'δ','Ⲉ':'ε','Ⲍ':'ζ','Ⲏ':'η',
  'Ⲑ':'θ','Ⲓ':'ι','Ⲕ':'κ','Ⲗ':'λ','Ⲙ':'μ','Ⲛ':'ν','Ⲝ':'ξ',
  'Ⲟ':'ο','Ⲡ':'π','Ⲣ':'ρ','Ⲥ':'σ','Ⲧ':'τ','Ⲩ':'υ','Ⲫ':'φ',
  'Ⲭ':'χ','Ⲯ':'ψ','Ⲱ':'ω',
};

// Normalized (accent-stripped) Greek articles and conjunctions.
// Coptic typically subsumes articles into morpheme prefixes (ⲛ-/ⲙ-/ⲡ-/ⲧ-)
// and conjunctions are matched in Pass 1 as Greek loanwords (ⲇⲉ, ⲕⲁⲓ, etc.).
// Rows in either set are excluded from the Pass 3 positional fallback and
// marked { type: 'empty' } in the output when unassigned.
const GREEK_FILLERS_NORM = new Set([
  // definite articles (all genders/cases)
  'ο','η','το','τον','την','του','της','τω','τη','τα','τους','τας','των','τοις','ταις',
  // common conjunctions subsumed or handled by Pass 1
  'δε','και','γαρ','αλλα','ουν',
  // 3rd-person possessive pronouns (genitive): systematically incorporated into
  // Coptic morpheme prefixes (ⲡⲉϥ-/ⲧⲉϥ-/ⲛⲉϥ- sg, ⲛⲉⲩ- pl) and never appear
  // as standalone Coptic words
  'αυτου','αυτης','αυτων',
]);

// Keep GREEK_ARTICLES as an alias used by populate.js (legacy export)
const GREEK_ARTICLES = GREEK_FILLERS_NORM;

function copticToGreekStr(s) {
  return s.toLowerCase().split('').map(c => C2G[c] ?? c).join('');
}

function stripDiacritics(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function normGreek(s) {
  // Strip diacritics + keep only Greek letter range
  return stripDiacritics(s).replace(/[^α-ως]/g, '');
}

function normCopticAsGreek(s) {
  return normGreek(copticToGreekStr(s));
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      row[j] = a[i-1] === b[j-1] ? prev : 1 + Math.min(prev, row[j], row[j-1]);
      prev = tmp;
    }
  }
  return row[n];
}

// Strip only genuine Coptic grammatical prefixes from a proper name before matching.
// ⲛⲓ-/ⲛ- (definite genitive), ⲙⲡ-/ⲙ- (before b/p), ⲉ- (dative).
// Crucially does NOT strip standalone vowels (ⲁ, ⲓ, ⲉ) that are part of the name itself
// (e.g., ⲓⲁⲕⲱⲃ, ⲁⲃⲣⲁϩⲁⲙ).
const NAME_PREFIX = /^(ⲛⲓ?|ⲙⲡ?|ⲉ(?=[ⲃ-ⲱ]))/;

/**
 * @param {import('./parse-tt').CopticWord[]} copticWords
 * @param {object[]} rows - AlignmentRow objects from verse JSON
 * @returns {Map<string, {word, confidence: 'high'|'low', method: string}>} rowId → assignment
 */
function alignWords(copticWords, rows) {
  const assignments = new Map(); // rowId → {word, confidence, method}
  const usedWords   = new Set(); // indices of used copticWords

  // Pre-build normalized Vaticanus text map: normText → [{rowId, row}]
  const vatNormMap = new Map();
  for (const row of rows) {
    if (row.vaticanus?.type !== 'text') continue;
    const norm = normGreek(row.vaticanus.text);
    if (!norm) continue;
    if (!vatNormMap.has(norm)) vatNormMap.set(norm, []);
    vatNormMap.get(norm).push(row.id);
  }

  function firstAvailableRow(normCandidates) {
    for (const norm of normCandidates) {
      const rowIds = vatNormMap.get(norm) ?? [];
      for (const rid of rowIds) {
        if (!assignments.has(rid)) return rid;
      }
    }
    return null;
  }

  // ── Pass 1: Greek loanwords ──────────────────────────────────────────────
  copticWords.forEach((word, wi) => {
    if (usedWords.has(wi) || word.lang !== 'Greek') return;

    const asGreek = normCopticAsGreek(word.lemma);
    if (asGreek.length < 2) return;

    // Build candidate normalizations: exact, then with sigma variant
    const candidates = [asGreek, asGreek.replace(/σ/g, 'ς'), asGreek.replace(/ς/g, 'σ')];

    // Try exact match on normalized text
    const rid = firstAvailableRow(candidates);
    if (rid) {
      assignments.set(rid, { word, confidence: 'high', method: 'greek-loanword' });
      usedWords.add(wi);
      return;
    }

    // Try substring / partial: if the lemma is 3+ chars and appears inside a Greek word
    if (asGreek.length >= 3) {
      for (const row of rows) {
        if (assignments.has(row.id)) continue;
        if (row.vaticanus?.type !== 'text') continue;
        const vatNorm = normGreek(row.vaticanus.text);
        if (vatNorm.includes(asGreek) || asGreek.includes(vatNorm)) {
          assignments.set(row.id, { word, confidence: 'high', method: 'greek-loanword-partial' });
          usedWords.add(wi);
          return;
        }
      }
    }

    // Levenshtein fallback: catch case-ending differences (e.g., Coptic lemma λαος
    // vs Greek accusative λαον — same word, different inflection, 1 edit apart).
    // Only applied to lemmas of 4+ chars to avoid short-word false positives.
    if (asGreek.length >= 4) {
      let bestDist = Infinity, bestRid = null;
      for (const row of rows) {
        if (assignments.has(row.id)) continue;
        if (row.vaticanus?.type !== 'text') continue;
        const vatNorm = normGreek(row.vaticanus.text);
        if (vatNorm.length < 3) continue;
        const dist = levenshtein(asGreek, vatNorm);
        const threshold = Math.max(1, Math.floor(Math.min(asGreek.length, vatNorm.length) * 0.25));
        if (dist <= threshold && dist < bestDist) {
          bestDist = dist;
          bestRid = row.id;
        }
      }
      if (bestRid) {
        assignments.set(bestRid, { word, confidence: 'high', method: 'greek-loanword-fuzzy' });
        usedWords.add(wi);
        return;
      }
    }
  });

  // ── Pass 2: Proper names (NPROP) by transliteration ─────────────────────
  copticWords.forEach((word, wi) => {
    if (usedWords.has(wi) || word.pos !== 'NPROP') return;

    const rawText = word.text.replace(NAME_PREFIX, '');
    const asGreek = normCopticAsGreek(rawText.length >= 2 ? rawText : word.text);
    if (asGreek.length < 2) return;

    let bestRid = null;
    let bestDist = Infinity;

    for (const row of rows) {
      if (assignments.has(row.id)) continue;
      if (row.vaticanus?.type !== 'text') continue;
      const vatNorm = normGreek(row.vaticanus.text);
      if (vatNorm.length < 2) continue;

      const dist = levenshtein(asGreek, vatNorm);
      // 0.4 threshold: allows for one case-ending difference (e.g., -ας vs -αν)
      // plus one missing article prefix (ι- stripped from Iakōb → akōb vs iakōb)
      const threshold = Math.max(1, Math.floor(Math.min(asGreek.length, vatNorm.length) * 0.4));

      if (dist <= threshold && dist < bestDist) {
        bestDist = dist;
        bestRid = row.id;
      }
    }

    if (bestRid) {
      assignments.set(bestRid, { word, confidence: 'high', method: 'proper-name' });
      usedWords.add(wi);
    }
  });

  // ── Pass 3: Positional fallback ──────────────────────────────────────────
  // Skip rows that are articles/conjunctions (Coptic subsumes these into morphemes)
  const remainingWords = copticWords.filter((_, i) => !usedWords.has(i));
  const remainingRows  = rows.filter(r => {
    if (assignments.has(r.id)) return false;
    if (r.vaticanus?.type === 'empty' || r.vaticanus?.type === 'lacuna') return false;
    const vatText = r.vaticanus?.type === 'text' ? r.vaticanus.text : '';
    // Normalize accents before checking: τὸν (grave) must match τον (normalized)
    if (GREEK_FILLERS_NORM.has(normGreek(vatText.replace(/[.,;·]/g, '')))) return false;
    return true;
  });

  const toAlign = Math.min(remainingWords.length, remainingRows.length);
  for (let i = 0; i < toAlign; i++) {
    assignments.set(remainingRows[i].id, {
      word: remainingWords[i],
      confidence: 'low',
      method: 'positional',
    });
  }

  return assignments;
}

module.exports = { alignWords, GREEK_ARTICLES };
