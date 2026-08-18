import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(ROOT, 'docs/audits/papyrus-source-order-audit.json');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

function sha256(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

const sequences = source.sequences.map((sequence) => {
  const words = sequence.tokens.map((token, index) => ({
    sourceWord: index + 1,
    diplomatic: token.diplomatic,
    normalized: token.form,
    conditions: token.conditions ?? [],
    supplied: token.supplied ?? null,
  }));
  return {
    gospel: sequence.gospel,
    reference: sequence.reference,
    siglum: sequence.siglum,
    words,
    wordCount: words.length,
    transcriptionSha256: sha256(words),
  };
});

const wordKeys = new Set();
const invariantErrors = [];
for (const sequence of sequences) {
  for (const word of sequence.words) {
    const key = `${sequence.gospel}:${sequence.reference}:${sequence.siglum}:${word.sourceWord}`;
    if (wordKeys.has(key)) invariantErrors.push(`duplicate source coordinate ${key}`);
    wordKeys.add(key);
  }
  if (sequence.words.some((word, index) => word.sourceWord !== index + 1)) {
    invariantErrors.push(`non-contiguous source order ${sequence.gospel}:${sequence.reference}:${sequence.siglum}`);
  }
}

const report = {
  status: invariantErrors.length ? 'invalid-independent-source-corpus' : 'independent-source-corpus',
  generatedAt: new Date().toISOString(),
  authority: 'Papyrus wording and order are admitted from the named papyrus transcription without requiring agreement with any comparison tradition.',
  source: 'docs/audits/papyrus-source-order-audit.json',
  totals: {
    witnessVerseSequences: sequences.length,
    sourceWords: wordKeys.size,
    duplicateSourceCoordinates: invariantErrors.filter((error) => error.startsWith('duplicate')).length,
    sourceOrderErrors: invariantErrors.filter((error) => error.startsWith('non-contiguous')).length,
  },
  invariantErrors,
  corpusSha256: sha256(sequences),
  sequences,
};

const output = path.join(ROOT, 'docs/audits/papyrus-independent-corpus.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, ...report.totals, corpusSha256: report.corpusSha256, output: path.relative(ROOT, output) }, null, 2));
if (invariantErrors.length) process.exitCode = 1;
