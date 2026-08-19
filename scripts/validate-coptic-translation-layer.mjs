import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const pilot = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/horner-pilot/manifest.json'), 'utf8'));
const admittedUnits = new Map((pilot.translationUnits ?? []).filter((unit) => unit.decision === 'admit').map((unit) => [unit.id, unit]));
const totals = { copticTextCells: 0, lexicalAidCells: 0, scholarlyAutomaticEnglishCells: 0, displayedTranslationCells: 0, blankCells: 0, violations: 0 };
const violations = [];

for (const gospel of GOSPELS) {
  for (const chapter of fs.readdirSync(path.join(ROOT, 'data', gospel)).filter((name) => /^\d+$/.test(name))) {
    for (const filename of fs.readdirSync(path.join(ROOT, 'data', gospel, chapter)).filter((name) => /^\d+\.json$/.test(name))) {
      const verse = filename.slice(0, -5);
      const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', gospel, chapter, filename), 'utf8'));
      for (const row of data.rows) {
        const cell = row.coptic;
        if (cell?.type !== 'text') continue;
        totals.copticTextCells++;
        if (!cell.gloss) { totals.blankCells++; continue; }
        if (cell.gloss.source === 'Crum') {
          totals.lexicalAidCells++;
          if (cell.gloss.generated) violations.push({ gospel, reference: `${chapter}:${verse}`, rowId: row.id, reason: 'Lexical aid cannot be generated English' });
          continue;
        }
        if (cell.gloss.source === 'Horner') {
          totals.displayedTranslationCells++;
          const unitId = cell.provenance?.translationUnitId;
          const unit = admittedUnits.get(unitId);
          if (!unit) violations.push({ gospel, reference: `${chapter}:${verse}`, rowId: row.id, reason: 'Displayed Horner translation lacks an admitted published-translation unit', unitId: unitId ?? null });
          if (cell.gloss.generated) violations.push({ gospel, reference: `${chapter}:${verse}`, rowId: row.id, reason: 'Published Horner translation cannot be marked generated' });
          continue;
        }
        if (cell.gloss.source === 'Scriptorium') {
          totals.scholarlyAutomaticEnglishCells++;
          if (cell.gloss.automaticAnnotation !== true) violations.push({ gospel, reference: `${chapter}:${verse}`, rowId: row.id, reason: 'SCRIPTORIUM entity English must be marked as an automatic annotation' });
          continue;
        }
        violations.push({ gospel, reference: `${chapter}:${verse}`, rowId: row.id, reason: `Forbidden Sahidic English source: ${cell.gloss.source}` });
      }
    }
  }
}

totals.violations = violations.length;
const report = { status: violations.length ? 'failed' : 'passed', generatedAt: new Date().toISOString(), invariants: ['CERTIFIED_SAHIDIC_TRANSLATION is a subset of ADMITTED_PUBLISHED_SAHIDIC_TRANSLATION_UNITS', 'SCHOLARLY_AUTOMATIC_ANNOTATION is visibly labeled and excluded from certified translation totals', 'LEXICAL_AID, TAGNT_EVIDENCE, GENERATED_ENGLISH, AI_OUTPUT, and OCR_OUTPUT are disjoint from CERTIFIED_SAHIDIC_TRANSLATION'], totals, violations };
fs.writeFileSync(path.join(ROOT, 'docs/audits/coptic-translation-layer-invariants.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, totals }, null, 2));
if (violations.length) process.exitCode = 1;
