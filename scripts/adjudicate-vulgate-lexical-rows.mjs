import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const inputFile = path.join(ROOT, 'docs/audits/vulgate-word-english-shadow.json');
const outputFile = path.join(ROOT, 'docs/audits/vulgate-lexical-row-adjudication.json');
const shadow = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const totals = { units: 0, latinTokens: 0, englishTokens: 0, displayedLatinRows: 0, displayedEnglishTokens: 0, pendingEnglishTokens: 0, multiEnglishRows: 0, compressedSharedLatinRows: 0, reorderedLatinRows: 0, unexpressedLatinRows: 0, heldLatinRows: 0, accountingErrors: 0 };
const units = [];
const errors = [];

// Every automatic candidate in these two verses was rejected as non-unique.
// State their row ownership explicitly so the decision remains auditable
// against the published Latin, Douay-Rheims wording, and stored lexicon data.
// English indices may be non-monotonic where the two languages change order.
const editorialRowOwnership = new Map([
  ['matthew 7:20', [[0, [0]], [1, [1]], [2, [3]], [3, [2]], [4, [4, 5, 6]], [5, [7]]]],
  ['mark 14:52', [[0, [0]], [1, [1]], [2, [2, 3]], [3, [4, 5, 6]], [4, [10]], [5, [7]], [6, [8]], [7, [9]]]],
]);

const articlePublishedEnglish = new Set(['a', 'an', 'the']);
const auxiliaryPublishedEnglish = new Set([
  'shall', 'will', 'would', 'should', 'may', 'might', 'must',
  'have', 'has', 'hast', 'hath', 'had', 'do', 'does', 'dost', 'doth', 'did',
  'am', 'art', 'is', 'are', 'was', 'wast', 'were', 'be', 'been', 'being',
]);
const attachablePublishedEnglish = new Set([...articlePublishedEnglish, ...auxiliaryPublishedEnglish]);

const subjectPronounForms = new Map(Object.entries({
  i: ['1S'], we: ['1P'], thou: ['2S'], you: ['2S', '2P'], ye: ['2P'],
  he: ['3S'], she: ['3S'], it: ['3S'], they: ['3P'],
}));
const sumAuxiliaryForms = new Set([
  'sum', 'es', 'est', 'sumus', 'estis', 'sunt',
  'eram', 'eras', 'erat', 'eramus', 'eratis', 'erant',
  'fui', 'fuisti', 'fuit', 'fuimus', 'fuistis', 'fuerunt',
  'fuerim', 'fueris', 'fuerit', 'fuerimus', 'fueritis',
  'esset', 'essent', 'sit', 'sint', 'ero', 'erit',
]);
const nonverbalFunctionForms = new Set([
  'a', 'ab', 'ad', 'aut', 'autem', 'cum', 'de', 'dum', 'e', 'enim', 'ergo', 'et', 'ex', 'in', 'iam', 'jam',
  'nam', 'nec', 'neque', 'non', 'per', 'pro', 'propter', 'quia', 'quidem', 'sed', 'si', 'sine', 'super', 'supra', 'usque', 'ut', 'vero',
]);
const participialSurface = /(?:nt(?:is|em|es|ium|ibus|i|e|ia)?|t(?:us|a|um|i|ae|am|os|as|o|is)|s(?:us|a|um|i|ae|am|os|as|o|is)|nd(?:us|a|um|i|ae|am|os|as|o|is)|tur(?:us|a|um|i|ae|am|os|as|o|is))$/u;
const isExclusiveParticiple = (token) => token?.grammaticalMoods?.includes('PPL')
  && !token.finiteVerbForms?.length
  && participialSurface.test(token.surface.toLowerCase());
