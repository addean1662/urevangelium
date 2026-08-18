import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const books = {
  matthew: ['matthew', 'B01'],
  mark: ['mark', 'B02'],
  luke: ['luke', 'B03'],
  john: ['john', 'B04'],
};

function words(xml) {
  return [...xml.matchAll(/<w(?:\s[^>]*)?>([\s\S]*?)<\/w>/g)]
    .map((match) => match[1].replace(/<[^>]+>/g, ''));
}

const ledger = read('docs/audits/vaticanus-english-shadow/generated-consensus-ledger.json');
const unresolved = ledger.decisions.filter((decision) => decision.status !== 'certified-generated');
const results = unresolved.map((decision) => {
  const [, book, chapter, verse] = decision.reference.match(/^(\w+) (\d+):(\d+)$/);
  const [filename, code] = books[book];
  const source = fs.readFileSync(path.join(ROOT, `data/sources/vaticanus/intf/${filename}.xml`), 'utf8');
  const start = source.indexOf(`n="${code}K${chapter}V${verse}"`);
  const ab = start < 0 ? '' : source.slice(start, source.indexOf('</ab>', start));
  const corrections = [...ab.matchAll(/<app>([\s\S]*?)<\/app>/g)].map((match) => {
    const orig = match[1].match(/<rdg type="orig"[\s\S]*?<\/rdg>/)?.[0] ?? '';
    const corr = match[1].match(/<rdg type="corr"[\s\S]*?<\/rdg>/)?.[0] ?? '';
    return { original: words(orig), correction: words(corr) };
  }).filter((entry) => entry.original.includes(decision.vaticanusGreek));
  return {
    reference: decision.reference,
    rowId: decision.rowId,
    greek: decision.vaticanusGreek,
    priorStatus: decision.status,
    corrections,
  };
});

const output = {
  generatedAt: new Date().toISOString(),
  inputDecisionSha256: ledger.decisionSha256,
  totals: {
    unresolved: results.length,
    withCorrectorEvidence: results.filter((item) => item.corrections.length).length,
    correctedToWords: results.filter((item) => item.corrections.some((entry) => entry.correction.length)).length,
    correctedByDeletion: results.filter((item) => item.corrections.some((entry) => !entry.correction.length)).length,
  },
  cases: results,
};

const target = path.join(ROOT, 'docs/audits/vaticanus-english-shadow/remaining-troubleshooting.json');
fs.writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output.totals, null, 2));
for (const item of results.filter((entry) => entry.corrections.length)) {
  console.log(`${item.reference}\t${item.greek}\t${JSON.stringify(item.corrections)}`);
}
