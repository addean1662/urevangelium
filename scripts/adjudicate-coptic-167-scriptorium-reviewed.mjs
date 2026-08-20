import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const APPLY = process.argv.includes('--apply');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');

// SCRIPTORIUM supplies the contextual English. Urevangelium records only the
// source-to-group alignment and does not rewrite the published wording.
const reviewed = [
  {
    key: 'Matt.6.25:10', sourceToken: 10, allocation: 'what you will drink',
    scriptoriumVerseTranslation: "Therefore, I tell you, don't be anxious for your life: what you will eat, or what you will drink; nor yet for your body, what you will wear. Isn't life more than food, and the body more than clothing?",
  },
  {
    key: 'Matt.6.25:14', sourceToken: 14, allocation: 'what you will wear',
    spanId: 'scriptorium-matt-6-25-wear', spanRole: 'start',
    scriptoriumVerseTranslation: "Therefore, I tell you, don't be anxious for your life: what you will eat, or what you will drink; nor yet for your body, what you will wear. Isn't life more than food, and the body more than clothing?",
  },
  {
    key: 'Matt.6.25:17', sourceToken: 15, allocation: '',
    spanId: 'scriptorium-matt-6-25-wear', spanRole: 'continuation',
    scriptoriumVerseTranslation: "Therefore, I tell you, don't be anxious for your life: what you will eat, or what you will drink; nor yet for your body, what you will wear. Isn't life more than food, and the body more than clothing?",
  },
  {
    key: 'Matt.24.7:10', sourceToken: 9, allocation: 'famines',
    scriptoriumVerseTranslation: 'For nation will rise against nation, and kingdom against kingdom; and there will be famines, plagues, and earthquakes in various places.',
  },
];

const decisions = reviewed.map((entry) => {
  const match = entry.key.match(/^(Matt|Mark|Luke|John)\.(\d+)\.(\d+):(\d+)$/);
  if (!match) throw new Error(`Invalid key: ${entry.key}`);
  const [, book, chapter, verse, rowIndexText] = match;
  if (entry.allocation && !entry.scriptoriumVerseTranslation.includes(entry.allocation)) {
    throw new Error(`${entry.key}: allocation is not verbatim SCRIPTORIUM English`);
  }
  const decision = {
    ...entry,
    gospel: book === 'Matt' ? 'matthew' : book.toLowerCase(),
    chapter,
    verse,
    rowIndex: Number(rowIndexText),
    method: 'SCRIPTORIUM_CONTEXTUAL_TRANSLATION_UNIT_REVIEWED_ALIGNMENT',
    status: 'internally-reviewed-source-alignment',
  };
  decision.decisionSha256 = sha(JSON.stringify(decision));
  return decision;
});

const discrepancy = {
  key: 'Luke.22.15:6',
  sourceToken: 8,
  coptic: 'ϣⲛⲙ',
  classification: 'PINNED_SOURCE_GROUP_NOT_PRESENT_IN_HORNER_COPTIC',
  disposition: 'WITHHOLD_ENGLISH_PENDING_SOURCE_EDITION_CORRECTION_OR_SPECIALIST_REVIEW',
  scriptoriumVerseTranslation: "He said to them, 'I have earnestly desired to eat this Passover with you before I suffer,",
  hornerEnglish: 'Said he to them, With a desire I desired to eat this Paskha with you before I die.',
  hornerFacsimile: {
    volume: 2,
    pdfFile: 'copticversionofn02hornuoft.pdf',
    pdfPage: 418,
    printedPage: 410,
    observation: 'Horner Coptic proceeds from the eat construction directly to this Passover; no corresponding ϣⲛⲙ group is printed.',
  },
};
discrepancy.decisionSha256 = sha(JSON.stringify(discrepancy));

if (APPLY) {
  const files = new Map();
  for (const decision of decisions) {
    const file = path.join(ROOT, 'data', decision.gospel, decision.chapter, `${decision.verse}.json`);
    const data = files.get(file) ?? JSON.parse(fs.readFileSync(file, 'utf8'));
    files.set(file, data);
    const cell = data.rows[decision.rowIndex]?.coptic;
    if (cell?.provenance?.sourceToken !== decision.sourceToken) throw new Error(`${decision.key}: source-token identity changed`);
    if (cell.gloss?.gloss && cell.provenance?.scriptoriumReviewedAlignment167?.decisionSha256 !== decision.decisionSha256) {
      throw new Error(`${decision.key}: reviewed alignment would overwrite English`);
    }
    cell.gloss = {
      gloss: decision.allocation,
      source: 'Scriptorium',
      automaticAnnotation: true,
      tooltip: 'Coptic SCRIPTORIUM · contextual translation unit aligned to the pinned Sahidica word-group',
      ...(decision.spanId ? { spanId: decision.spanId, spanRole: decision.spanRole } : {}),
    };
    cell.provenance.scriptoriumReviewedAlignment167 = {
      decisionSha256: decision.decisionSha256,
      method: decision.method,
      status: decision.status,
    };
  }

  const lukeFile = path.join(ROOT, 'data', 'luke', '22', '15.json');
  const lukeData = files.get(lukeFile) ?? JSON.parse(fs.readFileSync(lukeFile, 'utf8'));
  files.set(lukeFile, lukeData);
  const lukeCell = lukeData.rows[6]?.coptic;
  if (lukeCell?.provenance?.sourceToken !== discrepancy.sourceToken || lukeCell?.text !== discrepancy.coptic) {
    throw new Error(`${discrepancy.key}: source identity changed`);
  }
  if (lukeCell.gloss?.gloss) throw new Error(`${discrepancy.key}: discrepancy review would remove existing English`);
  lukeCell.provenance.sourceDiscrepancy = {
    classification: discrepancy.classification,
    disposition: discrepancy.disposition,
    decisionSha256: discrepancy.decisionSha256,
  };

  for (const [file, data] of files) fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

const report = {
  generatedAt: new Date().toISOString(),
  applied: APPLY,
  historicalCohort: 167,
  scriptoriumReviewedAdmissions: decisions.length,
  sourceDiscrepanciesWithheld: 1,
  unresolvedWithoutClassification: 0,
  decisions,
  discrepancies: [discrepancy],
};
fs.writeFileSync(path.join(ROOT, 'docs', 'audits', 'coptic-167-scriptorium-reviewed-adjudication.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ applied: APPLY, admitted: decisions.length, withheldAsSourceDiscrepancy: 1, unresolvedWithoutClassification: 0 }, null, 2));