const publishedPhraseByLatinSurface = new Map([
  ['quasi', [['as', 'it', 'were']]],
  ['unigeniti', [['of', 'the', 'only', 'begotten']]],
  ['propria', [['his', 'own']]],
  ['sui', [['his', 'own']]],
  ['sine', [['let', 'alone']]],
  ['vobiscum', [['with', 'you']]],
  ['mecum', [['with', 'me']]],
  ['tecum', [['with', 'thee'], ['with', 'you']]],
  ['videte', [['take', 'heed']]],
  ['attendite', [['take', 'heed']]],
  ['appropinquavit', [['is', 'at', 'hand'], ['was', 'at', 'hand']]],
  ['transibunt', [['shall', 'pass', 'away'], ['will', 'pass', 'away']]],
  ['secum', [['with', 'him'], ['with', 'her'], ['with', 'them'], ['with', 'himself'], ['with', 'herself'], ['with', 'themselves']]],
  ['nemo', [['no', 'man'], ['no', 'one']]],
  ['hodie', [['this', 'day']]],
]);

function maximumMatching(latinIndices, candidateMap, forbidden = null) {
  const englishOwner = new Map();
  function assign(latinIndex, visited) {
    for (const englishIndex of candidateMap.get(latinIndex) ?? []) {
      if (forbidden?.[0] === latinIndex && forbidden?.[1] === englishIndex) continue;
      if (visited.has(englishIndex)) continue;
      visited.add(englishIndex);
      const prior = englishOwner.get(englishIndex);
      if (prior === undefined || assign(prior, visited)) {
        englishOwner.set(englishIndex, latinIndex);
        return true;
      }
    }
    return false;
  }
  for (const latinIndex of latinIndices) assign(latinIndex, new Set());
  return [...englishOwner].map(([englishIndex, latinIndex]) => ({ latinIndex, englishIndex }));
}

function stableMonotonicPairs(record, initialPairs) {
  let pairs = [...initialPairs].sort((a, b) => a.latinIndex - b.latinIndex);
  let changed = true;
  while (changed) {
    changed = false;
    const retained = pairs.filter((pair, index) => {
      const previous = pairs[index - 1] ?? { latinIndex: -1, englishIndex: -1 };
      const next = pairs[index + 1] ?? { latinIndex: record.latin.length, englishIndex: record.english.length };
      const crossing = record.tokens.some((token) => {
        if (token.latinIndex <= previous.latinIndex || token.latinIndex >= next.latinIndex || token.latinIndex === pair.latinIndex) return false;
        return token.candidateEnglishIndices.some((englishIndex) =>
          (token.latinIndex < pair.latinIndex && englishIndex > pair.englishIndex && englishIndex < next.englishIndex)
          || (token.latinIndex > pair.latinIndex && englishIndex < pair.englishIndex && englishIndex > previous.englishIndex));
      });
      if (crossing) changed = true;
      return !crossing;
    });
    pairs = retained;
  }
  return pairs;
}

function forcedLocalTranspositions(record, monotonicPairs) {
  const forced = [];
  const boundaries = [
    { latinIndex: -1, englishIndex: -1 },
    ...monotonicPairs,
    { latinIndex: record.latin.length, englishIndex: record.english.length },
  ];
  for (let boundary = 0; boundary < boundaries.length - 1; boundary++) {
    const left = boundaries[boundary];
    const right = boundaries[boundary + 1];
    const latinIndices = record.tokens
      .map((token) => token.latinIndex)
      .filter((index) => index > left.latinIndex && index < right.latinIndex);
    const candidateMap = new Map(latinIndices.map((latinIndex) => [
      latinIndex,
      record.tokens[latinIndex].candidateEnglishIndices.filter((englishIndex) => englishIndex > left.englishIndex && englishIndex < right.englishIndex),
    ]));
    const maximum = maximumMatching(latinIndices, candidateMap);
    for (const pair of maximum) {
      if (maximumMatching(latinIndices, candidateMap, [pair.latinIndex, pair.englishIndex]).length < maximum.length) forced.push(pair);
    }
  }
  return forced;
}

