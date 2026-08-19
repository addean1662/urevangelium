import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createEngine, dictionaryForm } from 'whitakers-words/node';

const ROOT = path.resolve(import.meta.dirname, '..');
const unitsFile = path.join(ROOT, 'data', 'sources', 'vulgate-english', 'admitted-units.json');
const adjudicationFile = path.join(ROOT, 'docs', 'audits', 'vulgate-english-adjudication.json');
const dictFile = path.join(ROOT, 'data', 'sources', 'glosses', 'whitaker', 'DICTLINE.GEN');
const lewisShortFile = path.join(ROOT, 'data', 'sources', 'glosses', 'lewis-short', 'lat.ls.perseus-eng1.xml');
const outputFile = path.join(ROOT, 'docs', 'audits', 'vulgate-word-english-shadow.json');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const normalize = (value) => value
  .normalize('NFD')
  .replace(/\p{M}+/gu, '')
  .toLocaleLowerCase('en')
  .replace(/[^\p{L}\p{N}]+/gu, '');

const englishWords = (value) => value.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
const latinWords = (value) => value.match(/[\p{L}\p{N}]+/gu) ?? [];

function loadDictionary() {
  const map = new Map();
  for (const line of fs.readFileSync(dictFile, 'utf8').split(/\r?\n/u)) {
    const tokens = line.trim().split(/\s+/u);
    if (tokens.length < 7) continue;
    let definitionStart = -1;
    for (let index = tokens.length - 6; index >= 0; index -= 1) {
      const flags = tokens.slice(index, index + 5);
      if (flags.every((token) => /^[A-Z]$/u.test(token)) && tokens[index + 5] && !/^[A-Z]$/u.test(tokens[index + 5])) {
        definitionStart = index + 5;
        break;
      }
    }
    if (definitionStart < 0) continue;
    const stem = normalize(tokens[0]);
    const definition = tokens.slice(definitionStart).join(' ').replace(/;$/u, '').trim();
    if (stem && definition) {
      const definitions = map.get(stem) ?? [];
      if (!definitions.includes(definition)) definitions.push(definition);
      map.set(stem, definitions);
    }
  }
  return map;
}

const endings = [
  'ationibus', 'ationem', 'ationis', 'ationes', 'itionibus', 'itionem', 'itionis',
  'issimorum', 'issimum', 'issimus', 'issima', 'erunt', 'erant', 'untur', 'ientur',
  'orum', 'arum', 'ibus', 'ntium', 'ntem', 'ntis', 'ntes', 'antis', 'entis',
  'amus', 'atis', 'abat', 'abant', 'imus', 'itis', 'unt', 'tur', 'mur', 'mini',
  'que', 'ium', 'iam', 'ius', 'ionem', 'iones', 'onis', 'one', 'orum',
  'ae', 'am', 'as', 'em', 'es', 'ei', 'eo', 'is', 'os', 'um', 'us', 'e', 'i', 'o', 'a',
];

function dictionaryEntries(dictionary, surface) {
  const word = normalize(surface);
  const keys = [word];
  for (const ending of endings) {
    if (word.endsWith(ending) && word.length - ending.length >= 2) keys.push(word.slice(0, -ending.length));
  }
  return [...new Set(keys.flatMap((key) => dictionary.get(key) ?? []))];
}

const engine = createEngine();

function loadLewisShort() {
  const xml = fs.readFileSync(lewisShortFile, 'utf8');
  const map = new Map();
  for (const match of xml.matchAll(/<entryFree\b[^>]*\bkey="([^"]+)"[^>]*>([\s\S]*?)<\/entryFree>/gu)) {
    const key = normalize(match[1]).replaceAll('j', 'i');
    const text = match[2]
      .replace(/<cit\b[\s\S]*?<\/cit>/gu, ' ')
      .replace(/<[^>]+>/gu, ' ')
      .replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"').replaceAll('&apos;', "'")
      .replace(/\s+/gu, ' ').trim();
    if (key && text) map.set(key, text);
  }
  return map;
}

