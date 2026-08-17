'use strict';
/**
 * build-crum-lookup.js
 *
 * Parses the KELLIA Comprehensive Coptic Lexicon TEI XML and produces a
 * JSON lookup table: Coptic Unicode lemma → English gloss.
 *
 * Source: KELLIA/dictionary — Comprehensive_Coptic_Lexicon-v1.2-2020.xml
 * License: CC BY-SA 4.0 — attribute as:
 *   "Coptic glosses from the KELLIA Comprehensive Coptic Lexicon /
 *    coptic-dictionary.org (CC BY-SA 4.0)"
 *
 * Output: scripts/coptic/crum-lookup.json
 *   { "<lemma>": "<first English gloss>", ... }
 *
 * Usage:
 *   node scripts/coptic/build-crum-lookup.js
 */

const fs   = require('fs');
const path = require('path');

const XML_PATH  = path.join(__dirname, 'kellia-lexicon.xml');
const OUT_PATH  = path.join(__dirname, 'crum-lookup.json');

if (!fs.existsSync(XML_PATH)) {
  console.error(`KELLIA XML not found at ${XML_PATH}`);
  console.error('Download it from https://github.com/KELLIA/dictionary/tree/master/xml');
  process.exit(1);
}

console.log('Reading KELLIA XML…');
const xml = fs.readFileSync(XML_PATH, 'utf8');

// ── Extract all <entry> blocks ───────────────────────────────────────────────
// The file is ~12 MB — regex over the full string is fast enough.

const lookup = {};   // lemma → first English gloss
let entries = 0;
let glossed = 0;

// Match each <entry …>…</entry> block
const entryRe = /<entry\b[^>]*>([\s\S]*?)<\/entry>/g;
let em;

while ((em = entryRe.exec(xml)) !== null) {
  entries++;
  const block = em[1];

  // ── Collect Sahidic lemma forms ──────────────────────────────────────────
  // Prefer <form type="lemma"> with <usg type="geo">S</usg>, fall back to any
  // <form type="lemma"> if no Sahidic-specific form exists.
  const formRe = /<form\b([^>]*)>([\s\S]*?)<\/form>/g;
  let fm;
  const sahidicLemmas = [];
  const allLemmas     = [];

  while ((fm = formRe.exec(block)) !== null) {
    const formAttrs    = fm[1];
    const formContent  = fm[2];
    if (!formAttrs.includes('type="lemma"')) continue;

    const orthM = formContent.match(/<orth>([\s\S]*?)<\/orth>/);
    if (!orthM) continue;

    const lemma = orthM[1].trim().replace(/-$/, ''); // strip trailing hyphen
    if (!lemma) continue;

    const isSahidic = /<usg\s[^>]*type="geo"[^>]*>\s*S\s*<\/usg>/.test(formContent);
    allLemmas.push(lemma);
    if (isSahidic) sahidicLemmas.push(lemma);
  }

  const lemmas = sahidicLemmas.length > 0 ? sahidicLemmas : allLemmas;
  if (lemmas.length === 0) continue;

  // ── Extract first English gloss ──────────────────────────────────────────
  const enQuoteM = block.match(/<quote\s[^>]*xml:lang="en"[^>]*>([\s\S]*?)<\/quote>/);
  if (!enQuoteM) continue;

  const gloss = enQuoteM[1].trim().replace(/\s+/g, ' ');
  if (!gloss) continue;

  // Register all lemma forms for this entry
  for (const lemma of lemmas) {
    if (!lookup[lemma]) {
      lookup[lemma] = gloss;
      glossed++;
    }
  }
}

console.log(`Processed ${entries} entries → ${glossed} Coptic lemmas with English glosses`);

fs.writeFileSync(OUT_PATH, JSON.stringify(lookup, null, 2), 'utf8');
console.log(`Written: ${OUT_PATH} (${Object.keys(lookup).length} entries)`);
