import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const unitsFile = path.join(ROOT, 'data', 'sources', 'peshitta', 'murdock-admitted-units.json');
const ledgerFile = path.join(ROOT, 'docs', 'audits', 'peshitta-row-english-adjudication.json');
const applicationFile = path.join(ROOT, 'docs', 'audits', 'peshitta-row-english-application.json');
const apply = process.argv.includes('--apply');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const manifest = JSON.parse(fs.readFileSync(unitsFile, 'utf8'));

const WORD_RE = /[A-Za-z]+(?:['’][A-Za-z]+)*/gu;
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'nor', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'from', 'with',
  'as', 'than', 'that', 'this', 'these', 'those', 'who', 'whom', 'which', 'what', 'when', 'where', 'how',
  'i', 'we', 'you', 'he', 'she', 'it', 'they', 'me', 'us', 'him', 'her', 'them', 'my', 'our', 'your',
  'his', 'their', 'be', 'have', 'do', 'not', 'no', 'all', 'any', 'some', 'one', 'there', 'here', 'then',
]);

const IRREGULAR = new Map(Object.entries({
  am: 'be', is: 'be', are: 'be', was: 'be', were: 'be', been: 'be', being: 'be', art: 'be', wast: 'be',
  has: 'have', hath: 'have', had: 'have', having: 'have', does: 'do', doth: 'do', did: 'do', done: 'do', doing: 'do',
  says: 'say', saith: 'say', said: 'say', saying: 'say', saw: 'see', seen: 'see', seeing: 'see',
  came: 'come', coming: 'come', went: 'go', gone: 'go', going: 'go', gave: 'give', given: 'give',
  made: 'make', knew: 'know', known: 'know', brought: 'bring', thought: 'think', told: 'tell', sent: 'send',
  wrote: 'write', written: 'write', rose: 'rise', risen: 'rise', ate: 'eat', eaten: 'eat', began: 'begin', begun: 'begin',
  begat: 'beget', begot: 'beget', begotten: 'beget', stood: 'stand', taught: 'teach', sought: 'seek', sat: 'sit',
  lay: 'lie', lain: 'lie', bore: 'bear', borne: 'bear', born: 'bear', fell: 'fall', fallen: 'fall', grew: 'grow', grown: 'grow',
  held: 'hold', dwelt: 'dwell', heard: 'hear', led: 'lead', lost: 'lose', met: 'meet', paid: 'pay', ran: 'run', sold: 'sell',
  shone: 'shine', shew: 'show', shewed: 'show', shown: 'show', understood: 'understand', won: 'win',
  men: 'man', women: 'woman', children: 'child', brethren: 'brother', feet: 'foot',
  me: 'i', my: 'i', mine: 'i', us: 'we', our: 'we', ours: 'we', thee: 'you', thou: 'you', thy: 'you', thine: 'you', ye: 'you',
  him: 'he', his: 'he', her: 'she', them: 'they', their: 'they', himself: 'he', herself: 'she', themselves: 'they',
}));

function lemma(value) {
  const word = value.toLocaleLowerCase('en').replace(/[^a-z]/gu, '');
  if (IRREGULAR.has(word)) return IRREGULAR.get(word);
  if (word.length > 5 && word.endsWith('eth')) return word.slice(0, -3);
  if (word.length > 5 && word.endsWith('est')) return word.slice(0, -3);
  if (word.length > 5 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 5 && word.endsWith('ing')) {
    const base = word.slice(0, -3);
    return base.endsWith(base.at(-1)?.repeat(2)) ? base.slice(0, -1) : base;
  }
  if (word.length > 4 && word.endsWith('ied')) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith('ed')) {
    const base = word.slice(0, -2);
    return base.endsWith(base.at(-1)?.repeat(2)) ? base.slice(0, -1) : base;
  }
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1);
  return word;
}

function wordsWithOffsets(value) {
  return [...value.matchAll(WORD_RE)].map((match, index) => ({ surface: match[0], lemma: lemma(match[0]), index, charStart: match.index }));
}

function parseReference(reference) {
  const match = reference.match(/^(matthew|mark|luke|john) (\d+):(\d+)$/u);
  if (!match) throw new Error(`Invalid reference: ${reference}`);
  return { gospel: match[1], chapter: Number(match[2]), verse: Number(match[3]) };
}

function fileFor(reference) {
  const parsed = parseReference(reference);
  return path.join(ROOT, 'data', parsed.gospel, String(parsed.chapter), `${parsed.verse}.json`);
}

function cellGloss(cell) {
  if (!cell || !['text', 'extant', 'translation'].includes(cell.type)) return '';
  return cell.gloss?.spanRole === 'continuation' ? '' : cell.gloss?.gloss ?? '';
}