const lewisShort = loadLewisShort();

function repairMojibake(value) {
  if (!/[ÃÂ]/u.test(value)) return value;
  const repaired = Buffer.from(value, 'latin1').toString('utf8');
  return repaired.includes('\uFFFD') ? value : repaired;
}

function analyzedEntries(surface) {
  const repaired = repairMojibake(surface).toLocaleLowerCase('la');
  const variants = [...new Set([
    repaired,
    repaired.replaceAll('j', 'i'),
    repaired.replaceAll('æ', 'ae').replaceAll('œ', 'oe'),
    repaired.replaceAll('j', 'i').replaceAll('æ', 'ae').replaceAll('œ', 'oe'),
  ])];
  const whitakerMeanings = [];
  const headwords = new Set();
  function collectDictionaryMeanings(value) {
    if (!value || typeof value !== 'object') return;
    if (value.de?.mean) {
      whitakerMeanings.push(value.de.mean);
      const headword = dictionaryForm(value.de).split(/[\s,]+/u)[0];
      if (headword) headwords.add(normalize(headword).replaceAll('j', 'i'));
    }
    for (const child of Array.isArray(value) ? value : Object.values(value)) collectDictionaryMeanings(child);
  }
  for (const variant of variants) {
    collectDictionaryMeanings(engine.parseLine(variant)[0]);
  }
  // Retain the older lookup as corroboration and for forms not handled by the analyzer.
  whitakerMeanings.push(...dictionaryEntries(dictionary, surface));
  const lewisShortMeanings = [...headwords].map((headword) => lewisShort.get(headword)).filter(Boolean);
  const whitakerEntries = [...new Set(whitakerMeanings)];
  const lewisShortEntries = [...new Set(lewisShortMeanings)];
  return { whitakerEntries, lewisShortEntries, allEntries: [...new Set([...whitakerEntries, ...lewisShortEntries])] };
}

const irregularEnglish = new Map(Object.entries({
  am: 'be', is: 'be', are: 'be', was: 'be', were: 'be', been: 'be', being: 'be', art: 'be', wast: 'be',
  has: 'have', hath: 'have', had: 'have', having: 'have',
  does: 'do', doth: 'do', did: 'do', done: 'do', doing: 'do',
  says: 'say', saith: 'say', said: 'say', saying: 'say',
  speaks: 'speak', spoke: 'speak', spoken: 'speak', speaking: 'speak',
  comes: 'come', came: 'come', coming: 'come',
  goes: 'go', went: 'go', gone: 'go', going: 'go',
  sees: 'see', saw: 'see', seen: 'see', seeing: 'see',
  gives: 'give', gave: 'give', given: 'give', giving: 'give',
  takes: 'take', took: 'take', taken: 'take', taking: 'take',
  makes: 'make', made: 'make', making: 'make',
  knows: 'know', knew: 'know', known: 'know', knowing: 'know',
  leaves: 'leave', left: 'leave', leaving: 'leave',
  finds: 'find', found: 'find', finding: 'find',
  brings: 'bring', brought: 'bring', bringing: 'bring',
  thinks: 'think', thought: 'think', thinking: 'think',
  tells: 'tell', told: 'tell', telling: 'tell',
  sends: 'send', sent: 'send', sending: 'send',
  writes: 'write', wrote: 'write', written: 'write', writing: 'write',
  rises: 'rise', rose: 'rise', risen: 'rise', rising: 'rise',
  eats: 'eat', ate: 'eat', eaten: 'eat', eating: 'eat',
  drinks: 'drink', drank: 'drink', drunk: 'drink', drinking: 'drink',
  men: 'man', women: 'woman', children: 'child', brethren: 'brother', feet: 'foot',
  greater: 'great', greatest: 'great', less: 'little', least: 'little', better: 'good', best: 'good', worse: 'bad', worst: 'bad',
  first: 'one', second: 'two', third: 'three', fourth: 'four', fifth: 'five', sixth: 'six', seventh: 'seven', eighth: 'eight', ninth: 'nine', tenth: 'ten',
  me: 'i', my: 'i', mine: 'i', we: 'we', us: 'we', our: 'we', ours: 'we',
  thee: 'you', thou: 'you', thy: 'you', thine: 'you', ye: 'you', your: 'you', yours: 'you',
  he: 'he', him: 'he', his: 'he', she: 'she', her: 'she', hers: 'she',
  they: 'they', them: 'they', their: 'they', theirs: 'they',
  himself: 'he', herself: 'she', itself: 'it', themselves: 'they', myself: 'i', ourselves: 'we', thyself: 'you', yourself: 'you', yourselves: 'you',
}));

