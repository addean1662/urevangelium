import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const shadowFile = path.join(ROOT, 'docs', 'audits', 'vulgate-word-english-shadow.json');
const sourceFile = path.join(ROOT, 'data', 'sources', 'glosses', 'lewis-short', 'lat.ls.perseus-eng1.xml');
const outputFile = path.join(ROOT, 'data', 'sources', 'glosses', 'lewis-short', 'vulgate-gospels-evidence.json');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const shadow = JSON.parse(fs.readFileSync(shadowFile, 'utf8'));
const evidence = {};

for (const record of shadow.records) {
  for (const token of record.tokens) {
    if (!token.lewisShortEntries?.length) continue;
    const key = token.surface.normalize('NFC').toLocaleLowerCase('la');
    evidence[key] ??= { surfaces: [], entries: [], references: [] };
    if (!evidence[key].surfaces.includes(token.surface)) evidence[key].surfaces.push(token.surface);
    for (const entry of token.lewisShortEntries) if (!evidence[key].entries.includes(entry)) evidence[key].entries.push(entry);
    if (!evidence[key].references.includes(record.sourceReference)) evidence[key].references.push(record.sourceReference);
  }
}

const output = {
  status: 'derived-gospel-token-evidence-not-a-complete-lewis-short-edition',
  source: {
    title: 'A Latin Dictionary (Lewis and Short, 1879), Perseus TEI edition',
    upstream: 'https://github.com/PerseusDL/lexica',
    upstreamCommit: '40038e40937fa639639802e73dac15e6c938496b',
    sourcePath: 'CTS_XML_TEI/perseus/pdllex/lat/ls/lat.ls.perseus-eng1.xml',
    sourceSha256: sha256(fs.readFileSync(sourceFile)),
  },
  extraction: {
    scope: 'Lewis-Short entries reached through Whitaker morphological analyses of the certified Clementine Vulgate Gospel tokens',
    shadowLedgerSha256: shadow.ledgerSha256,
    surfaceCount: Object.keys(evidence).length,
  },
  evidence,
};
output.evidenceSha256 = sha256(JSON.stringify(evidence));
fs.writeFileSync(outputFile, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ surfaceCount: output.extraction.surfaceCount, evidenceSha256: output.evidenceSha256, sourceSha256: output.source.sourceSha256, output: path.relative(ROOT, outputFile) }, null, 2));
