'use strict';
// Fixes MISMATCH verses identified during QA inspection (batch 2).
//
// Verses:
//  john/5/4    — interpolated verse; P45/P66/P75 all skip it → set all rows to lost
//  luke/6/36   — P45+P75 lack Vat "οὖν" (r2), P75 also lacks Vat "καὶ" (r5);
//                data was shifted 1 row forward from r2 with trailing dup at r9-r10
//  john/16/29  — P66 words misaligned at r4-r6 (word4 at r4, should be word3);
//                P66 over-extended into r7-r14 (P66 has only 5 words total)
//
// INTF verification:
//  P45 john B04K5V4 — no key (skips verse)
//  P66 john B04K5V4 — returns v5 content (P66 skips v4 interpolation)
//  P75 john B04K5V4 — no key (skips verse)
//  P45 luke B03K6V36 — ["γινεσθε","οικτειρμονες","καθως","και","ο","πρ","υμων","οικτειρμων","εστιν"] (9 words)
//  P75 luke B03K6V36 — ["γεινεσθε","οικτειρμονες","καθωςοπατηρυμων","οικτειρμων","εστιν·"] (8 words after split)
//  P66 john B04K16V29 — ["λεγουσιν","οι","μαθηται","αυτου","ιδε"] (5 words)
//
// Run: node scripts/fix-mismatch-batch2.js [--apply]

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const DRY  = !process.argv.includes('--apply');

function readVerse(gospel, chapter, verse) {
  const fp = path.join(DATA, gospel, String(chapter), `${verse}.json`);
  return { fp, data: JSON.parse(fs.readFileSync(fp, 'utf8')) };
}