function englishLemma(value) {
  const word = normalize(value);
  if (irregularEnglish.has(word)) return irregularEnglish.get(word);
  if (word.length > 5 && word.endsWith('eth')) {
    const base = word.slice(0, -3);
    return base.endsWith('v') || base.endsWith('k') || base.endsWith('c') ? `${base}e` : base;
  }
  if (word.length > 5 && word.endsWith('est') && !new Set(['greatest', 'priest', 'honest', 'forest', 'harvest', 'modest', 'interest']).has(word)) {
    const base = word.slice(0, -3);
    return base.endsWith('v') || base.endsWith('k') || base.endsWith('c') ? `${base}e` : base;
  }
  if (word.length > 5 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 5 && word.endsWith('ing')) {
    const base = word.slice(0, -3);
    if (base.endsWith(base.at(-1).repeat(2)) && !/[lsz]$/u.test(base)) return base.slice(0, -1);
    return base.endsWith('v') || base.endsWith('k') ? `${base}e` : base;
  }
  if (word.length > 4 && word.endsWith('ied')) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith('ed')) {
    const base = word.slice(0, -2);
    if (base.endsWith(base.at(-1).repeat(2)) && !/[lsz]$/u.test(base)) return base.slice(0, -1);
    return base.endsWith('at') || base.endsWith('it') || base.endsWith('iz') ? `${base}e` : base;
  }
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1);
  return word;
}

function candidateEnglish(entries, words, excluded = new Set()) {
  const entryTerms = new Set(entries.flatMap((entry) => englishWords(entry).map(englishLemma)).filter((term) => term.length > 1));
  return words.map((word, index) => ({ word, index })).filter(({ word }) => entryTerms.has(englishLemma(word)) && !excluded.has(englishLemma(word)));
}

const lewisShortAnchorStopwords = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'nor', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'from', 'with', 'as', 'than',
  'be', 'have', 'do', 'he', 'she', 'it', 'they', 'i', 'we', 'you', 'this', 'that', 'these', 'those', 'who', 'which', 'what',
  'not', 'no', 'yes', 'also', 'then', 'there', 'here', 'all', 'any', 'some', 'same', 'one',
]);

const whitakerContentStopwords = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'nor', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'from', 'with', 'as', 'than',
  'he', 'she', 'it', 'they', 'i', 'we', 'you', 'this', 'that', 'these', 'those', 'who', 'which', 'what',
]);

const latinFunctionWords = new Map(Object.entries({
  et: ['and'], autem: ['but'], enim: ['for'], in: ['in'], non: ['not'], neque: ['neither', 'nor'], nec: ['nor'],
  vel: ['or'], aut: ['or'], ad: ['to'], de: ['of', 'from'], ex: ['from'], e: ['from'], cum: ['with', 'when'],
  per: ['through', 'by'], quia: ['because'], ut: ['that', 'as'], si: ['if'], sed: ['but'], ergo: ['therefore'],
  igitur: ['therefore'], quoque: ['also'], quidem: ['indeed'], amen: ['amen'],
}));

function registeredFunctionCandidates(surface, words) {
  const allowed = latinFunctionWords.get(normalize(repairMojibake(surface)).replaceAll('j', 'i')) ?? [];
  return words.map((word, index) => ({ word, index })).filter(({ word }) => allowed.includes(englishLemma(word)));
}

function editDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + Number(left[i - 1] !== right[j - 1]));
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function properNameCandidates(surface, words) {
  const raw = normalize(repairMojibake(surface)).replaceAll('j', 'i');
  const stems = [raw, ...['orum', 'arum', 'ium', 'ibus', 'em', 'am', 'um', 'is', 'es', 'ae', 'i', 'o', 'a'].filter((ending) => raw.endsWith(ending) && raw.length - ending.length >= 4).map((ending) => raw.slice(0, -ending.length))];
  return words.map((word, index) => ({ word, index, normalized: normalize(word).replaceAll('j', 'i') }))
    .filter(({ word, normalized }) => /^[A-Z]/u.test(word) && normalized.length >= 4 && stems.some((stem) => 1 - editDistance(stem, normalized) / Math.max(stem.length, normalized.length) >= 0.58))
    .map(({ word, index }) => ({ word, index }));
}

function monotonicAnchors(tokens, englishLength) {
  const rows = tokens.length + 1;
  const columns = englishLength + 1;
  const scores = Array.from({ length: rows }, () => Array(columns).fill(0));
  const choices = Array.from({ length: rows }, () => Array(columns).fill(null));
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < columns; j += 1) {
      let score = scores[i - 1][j];
      let choice = 'latin-skip';
      if (scores[i][j - 1] > score) { score = scores[i][j - 1]; choice = 'english-skip'; }
      if (tokens[i - 1].candidateEnglishIndices.includes(j - 1)) {
        const weight = tokens[i - 1].exactEnglishIndices.includes(j - 1) ? 3 : 2;
        // Prefer an equally scoring lexical match so repeated words anchor as
        // late as their source order permits instead of leaving a false tail.
        if (scores[i - 1][j - 1] + weight >= score) {
          score = scores[i - 1][j - 1] + weight;
          choice = 'match';
        }
      }
      scores[i][j] = score;
      choices[i][j] = choice;
    }
  }
  const matches = [];
  let i = tokens.length;
  let j = englishLength;
  while (i > 0 && j > 0) {
    const choice = choices[i][j];
    if (choice === 'match') { matches.push({ latinIndex: i - 1, englishIndex: j - 1 }); i -= 1; j -= 1; }
    else if (choice === 'english-skip') j -= 1;
    else i -= 1;
  }
  return matches.reverse();
}

function translationSpans(latinLength, englishLength, anchors) {
  const spans = [];
  let previousLatin = -1;
  let previousEnglish = -1;
  for (const anchor of anchors) {
    spans.push({
      latinStart: previousLatin + 1,
      latinEnd: anchor.latinIndex,
      englishStart: previousEnglish + 1,
      englishEnd: anchor.englishIndex,
      closingAnchor: anchor,
      status: 'LEXICALLY_ANCHORED_ORDERED_SPAN',
    });
    previousLatin = anchor.latinIndex;
    previousEnglish = anchor.englishIndex;
  }
  if (previousLatin < latinLength - 1) {
    spans.push({
      latinStart: previousLatin + 1,
      latinEnd: latinLength - 1,
      englishStart: previousEnglish + 1,
      englishEnd: englishLength - 1,
      closingAnchor: null,
      status: 'UNANCHORED_TRAILING_SPAN_HELD',
    });
  } else if (previousEnglish < englishLength - 1 && spans.length) {
    spans.at(-1).englishEnd = englishLength - 1;
    spans.at(-1).status = 'LEXICALLY_ANCHORED_WITH_ENGLISH_TRAILER';
  }
  return spans;
}

