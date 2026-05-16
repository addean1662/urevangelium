// @ts-check
// Build a coverage index from all CNTR papyrus source files.
// Usage: node scripts/build-papyrus-index.js
// Output: data/sources/earliest-papyrus/coverage-index.json
//
// The index has two shapes:
//   papyri[]  — per-papyrus list of covered verses
//   byVerse   — gospel → chapter → verse → [siglum, ...]
//
// This tells the alignment pipeline which verse cells can be "extant"
// rather than "lost" for the Earliest Papyrus column.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'data', 'sources', 'earliest-papyrus');
const OUT  = path.join(SRC, 'coverage-index.json');

// CNTR book codes → gospel slugs (Gospels only; Acts etc. are filtered out)
const BOOK_CODE = {
  '40': 'matthew',
  '41': 'mark',
  '42': 'luke',
  '43': 'john',
};

// Scholarly siglum + date for each CNTR filename (stem → metadata).
// P64 contains both P64 (Magdalen, Matt 3+5) and P67 (Barcelona, Matt 26);
// CNTR treats them as one file since they are likely the same manuscript.
const PAPYRUS_META = {
  P1:   { siglum: 'P1',      date: 'c. 250 CE' },
  P4:   { siglum: 'P4',      date: 'c. 150–200 CE' },
  P5:   { siglum: 'P5',      date: 'c. 250–300 CE' },
  P22:  { siglum: 'P22',     date: 'c. 250–300 CE' },
  P28:  { siglum: 'P28',     date: 'c. 250–300 CE' },
  P37:  { siglum: 'P37',     date: 'c. 250–300 CE' },
  P39:  { siglum: 'P39',     date: 'c. 200–250 CE' },
  P45:  { siglum: 'P45',     date: 'c. 200–250 CE' },
  P52:  { siglum: 'P52',     date: 'c. 125–175 CE' },
  P53:  { siglum: 'P53',     date: 'c. 250 CE' },
  P64:  { siglum: 'P64+P67', date: 'c. 200 CE' },
  P66:  { siglum: 'P66',     date: 'c. 175–225 CE' },
  P70:  { siglum: 'P70',     date: 'c. 175–225 CE' },
  P75:  { siglum: 'P75',     date: 'c. 175–225 CE' },
  P77:  { siglum: 'P77',     date: 'c. 150–250 CE' },
  P88:  { siglum: 'P88',     date: 'c. 4th c. CE' },
  P90:  { siglum: 'P90',     date: 'c. 150–200 CE' },
  P95:  { siglum: 'P95',     date: 'c. 250–300 CE' },
  P104: { siglum: 'P104',    date: 'c. 125–150 CE' },
  P106: { siglum: 'P106',    date: 'c. 200–250 CE' },
  P119: { siglum: 'P119',    date: 'c. 250–350 CE' },
  P120: { siglum: 'P120',    date: 'c. 250–350 CE' },
  // Tier A — downloaded from CNTR class 1
  P2   : { siglum: 'P2',    date: 'c. 6th c. CE'      },
  P3   : { siglum: 'P3',    date: 'c. 6th c. CE'      },
  P6   : { siglum: 'P6',    date: 'c. 4th c. CE'      },
  P7   : { siglum: 'P7',    date: 'c. 4th c. CE'      },
  P19  : { siglum: 'P19',   date: 'c. 4th–5th c. CE' },
  P21  : { siglum: 'P21',   date: 'c. 4th–5th c. CE' },
  P25  : { siglum: 'P25',   date: 'c. 4th c. CE'      },
  P35  : { siglum: 'P35',   date: 'c. 4th c. CE'      },
  P36  : { siglum: 'P36',   date: 'c. 3rd–4th c. CE' },
  P42  : { siglum: 'P42',   date: 'c. 7th c. CE'      },
  P44  : { siglum: 'P44',   date: 'c. 5th–6th c. CE' },
  P55  : { siglum: 'P55',   date: 'c. 6th–7th c. CE' },
  P59  : { siglum: 'P59',   date: 'c. 7th c. CE'      },
  P60  : { siglum: 'P60',   date: 'c. 7th c. CE'      },
  P63  : { siglum: 'P63',   date: 'c. 4th–5th c. CE' },
  P69  : { siglum: 'P69',   date: 'c. 3rd c. CE'      },
  P71  : { siglum: 'P71',   date: 'c. 4th c. CE'      },
  P73  : { siglum: 'P73',   date: 'c. 7th c. CE'      },
  P76  : { siglum: 'P76',   date: 'c. 6th c. CE'      },
  P80  : { siglum: 'P80',   date: 'c. 3rd c. CE'      },
  P82  : { siglum: 'P82',   date: 'c. 4th–5th c. CE' },
  P83  : { siglum: 'P83',   date: 'c. 3rd–4th c. CE' },
  P84  : { siglum: 'P84',   date: 'c. 5th–6th c. CE' },
  P86  : { siglum: 'P86',   date: 'c. 4th c. CE'      },
  P93  : { siglum: 'P93',   date: 'c. 3rd c. CE'      },
  P96  : { siglum: 'P96',   date: 'c. 3rd–4th c. CE' },
  P97  : { siglum: 'P97',   date: 'c. 5th–6th c. CE' },
  P101 : { siglum: 'P101',  date: 'c. 3rd c. CE'      },
  P102 : { siglum: 'P102',  date: 'c. 3rd–4th c. CE' },
  P103 : { siglum: 'P103',  date: 'c. 2nd–3rd c. CE' },
  P105 : { siglum: 'P105',  date: 'c. 4th c. CE'      },
  P107 : { siglum: 'P107',  date: 'c. 3rd c. CE'      },
  P108 : { siglum: 'P108',  date: 'c. 3rd c. CE'      },
  P109 : { siglum: 'P109',  date: 'c. 3rd c. CE'      },
  P110 : { siglum: 'P110',  date: 'c. 4th c. CE'      },
  P111 : { siglum: 'P111',  date: 'c. 3rd c. CE'      },
  P121 : { siglum: 'P121',  date: 'c. 3rd c. CE'      },
  P122 : { siglum: 'P122',  date: 'c. 4th–5th c. CE' },
  P128 : { siglum: 'P128',  date: 'c. 3rd–4th c. CE' },
  P134 : { siglum: 'P134',  date: 'c. 2nd–3rd c. CE' },
  P137 : { siglum: 'P137',  date: 'c. 3rd c. CE'      },
  P138 : { siglum: 'P138',  date: 'c. 3rd–4th c. CE' },
  P141 : { siglum: 'P141',  date: 'c. 4th–5th c. CE' },
};

