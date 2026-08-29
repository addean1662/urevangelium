import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'data');
const AUDIT_FILE = path.join(ROOT, 'docs/audits/peshitta-semantic-alignment.json');
const OUTPUT = path.join(ROOT, 'docs/audits/peshitta-shared-row-realignment.json');
const APPLY = process.argv.includes('--apply');
const COLUMNS = {
  greek: ['papyrus', 'vaticanus', 'sinaiticus', 'byzantine'],
  latin: ['vulgate'],
  coptic: ['coptic'],
};
const COMPOUNDS = [{
  source: ['\u0712\u0712\u071d\u072c', '\u0720\u071a\u0721'],
  target: 'bethlehem',
  leading: 'in',
}];
const IRREGULAR = new Map(Object.entries({
  judaea: 'judea', jesus: 'jesu', came: 'come', coming: 'come',
  arrived: 'come', arriving: 'come', born: 'bear', begotten: 'bear',
  days: 'day', magi: 'magi',
}));

function lemma(value) {
  const word = value.toLocaleLowerCase('en').replace(/[^a-z]/gu, '');
  if (IRREGULAR.has(word)) return IRREGULAR.get(word);
  if (word.length > 5 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith('ed')) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1);
  return word;
}
function tokens(value) {
  return new Set((value ?? '').match(/[A-Za-z]+/gu)?.map(lemma).filter(Boolean) ?? []);
}
function gloss(cell) {
  if (!cell || cell.type !== 'text') return '';
  return cell.gloss?.gloss ?? [cell.greekGloss?.gloss, cell.latinGloss?.gloss].filter(Boolean).join(' ');
}
function familySupport(row, term) {
  let count = 0;
  for (const witnesses of Object.values(COLUMNS)) {
    if (witnesses.some((column) => tokens(gloss(row[column])).has(term))) count += 1;
  }
  return count;
}
function parseReference(reference) {
  const match = reference.match(/^(matthew|mark|luke|john) (\d+):(\d+)$/u);
  if (!match) throw new Error(`Invalid reference: ${reference}`);
  return { gospel: match[1], chapter: match[2], verse: match[3] };
}
function fileFor(reference) {
  const item = parseReference(reference);
  return path.join(DATA, item.gospel, item.chapter, `${item.verse}.json`);
}

const audit = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
const auditDecisionByKey = new Map(audit.decisions.map((decision) => [`${decision.reference}#${decision.rowId}`, decision]));
const byReference = new Map();
for (const decision of audit.decisions) {
  if (decision.classification !== 'STRONG_UNIQUE_DISPLACEMENT_CANDIDATE') continue;
  if (decision.bestCandidate.distance > 6) continue;
  if (!byReference.has(decision.reference)) byReference.set(decision.reference, []);
  byReference.get(decision.reference).push({
    sourceId: decision.rowId,
    targetId: decision.bestCandidate.rowId,
    authority: 'sedra-independent-two-family',
    concepts: decision.bestCandidate.sharedConcepts.map((item) => item.concept),
    candidateOptions: [decision.bestCandidate, ...(decision.alternateCandidates ?? [])].filter((candidate) => candidate.distance <= 6 && candidate.familyCount >= 2 && candidate.sharedConcepts.length > 0),
  });
}

