import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { streamFingerprintInput } from '../lib/alignment/streamFingerprint.mjs';
import { pilotLinks } from './streams/pilot-links.mjs';

const root = path.resolve(import.meta.dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const bezae = read('docs/audits/bezae-display-certification.json');
if (bezae.status !== 'INTERNALLY_CERTIFIED_DISPLAY_SCOPE' || bezae.failures.length) throw new Error('Bezae source-occurrence certificate is not usable');
const bezaeByRef = new Map(bezae.decisions.map(d => [d.reference, d]));
const syriac = read('docs/audits/peshitta-alignment-certification.json');
const syriacByRef = new Map();
for (const d of syriac.decisions) {
  if (d.status !== 'CERTIFIED' || !['CONTEXTUAL_LEXICAL_CORRESPONDENCE','MULTIROW_LEXICAL_SPAN'].includes(d.relation)) continue;
  if ((d.lexicalEvidence?.evidenceFamilies?.length ?? 0) < 2) continue;
  syriacByRef.set(d.reference, [...(syriacByRef.get(d.reference) ?? []), d]);
}
const report = { schema: 1, baselineCommit: execFileSync('git', ['rev-parse','HEAD'], { cwd: root, encoding: 'utf8' }).trim(), verseFiles: 0, sourceCells: {}, linkedPilotVerses: [], invalidBezaeOccurrences: [], staleSyriacDecisions: [], absenceStates: {}, notes: [
  'Source-form certification is not cross-source semantic certification.',
  'Coptic positional/loanword placement is not promoted to a semantic link.',
  'Peshitta boundary spans and verse-level units are not lexical counterpart links.',
  'English allocations remain attached to their existing source parents or admitted phrase units.',
  'No corpus source or English text is rewritten.',
] };
const dir = path.join(root, 'data/alignment-streams'); fs.mkdirSync(dir, { recursive: true });
for (const gospel of ['matthew','mark','luke','john']) {
  const index = { schema: 1, verses: {} };
  const chapterDir = path.join(root,'data',gospel);
  for (const chapter of fs.readdirSync(chapterDir).filter(x => /^\d+$/.test(x)).sort((a,b)=>+a-+b)) for (const filename of fs.readdirSync(path.join(chapterDir,chapter)).filter(x=>/^\d+\.json$/.test(x)).sort((a,b)=>parseInt(a)-parseInt(b))) {
    const d = read(`data/${gospel}/${chapter}/${filename}`), ref = `${gospel} ${d.chapter}:${d.verse}`;
    report.verseFiles++;
    const evidence = { fingerprint: hash(streamFingerprintInput(d)), orders: {}, links: [], sourceSpecific: [] };
    const rows = new Map(d.rows.map(r => [r.id,r]));
    const b = bezaeByRef.get(ref);
    for (const side of ['greek','latin']) {
      const key = side === 'greek' ? 'bezaeGreek' : 'bezaeLatin';
      evidence.orders[key] = {};
      for (const item of b?.[side] ?? []) {
        if (rows.get(item.rowId)?.bezae?.[side] === item.text && Number.isInteger(item.sourceIndex)) evidence.orders[key][item.rowId] = item.sourceIndex + 1;
        else report.invalidBezaeOccurrences.push({ ref, side, rowId: item.rowId });
      }
    }
    for (const decision of syriacByRef.get(ref) ?? []) {
      const cell = rows.get(decision.rowId)?.peshitta;
      if (cell?.type !== 'text' || cell.text !== decision.syriac || cell.provenance?.sourceToken !== decision.sourceToken) { report.staleSyriacDecisions.push({ ref, rowId: decision.rowId }); continue; }
      const members = [`peshitta:${decision.rowId}`];
      // Use the certificate's named target and the source anchor only, not every
      // member of an old row or every word in its English phrase.
      for (const rowId of decision.targetRowIds) if (rows.get(rowId)?.vaticanus?.type === 'text') members.push(`vaticanus:${rowId}`);
      if (members.length > 1) evidence.links.push({ id: `peshitta:${decision.rowId}`, members, status: 'documented', basis: `Existing Peshitta certificate: ${decision.relation}; independent families ${decision.lexicalEvidence.evidenceFamilies.join(', ')}. Preserved as a comparative relation, not a new English translation or independent review.` });
    }
    const pilot = pilotLinks(ref,d);
    if (pilot.links.length) {
      report.linkedPilotVerses.push({ reference: ref, groups: pilot.links.length });
      // Explicit contextual examples supersede any older certificate link for
      // the same source occurrence; they do not change the underlying corpus.
      const ids = new Set(pilot.links.flatMap(l=>l.members));
      evidence.links = evidence.links.filter(l=>!l.members.some(id=>ids.has(id)));
      evidence.links.push(...pilot.links); evidence.sourceSpecific = pilot.sourceSpecific;
    }
    index.verses[`${d.chapter}:${d.verse}`] = evidence;
    for (const row of d.rows) for (const key of ['papyrus','coptic','vaticanus','sinaiticus','vulgate','bezae','peshitta','byzantine']) {
      const c = row[key]; if (!c) continue;
      if (['text','extant'].includes(c.type)) {
        const stats = report.sourceCells[key] ??= { cells: 0, occurrenceIndex: 0, provisionalCopticPlacement: 0 };
        stats.cells++; if (c.provenance?.sourceToken) stats.occurrenceIndex++;
        if (key === 'coptic' && c.provenance?.placementMethod !== 'source-order-and-lexical-alignment-reviewed') stats.provisionalCopticPlacement++;
      } else report.absenceStates[c.type] = (report.absenceStates[c.type] ?? 0) + 1;
    }
  }
  fs.writeFileSync(path.join(dir,`${gospel}.json`), JSON.stringify(index)+'\n');
}
fs.mkdirSync(path.join(root,'docs/audits/alignment-streams'),{recursive:true});
fs.writeFileSync(path.join(root,'docs/audits/alignment-streams/readiness.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({ verseFiles: report.verseFiles, pilotVerses: report.linkedPilotVerses, invalidBezaeOccurrences: report.invalidBezaeOccurrences.length, staleSyriacDecisions: report.staleSyriacDecisions.length },null,2));
if (report.invalidBezaeOccurrences.length) process.exitCode = 1;
