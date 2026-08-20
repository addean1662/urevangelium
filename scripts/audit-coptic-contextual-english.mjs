import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const words = (value) => String(value ?? '').trim().split(/\s+/u).filter(Boolean);
const normalize = (value) => String(value ?? '')
  .normalize('NFKD')
  .replace(/\p{M}/gu, '')
  .toLocaleLowerCase('en')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();
const contextualCore = (value) => normalize(value)
  .replace(/^(?:and|of|to|the|in|from|by|for)\s+/u, '')
  .trim();

const totals = {
  sourceWordGroups: 0,
  displayedEnglish: 0,
  crumLexicalAid: 0,
  scriptoriumAutomatic: 0,
  generatedContextualAid: 0,
  hornerPublishedTranslation: 0,
  otherEnglish: 0,
  clearDisplayViolations: 0,
  contextualReviewRequired: 0,
  contextualDiagnosticsPassed: 0,
};
const findings = [];

for (const gospel of GOSPELS) {
  const gospelDir = path.join(ROOT, 'data', gospel);
  const chapters = fs.readdirSync(gospelDir).filter((name) => /^\d+$/.test(name)).sort((a, b) => Number(a) - Number(b));
  for (const chapter of chapters) {
    const files = fs.readdirSync(path.join(gospelDir, chapter)).filter((name) => /^\d+\.json$/.test(name)).sort((a, b) => Number.parseInt(a) - Number.parseInt(b));
    for (const fileName of files) {
      const verse = Number.parseInt(fileName);
      const file = path.join(gospelDir, chapter, fileName);
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const [rowIndex, row] of data.rows.entries()) {
        const cell = row.coptic;
        if (cell?.type !== 'text') continue;
        totals.sourceWordGroups++;
        const english = cell.gloss?.gloss;
        if (!english) continue;
        totals.displayedEnglish++;
        const source = cell.gloss?.source ?? 'unknown';
        if (source === 'Crum') totals.crumLexicalAid++;
        else if (source === 'Scriptorium') totals.scriptoriumAutomatic++;
        else if (source === 'System' && cell.gloss?.generated) totals.generatedContextualAid++;
        else if (source === 'Horner') totals.hornerPublishedTranslation++;
        else totals.otherEnglish++;

        const location = { gospel, chapter: Number(chapter), verse, rowId: row.id, sourceToken: cell.provenance?.sourceToken ?? null, coptic: cell.text, english, source };
        const reasons = [];
        let severity = null;

        if (/[()]/u.test(english)) {
          severity = 'clear-display-violation';
          reasons.push('PARENTHETICAL_DICTIONARY_DESCRIPTION_IN_DISPLAY');
        }
        if (source === 'Scriptorium' && words(english).length > 1) {
          severity = 'clear-display-violation';
          reasons.push('MULTIWORD_ENTITY_EXPANSION_IN_SINGLE_SOURCE_CELL');
        }
        const witnessKeys = ['papyrus', 'vaticanus', 'sinaiticus', 'vulgate', 'bezae', 'peshitta', 'byzantine'];
        const peers = witnessKeys
          .map((key) => ({ key, english: row[key]?.gloss?.gloss ?? null }))
          .filter((peer) => peer.english && peer.english !== '↳');
        const peerForms = [...new Set(peers.map((peer) => normalize(peer.english)).filter(Boolean))];
        const englishForm = normalize(english);
        const exactPeerSupport = peers.filter((peer) => contextualCore(peer.english) === englishForm).map((peer) => peer.key);
        const contextRows = data.rows.slice(Math.max(0, rowIndex - 2), rowIndex + 3);
        const windowPeerSupport = witnessKeys.filter((key) => contextRows.some((contextRow) => contextualCore(contextRow[key]?.gloss?.gloss) === englishForm));
        if ((source === 'Scriptorium' || (source === 'System' && cell.gloss?.generated)) && exactPeerSupport.length === 0 && windowPeerSupport.length < 2) {
          if (!severity) severity = 'contextual-review-required';
          reasons.push('NO_COMPARATIVE_CONTEXT_CORROBORATION');
        }

        if (severity) {
          if (severity === 'clear-display-violation') totals.clearDisplayViolations++;
          else totals.contextualReviewRequired++;
          findings.push({ ...location, severity, reasons, automaticAnnotation: cell.gloss?.automaticAnnotation === true, tooltip: cell.gloss?.tooltip ?? null, peerForms, exactPeerSupport, windowPeerSupport });
        } else {
          totals.contextualDiagnosticsPassed++;
        }
      }
    }
  }
}

const report = {
  status: 'contextual-diagnostic-complete-not-scholarly-adjudication',
  generatedAt: new Date().toISOString(),
  scope: 'Every live Sahidic source word-group and every displayed Sahidic English value in Matthew through John.',
  governingLimits: [
    'The audit does not translate Coptic.',
    'Other traditions are diagnostic evidence only and never supply Sahidic English.',
    'SCRIPTORIUM automatic entity identity is not treated as contextual translation.',
    'Questionable output fails to a review class rather than being silently replaced.',
  ],
  totals,
  findings,
};
report.findingsSha256 = sha(JSON.stringify(findings));
const output = path.join(ROOT, 'docs/audits/coptic-contextual-english-audit.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, totals, findingsSha256: report.findingsSha256, output: path.relative(ROOT, output) }, null, 2));