function rowEvidence(row) {
  const families = {
    greek: [row.papyrus, row.vaticanus, row.sinaiticus, row.byzantine],
    latin: [row.vulgate],
    coptic: [row.coptic],
  };
  const result = {};
  for (const [family, cells] of Object.entries(families)) {
    const surfaces = cells.flatMap((cell) => wordsWithOffsets(cellGloss(cell)).map((word) => word.surface));
    result[family] = {
      surfaces: new Set(surfaces.map((surface) => surface.toLocaleLowerCase('en'))),
      lemmas: new Set(surfaces.map(lemma).filter(Boolean)),
    };
  }
  return result;
}

function candidatesForRows(rows, englishWords) {
  return rows.map(({ row }) => {
    const evidence = rowEvidence(row);
    const candidates = [];
    for (const word of englishWords) {
      const families = Object.entries(evidence).filter(([, terms]) => terms.lemmas.has(word.lemma)).map(([family]) => family);
      const exactFamilies = Object.entries(evidence).filter(([, terms]) => terms.surfaces.has(word.surface.toLocaleLowerCase('en'))).map(([family]) => family);
      const content = !STOPWORDS.has(word.lemma) && word.lemma.length > 1;
      if (families.length >= 2 || (content && exactFamilies.length >= 2)) {
        candidates.push({ englishIndex: word.index, families, exactFamilies, weight: families.length * 4 + exactFamilies.length * 2 + (content ? 2 : 0) });
      }
    }
    return candidates;
  });
}

function monotonicAnchors(rowCandidates, englishLength) {
  const scores = Array.from({ length: rowCandidates.length + 1 }, () => Array(englishLength + 1).fill(0));
  const choices = Array.from({ length: rowCandidates.length + 1 }, () => Array(englishLength + 1).fill(null));
  for (let rowIndex = 1; rowIndex <= rowCandidates.length; rowIndex += 1) {
    const byEnglish = new Map(rowCandidates[rowIndex - 1].map((candidate) => [candidate.englishIndex, candidate]));
    for (let englishIndex = 1; englishIndex <= englishLength; englishIndex += 1) {
      let score = scores[rowIndex - 1][englishIndex];
      let choice = 'row-skip';
      if (scores[rowIndex][englishIndex - 1] > score) { score = scores[rowIndex][englishIndex - 1]; choice = 'english-skip'; }
      const candidate = byEnglish.get(englishIndex - 1);
      if (candidate && scores[rowIndex - 1][englishIndex - 1] + candidate.weight >= score) {
        score = scores[rowIndex - 1][englishIndex - 1] + candidate.weight;
        choice = 'match';
      }
      scores[rowIndex][englishIndex] = score;
      choices[rowIndex][englishIndex] = choice;
    }
  }
  const anchors = [];
  let rowIndex = rowCandidates.length;
  let englishIndex = englishLength;
  while (rowIndex > 0 && englishIndex > 0) {
    const choice = choices[rowIndex][englishIndex];
    if (choice === 'match') {
      const candidate = rowCandidates[rowIndex - 1].find((item) => item.englishIndex === englishIndex - 1);
      anchors.push({ rowIndex: rowIndex - 1, englishIndex: englishIndex - 1, ...candidate });
      rowIndex -= 1;
      englishIndex -= 1;
    } else if (choice === 'english-skip') englishIndex -= 1;
    else rowIndex -= 1;
  }
  return anchors.reverse();
}

function buildGroups(rowCount, englishCount, anchors) {
  const groups = [];
  let rowStart = 0;
  let englishStart = 0;
  for (const anchor of anchors) {
    groups.push({ rowStart, rowEnd: anchor.rowIndex, englishStart, englishEnd: anchor.englishIndex, anchor });
    rowStart = anchor.rowIndex + 1;
    englishStart = anchor.englishIndex + 1;
  }
  if (rowStart < rowCount || englishStart < englishCount) {
    groups.push({ rowStart, rowEnd: rowCount - 1, englishStart, englishEnd: englishCount - 1, anchor: null });
  }
  // A final lexical anchor can occupy the last Syriac row while Murdock still
  // has trailing function words. They belong to that last real phrase, never
  // to a zero-row display object.
  if (groups.length > 1 && groups.at(-1).rowStart > groups.at(-1).rowEnd) {
    groups.at(-2).englishEnd = groups.at(-1).englishEnd;
    groups.pop();
  }
  // Empty-English source spans express morphology not separately represented by
  // Murdock. Merge them into the next phrase where possible, otherwise the prior.
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index];
    if (group.englishStart <= group.englishEnd) continue;
    if (index + 1 < groups.length) {
      groups[index + 1].rowStart = group.rowStart;
      groups.splice(index, 1);
    } else if (index > 0) {
      groups[index - 1].rowEnd = group.rowEnd;
      groups.splice(index, 1);
    }
  }
  return groups;
}