function forcedVerseTranspositions(record, admittedPairs) {
  const ownedLatin = new Set(admittedPairs.map((pair) => pair.latinIndex));
  const ownedEnglish = new Set(admittedPairs.map((pair) => pair.englishIndex));
  const latinIndices = record.tokens.map((token) => token.latinIndex).filter((index) => !ownedLatin.has(index));
  const candidateMap = new Map(latinIndices.map((latinIndex) => [
    latinIndex,
    record.tokens[latinIndex].candidateEnglishIndices.filter((englishIndex) => !ownedEnglish.has(englishIndex)),
  ]));
  const maximum = maximumMatching(latinIndices, candidateMap);
  return maximum.filter((pair) => maximumMatching(latinIndices, candidateMap, [pair.latinIndex, pair.englishIndex]).length < maximum.length);
}

function equivalentOccurrencePairs(record, admittedPairs) {
  const ownedLatin = new Set(admittedPairs.map((pair) => pair.latinIndex));
  const ownedEnglish = new Set(admittedPairs.map((pair) => pair.englishIndex));
  const groups = new Map();
  for (const token of record.tokens.filter((item) => !ownedLatin.has(item.latinIndex))) {
    const candidates = token.candidateEnglishIndices.filter((index) => !ownedEnglish.has(index));
    if (!candidates.length || new Set(candidates.map((index) => record.english[index].toLowerCase())).size !== 1) continue;
    const key = candidates.join(',');
    if (!groups.has(key)) groups.set(key, { candidates, latinIndices: [] });
    groups.get(key).latinIndices.push(token.latinIndex);
  }
  const pairs = [];
  for (const { candidates, latinIndices } of groups.values()) {
    const outsideCompetitor = record.tokens.some((token) => !latinIndices.includes(token.latinIndex)
      && !ownedLatin.has(token.latinIndex)
      && token.candidateEnglishIndices.some((index) => candidates.includes(index)));
    if (outsideCompetitor || latinIndices.length !== candidates.length) continue;
    latinIndices.sort((a, b) => a - b).forEach((latinIndex, index) => pairs.push({ latinIndex, englishIndex: candidates[index] }));
  }
  return pairs;
}

