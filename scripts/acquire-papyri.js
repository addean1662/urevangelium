// @ts-check
// scripts/acquire-papyri.js
// One-shot acquisition — downloads 22 Tier A papyri from CNTR, generates
// 21 Tier B coverage stubs, then patches lib/types.ts, parsePapyrus.ts, and
// build-papyrus-index.js. Finishes by rebuilding coverage-index.json.
//
// Usage: node scripts/acquire-papyri.js

'use strict';
const https        = require('https');
const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

const ROOT  = path.join(__dirname, '..');
const SRC   = path.join(ROOT, 'data', 'sources', 'earliest-papyrus');
const CNTR  = 'https://raw.githubusercontent.com/Center-for-New-Testament-Restoration/transcriptions/master/class%201/';

// ── helpers ────────────────────────────────────────────────────────────────

/** @param {string} url @returns {Promise<string>} */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302)
        return fetchUrl(res.headers.location).then(resolve, reject);
      if (res.statusCode !== 200)
        return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// 8-digit CNTR verse code: BBCCCVVV
function vc(bb, c, v) {
  return `${bb}${String(c).padStart(3, '0')}${String(v).padStart(3, '0')}`;
}
// inclusive verse range within a single chapter
function vr(bb, c, v1, v2) {
  const out = [];
  for (let v = v1; v <= v2; v++) out.push(vc(bb, c, v));
  return out;
}

const MT = '40', MK = '41', LK = '42', JN = '43';

// ── Tier A: CNTR downloads ─────────────────────────────────────────────────

const TIER_A = [
  { stem: 'P6',   siglum: 'P6',   date: 'c. 4th c. CE'      },
  { stem: 'P19',  siglum: 'P19',  date: 'c. 4th–5th c. CE' },
  { stem: 'P21',  siglum: 'P21',  date: 'c. 4th–5th c. CE' },
  { stem: 'P25',  siglum: 'P25',  date: 'c. 4th c. CE'      },
  { stem: 'P35',  siglum: 'P35',  date: 'c. 4th c. CE'      },
  { stem: 'P69',  siglum: 'P69',  date: 'c. 3rd c. CE'      },
  { stem: 'P71',  siglum: 'P71',  date: 'c. 4th c. CE'      },
  { stem: 'P82',  siglum: 'P82',  date: 'c. 4th–5th c. CE' },
  { stem: 'P86',  siglum: 'P86',  date: 'c. 4th c. CE'      },
  { stem: 'P101', siglum: 'P101', date: 'c. 3rd c. CE'      },
  { stem: 'P102', siglum: 'P102', date: 'c. 3rd–4th c. CE' },
  { stem: 'P107', siglum: 'P107', date: 'c. 3rd c. CE'      },
  { stem: 'P108', siglum: 'P108', date: 'c. 3rd c. CE'      },
  { stem: 'P109', siglum: 'P109', date: 'c. 3rd c. CE'      },
  { stem: 'P110', siglum: 'P110', date: 'c. 4th c. CE'      },
  { stem: 'P111', siglum: 'P111', date: 'c. 3rd c. CE'      },
  { stem: 'P121', siglum: 'P121', date: 'c. 3rd c. CE'      },
  { stem: 'P122', siglum: 'P122', date: 'c. 4th–5th c. CE' },
  { stem: 'P134', siglum: 'P134', date: 'c. 2nd–3rd c. CE' },
  { stem: 'P137', siglum: 'P137', date: 'c. 3rd c. CE'      },
  { stem: 'P138', siglum: 'P138', date: 'c. 3rd–4th c. CE' },
  { stem: 'P141', siglum: 'P141', date: 'c. 4th–5th c. CE' },
];

// ── Tier B: coverage stubs (not in CNTR) ──────────────────────────────────

