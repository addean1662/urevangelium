import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const shadowFile = path.join(ROOT, 'docs', 'audits', 'vulgate-word-english-shadow.json');
const outputFile = path.join(ROOT, 'docs', 'audits', 'vulgate-word-english-adjudication.json');
const shadow = JSON.parse(fs.readFileSync(shadowFile, 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function buildGroups(record) {
  const attachments = record.rowAttachments;
  const parent = attachments.map((_, index) => index);
  const find = (index) => parent[index] === index ? index : (parent[index] = find(parent[index]));
  const union = (left, right) => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent[b] = a;
  };

  // A compressed English word shared by multiple Latin tokens is one group,
  // never duplicated English in several display cells.
  const ownerByEnglish = new Map();
  for (const attachment of attachments) {
    for (const englishIndex of attachment.englishIndices) {
      if (ownerByEnglish.has(englishIndex)) union(attachment.latinIndex, ownerByEnglish.get(englishIndex));
      else ownerByEnglish.set(englishIndex, attachment.latinIndex);
    }
  }

  const seeded = new Map();
  for (const attachment of attachments) {
    if (!attachment.englishIndices.length) continue;
    const root = find(attachment.latinIndex);
    seeded.set(root, seeded.get(root) ?? { latinIndices: [], englishIndices: new Set(), evidence: new Set() });
    const group = seeded.get(root);
    group.latinIndices.push(attachment.latinIndex);
    attachment.englishIndices.forEach((index) => group.englishIndices.add(index));
    group.evidence.add(attachment.status);
  }

  const groups = [...seeded.values()];
  if (!groups.length) throw new Error(`No anchored translation group for ${record.sourceReference}`);

  // Held Latin remains within the published verse unit and joins the nearest
  // anchored Latin group. On a tie, prefer the following group so particles
  // and prepositions stay with the construction they introduce.
  for (const attachment of attachments.filter((item) => !item.englishIndices.length)) {
    const target = groups.reduce((best, candidate) => {
      const candidateDistance = Math.min(...candidate.latinIndices.map((index) => Math.abs(index - attachment.latinIndex)));
      const bestDistance = Math.min(...best.latinIndices.map((index) => Math.abs(index - attachment.latinIndex)));
      if (candidateDistance !== bestDistance) return candidateDistance < bestDistance ? candidate : best;
      const candidateFollowing = Math.min(...candidate.latinIndices) > attachment.latinIndex;
      const bestFollowing = Math.min(...best.latinIndices) > attachment.latinIndex;
      return candidateFollowing && !bestFollowing ? candidate : best;
    });
    target.latinIndices.push(attachment.latinIndex);
    target.evidence.add('ADJACENT_HELD_LATIN_ABSORBED_INTO_ANCHORED_SPAN');
  }

  return groups.map((group, groupIndex) => {
    const latinIndices = [...new Set(group.latinIndices)].sort((a, b) => a - b);
    const englishIndices = [...group.englishIndices].sort((a, b) => a - b);
    return {
      groupIndex,
      latinIndices,
      latin: latinIndices.map((index) => record.latin[index]).join(' '),
      englishIndices,
      english: englishIndices.map((index) => record.english[index]).join(' '),
      scope: latinIndices.length === 1 ? 'single-latin-token' : 'multi-latin-token-span',
      evidence: [...group.evidence].sort(),
      status: 'ADMITTED_PUBLISHED_TRANSLATION_ROW_OR_SPAN',
    };
  }).sort((left, right) => left.latinIndices[0] - right.latinIndices[0]);
}

function buildMonotonicGroups(record) {
  const groups = [];
  for (const span of record.translationSpans) {
    const latinIndices = Array.from({ length: span.latinEnd - span.latinStart + 1 }, (_, offset) => span.latinStart + offset);
    const englishIndices = span.englishEnd >= span.englishStart
      ? Array.from({ length: span.englishEnd - span.englishStart + 1 }, (_, offset) => span.englishStart + offset)
      : [];
    if (span.status === 'UNANCHORED_TRAILING_SPAN_HELD' && groups.length) {
      const prior = groups.at(-1);
      prior.latinIndices.push(...latinIndices);
      prior.englishIndices.push(...englishIndices);
      prior.evidence.push('UNANCHORED_TRAILER_ABSORBED_INTO_PRECEDING_ANCHORED_SPAN');
      continue;
    }
    groups.push({
      latinIndices,
      englishIndices,
      evidence: [span.status],
    });
  }
  // A locally inverted Latin token can fall between two monotonic anchors even
  // though all of its lexical candidates lie inside the preceding English
  // span. Move only that bounded leading token backward; never search outside
  // the immediately preceding published phrase.
  for (let index = 1; index < groups.length; index += 1) {
    const current = groups[index];
    const previous = groups[index - 1];
    while (current.latinIndices.length > 1) {
      const latinIndex = current.latinIndices[0];
      const candidates = record.tokens[latinIndex].candidateEnglishIndices;
      const priorEnglish = new Set(previous.englishIndices);
      if (!candidates.some((candidate) => priorEnglish.has(candidate))) break;
      previous.latinIndices.push(current.latinIndices.shift());
      previous.evidence.push('BOUNDED_LOCAL_INVERSION_JOINED_TO_PRECEDING_SPAN');
    }
  }
  return groups.map((group, groupIndex) => ({
    groupIndex,
    latinIndices: [...new Set(group.latinIndices)].sort((a, b) => a - b),
    latin: [...new Set(group.latinIndices)].sort((a, b) => a - b).map((index) => record.latin[index]).join(' '),
    englishIndices: [...new Set(group.englishIndices)].sort((a, b) => a - b),
    english: [...new Set(group.englishIndices)].sort((a, b) => a - b).map((index) => record.english[index]).join(' '),
    scope: group.latinIndices.length === 1 ? 'single-latin-token' : 'multi-latin-token-span',
    evidence: [...new Set(group.evidence)].sort(),
    status: 'ADMITTED_PUBLISHED_TRANSLATION_ROW_OR_SPAN',
  }));
}

const totals = {
  units: shadow.records.length,
  latinTokens: 0,
  englishTokens: 0,
  admittedGroups: 0,
  singleLatinGroups: 0,
  multiLatinGroups: 0,
  groupsContainingAbsorbedHeldLatin: 0,
  heldUnits: 0,
};
const admitted = [];
const held = [];

for (const record of shadow.records) {
  try {
    const groups = buildMonotonicGroups(record);
    const latinCoverage = groups.flatMap((group) => group.latinIndices).sort((a, b) => a - b);
    const englishCoverage = [...new Set(groups.flatMap((group) => group.englishIndices))].sort((a, b) => a - b);
    const expectedLatin = record.latin.map((_, index) => index);
    const expectedEnglish = record.english.map((_, index) => index);
    if (JSON.stringify(latinCoverage) !== JSON.stringify(expectedLatin)) throw new Error('Latin token accounting failed');
    if (JSON.stringify(englishCoverage) !== JSON.stringify(expectedEnglish)) throw new Error('English word accounting failed');
    totals.latinTokens += record.latin.length;
    totals.englishTokens += record.english.length;
    totals.admittedGroups += groups.length;
    totals.singleLatinGroups += groups.filter((group) => group.scope === 'single-latin-token').length;
    totals.multiLatinGroups += groups.filter((group) => group.scope === 'multi-latin-token-span').length;
    totals.groupsContainingAbsorbedHeldLatin += groups.filter((group) => group.evidence.includes('ADJACENT_HELD_LATIN_ABSORBED_INTO_ANCHORED_SPAN')).length;
    admitted.push({ sourceReference: record.sourceReference, displayReferences: record.displayReferences, groups });
  } catch (error) {
    totals.heldUnits += 1;
    held.push({ sourceReference: record.sourceReference, displayReferences: record.displayReferences, reason: error.message });
  }
}

const report = {
  status: held.length ? 'partial-internal-row-span-adjudication' : 'complete-internal-row-span-adjudication-not-independent-scholarly-review',
  generatedAt: new Date().toISOString(),
  governingRules: [
    'Displayed English characters are reproduced exclusively from the admitted Douay-Rheims 1899 translation unit.',
    'The Clementine Latin source order and token boundaries remain unchanged.',
    'Unique word pairings require verse-local lexical, proper-name, or exact-form evidence.',
    'English articles, auxiliaries, and other published expansion words remain attached to a lexically anchored row phrase.',
    'Several Latin tokens may share one published English phrase; the phrase is stored and displayed once.',
    'A Latin token without an independent English word is absorbed into the smallest adjacent anchored Latin span and is not assigned a manufactured gloss.',
    'Every Latin token and every Douay word must be accounted for exactly once within its admitted source unit.',
    'This certifies Urevangelium source-constrained alignment, not a word-level interlinear authored by the Douay translators and not independent scholarly review.',
  ],
  totals,
  shadowLedgerSha256: shadow.ledgerSha256,
  admitted,
  held,
};
report.adjudicationSha256 = sha256(JSON.stringify({ admitted, held }));
fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, totals, adjudicationSha256: report.adjudicationSha256, output: path.relative(ROOT, outputFile) }, null, 2));