function exactPhrase(english, words, start, end) {
  const charStart = start === 0 ? 0 : words[start].charStart;
  const charEnd = end + 1 < words.length ? words[end + 1].charStart : english.length;
  return { raw: english.slice(charStart, charEnd), display: english.slice(charStart, charEnd).trim(), charStart, charEnd };
}

const units = Object.values(manifest.units).filter((unit, index, all) => all.findIndex((candidate) => candidate.unitId === unit.unitId) === index);
const pendingFiles = new Map();
const decisions = [];
const totals = {
  units: units.length, displayReferences: 0, syriacRows: 0, englishWords: 0, groups: 0, lexicalAnchors: 0,
  populatedEnglishCells: 0, blankEnglishCells: 0, multiwordEnglishCells: 0, multirowPhraseGroups: 0, accountingErrors: 0, filesChanged: 0,
};

for (const unit of units) {
  const documents = unit.displayReferences.map((reference) => {
    const filename = fileFor(reference);
    const document = pendingFiles.get(filename) ?? JSON.parse(fs.readFileSync(filename, 'utf8'));
    pendingFiles.set(filename, document);
    return { reference, filename, document };
  });
  const rows = documents.flatMap(({ reference, filename, document }) => document.rows
    .filter((row) => row.peshitta?.type === 'text')
    .map((row) => ({ reference, filename, row })));
  const englishWords = wordsWithOffsets(unit.english);
  const anchors = monotonicAnchors(candidatesForRows(rows, englishWords), englishWords.length);
  const groups = buildGroups(rows.length, englishWords.length, anchors);
  const coveredRows = groups.flatMap((group) => Array.from({ length: group.rowEnd - group.rowStart + 1 }, (_, index) => group.rowStart + index));
  const coveredEnglish = groups.flatMap((group) => Array.from({ length: group.englishEnd - group.englishStart + 1 }, (_, index) => group.englishStart + index));
  const rowAccounting = groups.every((group) => group.rowStart <= group.rowEnd) && coveredRows.length === rows.length && new Set(coveredRows).size === rows.length && Math.min(...coveredRows) === 0 && Math.max(...coveredRows) === rows.length - 1;
  const englishAccounting = coveredEnglish.length === englishWords.length && new Set(coveredEnglish).size === englishWords.length && Math.min(...coveredEnglish) === 0 && Math.max(...coveredEnglish) === englishWords.length - 1;
  if (!rowAccounting || !englishAccounting || rows.length === 0 || englishWords.length === 0) totals.accountingErrors += 1;
  totals.displayReferences += unit.displayReferences.length;
  totals.syriacRows += rows.length;
  totals.englishWords += englishWords.length;
  totals.groups += groups.length;
  totals.lexicalAnchors += anchors.length;
  const groupDecisions = groups.map((group, groupIndex) => {
    const phrase = exactPhrase(unit.english, englishWords, group.englishStart, group.englishEnd);
    const members = rows.slice(group.rowStart, group.rowEnd + 1);
    const groupId = `${unit.unitId}#row-phrase-${groupIndex + 1}`;
    if (members.length > 1) totals.multirowPhraseGroups += 1;
    const englishCount = group.englishEnd - group.englishStart + 1;
    const allocations = members.map((member, memberIndex) => {
      const start = group.englishStart + Math.floor(memberIndex * englishCount / members.length);
      const endExclusive = group.englishStart + Math.floor((memberIndex + 1) * englishCount / members.length);
      const end = endExclusive - 1;
      const allocated = start <= end ? exactPhrase(unit.english, englishWords, start, end) : { display: '', charStart: null, charEnd: null };
      return { member, start, end, englishIndices: start <= end ? Array.from({ length: end - start + 1 }, (_, index) => start + index) : [], ...allocated };
    });
    allocations.forEach((allocation) => {
      const { member } = allocation;
      if (allocation.display) totals.populatedEnglishCells += 1;
      else totals.blankEnglishCells += 1;
      if (allocation.englishIndices.length > 1) totals.multiwordEnglishCells += 1;
      member.row.peshitta.gloss = {
        gloss: allocation.display,
        source: 'Murdock',
        tooltip: allocation.display
          ? `Murdock 1851 · ordered cell allocation within certified phrase: “${phrase.display}”`
          : `Murdock 1851 · no separately allocated English word within certified phrase: “${phrase.display}”`,
      };
      member.row.peshitta.provenance ??= {};
      member.row.peshitta.provenance.englishAlignment = {
        authority: 'James Murdock, The New Testament: A Literal Translation from the Syriac Peshito Version (1851)',
        sourceReference: unit.sourceReference,
        unitId: unit.unitId,
        groupId,
        scope: 'ordered-row-display-allocation',
        syriacRowIds: members.map((item) => item.row.id),
        syriacRowKeys: members.map((item) => `${item.reference}#${item.row.id}`),
        englishIndices: allocation.englishIndices,
        englishCharRange: [allocation.charStart, allocation.charEnd],
        anchor: group.anchor ? {
          syriacRowId: rows[group.anchor.rowIndex].row.id,
          englishIndex: group.anchor.englishIndex,
          concept: englishWords[group.anchor.englishIndex].surface,
          evidenceFamilies: group.anchor.families,
          exactEvidenceFamilies: group.anchor.exactFamilies,
        } : null,
        evidence: group.anchor ? ['MONOTONIC_CROSS_TRADITION_LEXICAL_ANCHOR', 'CERTIFIED_SYRIAC_ROW_ORDER'] : ['COMPLETE_PUBLISHED_UNIT_BOUNDARY', 'CERTIFIED_SYRIAC_ROW_ORDER'],
        status: 'internally-certified-row-cell-alignment',
      };
    });
    return {
      groupId,
      scope: members.length === 1 ? 'ROW_PHRASE_OWNERSHIP' : 'BOUNDED_MULTIROW_PHRASE_SPAN',
      displayReferences: [...new Set(members.map((member) => member.reference))],
      syriacRowIds: members.map((member) => member.row.id),
      syriacRowKeys: members.map((member) => `${member.reference}#${member.row.id}`),
      syriac: members.map((member) => member.row.peshitta.text),
      english: phrase.display,
      englishIndices: Array.from({ length: group.englishEnd - group.englishStart + 1 }, (_, index) => group.englishStart + index),
      englishCharRange: [phrase.charStart, phrase.charEnd],
      anchor: group.anchor ? {
        syriacRowId: rows[group.anchor.rowIndex].row.id,
        englishIndex: group.anchor.englishIndex,
        concept: englishWords[group.anchor.englishIndex].surface,
        evidenceFamilies: group.anchor.families,
        exactEvidenceFamilies: group.anchor.exactFamilies,
      } : null,
      rowAllocations: allocations.map((allocation) => ({
        rowKey: `${allocation.member.reference}#${allocation.member.row.id}`,
        english: allocation.display,
        englishIndices: allocation.englishIndices,
        englishCharRange: [allocation.charStart, allocation.charEnd],
      })),
    };
  });
  decisions.push({ unitId: unit.unitId, sourceReference: unit.sourceReference, displayReferences: unit.displayReferences, syriacRows: rows.length, englishWords: englishWords.length, rowAccounting, englishAccounting, groups: groupDecisions });
}