/** @param {string} raw  CNTR line content after the 8-digit reference prefix */
function extractWords(raw) {
  // Strip CNTR structural markers that are not part of the Greek text:
  //   \ | / & * $ (and numeric sequences after $)
  // Strip per-character uncertainty markers: ^ %
  // Keep: ~ = + prefixes attached to Greek tokens (used for nomen sacrum and additions)
  //   but strip them when splitting so the bare Greek token is extractable.
  return raw
    .replace(/\$[^\s]*/g, '')     // $ιδ numerals
    .replace(/[\\|/&*]/g, ' ')    // structural breaks
    .replace(/\d+/g, '')          // any stray digits
    .split(/\s+/)
    .map(t => t.replace(/^[~=+]+/, '').replace(/[^%]/g, c => c).replace(/[\^%]/g, ''))
    .map(t => t.replace(/[^α-ωΑ-Ωά-ώϊϋΐΰ]/g, ''))
    .filter(Boolean);
}

function main() {
  const files = fs.readdirSync(SRC).filter(f => /^P\d+\.txt$/.test(f));

  /** @type {Record<string, {siglum: string, date: string, verses: Array<{gospel: string, chapter: number, verse: number}>}>} */
  const papyri = {};

  /** @type {Record<string, Record<string, Record<string, string[]>>>} */
  const byVerse = {};

  for (const file of files.sort()) {
    const stem = file.replace('.txt', '');
    const meta = PAPYRUS_META[stem];
    if (!meta) {
      console.warn(`  No metadata for ${file} — skipping`);
      continue;
    }

    const { siglum, date } = meta;
    if (!papyri[siglum]) papyri[siglum] = { siglum, date, verses: [] };

    const content = fs.readFileSync(path.join(SRC, file), 'utf-8');
    const seen = new Set();

    for (const line of content.split('\n')) {
      const m = line.match(/^(\d{8})\s/);
      if (!m) continue;

      const ref = m[1];
      const bb  = ref.slice(0, 2);
      const ccc = ref.slice(2, 5);
      const vvv = ref.slice(5, 8);

      const gospel = BOOK_CODE[bb];
      if (!gospel) continue; // non-Gospel book

      const chapter = parseInt(ccc, 10);
      const verse   = parseInt(vvv, 10);
      const key     = `${gospel}:${chapter}:${verse}`;

      if (!seen.has(key)) {
        seen.add(key);
        papyri[siglum].verses.push({ gospel, chapter, verse });

        byVerse[gospel]               ??= {};
        byVerse[gospel][chapter]      ??= {};
        byVerse[gospel][chapter][verse] ??= [];
        if (!byVerse[gospel][chapter][verse].includes(siglum)) {
          byVerse[gospel][chapter][verse].push(siglum);
        }
      }
    }

    const count = papyri[siglum].verses.length;
    console.log(`  ${siglum.padEnd(8)} ${date.padEnd(16)} ${count} verse-lines  (${file})`);
  }

  // Sort verse arrays by gospel order, chapter, verse
  const GOSPEL_ORDER = ['matthew', 'mark', 'luke', 'john'];
  for (const entry of Object.values(papyri)) {
    entry.verses.sort((a, b) => {
      const gi = GOSPEL_ORDER.indexOf(a.gospel) - GOSPEL_ORDER.indexOf(b.gospel);
      if (gi !== 0) return gi;
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });
  }

  const output = { papyri: Object.values(papyri), byVerse };
  fs.writeFileSync(OUT, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\nWrote ${OUT}`);

  // Summary
  const totalVerses = Object.values(papyri).reduce((n, p) => n + p.verses.length, 0);
  console.log(`Total: ${Object.keys(papyri).length} papyri, ${totalVerses} verse-lines indexed`);
}

main();
