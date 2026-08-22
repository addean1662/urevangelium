import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const TF = path.join(ROOT, 'data/sources/peshitta/etcbc-syrnt/tf/0.1');
const OUTPUT = path.join(ROOT, 'docs/audits/peshitta-etcbc-morphology-concordance.json');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];

function bodyLines(filename) {
  return fs.readFileSync(path.join(TF, filename), 'utf8').split(/\r?\n/u)
    .filter((line) => line && !line.startsWith('@'));
}

function nodeFeature(filename) {
  const result = new Map();
  let node = 1;
  for (const line of bodyLines(filename)) {
    const match = line.match(/^(\d+)(?:-(\d+))?\t(.*)$/u);
    if (match) {
      node = Number(match[1]);
      const last = Number(match[2] ?? match[1]);
      for (; node <= last; node += 1) result.set(node, match[3]);
    } else {
      result.set(node, line);
      node += 1;
    }
  }
  return result;
}

function slots(value) {
  return value.split(',').flatMap((part) => {
    const [first, last = first] = part.split('-').map(Number);
    return Array.from({ length: last - first + 1 }, (_, index) => first + index);
  });
}

const types = nodeFeature('otype.tf');
const slotEdges = nodeFeature('oslots.tf');
const books = nodeFeature('book@en.tf');
const chapters = nodeFeature('chapter.tf');
const verses = nodeFeature('verse.tf');
const words = nodeFeature('word.tf');
const morphFeatures = Object.fromEntries([
  'sp', 'stem', 'prefix', 'suffix', 'ps', 'gn', 'nu', 'st', 'vt', 'vs',
  'sfps', 'sfgn', 'sfnu', 'sfcontract', 'nmtyp', 'ntyp', 'ptctyp', 'prtyp',
].map((name) => [name, nodeFeature(`${name}.tf`)]));

const location = new Map();
for (const [node, type] of types) {
  if (!['book', 'chapter', 'verse'].includes(type)) continue;
  const value = type === 'book' ? books.get(node) : type === 'chapter' ? Number(chapters.get(node)) : Number(verses.get(node));
  for (const slot of slots(slotEdges.get(node))) {
    const current = location.get(slot) ?? {};
    current[type] = value;
    location.set(slot, current);
  }
}

const tfByReference = new Map();
for (const [slot, word] of words) {
  const loc = location.get(slot);
  if (!loc || !GOSPELS.includes(loc.book?.toLowerCase())) continue;
  const reference = `${loc.book.toLowerCase()} ${loc.chapter}:${loc.verse}`;
  if (!tfByReference.has(reference)) tfByReference.set(reference, []);
  tfByReference.get(reference).push({
    slot,
    word,
    morphology: Object.fromEntries(Object.entries(morphFeatures).map(([name, feature]) => [name, feature.get(slot) ?? null])),
  });
}

const liveByReference = new Map();
for (const gospel of GOSPELS) {
  for (const chapter of fs.readdirSync(path.join(ROOT, 'data', gospel))) {
    const chapterDir = path.join(ROOT, 'data', gospel, chapter);
    if (!fs.statSync(chapterDir).isDirectory()) continue;
    for (const filename of fs.readdirSync(chapterDir).filter((name) => /^\d+\.json$/u.test(name))) {
      const document = JSON.parse(fs.readFileSync(path.join(chapterDir, filename), 'utf8'));
      const reference = `${gospel} ${chapter}:${filename.replace('.json', '')}`;
      liveByReference.set(reference, document.rows
        .filter((row) => row.peshitta?.type === 'text')
        .sort((a, b) => a.peshitta.provenance.sourceToken - b.peshitta.provenance.sourceToken)
        .map((row) => ({ rowId: row.id, word: row.peshitta.text, sourceToken: row.peshitta.provenance.sourceToken })));
    }
  }
}

function lcsPairs(left, right) {
  const dp = Array.from({ length: left.length + 1 }, () => new Uint16Array(right.length + 1));
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      dp[i][j] = left[i].word === right[j].word ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i].word === right[j].word && dp[i][j] === dp[i + 1][j + 1] + 1) {
      pairs.push([i, j]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i += 1;
    else j += 1;
  }
  return pairs;
}

const records = [];
let exactVerses = 0;
let exactTokens = 0;
let mappedTokens = 0;
for (const [reference, live] of liveByReference) {
  const tf = tfByReference.get(reference) ?? [];
  const exact = live.length === tf.length && live.every((token, index) => token.word === tf[index].word);
  if (exact) {
    exactVerses += 1;
    exactTokens += live.length;
  }
  const pairs = exact ? live.map((_, index) => [index, index]) : lcsPairs(live, tf);
  mappedTokens += pairs.length;
  records.push({
    reference,
    exact,
    liveTokenCount: live.length,
    tfTokenCount: tf.length,
    mappedTokens: pairs.map(([liveIndex, tfIndex]) => ({ ...live[liveIndex], tfSlot: tf[tfIndex].slot, tfToken: tfIndex + 1, morphology: tf[tfIndex].morphology })),
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  authority: 'ETCBC/syrnt Text-Fabric corpus, derived from the SEDRA database export',
  pinnedCommit: 'dae3eb6ff62b9b272fb503646796c25d248175ce',
  totals: {
    liveVerses: liveByReference.size,
    tfVerses: tfByReference.size,
    exactVerses,
    nonExactVerses: liveByReference.size - exactVerses,
    exactTokens,
    mappedTokens,
    unmappedTokens: [...liveByReference.values()].reduce((sum, tokens) => sum + tokens.length, 0) - mappedTokens,
  },
  records,
};
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.totals, null, 2));