if (totals.accountingErrors) throw new Error(`Refusing certification: ${totals.accountingErrors} units failed complete accounting.`);
const decisionCore = { standard: 'Complete Murdock-unit English is partitioned into ordered, non-overlapping phrases bounded by monotonic lexical anchors corroborated by at least two independent displayed tradition families. Each bounded phrase is then allocated in source order across its ordinary Syriac-row English cells. Arrows, merged cells, continuation cells, borrowed wording, and claims of one-to-one lexical equivalence are prohibited.', totals, decisions };
const adjudicationSha256 = sha256(JSON.stringify(decisionCore));
for (const document of pendingFiles.values()) {
  for (const row of document.rows) {
    if (row.peshitta?.provenance?.englishAlignment?.status === 'internally-certified-row-cell-alignment') {
      row.peshitta.provenance.englishAlignment.adjudicationSha256 = adjudicationSha256;
    }
  }
}

const ledger = {
  status: 'INTERNALLY_CERTIFIED',
  generatedAt: new Date().toISOString(),
  standard: decisionCore.standard,
  authorities: {
    syriac: 'Pinned scrollmapper electronic Peshitta; source token sequence separately certified',
    english: manifest.translation,
    alignmentEvidence: 'Displayed Greek, Latin, and Coptic glosses counted as three tradition families; Greek witnesses count as one dependent family',
  },
  exclusions: 'Other traditions supply alignment evidence only. Their English wording is never inserted into the Peshitta column. Per-row display allocation preserves the certified phrase and source order but does not claim one-to-one lexical equivalence.',
  sourceContentSha256: manifest.sourceContentSha256,
  adjudicationSha256,
  totals,
  decisions,
};
fs.writeFileSync(ledgerFile, `${JSON.stringify(ledger, null, 2)}\n`);

if (apply) {
  for (const [filename, document] of pendingFiles) {
    fs.writeFileSync(filename, `${JSON.stringify(document, null, 2)}\n`);
    totals.filesChanged += 1;
  }
}
const application = {
  status: apply ? 'APPLIED_INTERNALLY_CERTIFIED' : 'DRY_RUN',
  generatedAt: new Date().toISOString(),
  adjudicationSha256,
  totals,
};
application.reportSha256 = sha256(JSON.stringify(application));
fs.writeFileSync(applicationFile, `${JSON.stringify(application, null, 2)}\n`);
console.log(JSON.stringify(application, null, 2));
