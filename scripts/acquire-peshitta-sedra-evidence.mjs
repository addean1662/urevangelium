import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'data');
const OUTPUT = path.join(DATA, 'sources/peshitta/sedra-inserted-token-evidence.json');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];

const tokens = new Set();
for (const gospel of GOSPELS) {
  const gospelDir = path.join(DATA, gospel);
  for (const chapter of fs.readdirSync(gospelDir)) {
    const chapterDir = path.join(gospelDir, chapter);
    if (!fs.statSync(chapterDir).isDirectory()) continue;
    for (const filename of fs.readdirSync(chapterDir).filter((name) => /^\d+\.json$/u.test(name))) {
      const document = JSON.parse(fs.readFileSync(path.join(chapterDir, filename), 'utf8'));
      for (const row of document.rows) {
        if (row.id.startsWith('peshitta-') && row.peshitta?.type === 'text') tokens.add(row.peshitta.text);
      }
    }
  }
}

function plainGloss(value) {
  return value.replace(/<[^>]+>/gu, ' ').replace(/&[^;]+;/gu, ' ').replace(/\s+/gu, ' ').trim();
}

async function fetchToken(token) {
  const url = `https://sedra.bethmardutho.org/api/word/${encodeURIComponent(token)}.json`;
  const response = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'Urevangelium-source-audit/1.0' } });
  if (!response.ok) return { token, url, status: response.status, analyses: [] };
  const raw = await response.json();
  const analyses = Array.isArray(raw) ? raw.map((entry) => ({
    wordId: entry.word?.id ?? null,
    lexemeId: entry.lexeme?.id ?? null,
    syriac: entry.syriac ?? null,
    stem: entry.stem ?? null,
    western: entry.western ?? null,
    eastern: entry.eastern ?? null,
    category: entry.category ?? null,
    tense: entry.tense ?? null,
    kaylo: entry.kaylo ?? null,
    number: entry.number ?? null,
    person: entry.person ?? null,
    gender: entry.gender ?? null,
    isEnclitic: entry.isEnclitic ?? null,
    isTheoretical: entry.isTheoretical ?? null,
    englishGlosses: [...new Set((entry.glosses?.eng ?? []).map(plainGloss).filter(Boolean))].sort(),
  })) : [];
  return { token, url, status: response.status, analyses };
}

const queue = [...tokens].sort((a, b) => a.localeCompare(b, 'syr'));
const records = [];
const concurrency = 6;
let cursor = 0;
async function worker() {
  while (cursor < queue.length) {
    const index = cursor;
    cursor += 1;
    const token = queue[index];
    try {
      records[index] = await fetchToken(token);
    } catch (error) {
      records[index] = { token, status: 'FETCH_ERROR', error: String(error), analyses: [] };
    }
  }
}
await Promise.all(Array.from({ length: concurrency }, () => worker()));

const report = {
  generatedAt: new Date().toISOString(),
  authority: 'SEDRA IV API, Beth Mardutho',
  apiSpecification: 'https://sedra.bethmardutho.org/api/openapi',
  scope: 'Lexical and morphological evidence for unique tokens on the 728 inserted Peshitta holding rows; audit use only.',
  tokenCount: queue.length,
  resolved: records.filter((record) => record.analyses.length > 0).length,
  unresolved: records.filter((record) => record.analyses.length === 0).length,
  records,
};
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ tokenCount: report.tokenCount, resolved: report.resolved, unresolved: report.unresolved }, null, 2));
