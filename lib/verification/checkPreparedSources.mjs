// Build gate: stale source expectations cannot acquire a current-looking report.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/verse-verification/manifest.json'), 'utf8'));
if (manifest.schema !== 1 || manifest.hashPolicy !== 'sha256-utf8-lf') throw new Error('Unsupported verification manifest');
for (const [file, expected] of Object.entries({ ...manifest.sourceHashes, ...manifest.outputHashes })) {
  const text = fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n');
  if (createHash('sha256').update(text).digest('hex') !== expected) throw new Error(`Verse verification sources changed: ${file}. Rebuild and review expectations before publication.`);
}
console.log(`Verse verification expectations match pinned sources for ${manifest.verses} verses.`);
