'use strict';
// Fixes DISPLACEMENT and text-variant MISMATCH cases (batch 5).
//
// DISPLACEMENT — papyrus starts too early; remove from leading N extant rows:
//  matthew/26/7  [P64+P67]: 5 extant words; INTF has last 3 → remove first 2 extant rows
//  matthew/26/10 [P64+P67]: 11 extant words; INTF has last 6 → remove first 2 extant rows
//  mark/1/16     [P137]:    8 extant words; INTF has last 7 → remove first 1 extant row
//  luke/12/42    [P45]:     26 extant words; INTF has last 1 → remove first 25 extant rows
//  john/6/17     [P28]:     14 extant words; INTF has last 9 → remove first 5 extant rows
//
// TEXT VARIANTS:
//  luke/9/55  [P75]: r3 text "επετειμησεν" → "επετιμησεν" (INTF confirmed)
//  john/14/25 [P75]: r3 "υμειν"→"υμιν", r5 "υμειν"→"υμιν" (INTF confirmed)
//
// Run: node scripts/fix-batch5-displacement.js [--apply]

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

// Remove fragId from the first N extant rows that contain it.
// Returns count of rows actually changed.
function removeLeadingExtant(data, fragId, leadingCount) {
  let removed = 0;
  for (const row of data.rows) {
    if (removed >= leadingCount) break;
    if (row.papyrus?.type !== 'extant') continue;
    if (!row.papyrus.fragments?.some(f => f.id === fragId)) continue;
    const before = row.papyrus.fragments.length;
    row.papyrus.fragments = row.papyrus.fragments.filter(f => f.id !== fragId);
    if (row.papyrus.fragments.length < before) {
      if (row.papyrus.fragments.length === 0) row.papyrus = { type: 'lost' };
      removed++;
    }
  }
  return removed;
}

// ─────────────────────────────────────────────────────────
// MATTHEW 26:7 [P64+P67] — INTF ["κεφαλης","αυτου","ανακειμενου"] → last 3 words
// Remove P64+P67 from first 2 extant rows ("επι","τησ")
{
  const { fp, data } = readVerse('matthew', 26, 7);
  const n = removeLeadingExtant(data, 'P64+P67', 2);
  log(`${DRY ? 'WOULD' : 'DID'} matthew/26/7: removed P64+P67 from ${n} leading extant rows`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// MATTHEW 26:10 [P64+P67] — INTF has 6 words starting at "κοπους"
// Remove P64+P67 from first 2 extant rows ("αυτοισ","τι")
{
  const { fp, data } = readVerse('matthew', 26, 10);
  const n = removeLeadingExtant(data, 'P64+P67', 2);
  log(`${DRY ? 'WOULD' : 'DID'} matthew/26/10: removed P64+P67 from ${n} leading extant rows`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// MARK 1:16 [P137] — INTF ["αμφιβαλλοντας",...] → 7 words starting at r19
// Remove P137 from first 1 extant row ("σιμωνοσ" at r18)
{
  const { fp, data } = readVerse('mark', 1, 16);
  const n = removeLeadingExtant(data, 'P137', 1);
  log(`${DRY ? 'WOULD' : 'DID'} mark/1/16: removed P137 from ${n} leading extant row (σιμωνοσ)`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// LUKE 12:42 [P45] — INTF ["σιτομετριον"] → last 1 word only
// Remove P45 from first 25 extant rows (keeps only "σιτομετριον")
{
  const { fp, data } = readVerse('luke', 12, 42);
  const n = removeLeadingExtant(data, 'P45', 25);
  log(`${DRY ? 'WOULD' : 'DID'} luke/12/42: removed P45 from ${n} leading extant rows; keeps P45 at last word "σιτομετριον"`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// JOHN 6:17 [P28] — INTF ["και","σκοτια","ηδη","εγεγονει","και","ουπω","προς","αυτους","εληλυθει","ο","ις"] → last 9 words
// Remove P28 from first 5 extant rows ("περαν","τησ","θαλασσησ","εισ","καφαρναουμ")
{
  const { fp, data } = readVerse('john', 6, 17);
  const n = removeLeadingExtant(data, 'P28', 5);
  log(`${DRY ? 'WOULD' : 'DID'} john/6/17: removed P28 from ${n} leading extant rows; keeps P28 at "και σκοτια..." onward`);
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// LUKE 9:55 [P75] — Fix r3 text "επετειμησεν" → "επετιμησεν"
// INTF P75 word: "επετιμησεν" (without the ε diphthong before ι)
{
  const { fp, data } = readVerse('luke', 9, 55);
  const row = data.rows[2]; // r3 = index 2
  if (row.papyrus?.type === 'extant' && row.papyrus.text === 'επετειμησεν') {
    row.papyrus.text = 'επετιμησεν';
    log(`${DRY ? 'WOULD' : 'DID'} luke/9/55: r3 "επετειμησεν" → "επετιμησεν"`);
  } else {
    log(`SKIP luke/9/55 r3: unexpected text "${row.papyrus?.text}"`);
  }
  save(fp, data);
}

// ─────────────────────────────────────────────────────────
// JOHN 14:25 [P75] — Fix "υμειν" → "υμιν" (INTF uses iota, not ει diphthong)
// Affects r3 and r5 of the verse
{
  const { fp, data } = readVerse('john', 14, 25);
  let changed = 0;
  for (const row of data.rows) {
    if (row.papyrus?.type === 'extant' && row.papyrus.text === 'υμειν') {
      row.papyrus.text = 'υμιν';
      changed++;
    }
  }
  log(`${DRY ? 'WOULD' : 'DID'} john/14/25: changed ${changed} row(s) "υμειν" → "υμιν"`);
  save(fp, data);
}

console.log('');
console.log(DRY ? 'Dry run — pass --apply to write changes.' : 'Done.');
