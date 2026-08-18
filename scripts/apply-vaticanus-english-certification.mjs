import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const AUDIT = path.join(ROOT, 'docs/audits/vaticanus-english-shadow');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const SECONDARY = JSON.parse(fs.readFileSync(path.join(AUDIT, 'secondary-source-ledger.json'), 'utf8'));
const PRIMARY = JSON.parse(fs.readFileSync(path.join(AUDIT, 'adjudication-ledger.json'), 'utf8'));
const hash = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const certified = new Map();

function add(key, record) {
  if (certified.has(key)) throw new Error(`Duplicate certified English decision: ${key}`);
  certified.set(key, record);
}

for (const gospel of GOSPELS) {
  const artifact = JSON.parse(fs.readFileSync(path.join(AUDIT, `${gospel}.json`), 'utf8'));
  for (const verse of artifact.verses) for (const item of verse.proposed) {
    if (!item.status.startsWith('certifiable-')) continue;
    const reference = verse.reference.startsWith(`${gospel} `) ? verse.reference : `${gospel} ${verse.reference}`;
    add(`${reference}|${item.rowId}`, {
      gloss: item.proposedGloss,
      certification: { layer: 'primary-shadow', rule: item.status, alignment: item.alignment, lexicalVerification: item.lexicalVerification },
    });
  }
}

for (const item of PRIMARY.decisions.filter((entry) => entry.decision === 'certified')) {
  add(`${item.reference}|${item.rowId}`, {
    gloss: { gloss: item.proposedGloss, source: 'TAGNT', tooltip: `${item.evidence.strong} · ${item.evidence.morphology} · TBESG: ${item.evidence.tbesgGloss} · ${item.evidence.tbesgLemma}` },
    certification: { layer: 'primary-adjudication', rule: item.rule, evidence: item.evidence },
  });
}

for (const item of SECONDARY.decisions.filter((entry) => entry.secondaryDecision === 'certified-lexical')) {
  add(`${item.reference}|${item.rowId}`, {
    gloss: { gloss: item.proposedGloss, source: 'Lexical', deviation: true, tooltip: `Certified lexical annotation · ${item.rule}` },
    certification: { layer: 'secondary-adjudication', rule: item.rule, evidence: item.evidence },
  });
}

if (certified.size !== 63409) throw new Error(`Expected 63,409 certified decisions, found ${certified.size}`);
const unresolved = SECONDARY.decisions.filter((entry) => entry.secondaryDecision === 'withheld');
if (unresolved.length !== 137) throw new Error(`Expected 137 unresolved decisions, found ${unresolved.length}`);
const unresolvedKeys = new Set(unresolved.map((item) => `${item.reference}|${item.rowId}`));
const before = [], after = [];
let applied = 0, withheldBlank = 0;

for (const gospel of GOSPELS) {
  const gospelDir = path.join(ROOT, 'data', gospel);
  for (const chapter of fs.readdirSync(gospelDir).filter((name) => /^\d+$/.test(name)).sort((a, b) => Number(a) - Number(b))) {
    const chapterDir = path.join(gospelDir, chapter);
    for (const filename of fs.readdirSync(chapterDir).filter((name) => /^\d+\.json$/.test(name)).sort((a, b) => Number.parseInt(a) - Number.parseInt(b))) {
      const file = path.join(chapterDir, filename);
      const verse = JSON.parse(fs.readFileSync(file, 'utf8'));
      const reference = `${gospel} ${chapter}:${Number.parseInt(filename)}`;
      let changed = false;
      for (const row of verse.rows) {
        const cell = row.vaticanus;
        if (cell?.type !== 'text') continue;
        const key = `${reference}|${row.id}`;
        const core = { reference, rowId: row.id, text: cell.text, type: cell.type, otherColumns: Object.fromEntries(Object.entries(row).filter(([name]) => name !== 'vaticanus')), provenance: { ...cell.provenance } };
        delete core.provenance.englishCertification;
        before.push(core);
        const decision = certified.get(key);
        if (decision) {
          cell.gloss = decision.gloss;
          cell.provenance = { ...cell.provenance, englishCertification: { ...decision.certification, decisionSha256: SECONDARY.decisionSha256, status: 'internally-certified' } };
          applied++;
          changed = true;
        } else if (unresolvedKeys.has(key)) {
          if (cell.gloss) { delete cell.gloss; changed = true; }
          if (cell.provenance?.englishCertification) { delete cell.provenance.englishCertification; changed = true; }
          withheldBlank++;
        } else throw new Error(`Vaticanus text cell has no English decision: ${key}`);
        const afterCore = { reference, rowId: row.id, text: cell.text, type: cell.type, otherColumns: Object.fromEntries(Object.entries(row).filter(([name]) => name !== 'vaticanus')), provenance: { ...cell.provenance } };
        delete afterCore.provenance.englishCertification;
        after.push(afterCore);
      }
      if (changed) fs.writeFileSync(file, `${JSON.stringify(verse, null, 2)}\n`);
    }
  }
}

if (hash(before) !== hash(after)) throw new Error('A Greek cell, row, or another tradition changed while applying English');
if (applied !== 63409 || withheldBlank !== 137) throw new Error(`Application accounting failed: applied=${applied}, withheld=${withheldBlank}`);
const publicExceptions = unresolved.map((item) => {
  const [, gospel, chapter, verse] = item.reference.match(/^(\w+) (\d+):(\d+)$/) || [];
  return { gospel, chapter: Number(chapter), verse: Number(verse), rowId: item.rowId, greek: item.vaticanusGreek, category: item.rule === 'VEA-W07-AMBIGUOUS-ANALYSIS' ? 'Ambiguous exact-form analysis' : 'No exact morphology-index analysis', rule: item.rule, rationale: item.rationale, alignedCandidate: item.candidate ? { greek: item.candidate.greek, gloss: item.candidate.contextualGloss, strong: item.candidate.strong } : null };
});
fs.writeFileSync(path.join(ROOT, 'data/vaticanus-english-exceptions.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), decisionSha256: SECONDARY.decisionSha256, certified: 63409, total: 63546, unresolved: 137, cases: publicExceptions }, null, 2)}\n`);
const report = { status: 'applied', applied, withheldBlank, invariantSha256: hash(after), decisionSha256: SECONDARY.decisionSha256 };
fs.writeFileSync(path.join(AUDIT, 'live-application.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
