import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
async function load(relativePath) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { parseMesLine, comparisonForm } = await load('lib/sources/cntrMes.js');
const GOSPELS = { matthew: { book: 40, intfBook: 'B01' }, mark: { book: 41, intfBook: 'B02' }, luke: { book: 42, intfBook: 'B03' }, john: { book: 43, intfBook: 'B04' } };
const OUTPUT = path.join(ROOT, 'docs/audits/vaticanus-english-shadow/word-division-ledger.json');

function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function decode(text) { return text.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&apos;', "'"); }
function diplomatic(xml) { return decode(xml.replace(/<lb\b[^>]*break="no"[^>]*\/>/g, '').replace(/<cb\b[^>]*break="no"[^>]*\/>/g, '').replace(/<gap\b[^>]*\/>/g, '�').replace(/<[^>]+>/g, '').replace(/\s+/g, '')); }
function plain(text = '') { return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^α-ω�]/g, ''); }
function originalHand(body) { return body.replace(/<app\b[^>]*>([\s\S]*?)<\/app>/g, (_all, app) => app.match(/<rdg\b(?=[^>]*type="orig")(?=[^>]*hand="firsthand")[^>]*>([\s\S]*?)<\/rdg>/)?.[1] ?? ''); }
function parseIntf(file, expectedBook) {
  const verses = new Map();
  const xml = fs.readFileSync(file, 'utf8');
  for (const match of xml.matchAll(/<ab\b[^>]*\bn="B0(\d)K(\d+)V(\d+)"[^>]*(?<!\/)>([\s\S]*?)<\/ab>/g)) {
    if (`B0${match[1]}` !== expectedBook) continue;
    const words = [...originalHand(match[4]).matchAll(/<w\b[^>]*>([\s\S]*?)<\/w>/g)].map(word => ({ diplomatic: diplomatic(word[1]), rawXml: word[0] })).filter(word => word.diplomatic);
    verses.set(`${Number(match[2])}:${Number(match[3])}`, words);
  }
  return verses;
}
function pathsFor(gospel) {
  const base = path.join(ROOT, 'data', gospel);
  return fs.readdirSync(base, { withFileTypes: true }).filter(entry => entry.isDirectory() && /^\d+$/.test(entry.name)).flatMap(chapter =>
    fs.readdirSync(path.join(base, chapter.name)).filter(name => /^\d+\.json$/.test(name)).map(name => ({ chapter: Number(chapter.name), verse: Number(name.slice(0, -5)), file: path.join(base, chapter.name, name) })),
  );
}

const cntr = Object.fromEntries(Object.keys(GOSPELS).map(gospel => [gospel, new Map()]));
const cntrFile = path.join(ROOT, 'data/sources/vaticanus/03.txt');
for (const line of fs.readFileSync(cntrFile, 'utf8').split(/\r?\n/).filter(Boolean)) {
  const record = parseMesLine(line);
  const gospel = Object.entries(GOSPELS).find(([, config]) => config.book === record.reference.book)?.[0];
  if (gospel) cntr[gospel].set(`${record.reference.chapter}:${record.reference.verse}`, record.baseWords.filter(word => word.presence !== 'absent'));
}

const decisions = [];
const totals = { verses: 0, intfTokens: 0, uniqueExactSplits: 0, resultingLexicalWords: 0, unresolvedJoinedCandidates: 0, liveMappingErrors: 0 };
for (const [gospel, config] of Object.entries(GOSPELS)) {
  const intfFile = path.join(ROOT, `data/sources/vaticanus/intf/${gospel}.xml`);
  const intf = parseIntf(intfFile, config.intfBook);
  for (const location of pathsFor(gospel)) {
    totals.verses++;
    const reference = `${location.chapter}:${location.verse}`;
    const sourceWords = intf.get(reference) || [];
    const cntrWords = cntr[gospel].get(reference) || [];
    const live = JSON.parse(fs.readFileSync(location.file, 'utf8'));
    const liveWords = live.rows.filter(row => row.vaticanus?.type === 'text');
    totals.intfTokens += sourceWords.length;
    if (liveWords.length !== sourceWords.length) { totals.liveMappingErrors++; continue; }
    for (let sourceIndex = 0; sourceIndex < sourceWords.length; sourceIndex++) {
      const source = sourceWords[sourceIndex];
      const sourceForm = plain(source.diplomatic);
      if (sourceForm.length < 4 || sourceForm.includes('�')) continue;
      const matches = [];
      for (let start = 0; start < cntrWords.length; start++) {
        for (let length = 2; length <= 4 && start + length <= cntrWords.length; length++) {
          const words = cntrWords.slice(start, start + length);
          if (words.map(comparisonForm).join('') === sourceForm) matches.push({ start, words });
        }
      }
      if (matches.length === 1) {
        const match = matches[0];
        // Preserve the INTF characters exactly; CNTR supplies only the unique
        // boundary positions. Its MES overbar/glyph encoding must not leak
        // into the displayed Vaticanus transcription.
        const sourceCharacters = [...source.diplomatic];
        let offset = 0;
        const split = match.words.map(word => {
          const length = [...comparisonForm(word)].length;
          const value = sourceCharacters.slice(offset, offset + length).join('');
          offset += length;
          return value;
        });
        totals.uniqueExactSplits++;
        totals.resultingLexicalWords += split.length;
        decisions.push({ reference: `${gospel} ${reference}`, rowId: liveWords[sourceIndex].id, intfToken: source.diplomatic, intfRawXml: source.rawXml, decision: 'certified-word-division', rule: 'VWD-001-UNIQUE-CNTR-CONSECUTIVE-EXACT-SEGMENTATION', cntrStart: match.start, cntrTokens: match.words.map(word => word.diplomatic), split, comparisonInvariant: split.join('') === source.diplomatic && split.map(plain).join('') === sourceForm });
      } else if (matches.length > 1) {
        totals.unresolvedJoinedCandidates++;
        decisions.push({ reference: `${gospel} ${reference}`, rowId: liveWords[sourceIndex].id, intfToken: source.diplomatic, decision: 'withheld-nonunique-word-division', matches: matches.map(match => match.words.map(word => word.diplomatic)) });
      }
    }
  }
}

const output = { status: 'shadow-only', generatedAt: new Date().toISOString(), policy: 'Split an INTF w-token only when one unique sequence of two to four consecutive CNTR GA 03 base-hand tokens has the identical normalized character sequence.', sources: { intfDocument: 20003, cntrRevision: '4c0e9f94117ec3dc4ae40094aec044bb7a416a53', cntrSha256: sha256(cntrFile) }, totals, passed: totals.liveMappingErrors === 0 && decisions.filter(item => item.decision === 'certified-word-division').every(item => item.comparisonInvariant), decisionSha256: crypto.createHash('sha256').update(JSON.stringify(decisions)).digest('hex'), decisions };
fs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, OUTPUT), ...totals, passed: output.passed, decisionSha256: output.decisionSha256 }, null, 2));
process.exitCode = output.passed ? 0 : 2;