const TIER_B = [
  // Matthew
  { stem:'P73',  siglum:'P73',  date:'c. 7th c. CE',
    verses:[vc(MT,25,43), vc(MT,26,2), vc(MT,26,3)] },
  { stem:'P83',  siglum:'P83',  date:'c. 3rd–4th c. CE',
    verses:[...vr(MT,20,23,25), vc(MT,20,30), vc(MT,20,31),
            vc(MT,23,39), vc(MT,24,1), vc(MT,24,6)] },
  { stem:'P96',  siglum:'P96',  date:'c. 3rd–4th c. CE',
    verses:[...vr(MT,3,10,12)] },
  { stem:'P103', siglum:'P103', date:'c. 2nd–3rd c. CE',
    verses:[vc(MT,13,55), vc(MT,13,56), ...vr(MT,14,3,5)] },
  { stem:'P105', siglum:'P105', date:'c. 4th c. CE',
    verses:[...vr(MT,27,62,64), ...vr(MT,28,2,5)] },
  // Matthew + John
  { stem:'P44',  siglum:'P44',  date:'c. 5th–6th c. CE',
    verses:[...vr(MT,17,1,3), ...vr(MT,17,6,7),
            ...vr(MT,18,15,17), vc(MT,18,19),
            ...vr(MT,25,8,10),
            ...vr(JN,10,8,14)] },
  // Mark + John
  { stem:'P84',  siglum:'P84',  date:'c. 5th–6th c. CE',
    verses:[...vr(MK,2,2,5), vc(MK,2,8), vc(MK,2,9),
            vc(MK,6,30), vc(MK,6,31), vc(MK,6,33), vc(MK,6,34),
            vc(MK,6,36), vc(MK,6,37), ...vr(MK,6,39,41),
            vc(JN,5,5), vc(JN,17,3), vc(JN,17,7), vc(JN,17,8)] },
  // Luke
  { stem:'P3',   siglum:'P3',   date:'c. 6th c. CE',
    verses:[...vr(LK,7,36,45), ...vr(LK,10,38,42)] },
  { stem:'P7',   siglum:'P7',   date:'c. 4th c. CE',
    verses:[...vr(LK,4,1,3)] },
  { stem:'P42',  siglum:'P42',  date:'c. 7th c. CE',
    verses:[...vr(LK,1,54,55), ...vr(LK,2,29,32)] },
  { stem:'P97',  siglum:'P97',  date:'c. 5th–6th c. CE',
    verses:[...vr(LK,14,7,14)] },
  // John
  { stem:'P2',   siglum:'P2',   date:'c. 6th c. CE',
    verses:[...vr(JN,12,12,15)] },
  { stem:'P36',  siglum:'P36',  date:'c. 3rd–4th c. CE',
    verses:[...vr(JN,3,14,18), ...vr(JN,3,31,32), ...vr(JN,3,34,35)] },
  { stem:'P55',  siglum:'P55',  date:'c. 6th–7th c. CE',
    verses:[...vr(JN,1,31,33), ...vr(JN,1,35,38)] },
  { stem:'P59',  siglum:'P59',  date:'c. 7th c. CE',
    verses:[
      vc(JN,1,26), vc(JN,1,28), vc(JN,1,48), vc(JN,1,51),
      vc(JN,2,15), vc(JN,2,16),
      ...vr(JN,11,40,52),
      ...vr(JN,12,25,29), vc(JN,12,31), vc(JN,12,35),
      ...vr(JN,17,24,26),
      vc(JN,18,1), vc(JN,18,2), vc(JN,18,16), vc(JN,18,17), vc(JN,18,22),
      vc(JN,21,7), vc(JN,21,12), vc(JN,21,13), vc(JN,21,15),
      ...vr(JN,21,17,20), vc(JN,21,23),
    ] },
  { stem:'P60',  siglum:'P60',  date:'c. 7th c. CE',
    verses:[
      // John 16-17
      ...vr(JN,16,29,30), ...vr(JN,16,32,33),
      ...vr(JN,17,1,6),
      vc(JN,17,8), vc(JN,17,9),
      ...vr(JN,17,11,15),
      ...vr(JN,17,18,25),
      // John 18
      vc(JN,18,1), vc(JN,18,2),
      vc(JN,18,4), vc(JN,18,5),
      ...vr(JN,18,7,16),
      ...vr(JN,18,18,20),
      ...vr(JN,18,23,29),
      ...vr(JN,18,31,37),
      vc(JN,18,39), vc(JN,18,40),
      // John 19
      vc(JN,19,2), vc(JN,19,3),
      ...vr(JN,19,5,8),
      ...vr(JN,19,10,18),
      vc(JN,19,20),
      ...vr(JN,19,23,26),
    ] },
  { stem:'P63',  siglum:'P63',  date:'c. 4th–5th c. CE',
    verses:[...vr(JN,3,14,18), vc(JN,4,9), vc(JN,4,10)] },
  { stem:'P76',  siglum:'P76',  date:'c. 6th c. CE',
    verses:[vc(JN,4,9), vc(JN,4,12)] },
  { stem:'P80',  siglum:'P80',  date:'c. 3rd c. CE',
    verses:[vc(JN,3,34)] },
  { stem:'P93',  siglum:'P93',  date:'c. 3rd c. CE',
    verses:[...vr(JN,13,15,17)] },
  { stem:'P128', siglum:'P128', date:'c. 3rd–4th c. CE',
    verses:[vc(JN,9,3), vc(JN,9,4), ...vr(JN,12,16,18)] },
];

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  let downloaded = 0, stubbed = 0, skipped = 0, failed = 0;

  // ── Step 1: Download Tier A ──────────────────────────────────────────────
  console.log('\n=== Step 1: Downloading Tier A from CNTR ===');
  for (const p of TIER_A) {
    const dest = path.join(SRC, p.stem + '.txt');
    if (fs.existsSync(dest)) {
      console.log(`  ${p.siglum.padEnd(6)} already exists — skip`);
      skipped++;
      continue;
    }
    try {
      const text = await fetchUrl(CNTR + encodeURIComponent(p.stem + '.txt'));
      fs.writeFileSync(dest, text, 'utf-8');
      const lines = text.split('\n').filter(l => /^\d{8}\s/.test(l)).length;
      console.log(`  ${p.siglum.padEnd(6)} downloaded  (${lines} verse-lines)`);
      downloaded++;
    } catch (e) {
      console.error(`  ${p.siglum.padEnd(6)} FAILED: ${e.message}`);
      failed++;
    }
  }

  // ── Step 2: Generate Tier B stubs ───────────────────────────────────────
  console.log('\n=== Step 2: Generating Tier B coverage stubs ===');
  for (const p of TIER_B) {
    const dest = path.join(SRC, p.stem + '.txt');
    if (fs.existsSync(dest)) {
      console.log(`  ${p.siglum.padEnd(6)} already exists — skip`);
      skipped++;
      continue;
    }
    const content = p.verses.map(code => `${code} [stub — not in CNTR]`).join('\n') + '\n';
    fs.writeFileSync(dest, content, 'utf-8');
    console.log(`  ${p.siglum.padEnd(6)} stub written (${p.verses.length} verse-lines)`);
    stubbed++;
  }

  const all = [...TIER_A, ...TIER_B];

  // ── Step 3: Patch lib/types.ts ──────────────────────────────────────────
  console.log('\n=== Step 3: Patching lib/types.ts ===');
  {
    const file = path.join(ROOT, 'lib', 'types.ts');
    let src = fs.readFileSync(file, 'utf-8');
    const existingSigla = new Set([...src.matchAll(/'(P[\w+]+)'/g)].map(m => m[1]));
    const newSigla = all.map(p => p.siglum).filter(s => !existingSigla.has(s));
    if (newSigla.length === 0) {
      console.log('  PAPYRUS_SIGLA already up to date');
    } else {
      const anchor = '] as const;\n\nexport type PapyrusSiglum';
      const pos = src.indexOf(anchor);
      if (pos === -1) throw new Error('Could not find PAPYRUS_SIGLA closing anchor in types.ts');
      const insert = newSigla.map(s => `  '${s}',`).join('\n') + '\n';
      src = src.slice(0, pos) + '\n' + insert + src.slice(pos);
      fs.writeFileSync(file, src, 'utf-8');
      console.log(`  Added ${newSigla.length} sigla: ${newSigla.join(', ')}`);
    }
  }

  // ── Step 4: Patch lib/sources/parsePapyrus.ts ───────────────────────────
  console.log('\n=== Step 4: Patching lib/sources/parsePapyrus.ts ===');
  {
    const file = path.join(ROOT, 'lib', 'sources', 'parsePapyrus.ts');
    let src = fs.readFileSync(file, 'utf-8');
    const existingIds = new Set([...src.matchAll(/id: '(P[\w+]+)'/g)].map(m => m[1]));
    const newEntries = all.filter(p => !existingIds.has(p.siglum));
    if (newEntries.length === 0) {
      console.log('  PAPYRI array already up to date');
    } else {
      // Insert before the lone ]; that closes the PAPYRI array
      const pos = src.indexOf('\n];');
      if (pos === -1) throw new Error('Could not find PAPYRI closing ];\n in parsePapyrus.ts');
      const insert = newEntries.map(p =>
        `  { id: '${p.siglum}', file: '${p.stem}.txt', date: '${p.date}' },`
      ).join('\n') + '\n';
      src = src.slice(0, pos) + '\n' + insert + src.slice(pos);
      fs.writeFileSync(file, src, 'utf-8');
      console.log(`  Added ${newEntries.length} entries`);
    }
  }

  // ── Step 5: Patch scripts/build-papyrus-index.js ────────────────────────
  console.log('\n=== Step 5: Patching scripts/build-papyrus-index.js ===');
  {
    const file = path.join(ROOT, 'scripts', 'build-papyrus-index.js');
    let src = fs.readFileSync(file, 'utf-8');
    const existingStems = new Set([...src.matchAll(/^\s+(P\w+):\s*\{/gm)].map(m => m[1]));
    const newEntries = all.filter(p => !existingStems.has(p.stem));
    if (newEntries.length === 0) {
      console.log('  PAPYRUS_META already up to date');
    } else {
      // Insert before the }; that closes PAPYRUS_META (anchored to unique surrounding text)
      const anchor = '\n};\n\n/** @param';
      const pos = src.indexOf(anchor);
      if (pos === -1) throw new Error('Could not find PAPYRUS_META closing }; in build-papyrus-index.js');
      const insert = newEntries.map(p =>
        `  ${p.stem.padEnd(5)}: { siglum: '${p.siglum}', date: '${p.date}' },`
      ).join('\n') + '\n';
      src = src.slice(0, pos) + '\n' + insert + src.slice(pos);
      fs.writeFileSync(file, src, 'utf-8');
      console.log(`  Added ${newEntries.length} entries`);
    }
  }

  // ── Step 6: Rebuild coverage index ──────────────────────────────────────
  console.log('\n=== Step 6: Rebuilding coverage-index.json ===');
  execSync('node scripts/build-papyrus-index.js', { cwd: ROOT, stdio: 'inherit' });

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(55)}`);
  console.log(`  Downloaded : ${downloaded}`);
  console.log(`  Stubs      : ${stubbed}`);
  console.log(`  Skipped    : ${skipped}`);
  console.log(`  Failed     : ${failed}`);
  console.log(`${'='.repeat(55)}`);
  if (failed > 0) {
    console.log('\nSome downloads failed. Re-run to retry.');
    process.exit(1);
  }
}

main().catch(e => { console.error('\nFatal:', e.message); process.exit(1); });
