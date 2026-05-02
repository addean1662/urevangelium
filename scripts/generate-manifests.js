// @ts-check
/* eslint-disable @typescript-eslint/no-require-imports */
// Plain Node.js CJS script — require() is intentional here.
const path = require('path');
const fs = require('fs');

const VERSE_COUNTS = {
  matthew: [25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20],
  mark:    [45,28,35,41,43,56,37,38,50,52,33,44,37,72,47,20],
  luke:    [80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53],
  john:    [51,25,36,54,47,71,53,59,41,42,57,50,38,31,27,33,26,40,42,31,25],
};

const PROOF_VERSES = {
  matthew: [[1, 1]],
  mark:    [[1, 1]],
  luke:    [[1, 1]],
  john:    [[1, 1]],
};

for (const gospel of Object.keys(VERSE_COUNTS)) {
  const counts = VERSE_COUNTS[gospel];
  const proofs = PROOF_VERSES[gospel];
  const verses = [];

  counts.forEach((verseCount, i) => {
    const chapter = i + 1;
    for (let v = 1; v <= verseCount; v++) {
      const populated = proofs.some(([c, pv]) => c === chapter && pv === v);
      verses.push({ chapter, verse: v, populated });
    }
  });

  const manifest = { gospel, verses };
  const outPath = path.join('data', 'manifests', `${gospel}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
  console.log(`Wrote ${outPath} — ${verses.length} verses`);
}
