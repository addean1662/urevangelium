import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const parserSource = fs.readFileSync(path.join(ROOT, 'lib/sources/cntrMes.js'), 'utf8');
const { parseMesLine } = await import(`data:text/javascript;base64,${Buffer.from(parserSource).toString('base64')}`);

const SOURCE = {
  witness: 'GA 03',
  name: 'CNTR Class 1 transcription of Codex Vaticanus',
  revision: '4c0e9f94117ec3dc4ae40094aec044bb7a416a53',
  sha256: 'cea945958d065699d3ab42f05d2afa3be54af4551a68e2e0a32090cd9fa0bb7f',
  readingLayer: 'base',
};

const targetBook = 40;
const targetChapter = 1;
const verses = [];

for (const line of fs.readFileSync(path.join(ROOT, 'data/sources/vaticanus/03.txt'), 'utf8').split(/\r?\n/).filter(Boolean)) {
  const parsed = parseMesLine(line);
  if (parsed.reference.book !== targetBook || parsed.reference.chapter !== targetChapter) continue;
  const livePath = path.join(ROOT, 'data/matthew/1', `${parsed.reference.verse}.json`);
  const live = JSON.parse(fs.readFileSync(livePath, 'utf8'));
  const liveCells = live.rows.filter((row) => row.vaticanus?.type === 'text').map((row) => ({ rowId: row.id, text: row.vaticanus.text }));
  verses.push({
    reference: parsed.reference,
    sourceRaw: parsed.raw,
    sourceSegments: parsed.segments,
    baseWords: parsed.baseWords.map((word, index) => ({
      sourceWord: index + 1,
      ...word,
      provenance: {
        ...SOURCE,
        sourceReference: parsed.reference.code,
        diplomatic: word.diplomatic,
        normalization: [],
        verification: 'machine-compared',
      },
    })),
    currentLiveVaticanus: liveCells,
  });
}

const shadow = {
  status: 'shadow-not-for-display',
  generatedAt: new Date().toISOString(),
  policy: 'docs/VATICANUS_EDITORIAL_POLICY.md',
  source: SOURCE,
  scope: 'Matthew 1',
  verses,
};

const out = path.join(ROOT, 'docs/audits/vaticanus-shadow-matthew-1.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(shadow, null, 2) + '\n');
console.log(`Wrote ${verses.length} verses and ${verses.reduce((sum, verse) => sum + verse.baseWords.length, 0)} GA 03 base words to ${path.relative(ROOT, out)}`);
