import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const records = [];
for (const gospel of GOSPELS) {
  for (const chapter of fs.readdirSync(path.join(ROOT, 'data', gospel)).filter((name) => /^\d+$/.test(name))) {
    for (const filename of fs.readdirSync(path.join(ROOT, 'data', gospel, chapter)).filter((name) => /^\d+\.json$/.test(name))) {
      const verse = filename.slice(0, -5);
      const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', gospel, chapter, filename), 'utf8'));
      for (const [rowIndex, row] of data.rows.entries()) {
        const cell = row.coptic;
        const provenance = cell?.provenance?.hornerAllocation ?? cell?.provenance?.hornerPeerAllocation ?? cell?.provenance?.hornerAdjudication229 ?? cell?.provenance?.hornerPhraseAdjudication229;
        if (!provenance || cell?.gloss?.source !== 'Horner') continue;
        const book = gospel === 'matthew' ? 'Matt' : gospel[0].toUpperCase() + gospel.slice(1);
        records.push({
          key: `${book}.${chapter}.${verse}:${rowIndex}`,
          sourceReference: `${book}.${chapter}.${verse}`,
          rowIndex,
          rowId: row.id,
          sourceToken: cell.provenance.sourceToken,
          coptic: cell.text,
          allocation: cell.gloss.gloss,
          hornerUnitId: provenance.unitId,
          decisionSha256: provenance.decisionSha256,
          method: cell.provenance.hornerPeerAllocation ? 'HORNER_SAME_ROW_MULTI_WITNESS_ALLOCATION' : cell.provenance.hornerAdjudication229 ? 'HORNER_229_SOURCE_GROUNDED_ADJUDICATION' : cell.provenance.hornerPhraseAdjudication229 ? 'HORNER_PHRASE_SPAN_ADJUDICATION' : 'HORNER_BOUNDED_NEIGHBOR_ALLOCATION',
          status: provenance.status,
        });
      }
    }
  }
}
records.sort((left, right) => left.key.localeCompare(right.key));
const output = { generatedAt: new Date().toISOString(), policy: 'Persistent ledger of applied Horner allocations; regenerated audit passes may not erase applied decision evidence.', count: records.length, records };
const outputPath = path.join(ROOT, 'data/sources/horner-english/applied-allocations.json');
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ status: 'persisted', count: records.length, outputPath: path.relative(ROOT, outputPath) }, null, 2));
