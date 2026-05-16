// @ts-check
// Cross-check every extant papyrus cell in verse JSON files against
// coverage-index.json. Catches two classes of error:
//
//   1. Unknown siglum — fragment id not in the known PAPYRUS_SIGLA list
//   2. Uncovered verse — fragment id not present for this verse in the index
//      (i.e. the papyrus never covers this verse; text was likely copied from
//       another witness, defeating the purpose of the column)
//
// Usage: node scripts/validate-papyrus.js
// Exit code 1 if any violations found, 0 if clean.

const fs   = require('fs');
const path = require('path');

const ROOT  = path.join(__dirname, '..');
const INDEX = require(path.join(ROOT, 'data/sources/earliest-papyrus/coverage-index.json'));

const KNOWN_SIGLA = new Set(INDEX.papyri.map(p => p.siglum));

// Build a fast lookup: gospel -> chapter -> verse -> Set<siglum>
const covered = {};
for (const [gospel, chapters] of Object.entries(INDEX.byVerse)) {
  covered[gospel] = {};
  for (const [ch, verses] of Object.entries(chapters)) {
    covered[gospel][ch] = {};
    for (const [v, sigla] of Object.entries(verses)) {
      covered[gospel][ch][v] = new Set(sigla);
    }
  }
}

function siglaCover(gospel, chapter, verse, siglum) {
  return covered[gospel]?.[chapter]?.[verse]?.has(siglum) ?? false;
}

// Walk all verse JSON files
const gospels = ['matthew', 'mark', 'luke', 'john'];
let violations = 0;
let filesChecked = 0;

for (const gospel of gospels) {
  const gospelDir = path.join(ROOT, 'data', gospel);
  if (!fs.existsSync(gospelDir)) continue;

  for (const chDir of fs.readdirSync(gospelDir)) {
    const chPath = path.join(gospelDir, chDir);
    if (!fs.statSync(chPath).isDirectory()) continue;

    for (const file of fs.readdirSync(chPath)) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(chPath, file);
      const verse = parseInt(file.replace('.json', ''), 10);
      const chapter = parseInt(chDir, 10);

      let data;
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch {
        console.error(`  PARSE ERROR: ${filePath}`);
        violations++;
        continue;
      }

      filesChecked++;

      for (const row of (data.rows ?? [])) {
        const pap = row.papyrus;
        if (!pap || pap.type !== 'extant') continue;

        for (const frag of (pap.fragments ?? [])) {
          const id = frag.id;
          const loc = `${gospel} ${chapter}:${verse} row ${row.id}`;

          if (!KNOWN_SIGLA.has(id)) {
            console.error(`  UNKNOWN SIGLUM "${id}" — ${loc}`);
            violations++;
            continue;
          }

          if (!siglaCover(gospel, String(chapter), String(verse), id)) {
            console.error(`  UNCOVERED VERSE — ${id} does not attest ${loc}`);
            console.error(`    (text "${pap.text}" may have been copied from another witness)`);
            violations++;
          }
        }
      }
    }
  }
}

if (violations === 0) {
  console.log(`validate-papyrus: OK — ${filesChecked} verse files checked, no violations`);
  process.exit(0);
} else {
  console.error(`\nvalidate-papyrus: ${violations} violation(s) across ${filesChecked} files`);
  process.exit(1);
}
