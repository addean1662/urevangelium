import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
async function load(relativePath) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { alignSequences } = await load('lib/alignment/sequenceAlign.js');

const BOOKS = { matthew: 'Mat', mark: 'Mrk', luke: 'Luk', john: 'Jhn' };
const TAGNT_FILE = path.join(ROOT, 'data/sources/greek-shared/TAGNT-Mat-Jhn-CC-BY.txt');
const TBESG_FILE = path.join(ROOT, 'data/sources/greek-shared/TBESG-CC-BY.txt');
const OUTPUT_DIR = path.join(ROOT, 'docs/audits/vaticanus-english-shadow');

function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function norm(text = '') {
  const value = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^α-ω]/g, '');
  // Comparison-only expansion of the same Vaticanus nomina-sacra forms used by
  // the certified INTF/CNTR shadow. The diplomatic Greek remains unchanged.
  const nominaSacra = {
    ισ: 'ιησουσ', ιυ: 'ιησου', ιν: 'ιησουν', ιη: 'ιησου',
    χσ: 'χριστοσ', χυ: 'χριστου', χν: 'χριστον', χω: 'χριστω',
    κσ: 'κυριοσ', κυ: 'κυριου', κν: 'κυριον', κω: 'κυριω', κε: 'κυριε',
    θσ: 'θεοσ', θυ: 'θεου', θν: 'θεον', θω: 'θεω',
    πνα: 'πνευμα', πνσ: 'πνευματοσ', πνι: 'πνευματι',
    // The ΠΡΣ contraction is homographic for nominative and genitive. The
    // comparison form covers the attested genitive; a nominative remains
    // withheld rather than being guessed from the contraction alone.
    πρσ: 'πατροσ', πρα: 'πατερα', πρι: 'πατρι', πρε: 'πατερ',
  };
  return nominaSacra[value] ?? value;
}
function pathsFor(gospel) {
  const base = path.join(ROOT, 'data', gospel);
  return fs.readdirSync(base, { withFileTypes: true }).filter(entry => entry.isDirectory() && /^\d+$/.test(entry.name)).flatMap(chapter =>
    fs.readdirSync(path.join(base, chapter.name)).filter(name => /^\d+\.json$/.test(name)).map(name => ({
      chapter: Number(chapter.name), verse: Number(name.slice(0, -5)), file: path.join(base, chapter.name, name),
    })),
  ).sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
}
function loadTbesg() {
  const entries = new Map();
  for (const line of fs.readFileSync(TBESG_FILE, 'utf8').split(/\r?\n/)) {
    if (!/^G\d{4}/.test(line)) continue;
    const cols = line.split('\t');
    const key = cols[0]?.match(/^G\d{4}/)?.[0];
    if (key && !entries.has(key)) entries.set(key, { strong: cols[0].trim(), lemma: cols[3]?.trim() || '', gloss: cols[6]?.trim() || '', full: cols[7]?.trim() || '' });
  }
  return entries;
}
function loadTagnt() {
  const verses = new Map();
  for (const line of fs.readFileSync(TAGNT_FILE, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z][a-z]+)\.(\d+)\.(\d+)#(\d+)=/);
    if (!match) continue;
    const cols = line.split('\t');
    const greek = (cols[1] || '').replace(/\s*\([^)]*\)\s*$/, '').replace(/[.,;·!?]+$/, '').trim();
    const strongs = (cols[3]?.split('=')[0].match(/G\d{4}/g) || []);
    const entry = {
      reference: `${match[1]}.${match[2]}.${match[3]}`, position: Number(match[4]), greek,
      contextualGloss: (cols[2] || '').trim(), strong: strongs.at(-1) || '', morphology: cols[3]?.split('=').slice(1).join('=') || '',
      dictionaryField: (cols[4] || '').trim(), editions: (cols[5] || '').trim(),
    };
    if (!verses.has(entry.reference)) verses.set(entry.reference, []);
    verses.get(entry.reference).push(entry);
  }
  return verses;
}

const tbesg = loadTbesg();
const tagnt = loadTagnt();
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const summary = {
  status: 'shadow-only', generatedAt: new Date().toISOString(),
  policy: 'INTF-certified live GA 03 Greek governs; TAGNT supplies contextual English; TBESG/Abbott-Smith must resolve the lexical identifier; OCR excluded',
  sources: { tagntSha256: sha256(TAGNT_FILE), tbesgSha256: sha256(TBESG_FILE) },
  gospels: {}, invariantErrors: [],
};