const report = { mode: APPLY ? 'applied' : 'shadow', versesConsidered: byReference.size, movedCells: 0, blockedCells: 0, compoundMoves: 0, versesChanged: 0, decisions: [] };
for (const [reference, proposed] of byReference) {
  const filename = fileFor(reference);
  const document = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const rowById = new Map(document.rows.map((row) => [row.id, row]));
  const sourceRows = document.rows.filter((row) => row.peshitta?.type === 'text');
  const sourceIdByTextIndex = new Map(sourceRows.map((row, index) => [index, row.id]));
  const moves = new Map(proposed.map((item) => [item.sourceId, item]));

  for (const compound of COMPOUNDS) {
    for (let index = 0; index < sourceRows.length - 1; index += 1) {
      if (sourceRows[index].peshitta.text !== compound.source[0] || sourceRows[index + 1].peshitta.text !== compound.source[1]) continue;
      const targetRows = document.rows.filter((row) => familySupport(row, compound.target) >= 2);
      if (targetRows.length !== 1) continue;
      const targetIndex = document.rows.indexOf(targetRows[0]);
      const leadingRows = document.rows.slice(Math.max(0, targetIndex - 3), targetIndex).filter((row) => familySupport(row, compound.leading) >= 2);
      if (leadingRows.length !== 1) continue;
      moves.set(sourceIdByTextIndex.get(index), { sourceId: sourceIdByTextIndex.get(index), targetId: leadingRows[0].id, authority: 'governed-syriac-compound-leading', concepts: [compound.leading] });
      moves.set(sourceIdByTextIndex.get(index + 1), { sourceId: sourceIdByTextIndex.get(index + 1), targetId: targetRows[0].id, authority: 'governed-syriac-compound-name', concepts: [compound.target] });
      report.compoundMoves += 2;
    }
  }

  const selected = [];
  const usedTargets = new Set();
  const rankedMoves = [...moves.values()].sort((a,b) => {
    const firstA = a.candidateOptions?.[0], firstB = b.candidateOptions?.[0];
    return (firstB?.sharedConcepts.length ?? 0)-(firstA?.sharedConcepts.length ?? 0)
      || (firstB?.familyCount ?? 0)-(firstA?.familyCount ?? 0)
      || (firstA?.distance ?? 0)-(firstB?.distance ?? 0)
      || document.rows.indexOf(rowById.get(a.sourceId))-document.rows.indexOf(rowById.get(b.sourceId));
  });
  for (const move of rankedMoves) {
    const options = move.candidateOptions ?? [{ rowId: move.targetId, sharedConcepts: move.concepts.map((concept) => ({concept})) }];
    const candidate = options.find((item) => {
      if (!rowById.has(item.rowId) || item.rowId === move.sourceId || usedTargets.has(item.rowId)) return false;
      const occupantConfirmed = rowById.get(item.rowId).peshitta?.type === 'text' && auditDecisionByKey.get(`${reference}#${item.rowId}`)?.classification === 'CONFIRMED_SHARED_CONCEPT_ALIGNMENT';
      return !occupantConfirmed || moves.has(item.rowId);
    });
    if (!candidate) {
      report.blockedCells += 1;
      continue;
    }
    move.targetId = candidate.rowId;
    move.concepts = candidate.sharedConcepts.map((item) => item.concept);
    usedTargets.add(move.targetId);
    selected.push(move);
  }
  const sourceIds = new Set(selected.map((move) => move.sourceId));
  const targetIds = new Set(selected.map((move) => move.targetId));
  const vacated = [...sourceIds].filter((id) => !targetIds.has(id)).sort((a,b) => document.rows.indexOf(rowById.get(a))-document.rows.indexOf(rowById.get(b)));
  const displaced = [...targetIds].filter((id) => rowById.get(id).peshitta?.type === 'text' && !sourceIds.has(id)).sort((a,b) => document.rows.indexOf(rowById.get(a))-document.rows.indexOf(rowById.get(b)));
  const available = new Set(vacated);
  const preservationMoves = [];
  for (const sourceId of displaced) {
    const sourcePosition = document.rows.indexOf(rowById.get(sourceId));
    const targetId = [...available].sort((a,b) => Math.abs(document.rows.indexOf(rowById.get(a))-sourcePosition)-Math.abs(document.rows.indexOf(rowById.get(b))-sourcePosition) || document.rows.indexOf(rowById.get(a))-document.rows.indexOf(rowById.get(b)))[0];
    if (!targetId) {
      report.blockedCells += 1;
      continue;
    }
    available.delete(targetId);
    preservationMoves.push({ sourceId, targetId, authority: 'deterministic-displacement-preservation', concepts: [] });
  }
  const accepted = [...selected, ...preservationMoves];
  if (!accepted.length) continue;
  const snapshots = new Map(accepted.map((move) => [move.sourceId, structuredClone(rowById.get(move.sourceId).peshitta)]));
  for (const move of accepted) rowById.get(move.sourceId).peshitta = { type: 'empty' };
  for (const move of accepted) {
    const cell = snapshots.get(move.sourceId);
    cell.provenance ??= {};
    cell.provenance.sharedRowAlignment = {
      status: 'deterministically-realigned',
      authority: move.authority,
      concepts: move.concepts,
      previousRowId: move.sourceId,
      targetRowId: move.targetId,
    };
    rowById.get(move.targetId).peshitta = cell;
    report.decisions.push({ reference, ...move, syriac: cell.text, english: cell.gloss?.gloss ?? '' });
  }
  report.movedCells += accepted.length;
  report.versesChanged += 1;
  if (APPLY) fs.writeFileSync(filename, `${JSON.stringify(document, null, 2)}\n`);
}
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ mode: report.mode, versesConsidered: report.versesConsidered, versesChanged: report.versesChanged, movedCells: report.movedCells, blockedCells: report.blockedCells, compoundMoves: report.compoundMoves }, null, 2));
