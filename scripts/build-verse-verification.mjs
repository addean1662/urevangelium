// Prepare source-only expectations for fast, independent checks on every verse load.
// Does not modify any source text, English translation, or corpus verse.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { getByzantineVerse } from '../lib/sources/parseByzantine.ts';
import { getPeshittaVerse } from '../lib/sources/parsePeshitta.ts';
import { loadClementineSequences } from '../lib/sources/clementineSequences.mjs';
import { parseMesLine } from '../lib/sources/cntrMes.js';
import { loadPapyrusSourceIndex } from '../lib/sources/papyrusSourceIndex.mjs';
import { admitPapyrusCell } from '../lib/sources/papyrusEvidence.mjs';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const { parseTTChapterSequence } = require('./coptic/parse-tt.js');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const files = new Map();
// Git checks text out as CRLF on Windows and LF on Linux. Only newline encoding
// is canonicalized; manuscript letters, punctuation and whitespace stay intact.
function pin(file) { files.set(file, hash(fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n'))); }
const books = ['matthew', 'mark', 'luke', 'john'];
const prefix = ['40_Matthew', '41_Mark', '42_Luke', '43_John'];
const coptic = new Map();
for (const [b, book] of books.entries()) {
  for (const file of fs.readdirSync(path.join(root, 'data/sources/coptic-tt')).filter(f => f.startsWith(prefix[b]) && f.endsWith('.tt'))) {
    const relative = `data/sources/coptic-tt/${file}`; pin(relative);
    const fileChapter = Number(file.match(/_(\d+)\.tt$/u)[1]);
    let chapter = fileChapter, afterLacuna = false;
    for (const record of parseTTChapterSequence(fs.readFileSync(path.join(root, relative), 'utf8'))) {
      if (book === 'john' && fileChapter === 7) {
        if (afterLacuna) chapter = 8;
        else if (record.verse === 53) afterLacuna = true;
      }
      coptic.set(`${book} ${chapter}:${record.verse}`, record.words.map(w => w.text));
    }
  }
}
const bezae = JSON.parse(execFileSync('python', [path.join(root, 'scripts/verification-bezae-source.py')], { encoding: 'utf8', maxBuffer: 12 * 1024 * 1024 }));
for (const side of ['Greek', 'Latin']) {
  const file = `data/sources/bezae/Bezae-${side}.xml`; pin(file);
}
const sinaiticus = new Map();
pin('data/sources/sinaiticus/01.txt');
for (const line of fs.readFileSync(path.join(root, 'data/sources/sinaiticus/01.txt'), 'utf8').split(/\r?\n/u).filter(Boolean)) {
  const record = parseMesLine(line), r = record.reference;
  const book = books[r.book - 40];
  if (!book) continue;
  const words = record.baseWords.filter(w => w.presence !== 'absent').map(w => {
    const text = w.diplomatic.replaceAll('¯', 'ν').replaceAll('ϗ', 'και').replaceAll('⳨', 'τρ').replaceAll('\ue001', 'μου');
    return text.endsWith('σ') ? `${text.slice(0, -1)}ς` : text;
  });
  sinaiticus.set(`${book} ${r.chapter}:${r.verse}`, words);
}
const vulgate = loadClementineSequences(path.join(root, 'data'));
for (const file of ['data/sources/vulgate/VulgClementine.txt', 'data/sources/peshitta/Peshitta.txt',
  'data/sources/peshitta/murdock-admitted-units.json', 'data/sources/vulgate-english/admitted-units.json']) pin(file);
for (const file of fs.readdirSync(path.join(root, 'data/sources/earliest-papyrus')).filter(f => /^(P[\d+P]+\.txt|coverage-index\.json)$/u.test(f))) pin(`data/sources/earliest-papyrus/${file}`);
const papyrus = loadPapyrusSourceIndex();
const disagreementFile = 'docs/audits/verse-review/source-checks/matthew-1-3-4-source-comparison.json';
const disagreements = read(disagreementFile); pin(disagreementFile);
const english = {
  peshitta: read('data/sources/peshitta/murdock-admitted-units.json').units,
  vulgate: read('data/sources/vulgate-english/admitted-units.json').units,
  sinaiticus: {},
};
for (const book of books) {
  const file = `data/sources/sinaiticus-english/anderson-1918/${book}.json`; pin(file);
  const edition = read(file);
  for (const verse of edition.verses) {
    const ref = `${book} ${verse.chapter}:${verse.verse}`;
    english.sinaiticus[ref] = { english: verse.text, translatorEdition: edition.authority, displayReferences: [ref] };
  }
}
const destination = path.join(root, 'data/verse-verification');
// Registered source-record concordance from build-peshitta-source-shadow.mjs.
// The file's Mark 3:35 line contains the latter portion of modern Mark 4:1.
const mark335 = getPeshittaVerse('mark', 3, 35);
const mark41 = getPeshittaVerse('mark', 4, 1);
const mark41Boundary = mark335.indexOf('ܘܐܬܟܢܫܘ');
if (mark41Boundary < 0) throw new Error('Unexpected Peshitta Mark 3:35 / 4:1 source boundary');
function peshittaWords(book, chapter, verse) {
  if (book === 'mark' && chapter === 3 && verse === 35) return mark335.slice(0, mark41Boundary);
  if (book === 'mark' && chapter === 4 && verse === 1) return [...mark41, ...mark335.slice(mark41Boundary)];
  return getPeshittaVerse(book, chapter, verse);
}
fs.mkdirSync(destination, { recursive: true });
const outputs = {};
let count = 0;
for (const [b, book] of books.entries()) {
  const shadowFile = `docs/audits/vaticanus-intf-cntr-shadow/${book}.json`;
  const shadow = read(shadowFile);
  const intfFile = `data/sources/vaticanus/intf/${book}.xml`; pin(intfFile);
  if (files.get(intfFile) !== shadow.sources.intf.sha256) throw new Error(`${book}: INTF source shadow is stale`);
  pin(`data/sources/byzantine/${['MAT', 'MAR', 'LUK', 'JOH'][b]}.csv`);
  const vat = new Map(shadow.verses.map(v => [v.reference, v.sourceWords ?? []]));
  const verses = {};
  for (const chapter of fs.readdirSync(path.join(root, 'data', book)).filter(x => /^\d+$/u.test(x))) {
    for (const file of fs.readdirSync(path.join(root, 'data', book, chapter)).filter(x => /^\d+\.json$/u.test(x))) {
      const verse = Number(file.slice(0, -5)), ref = `${book} ${chapter}:${verse}`;
      const document = read(`data/${book}/${chapter}/${file}`);
      const expectedPapyrus = {};
      for (const row of document.rows) {
        const cell = admitPapyrusCell(row.papyrus, ref, papyrus);
        if (cell?.type === 'extant' || cell?.provenance?.attestationPolicy) expectedPapyrus[row.id] = { type: cell.type, text: cell.text ?? null };
      }
      const conflicts = disagreements.records.find(r => r.reference === ref)?.p1Tokens.filter(t => t.supplyDisagreement)
        .map(t => ({ witness: 'P1', sourceToken: t.sourceToken, cntr: t.cntr.display, intf: t.intfEvidenceProjection })) ?? [];
      verses[`${chapter}:${verse}`] = {
        sources: {
          papyrus: { rows: expectedPapyrus, conflicts, authority: 'Declared CNTR papyrus collection; physical attestation still requires image review' },
          coptic: { words: coptic.get(ref) ?? [], authority: 'Sahidica NT 4.1.0 / Coptic SCRIPTORIUM' },
          vaticanus: { words: vat.get(`${chapter}:${verse}`) ?? [], authority: 'INTF GA 03, original hand, pinned source-word ledger' },
          sinaiticus: { words: sinaiticus.get(ref) ?? [], authority: 'CNTR GA 01, selected base hand, declared glyph projection' },
          vulgate: { words: vulgate.get(ref)?.tokens ?? [], authority: 'Clementine Vulgate with registered verse-boundary concordance' },
          peshitta: { words: peshittaWords(book, Number(chapter), verse), authority: 'Pinned electronic Peshitta with registered verse-boundary concordance' },
          byzantine: { words: getByzantineVerse(book, Number(chapter), verse), authority: 'Robinson–Pierpont 2018' },
          bezaeGreek: { words: bezae.Greek[ref] ?? [], authority: 'ITSEE/IGNTP Bezae Greek, first encoded reading; independent XML extraction' },
          bezaeLatin: { words: bezae.Latin[ref] ?? [], authority: 'ITSEE/IGNTP Bezae Latin, first encoded reading; independent XML extraction' },
        },
        english: Object.fromEntries(Object.entries(english).map(([column, units]) => [column, units[ref] ?? null])),
      };
      count++;
    }
  }
  const file = `data/verse-verification/${book}.json`, bytes = JSON.stringify({ schema: 1, verses }) + '\n';
  fs.writeFileSync(path.join(root, file), bytes); outputs[file] = hash(bytes);
}
// Archival reports are not uploaded to production. Their source-dependent derived data
// is committed here; fresh builds verify every deployed primary source and output hash.
const sourceHashes = Object.fromEntries([...files].filter(([file]) => !file.startsWith('docs/')));
fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify({ schema: 1, hashPolicy: 'sha256-utf8-lf', verses: count, sourceHashes, outputHashes: outputs,
  scope: 'Source-transcription and edition comparisons. No manuscript-image or English-semantic certification is implied.' }, null, 2) + '\n');
console.log(JSON.stringify({ verses: count, sourceFiles: Object.keys(sourceHashes).length, outputs: Object.keys(outputs) }));