for (const [gospel, tagntBook] of Object.entries(BOOKS)) {
  const totals = { verses: 0, vaticanusWords: 0, exact: 0, normalized: 0, withheldAlignment: 0, withheldLexicon: 0, tagntVariantWordsSkipped: 0, omittedOrLacunaCells: 0 };
  const verses = [];
  for (const location of pathsFor(gospel)) {
    totals.verses++;
    const live = JSON.parse(fs.readFileSync(location.file, 'utf8'));
    const words = live.rows.flatMap((row, rowIndex) => row.vaticanus?.type === 'text' ? [{ rowIndex, rowId: row.id, greek: row.vaticanus.text }] : []);
    totals.vaticanusWords += words.length;
    totals.omittedOrLacunaCells += live.rows.filter(row => row.vaticanus?.type === 'omitted' || row.vaticanus?.type === 'lacuna').length;
    const reference = `${tagntBook}.${location.chapter}.${location.verse}`;
    const candidates = tagnt.get(reference) || [];
    const operations = alignSequences(words.map(word => norm(word.greek)), candidates.map(word => norm(word.greek)));
    const proposed = [];
    for (const operation of operations) {
      if (operation.sourceIndex === null) { totals.tagntVariantWordsSkipped++; continue; }
      const word = words[operation.sourceIndex];
      if (operation.displayIndex === null || !['exact', 'orthographic'].includes(operation.type)) {
        totals.withheldAlignment++;
        const candidate = operation.displayIndex === null ? null : candidates[operation.displayIndex];
        proposed.push({ rowId: word.rowId, greek: word.greek, status: 'withheld-alignment', operation, tagntCandidate: candidate });
        continue;
      }
      const candidate = candidates[operation.displayIndex];
      const lexicon = candidate.strong ? tbesg.get(candidate.strong) : null;
      if (!candidate.contextualGloss || !lexicon?.gloss) {
        totals.withheldLexicon++;
        proposed.push({ rowId: word.rowId, greek: word.greek, status: 'withheld-lexicon', tagnt: candidate, tbesg: lexicon || null });
        continue;
      }
      if (operation.type === 'exact') totals.exact++; else totals.normalized++;
      proposed.push({
        rowId: word.rowId, greek: word.greek, status: operation.type === 'exact' ? 'certifiable-exact' : 'certifiable-normalized',
        proposedGloss: { gloss: candidate.contextualGloss, source: 'TAGNT', tooltip: `${candidate.strong} · ${candidate.morphology} · TBESG: ${lexicon.gloss}${lexicon.lemma ? ` · ${lexicon.lemma}` : ''}` },
        alignment: { similarity: operation.similarity, tagntReference: candidate.reference, tagntPosition: candidate.position, tagntGreek: candidate.greek },
        lexicalVerification: { source: 'TBESG/Abbott-Smith', strong: candidate.strong, lemma: lexicon.lemma, briefGloss: lexicon.gloss },
      });
    }
    if (proposed.length !== words.length) summary.invariantErrors.push(`${gospel} ${location.chapter}:${location.verse}: ${proposed.length} proposals for ${words.length} words`);
    verses.push({ reference: `${gospel} ${location.chapter}:${location.verse}`, liveWords: words.length, tagntCandidates: candidates.length, proposed });
  }
  const certifiable = totals.exact + totals.normalized;
  summary.gospels[gospel] = { totals: { ...totals, certifiable, coveragePercent: totals.vaticanusWords ? Number((certifiable / totals.vaticanusWords * 100).toFixed(3)) : 100 }, verses };
  fs.writeFileSync(path.join(OUTPUT_DIR, `${gospel}.json`), `${JSON.stringify(summary.gospels[gospel], null, 2)}\n`);
}
summary.passed = summary.invariantErrors.length === 0;
fs.writeFileSync(path.join(OUTPUT_DIR, 'summary.json'), `${JSON.stringify({ ...summary, gospels: Object.fromEntries(Object.entries(summary.gospels).map(([gospel, value]) => [gospel, value.totals])) }, null, 2)}\n`);
console.log(JSON.stringify({ ...summary, gospels: Object.fromEntries(Object.entries(summary.gospels).map(([gospel, value]) => [gospel, value.totals])) }, null, 2));
process.exitCode = summary.passed ? 0 : 2;