for (const record of shadow.records) {
  const statedOwnership = editorialRowOwnership.get(record.sourceReference);
  const monotonicPairs = statedOwnership
    ? statedOwnership.map(([latinIndex, englishIndices]) => ({ latinIndex, englishIndex: englishIndices[0] }))
    : stableMonotonicPairs(record, record.monotonicAnchors);
  const transpositionPairs = statedOwnership ? [] : forcedLocalTranspositions(record, monotonicPairs);
  const verseTranspositionPairs = statedOwnership ? [] : forcedVerseTranspositions(record, [...monotonicPairs, ...transpositionPairs]);
  const occurrencePairs = statedOwnership ? [] : equivalentOccurrencePairs(record, [...monotonicPairs, ...transpositionPairs, ...verseTranspositionPairs]);
  const localTranspositionKeys = new Set(transpositionPairs.map((pair) => `${pair.latinIndex}:${pair.englishIndex}`));
  const verseTranspositionKeys = new Set(verseTranspositionPairs.map((pair) => `${pair.latinIndex}:${pair.englishIndex}`));
  const occurrenceKeys = new Set(occurrencePairs.map((pair) => `${pair.latinIndex}:${pair.englishIndex}`));
  const admittedPairs = [...monotonicPairs, ...transpositionPairs, ...verseTranspositionPairs, ...occurrencePairs];
  const pairsByLatin = new Map(admittedPairs.map((pair) => [pair.latinIndex, pair.englishIndex]));
  const ownerByEnglish = new Map(admittedPairs.map((pair) => [pair.englishIndex, pair.latinIndex]));
  let pendingLexicalEnglish = new Set(record.tokens
    .filter((token) => !pairsByLatin.has(token.latinIndex))
    .flatMap((token) => token.candidateEnglishIndices)
    .filter((englishIndex) => !ownerByEnglish.has(englishIndex)));
  const attachmentsByLatin = new Map(admittedPairs.map((pair) => [pair.latinIndex, {
    latinIndex: pair.latinIndex,
    englishIndices: [pair.englishIndex],
    status: statedOwnership
      ? 'EDITORIALLY_ADJUDICATED_LEXICAL_OWNER'
      : localTranspositionKeys.has(`${pair.latinIndex}:${pair.englishIndex}`)
        ? 'UNIQUE_LOCAL_TRANSPOSITION_OWNER'
        : verseTranspositionKeys.has(`${pair.latinIndex}:${pair.englishIndex}`)
          ? 'UNIQUE_VERSE_TRANSPOSITION_OWNER'
          : occurrenceKeys.has(`${pair.latinIndex}:${pair.englishIndex}`)
            ? 'EQUIVALENT_OCCURRENCE_ORDER_OWNER'
        : 'MONOTONIC_LEXICAL_OWNER',
  }]));
  if (statedOwnership) {
    for (const [latinIndex, englishIndices] of statedOwnership) attachmentsByLatin.get(latinIndex).englishIndices = [...englishIndices];
  } else {
    // A published translation may use two adjacent lexical words for one
    // Latin token (for example omnia -> “All things”). Attach the second word
    // only when the admitted Latin owner is unique and no unresolved Latin
    // token claims it.
    for (let englishIndex = 0; englishIndex < record.english.length; englishIndex++) {
      if (ownerByEnglish.has(englishIndex)) continue;
      const admittedOwners = admittedPairs.filter((pair) => record.tokens[pair.latinIndex].candidateEnglishIndices.includes(englishIndex));
      const unresolvedOwners = record.tokens.filter((token) => !pairsByLatin.has(token.latinIndex) && token.candidateEnglishIndices.includes(englishIndex));
      const soleAttachment = admittedOwners.length === 1 ? attachmentsByLatin.get(admittedOwners[0].latinIndex) : null;
      const contiguousWithOwner = soleAttachment?.englishIndices.some((ownedIndex) => Math.abs(ownedIndex - englishIndex) === 1);
      if (admittedOwners.length === 1 && unresolvedOwners.length === 0 && contiguousWithOwner) {
        soleAttachment.englishIndices.push(englishIndex);
        ownerByEnglish.set(englishIndex, admittedOwners[0].latinIndex);
      }
    }
    pendingLexicalEnglish = new Set(record.tokens
      .filter((token) => !pairsByLatin.has(token.latinIndex))
      .flatMap((token) => token.candidateEnglishIndices)
      .filter((englishIndex) => !ownerByEnglish.has(englishIndex)));

    // Admit a complete published idiom only when it overlaps the token's
    // already admitted lexical anchor. This expands a known translation unit
    // without using free verse-wide phrase guessing.
    for (const [latinIndex, attachment] of attachmentsByLatin) {
      const phrases = publishedPhraseByLatinSurface.get(record.tokens[latinIndex].surface.toLowerCase()) ?? [];
      for (const phrase of phrases) {
        const occurrences = [];
        for (let start = 0; start <= record.english.length - phrase.length; start++) {
          if (phrase.every((word, offset) => record.english[start + offset].toLowerCase() === word)) occurrences.push(phrase.map((_, offset) => start + offset));
        }
        const overlapping = occurrences.filter((indices) => indices.some((index) => attachment.englishIndices.includes(index)));
        if (overlapping.length !== 1) continue;
        const indices = overlapping[0];
        if (indices.some((index) => ownerByEnglish.has(index) && ownerByEnglish.get(index) !== latinIndex)) continue;
        const added = indices.filter((index) => !attachment.englishIndices.includes(index));
        if (!added.length) continue;
        attachment.englishIndices.push(...added);
        attachment.publishedPhraseEnglish = [...(attachment.publishedPhraseEnglish ?? []), ...added];
        for (const index of added) ownerByEnglish.set(index, latinIndex);
      }
    }
    const admittedEnglish = [...ownerByEnglish.keys()].sort((a, b) => a - b);
    for (let englishIndex = 0; englishIndex < record.english.length; englishIndex++) {
      if (ownerByEnglish.has(englishIndex) || pendingLexicalEnglish.has(englishIndex) || !admittedEnglish.length) continue;
      const nextLexicalEnglish = [...admittedEnglish, ...pendingLexicalEnglish].sort((a, b) => a - b).find((candidate) => candidate > englishIndex);
      if (nextLexicalEnglish !== undefined && pendingLexicalEnglish.has(nextLexicalEnglish)) continue;
      const anchorEnglish = nextLexicalEnglish ?? admittedEnglish.at(-1);
      const latinOwner = ownerByEnglish.get(anchorEnglish);
      const publishedWord = record.english[englishIndex].toLowerCase();
      const token = record.tokens[latinOwner];
      const requiredCases = publishedWord === 'of' ? ['GEN']
        : ['to', 'unto', 'for'].includes(publishedWord) ? ['DAT']
          : ['by', 'with', 'from'].includes(publishedWord) ? ['ABL'] : [];
      const caseSupplied = requiredCases.some((requiredCase) => token.grammaticalCases?.includes(requiredCase));
      const infinitiveSupplied = ['to', 'unto'].includes(publishedWord) && token.grammaticalMoods?.includes('INF');
      const indeclinableNameSupplied = publishedWord === 'of'
        && /^[A-Z]/u.test(token.surface)
        && ['EXACT_SURFACE_CONTEXT_CANDIDATE', 'PROPER_NAME_ORTHOGRAPHIC_CANDIDATE'].includes(token.classification)
        && (!token.grammaticalCases?.length || token.grammaticalCases.includes('X'));
      const interveningWords = record.english.slice(englishIndex + 1, anchorEnglish);
      const finiteSubjectSupplied = (subjectPronounForms.get(publishedWord) ?? []).some((form) => token.finiteVerbForms?.includes(form))
        && interveningWords.every((word) => attachablePublishedEnglish.has(word.toLowerCase()));
      const grammarSupplied = caseSupplied || infinitiveSupplied || indeclinableNameSupplied || finiteSubjectSupplied;
      const adjacencySupplied = anchorEnglish === englishIndex + 1 && (
        articlePublishedEnglish.has(publishedWord)
        || (auxiliaryPublishedEnglish.has(publishedWord) && token.finiteVerbForms?.length > 0)
      );
      const invertedSubject = interveningWords.length === 1 ? interveningWords[0].toLowerCase() : null;
      const auxiliarySubjectInversionSupplied = auxiliaryPublishedEnglish.has(publishedWord)
        && invertedSubject
        && (subjectPronounForms.get(invertedSubject) ?? []).some((form) => token.finiteVerbForms?.includes(form))
        && anchorEnglish === englishIndex + 2;
      if (!grammarSupplied && !adjacencySupplied && !auxiliarySubjectInversionSupplied) continue;
      attachmentsByLatin.get(latinOwner).englishIndices.push(englishIndex);
      ownerByEnglish.set(englishIndex, latinOwner);
      if (grammarSupplied) attachmentsByLatin.get(latinOwner).grammarSuppliedEnglish = [...(attachmentsByLatin.get(latinOwner).grammarSuppliedEnglish ?? []), englishIndex];
      if (indeclinableNameSupplied) attachmentsByLatin.get(latinOwner).indeclinableNameEnglish = [...(attachmentsByLatin.get(latinOwner).indeclinableNameEnglish ?? []), englishIndex];
      if (finiteSubjectSupplied) attachmentsByLatin.get(latinOwner).finiteSubjectEnglish = [...(attachmentsByLatin.get(latinOwner).finiteSubjectEnglish ?? []), englishIndex];
      if (auxiliarySubjectInversionSupplied) attachmentsByLatin.get(latinOwner).auxiliaryInversionEnglish = [...(attachmentsByLatin.get(latinOwner).auxiliaryInversionEnglish ?? []), englishIndex];
    }

    // A finite verb can own its published subject and auxiliary even when an
    // independently owned Latin negation intervenes in English order:
    // valebant -> "they were ... able", non -> "not".
    for (const [latinIndex, attachment] of attachmentsByLatin) {
      const token = record.tokens[latinIndex];
      if (!token.finiteVerbForms?.length || nonverbalFunctionForms.has(token.surface.toLowerCase())) continue;
      const anchor = Math.min(...attachment.englishIndices);
      const negationIndex = anchor - 1;
      const auxiliaryIndex = anchor - 2;
      const subjectIndex = anchor - 3;
      const negationOwner = ownerByEnglish.get(negationIndex);
      const subject = record.english[subjectIndex]?.toLowerCase();
      const auxiliary = record.english[auxiliaryIndex]?.toLowerCase();
      const negation = record.english[negationIndex]?.toLowerCase();
      const adjacentLatinNegation = negationOwner !== undefined
        && Math.abs(negationOwner - latinIndex) === 1
        && record.tokens[negationOwner]?.surface.toLowerCase() === 'non';
      const subjectMatches = (subjectPronounForms.get(subject) ?? []).some((form) => token.finiteVerbForms.includes(form));
      if (negation === 'not' && adjacentLatinNegation && subjectMatches && auxiliaryPublishedEnglish.has(auxiliary)
        && !ownerByEnglish.has(subjectIndex) && !ownerByEnglish.has(auxiliaryIndex)) {
        attachment.englishIndices.push(subjectIndex, auxiliaryIndex);
        attachment.negatedFinitePhraseEnglish = [subjectIndex, auxiliaryIndex];
        ownerByEnglish.set(subjectIndex, latinIndex);
        ownerByEnglish.set(auxiliaryIndex, latinIndex);
      } else if (negation === 'not' && adjacentLatinNegation && auxiliaryPublishedEnglish.has(auxiliary)
        && !ownerByEnglish.has(auxiliaryIndex)) {
        attachment.englishIndices.push(auxiliaryIndex);
        attachment.negatedFinitePhraseEnglish = [...(attachment.negatedFinitePhraseEnglish ?? []), auxiliaryIndex];
        ownerByEnglish.set(auxiliaryIndex, latinIndex);
      }
    }

    // When Latin expresses a finite clause with participle + sum but Douay
    // uses one lexical English verb, retain the person/number-bearing subject
    // on sum rather than leaving that Latin row wholly unexplained.
    for (const token of record.tokens) {
      if (attachmentsByLatin.has(token.latinIndex) || !sumAuxiliaryForms.has(token.surface.toLowerCase())) continue;
      const participle = [record.tokens[token.latinIndex - 1], record.tokens[token.latinIndex + 1]]
        .find((candidate) => isExclusiveParticiple(candidate) && attachmentsByLatin.has(candidate.latinIndex));
      if (!participle) continue;
      const participleAttachment = attachmentsByLatin.get(participle.latinIndex);
      const subjectIndex = Math.min(...participleAttachment.englishIndices) - 1;
      const subject = record.english[subjectIndex]?.toLowerCase();
      const subjectMatches = (subjectPronounForms.get(subject) ?? []).some((form) => token.finiteVerbForms?.includes(form));
      if (!subjectMatches || ownerByEnglish.has(subjectIndex) || pendingLexicalEnglish.has(subjectIndex)) continue;
      attachmentsByLatin.set(token.latinIndex, {
        latinIndex: token.latinIndex,
        englishIndices: [subjectIndex],
        status: 'MORPHOLOGICAL_SUBJECT_OWNER',
        finiteSubjectEnglish: [subjectIndex],
      });
      ownerByEnglish.set(subjectIndex, token.latinIndex);
    }

    // Preserve a published pronoun complement immediately following a
    // participial anchor as part of that translation unit. This is alignment
    // evidence, not a claim that the pronoun is a separate Latin token.
    const complementPronouns = new Set(['him', 'her', 'them', 'it', 'thee', 'me', 'us', 'you']);
    for (const [latinIndex, attachment] of attachmentsByLatin) {
      const token = record.tokens[latinIndex];
      if (!isExclusiveParticiple(token)) continue;
      const anchorIndex = Math.max(...attachment.englishIndices);
      if (!record.english[anchorIndex]?.toLowerCase().endsWith('ing')) continue;
      const complementIndex = anchorIndex + 1;
      const complement = record.english[complementIndex]?.toLowerCase();
      if (!complementPronouns.has(complement) || ownerByEnglish.has(complementIndex) || pendingLexicalEnglish.has(complementIndex)) continue;
      attachment.englishIndices.push(complementIndex);
      attachment.participleComplementEnglish = [complementIndex];
      ownerByEnglish.set(complementIndex, latinIndex);
    }
  }
  const primary = [...attachmentsByLatin.values()];
  const accountedOwnerByEnglish = new Map();
  for (const attachment of primary) for (const englishIndex of attachment.englishIndices) {
    if (accountedOwnerByEnglish.has(englishIndex)) errors.push(`${record.sourceReference}: English ${englishIndex} has multiple primary owners`);
    accountedOwnerByEnglish.set(englishIndex, attachment.latinIndex);
  }
  const pendingEnglish = record.english.map((_, index) => index).filter((index) => !accountedOwnerByEnglish.has(index));

  const rows = record.tokens.map((token) => {
    const attachment = attachmentsByLatin.get(token.latinIndex);
    if (!attachment) {
      if (token.candidateEnglishIndices.some((index) => pendingLexicalEnglish.has(index))) return { latinIndex: token.latinIndex, latin: token.surface, action: 'blank-reordered', candidateEnglishIndices: token.candidateEnglishIndices, evidence: ['REORDERED_LEXICAL_PAIR_REQUIRES_ADJUDICATION', token.classification] };
      const adjacentParticiple = [record.tokens[token.latinIndex - 1], record.tokens[token.latinIndex + 1]]
        .find((candidate) => isExclusiveParticiple(candidate) && attachmentsByLatin.has(candidate.latinIndex));
      if (sumAuxiliaryForms.has(token.surface.toLowerCase()) && adjacentParticiple) {
        return {
          latinIndex: token.latinIndex,
          latin: token.surface,
          action: 'blank-compressed',
          ownerLatinIndex: adjacentParticiple.latinIndex,
          evidence: ['GRAMMATICAL_AUXILIARY_COMPRESSED_IN_PUBLISHED_ENGLISH'],
        };
      }
      const sharedEnglishIndex = token.candidateEnglishIndices.find((index) => ownerByEnglish.has(index));
      if (sharedEnglishIndex !== undefined) return { latinIndex: token.latinIndex, latin: token.surface, action: 'blank-compressed', sharedEnglishIndex, ownerLatinIndex: ownerByEnglish.get(sharedEnglishIndex), evidence: ['SHARED_COMPRESSED_ENGLISH_PAIR', token.classification] };
      if (pendingEnglish.length === 0) return { latinIndex: token.latinIndex, latin: token.surface, action: 'blank-unexpressed', evidence: ['NO_STANDALONE_WORD_IN_COMPLETE_PUBLISHED_TRANSLATION_UNIT', token.classification] };
      return { latinIndex: token.latinIndex, latin: token.surface, action: 'blank-unresolved', evidence: ['HELD_NO_LEXICAL_PAIR', token.classification] };
    }
    const anchorEnglishIndex = pairsByLatin.get(attachment.latinIndex) ?? attachment.englishIndices[0];
    if (!attachment.englishIndices.includes(anchorEnglishIndex)) errors.push(`${record.sourceReference}: Latin ${attachment.latinIndex} lacks its anchor`);
    return {
      latinIndex: attachment.latinIndex,
      latin: token.surface,
      action: 'display',
      englishIndices: attachment.englishIndices.sort((a, b) => a - b),
      english: attachment.englishIndices.sort((a, b) => a - b).map((index) => record.english[index]).join(' '),
      anchorEnglishIndex,
      anchorEnglish: record.english[anchorEnglishIndex],
      evidence: [
        attachment.status,
        token.classification,
        ...(attachment.grammarSuppliedEnglish?.length ? ['WHITAKER_MORPHOLOGY_SUPPORTED_ENGLISH_FUNCTION'] : []),
        ...(attachment.indeclinableNameEnglish?.length ? ['INDECLINABLE_PROPER_NAME_RELATION'] : []),
        ...(attachment.finiteSubjectEnglish?.length ? ['WHITAKER_FINITE_VERB_SUPPORTED_SUBJECT'] : []),
        ...(attachment.auxiliaryInversionEnglish?.length ? ['PUBLISHED_AUXILIARY_SUBJECT_INVERSION'] : []),
        ...(attachment.negatedFinitePhraseEnglish?.length ? ['PUBLISHED_NEGATED_FINITE_PHRASE'] : []),
        ...(attachment.participleComplementEnglish?.length ? ['PUBLISHED_PARTICIPLE_PRONOUN_COMPLEMENT'] : []),
        ...(attachment.publishedPhraseEnglish?.length ? ['PUBLISHED_SOURCE_PHRASE_UNIT'] : []),
      ],
    };
  });

  totals.units++;
  totals.latinTokens += record.latin.length;
  totals.englishTokens += record.english.length;
  totals.displayedLatinRows += rows.filter((row) => row.action === 'display').length;
  totals.displayedEnglishTokens += rows.filter((row) => row.action === 'display').reduce((sum, row) => sum + row.englishIndices.length, 0);
  totals.pendingEnglishTokens += pendingEnglish.length;
  totals.multiEnglishRows += rows.filter((row) => row.action === 'display' && row.englishIndices.length > 1).length;
  totals.compressedSharedLatinRows += rows.filter((row) => row.action === 'blank-compressed').length;
  totals.reorderedLatinRows += rows.filter((row) => row.action === 'blank-reordered').length;
  totals.unexpressedLatinRows += rows.filter((row) => row.action === 'blank-unexpressed').length;
  totals.heldLatinRows += rows.filter((row) => row.action === 'blank-unresolved').length;
  units.push({ sourceReference: record.sourceReference, displayReferences: record.displayReferences, latin: record.latin, publishedEnglish: record.english, pendingEnglishIndices: pendingEnglish, rows });
}