function save(fp, data) {
  if (DRY) return;
  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function log(msg) { console.log(msg); }

// ─────────────────────────────────────────────────────────
// JOHN 5:4 — Angel-stirring-water interpolation (doubly-bracketed)
// P45/P66/P75 all skip this verse. P66 INTF B04K5V4 returns John 5:5 content.
// P45 and P75 have no B04K5V4 key at all in the INTF cache.
{
  const { fp, data } = readVerse('john', 5, 4);
  let count = 0;
  for (const row of data.rows) {
    if (row.papyrus && row.papyrus.type !== 'lost') {
      row.papyrus = { type: 'lost' };
      count++;
    }
  }
  log(`${DRY ? 'WOULD' : 'DID'} set john/5/4 all ${count} rows → papyrus lost (P45/P66/P75 skip interpolated v4)`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// LUKE 6:36 — Fix 1-row displacement (both P45 and P75 lack Vat "οὖν")
//
// Vaticanus (10 rows):
//   r1=Γίνεσθε r2=οὖν r3=οἰκτίρμονες r4=καθὼς r5=καὶ r6=ὁ r7=πατὴρ r8=ὑμῶν r9=οἰκτίρμων r10=ἐστίν.
//
// P45 INTF (9 words): γινεσθε οικτειρμονες καθως και ο πρ υμων οικτειρμων εστιν
//   → covers r1, r3-r10 (lacks Vat "οὖν" at r2)
//
// P75 INTF (8 words after splitting TEI concat): γεινεσθε οικτειρμονες καθως ο πρ (=πατηρ) υμων οικτειρμων εστιν
//   → covers r1, r3-r4, r6-r10 (lacks Vat "οὖν" at r2 AND "καὶ" at r5)
//
// Current (broken) state: data was shifted 1 row early from r2 onward, with
// trailing dup "εστιν"/"εστιν." at r9-r10.
//
// Per-row correct state:
//   r1:  [P45,P75] "γινεσθε"   (keep; minor spelling variant in P75)
//   r2:  empty                 (both lack Vat "οὖν")
//   r3:  [P45,P75] "οικτειρμονεσ"
//   r4:  [P45,P75] "καθωσ"
//   r5:  [P45]     "και"       (P75 lacks Vat "καὶ")
//   r6:  [P45,P75] "ο"
//   r7:  [P45,P75] "πρ"        (P45 nomina sacra; P75 writes "πατηρ" out but same word)
//   r8:  [P45,P75] "υμων"
//   r9:  [P45,P75] "οικτειρμων"
//   r10: [P45,P75] "εστιν."    (terminal punctuation added per convention)
{
  const { fp, data } = readVerse('luke', 6, 36);

  const P45 = { id: 'P45', date: 'c. 200–250 CE' };
  const P75 = { id: 'P75', date: 'c. 175–225 CE' };

  function gloss(row) {
    return row.vaticanus && row.vaticanus.gloss ? row.vaticanus.gloss : null;
  }

  const plan = [
    // idx 0, r1: keep as-is
    null,
    // idx 1, r2: empty (both P45 and P75 lack Vat "οὖν")
    { type: 'empty' },
    // idx 2, r3: [P45,P75] "οικτειρμονεσ"
    { type: 'extant', frags: [P45, P75], text: 'οικτειρμονεσ' },
    // idx 3, r4: [P45,P75] "καθωσ"
    { type: 'extant', frags: [P45, P75], text: 'καθωσ' },
    // idx 4, r5: [P45] only "και" — P75 lacks Vat "καὶ"
    { type: 'extant', frags: [P45], text: 'και' },
    // idx 5, r6: [P45,P75] "ο"
    { type: 'extant', frags: [P45, P75], text: 'ο' },
    // idx 6, r7: [P45,P75] "πρ" (nomina sacra for πατηρ; P45 attests πρ, P75 attests πατηρ)
    { type: 'extant', frags: [P45, P75], text: 'πρ' },
    // idx 7, r8: [P45,P75] "υμων"
    { type: 'extant', frags: [P45, P75], text: 'υμων' },
    // idx 8, r9: [P45,P75] "οικτειρμων"
    { type: 'extant', frags: [P45, P75], text: 'οικτειρμων' },
    // idx 9, r10: [P45,P75] "εστιν." — was trailing dup, now correctly final word
    { type: 'extant', frags: [P45, P75], text: 'εστιν.' },
  ];

  let changed = 0;
  for (let i = 1; i < plan.length; i++) {
    const p = plan[i];
    const row = data.rows[i];
    if (p.type === 'empty') {
      row.papyrus = { type: 'empty' };
    } else {
      row.papyrus = { type: 'extant', fragments: p.frags, text: p.text, gloss: gloss(row) };
    }
    changed++;
  }

  log(`${DRY ? 'WOULD' : 'DID'} fix luke/6/36 (${changed} rows): displacement + trailing dup`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// JOHN 16:29 — Fix P66 alignment at r4-r6 and remove P66 from r7-r14
//
// P66 INTF (5 words): λεγουσιν οι μαθηται αυτου ιδε
// Mapping: r1=word1, r2=empty(P66 lacks Vat "αὐτῷ"), r3=word2, r4=word3, r5=word4, r6=word5
// r7-r14: P66 has no more words; should not appear in fragments
//
// Current broken state: r4 text="αυτου" (word4), r5="ιδε" (word5), r6="νυν" (wrong);
// P66 still listed in r7-r14 fragment arrays.
{
  const { fp, data } = readVerse('john', 16, 29);

  let changed = 0;

  // Fix r4-r6 texts (indices 3-5)
  // r4 (idx 3): P66 word 3 = "μαθηται" (aligns with Vat "μαθηταὶ")
  // r5 (idx 4): P66 word 4 = "αυτου" (aligns with Vat "αὐτοῦ·")
  // r6 (idx 5): P66 word 5 = "ιδε" (aligns with Vat "ἴδε")
  const textFixes = [
    [3, 'μαθηται'],
    [4, 'αυτου'],
    [5, 'ιδε'],
  ];
  for (const [idx, newText] of textFixes) {
    const row = data.rows[idx];
    if (row.papyrus.type === 'extant' && row.papyrus.text !== newText) {
      log(`  r${idx + 1}: text "${row.papyrus.text}" → "${newText}"`);
      row.papyrus.text = newText;
      changed++;
    }
  }

  // Remove P66 from r7-r14 fragments (indices 6-13; r13 is already empty)
  for (let i = 6; i <= 13; i++) {
    const row = data.rows[i];
    if (!row || !row.papyrus || row.papyrus.type !== 'extant') continue;
    const before = row.papyrus.fragments.length;
    row.papyrus.fragments = row.papyrus.fragments.filter(f => f.id !== 'P66');
    if (row.papyrus.fragments.length < before) {
      changed++;
    }
  }

  log(`${DRY ? 'WOULD' : 'DID'} fix john/16/29 (${changed} changes): P66 text r4-r6, P66 removed r7-r14`);
  save(fp, data);
}

console.log('');
console.log(DRY ? 'Dry run — pass --apply to write changes.' : 'Done.');