function uniqueVersePairs(tokens, englishLength) {
  const englishOwner = Array(englishLength).fill(-1);
  const orderedCandidates = tokens.map((token) => [...token.candidateEnglishIndices].sort((left, right) => {
    const leftExact = token.exactEnglishIndices.includes(left);
    const rightExact = token.exactEnglishIndices.includes(right);
    if (leftExact !== rightExact) return leftExact ? -1 : 1;
    const projected = tokens.length > 1 ? token.latinIndex * (englishLength - 1) / (tokens.length - 1) : 0;
    return Math.abs(left - projected) - Math.abs(right - projected) || left - right;
  }));
  function assign(latinIndex, visited) {
    for (const englishIndex of orderedCandidates[latinIndex]) {
      if (visited.has(englishIndex)) continue;
      visited.add(englishIndex);
      if (englishOwner[englishIndex] < 0 || assign(englishOwner[englishIndex], visited)) {
        englishOwner[englishIndex] = latinIndex;
        return true;
      }
    }
    return false;
  }
  for (const token of tokens) assign(token.latinIndex, new Set());
  return englishOwner
    .map((latinIndex, englishIndex) => latinIndex < 0 ? null : ({ latinIndex, englishIndex }))
    .filter(Boolean)
    .sort((left, right) => left.latinIndex - right.latinIndex);
}

function rowAttachments(tokens, english, pairs) {
  const byLatin = new Map(pairs.map((pair) => [pair.latinIndex, { latinIndex: pair.latinIndex, englishIndices: [pair.englishIndex], status: 'UNIQUE_LEXICAL_PAIR' }]));
  const ownerByEnglish = new Map(pairs.map((pair) => [pair.englishIndex, pair.latinIndex]));
  const pairedEnglish = [...ownerByEnglish.keys()].sort((left, right) => left - right);

  // Published English function words and auxiliaries have no independent
  // Latin token in many constructions. Keep them with the closest lexical
  // anchor, never outside the source unit.
  for (let englishIndex = 0; englishIndex < english.length; englishIndex += 1) {
    if (ownerByEnglish.has(englishIndex) || !pairedEnglish.length) continue;
    // In an English translation, unpaired articles, prepositions, pronouns,
    // and auxiliaries ordinarily introduce the following lexical item. Keep
    // the published sequence intact by preferring the next anchor; only a
    // terminal trailer falls back to the preceding anchor.
    const anchorEnglish = pairedEnglish.find((candidate) => candidate > englishIndex) ?? pairedEnglish.at(-1);
    const latinIndex = ownerByEnglish.get(anchorEnglish);
    const attachment = byLatin.get(latinIndex);
    attachment.englishIndices.push(englishIndex);
    attachment.status = 'LEXICAL_PAIR_WITH_ATTACHED_PUBLISHED_WORDS';
  }

  // When several Latin tokens have evidence for the same compressed English
  // word, record a shared relationship instead of duplicating the English.
  for (const token of tokens) {
    if (byLatin.has(token.latinIndex) || !token.candidateEnglishIndices.length) continue;
    const sharedEnglish = token.candidateEnglishIndices.find((index) => ownerByEnglish.has(index));
    if (sharedEnglish !== undefined) {
      byLatin.set(token.latinIndex, { latinIndex: token.latinIndex, englishIndices: [sharedEnglish], status: 'SHARED_COMPRESSED_ENGLISH_PAIR' });
    }
  }

  return tokens.map((token) => {
    const attachment = byLatin.get(token.latinIndex);
    if (!attachment) return { latinIndex: token.latinIndex, englishIndices: [], english: '', status: 'HELD_NO_LEXICAL_PAIR' };
    attachment.englishIndices.sort((left, right) => left - right);
    return { ...attachment, english: attachment.englishIndices.map((index) => english[index]).join(' ') };
  });
}