if (totals.displayedEnglishTokens + totals.pendingEnglishTokens !== totals.englishTokens) errors.push(`Corpus English accounting failed: ${totals.displayedEnglishTokens} displayed + ${totals.pendingEnglishTokens} pending / ${totals.englishTokens}`);
if (totals.displayedLatinRows + totals.compressedSharedLatinRows + totals.reorderedLatinRows + totals.unexpressedLatinRows + totals.heldLatinRows !== totals.latinTokens) errors.push('Corpus Latin accounting failed');
totals.accountingErrors = errors.length;
const report = {
  status: errors.length ? 'failed' : 'partial-internal-lexical-row-adjudication-pending-reordered-and-unresolved-rows',
  generatedAt: new Date().toISOString(),
  rules: [
    'Every Douay-Rheims English token is accounted exactly once as displayed or pending within its published source unit.',
    'Automatic display requires a monotonic verse-local lexical, exact-form, or proper-name anchor.',
    'A lexical candidate displaced by translation word order remains pending until explicitly adjudicated.',
    'Unpaired English articles, auxiliaries, and function words remain attached to that anchored English phrase.',
    'Latin word order remains untouched; English may appear out of continuous English order when the traditions transpose constituents.',
    'A compressed Latin participant or a Latin token without an independently supported English owner remains blank; no arrow or leading phrase span is displayed.',
    'The complete published Douay-Rheims unit remains preserved separately from Urevangelium row alignment.'
  ],
  inputLedgerSha256: shadow.ledgerSha256,
  totals,
  errors,
  units,
};
report.adjudicationSha256 = sha256(JSON.stringify(units));
fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, totals, adjudicationSha256: report.adjudicationSha256, output: path.relative(ROOT, outputFile), errors: errors.slice(0, 20) }, null, 2));
if (errors.length) process.exitCode = 1;
