import fs from 'node:fs';
import path from 'node:path';
import { admitPapyrusVerse } from './papyrusEvidence.mjs';
import { loadPapyrusSourceIndex } from './papyrusSourceIndex.mjs';

const index = loadPapyrusSourceIndex();
let count = 0;
for (const gospel of ['matthew', 'mark', 'luke', 'john']) {
  const base = path.join(process.cwd(), 'data', gospel);
  for (const chapter of fs.readdirSync(base).filter(n => /^\d+$/.test(n))) for (const name of fs.readdirSync(path.join(base, chapter)).filter(n => /^\d+\.json$/.test(n))) {
    const data = JSON.parse(fs.readFileSync(path.join(base, chapter, name), 'utf8'));
    if (JSON.stringify(admitPapyrusVerse(data, index)) !== JSON.stringify(data)) throw new Error(`Papyrus attestation must be rebuilt before publication: ${gospel} ${chapter}:${name.slice(0, -5)}`);
    count++;
  }
}
console.log(`Papyrus attestation verified against pinned sources in ${count} verses.`);