const dictionary = loadDictionary();
const manifest = JSON.parse(fs.readFileSync(unitsFile, 'utf8'));
const adjudication = JSON.parse(fs.readFileSync(adjudicationFile, 'utf8'));
const latinBySourceReference = new Map(adjudication.admitted.map((unit) => [unit.sourceReference, unit.latin]));
const records = [];
const unresolvedForms = new Map();
const totals = {
  units: 0,
  latinTokens: 0,
  englishTokens: 0,
  dictionaryLocated: 0,
  lewisShortLocated: 0,
  twoLexiconContextAgreement: 0,
  contextualCandidateLocated: 0,
  exactSurfaceCandidate: 0,
  properNameOrthographicCandidates: 0,
  monotonicAnchorPairs: 0,
  uniqueVersePairs: 0,
  displacedUniqueVersePairs: 0,
  attachedPublishedEnglishWords: 0,
  sharedCompressedLatinPairs: 0,
  heldRowAttachments: 0,
  translationSpans: 0,
  oneLatinOneEnglishSpans: 0,
  oneLatinMultipleEnglishSpans: 0,
  multipleLatinPhraseSpans: 0,
  heldTrailingSpans: 0,
  heldLatinTokens: 0,
};

for (const [displayReference, unit] of Object.entries(manifest.units)) {
  // Multi-verse units are stored under each display reference. Audit the source unit once.
  if (displayReference !== unit.displayReferences[0]) continue;
  const latinSource = latinBySourceReference.get(unit.sourceReference);
  if (!latinSource) throw new Error(`Missing certified Latin unit for ${unit.sourceReference}`);
  const latin = latinWords(latinSource);
  const english = englishWords(unit.english);
  const tokenRecords = latin.map((surface, latinIndex) => {
    const evidence = analyzedEntries(surface);
    const entries = evidence.allEntries;
    const direct = english.map((word, index) => ({ word, index })).filter(({ word }) => normalize(word) === normalize(surface));
    const whitakerHeadEntries = evidence.whitakerEntries.map((entry) => entry.split(';')[0]);
    const whitakerCandidates = candidateEnglish(whitakerHeadEntries, english, whitakerContentStopwords);
    const functionCandidates = registeredFunctionCandidates(surface, english);
    const lewisShortCandidates = candidateEnglish(evidence.lewisShortEntries, english, lewisShortAnchorStopwords);
    // Lewis–Short corroborates a Whitaker-selected contextual candidate. Its
    // long historical entries are deliberately prohibited from creating an
    // independent anchor because incidental words can occur deep in an entry.
    const lexical = [...whitakerCandidates, ...functionCandidates].filter((candidate, index, all) => all.findIndex((item) => item.index === candidate.index) === index);
    const properNames = entries.length ? [] : properNameCandidates(surface, english);
    const candidateRecords = [...direct, ...lexical, ...properNames].filter((candidate, index, all) => all.findIndex((item) => item.index === candidate.index) === index);
    const candidates = candidateRecords.map(({ word }) => word);
    let classification = 'HELD_NO_CONTEXTUAL_CANDIDATE';
    if (direct.length) classification = 'EXACT_SURFACE_CONTEXT_CANDIDATE';
    else if (lexical.length) classification = 'LEXICON_CONTEXT_CANDIDATE';
    else if (properNames.length) classification = 'PROPER_NAME_ORTHOGRAPHIC_CANDIDATE';
    else if (entries.length) classification = 'LEXICON_FOUND_CONTEXT_UNRESOLVED';
    const heldForm = normalize(repairMojibake(surface));
    if (!candidates.length) unresolvedForms.set(heldForm, (unresolvedForms.get(heldForm) ?? 0) + 1);
    totals.latinTokens += 1;
    totals.dictionaryLocated += Number(entries.length > 0);
    totals.lewisShortLocated += Number(evidence.lewisShortEntries.length > 0);
    totals.twoLexiconContextAgreement += Number(whitakerCandidates.some((candidate) => lewisShortCandidates.some((other) => other.index === candidate.index)));
    totals.contextualCandidateLocated += Number(candidates.length > 0);
    totals.exactSurfaceCandidate += Number(direct.length > 0);
    totals.properNameOrthographicCandidates += Number(properNames.length > 0);
    totals.heldLatinTokens += Number(candidates.length === 0);
    return {
      latinIndex,
      surface,
      classification,
      candidates,
      candidateEnglishIndices: candidateRecords.map(({ index }) => index),
      exactEnglishIndices: direct.map(({ index }) => index),
      dictionaryEntries: entries.slice(0, 3),
      whitakerEntries: evidence.whitakerEntries.slice(0, 3),
      lewisShortEntries: evidence.lewisShortEntries.slice(0, 2),
    };
  });
  const anchors = monotonicAnchors(tokenRecords, english.length);
  const versePairs = uniqueVersePairs(tokenRecords, english.length);
  const attachments = rowAttachments(tokenRecords, english, versePairs);
  const spans = translationSpans(latin.length, english.length, anchors);
  totals.monotonicAnchorPairs += anchors.length;
  totals.uniqueVersePairs += versePairs.length;
  let priorEnglishIndex = -1;
  for (const pair of versePairs) {
    if (pair.englishIndex < priorEnglishIndex) totals.displacedUniqueVersePairs += 1;
    priorEnglishIndex = pair.englishIndex;
  }
  totals.attachedPublishedEnglishWords += attachments.reduce((sum, attachment) => sum + Math.max(0, attachment.englishIndices.length - 1), 0);
  totals.sharedCompressedLatinPairs += attachments.filter((attachment) => attachment.status === 'SHARED_COMPRESSED_ENGLISH_PAIR').length;
  totals.heldRowAttachments += attachments.filter((attachment) => attachment.status === 'HELD_NO_LEXICAL_PAIR').length;
  totals.translationSpans += spans.length;
  for (const span of spans) {
    const latinCount = span.latinEnd - span.latinStart + 1;
    const englishCount = span.englishEnd - span.englishStart + 1;
    totals.oneLatinOneEnglishSpans += Number(latinCount === 1 && englishCount === 1);
    totals.oneLatinMultipleEnglishSpans += Number(latinCount === 1 && englishCount > 1);
    totals.multipleLatinPhraseSpans += Number(latinCount > 1);
    totals.heldTrailingSpans += Number(span.status === 'UNANCHORED_TRAILING_SPAN_HELD');
  }
  totals.units += 1;
  totals.englishTokens += english.length;
  records.push({
    sourceReference: unit.sourceReference,
    displayReferences: unit.displayReferences,
    latin,
    english,
    tokens: tokenRecords,
    monotonicAnchors: anchors,
    uniqueVersePairs: versePairs,
    rowAttachments: attachments,
    translationSpans: spans,
  });
}

const report = {
  status: 'shadow-candidates-only-no-live-display-changes',
  generatedAt: new Date().toISOString(),
  rules: [
    'The Clementine Latin and admitted Douay-Rheims 1899 wording remain unchanged.',
    'This pass identifies possible contextual pairings; it does not admit or display them.',
    'Whitaker supplies lexical evidence only and does not replace the published translation.',
    'Candidate presence is not certification: order, morphology, multiword scope, and English-token accounting remain to be adjudicated.',
    'Ambiguity fails closed.',
  ],
  totals,
  rates: {
    dictionaryCoverage: totals.dictionaryLocated / totals.latinTokens,
    contextualCandidateCoverage: totals.contextualCandidateLocated / totals.latinTokens,
  },
  mostFrequentHeldForms: [...unresolvedForms.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 250)
    .map(([form, count]) => ({ form, count })),
  inputs: {
    units: path.relative(ROOT, unitsFile),
    unitsSha256: sha256(fs.readFileSync(unitsFile)),
    dictionary: path.relative(ROOT, dictFile),
    dictionarySha256: sha256(fs.readFileSync(dictFile)),
    lewisShort: path.relative(ROOT, lewisShortFile),
    lewisShortSha256: sha256(fs.readFileSync(lewisShortFile)),
    adjudication: path.relative(ROOT, adjudicationFile),
    adjudicationSha256: sha256(fs.readFileSync(adjudicationFile)),
  },
  records,
};
report.ledgerSha256 = sha256(JSON.stringify(records));
fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, totals, rates: report.rates, ledgerSha256: report.ledgerSha256, output: path.relative(ROOT, outputFile) }, null, 2));
