import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { alignSequences } from '../lib/alignment/sequenceAlign.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const APPLY = process.argv.includes('--apply');
const GOSPELS = ['matthew', 'mark', 'luke', 'john'];
const BOOKS = { matthew: 'Mat', mark: 'Mrk', luke: 'Luk', john: 'Jhn' };
const FILES = { matthew: 'MAT.csv', mark: 'MAR.csv', luke: 'LUK.csv', john: 'JOH.csv' };
const MORPH_FILES = ['61-Mt-morphgnt.txt', '62-Mk-morphgnt.txt', '63-Lk-morphgnt.txt', '64-Jn-morphgnt.txt'];
const PROIEL_FILE = 'data/sources/greek-shared/proiel/greek-nt.xml';
const LEXEMES_FILE = 'data/sources/greek-shared/morphgnt-lexicon/lexemes.yaml';

function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function norm(text) { return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('el').replace(/ς/gu, 'σ').replace(/[^α-ω]/gu, ''); }
function cleanGreek(text) { return text.replace(/\s+\([^)]*\)\s*$/u, '').replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, ''); }
function cleanGloss(text) { return text.replace(/[\[\]]/gu, '').replace(/\s+/gu, ' ').trim(); }
function strongNumber(value) { return Number(value.match(/^G?0*(\d+)/u)?.[1] ?? 0); }
function xmlAttributes(source) { return Object.fromEntries([...source.matchAll(/([\w-]+)="([^"]*)"/gu)].map((match) => [match[1], match[2]])); }

function parseSecondaryGreek() {
  const morph = new Map();
  const proiel = new Map();
  const lexemes = new Map();
  const lexemesByStrong = new Map();
  const add = (index, form, lemma) => {
    const key = norm(form);
    const value = norm(lemma);
    if (!key || !value) return;
    if (!index.has(key)) index.set(key, new Set());
    index.get(key).add(value);
  };
  for (const name of MORPH_FILES) {
    const file = path.join(ROOT, 'data/sources/greek-shared/morphgnt', name);
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/u)) {
      const columns = line.trim().split(/\s+/u);
      if (columns.length >= 7) add(morph, columns[4], columns[6]);
    }
  }
  const proielPath = path.join(ROOT, PROIEL_FILE);
  for (const match of fs.readFileSync(proielPath, 'utf8').matchAll(/<token\s+([^>]+)>/gsu)) {
    const attributes = xmlAttributes(match[1]);
    if (attributes.form && attributes.lemma) add(proiel, attributes.form, attributes.lemma);
  }
  const lexemePath = path.join(ROOT, LEXEMES_FILE);
  let current = null;
  for (const line of fs.readFileSync(lexemePath, 'utf8').split(/\r?\n/u)) {
    const head = line.match(/^(\S.*):$/u);
    if (head) { current = { lemma: norm(head[1]) }; lexemes.set(current.lemma, current); continue; }
    if (!current) continue;
    const field = line.match(/^\s{4}(strongs|gloss):\s*(.*)$/u);
    if (field) current[field[1]] = field[2].replace(/^['"]|['"]$/gu, '');
  }
  for (const entry of lexemes.values()) {
    const strong = strongNumber(String(entry.strongs ?? ''));
    if (!strong) continue;
    if (!lexemesByStrong.has(strong)) lexemesByStrong.set(strong, []);
    lexemesByStrong.get(strong).push(entry);
  }
  return {
    morph, proiel, lexemes, lexemesByStrong,
    files: {
      morphgnt: Object.fromEntries(MORPH_FILES.map((name) => {
        const relative = `data/sources/greek-shared/morphgnt/${name}`;
        return [name, sha256(path.join(ROOT, relative))];
      })),
      proiel: { file: PROIEL_FILE, sha256: sha256(proielPath) },
      morphgntLexicon: { file: LEXEMES_FILE, sha256: sha256(lexemePath) },
    },
  };
}

function parseMorphology() {
  const corpus = new Map();
  const files = {};
  for (const gospel of GOSPELS) {
    const relative = `data/sources/byzantine/strongs-with-parsing/${FILES[gospel]}`;
    const file = path.join(ROOT, relative);
    files[gospel] = { file: relative, sha256: sha256(file) };
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/u)) {
      const match = line.match(/^(\d+),(\d+),(.*)$/u);
      if (!match) continue;
      const tokens = [];
      for (const item of match[3].matchAll(/(\S+)\s+(\d+)\s+\{([^}]+)\}/gu)) tokens.push({ text: item[1], strong: Number(item[2]), parsing: item[3] });
      corpus.set(`${gospel} ${Number(match[1])}:${Number(match[2])}`, tokens);
    }
  }
  return { corpus, files };
}

function parseTagnt() {
  const verses = new Map();
  const file = path.join(ROOT, 'data/sources/greek-shared/TAGNT-Mat-Jhn-CC-BY.txt');
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/u)) {
    const columns = line.split('\t');
    const reference = columns[0]?.match(/^(Mat|Mrk|Luk|Jhn)\.(\d+)\.(\d+)#/u);
    const editions = columns[5] ?? '';
    const variant = columns[6] ?? '';
    const baseIsByzantine = editions.split('+').includes('Byz');
    const variantIsByzantine = /\bin:\s*[^\t]*\bByz\b/u.test(variant);
    if (!reference || (!baseIsByzantine && !variantIsByzantine)) continue;
    let text = cleanGreek(columns[1] ?? '');
    let strongCode = (columns[3] ?? '').split('=')[0];
    let parsing = (columns[3] ?? '').split('=')[1] ?? '';
    let gloss = cleanGloss(columns[2] ?? '');
    if (!baseIsByzantine && variantIsByzantine) {
      text = cleanGreek(variant.split(/\s+\(t=/u)[0]);
      const variantAnalysis = variant.match(/\b(G\d+[A-Z]?)=([^\s]+)\s+in:/u);
      if (variantAnalysis) { strongCode = variantAnalysis[1]; parsing = variantAnalysis[2]; }
      const contextual = variant;
      const byzantineSense = contextual.match(/\|([^|@»]+)(?:@|$)/u)?.[1];
      if (byzantineSense) gloss = cleanGloss(byzantineSense);
    }
    if (!baseIsByzantine && variantIsByzantine) {
      const variantGloss = variant.match(/\)\s*(.*?)\s+-\s+G\d+[A-Z]?=/u)?.[1];
      if (variantGloss) gloss = cleanGloss(variantGloss);
    }
    const gospel = Object.entries(BOOKS).find(([, code]) => code === reference[1])?.[0];
    if (!gospel || !text) continue;
    const key = `${gospel} ${Number(reference[2])}:${Number(reference[3])}`;
    if (!verses.has(key)) verses.set(key, []);
    verses.get(key).push({ text, strongCode, strong: strongNumber(strongCode), parsing, gloss });
  }
  return { verses, file: 'data/sources/greek-shared/TAGNT-Mat-Jhn-CC-BY.txt', sha256: sha256(file) };
}

function parseTbesg() {
  const entries = new Map();
  const file = path.join(ROOT, 'data/sources/greek-shared/TBESG-CC-BY.txt');
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/u)) {
    if (!line.startsWith('G')) continue;
    const columns = line.split('\t');
    const base = strongNumber(columns[0] ?? '');
    const extended = (columns[1] ?? '').split('=')[0].trim();
    const record = { base, extended, lemma: columns[3] ?? '', briefGloss: columns[6] ?? '', definition: columns[7] ?? '' };
    if (!entries.has(base)) entries.set(base, []);
    entries.get(base).push(record);
  }
  return { entries, file: 'data/sources/greek-shared/TBESG-CC-BY.txt', sha256: sha256(file) };
}

function liveTokens(reference) {
  const match = reference.match(/^(\w+) (\d+):(\d+)$/u);
  const file = path.join(ROOT, 'data', match[1], match[2], `${match[3]}.json`);
  const document = JSON.parse(fs.readFileSync(file, 'utf8'));
  return document.rows.filter((row) => row.byzantine?.type === 'text').map((row) => ({ rowId: row.id, text: row.byzantine.text, provenance: row.byzantine.provenance }));
}

const morphology = parseMorphology();
const tagnt = parseTagnt();
const tbesg = parseTbesg();
const secondary = parseSecondaryGreek();
const decisions = [];
const totals = { liveTokens: 0, morphologyExact: 0, tagntByzantineExact: 0, strongAgreement: 0, tbesgExactExtended: 0, contextualAdmitted: 0, generatedLexicalAdmitted: 0, secondaryContextualAdmitted: 0, secondaryLexicalAdmitted: 0, rpTagntMorphologyAdmitted: 0, rpLexiconAdmitted: 0, admitted: 0, held: 0 };

for (const [reference, morphTokens] of morphology.corpus) {
  const live = liveTokens(reference);
  totals.liveTokens += live.length;
  if (live.length !== morphTokens.length) throw new Error(`${reference}: live/morphology count mismatch ${live.length}/${morphTokens.length}`);
  const tagntTokens = tagnt.verses.get(reference) ?? [];
  const operations = alignSequences(morphTokens.map((item) => norm(item.text)), tagntTokens.map((item) => norm(item.text)));
  const tagntByMorph = new Map(operations.filter((item) => item.sourceIndex !== null && item.displayIndex !== null && item.type === 'exact').map((item) => [item.sourceIndex, tagntTokens[item.displayIndex]]));
  for (let index = 0; index < morphTokens.length; index += 1) {
    const source = morphTokens[index];
    const cell = live[index];
    const morphologyExact = norm(source.text) === norm(cell.text) && cell.provenance?.sourceToken === index + 1;
    if (morphologyExact) totals.morphologyExact += 1;
    const contextual = tagntByMorph.get(index);
    const tagntExact = Boolean(contextual);
    if (tagntExact) totals.tagntByzantineExact += 1;
    const strongAgreement = Boolean(contextual && contextual.strong === source.strong);
    if (strongAgreement) totals.strongAgreement += 1;
    const lexicalCandidates = tbesg.entries.get(source.strong) ?? [];
    const exactExtended = contextual ? lexicalCandidates.find((entry) => entry.extended === contextual.strongCode) : null;
    const briefGlosses = [...new Set(lexicalCandidates.map((entry) => entry.briefGloss.trim()).filter(Boolean))];
    const consensusLexical = briefGlosses.length === 1 ? lexicalCandidates.find((entry) => entry.briefGloss.trim() === briefGlosses[0]) : null;
    const lexical = exactExtended ?? (lexicalCandidates.length === 1 ? lexicalCandidates[0] : consensusLexical);
    if (exactExtended) totals.tbesgExactExtended += 1;
    const contextualAdmitted = Boolean(morphologyExact && tagntExact && strongAgreement && lexical && contextual.gloss);
    const generatedLexicalAdmitted = Boolean(!contextualAdmitted && morphologyExact && lexical?.briefGloss);
    const formKey = norm(source.text);
    const morphLemmas = secondary.morph.get(formKey) ?? new Set();
    const proielLemmas = secondary.proiel.get(formKey) ?? new Set();
    const sharedLemmas = [...morphLemmas].filter((lemma) => proielLemmas.has(lemma));
    const contextualTbesg = contextual ? (tbesg.entries.get(contextual.strong) ?? []).find((entry) => entry.extended === contextual.strongCode) : null;
    const contextualLemma = norm(contextualTbesg?.lemma ?? '');
    const secondaryContextualAdmitted = Boolean(!contextualAdmitted && !generatedLexicalAdmitted && morphologyExact && contextual?.gloss && sharedLemmas.length === 1);
    const uniqueSharedLemma = sharedLemmas.length === 1 ? sharedLemmas[0] : '';
    const secondaryLexeme = uniqueSharedLemma ? secondary.lexemes.get(uniqueSharedLemma) : null;
    const secondaryStrong = strongNumber(String(secondaryLexeme?.strongs ?? ''));
    const secondaryCandidates = secondaryStrong ? (tbesg.entries.get(secondaryStrong) ?? []) : [];
    const secondaryGlosses = [...new Set(secondaryCandidates.map((entry) => entry.briefGloss.trim()).filter(Boolean))];
    const secondaryLexical = secondaryGlosses.length === 1 ? secondaryCandidates.find((entry) => entry.briefGloss.trim() === secondaryGlosses[0]) : null;
    const secondaryLexicalAdmitted = Boolean(!contextualAdmitted && !generatedLexicalAdmitted && !secondaryContextualAdmitted && morphologyExact && secondaryLexeme?.gloss);
    const parsingAgreement = Boolean(contextual && contextual.parsing.replace(/-LG$/u, '') === source.parsing.replace(/-LG$/u, ''));
    const contextualDictionaryEntry = contextual ? (tbesg.entries.get(contextual.strong) ?? []).find((entry) => entry.extended === contextual.strongCode) : null;
    const contextualBaseDictionary = contextual ? (tbesg.entries.get(contextual.strong) ?? []) : [];
    const rpTagntMorphologyAdmitted = Boolean(!contextualAdmitted && !generatedLexicalAdmitted && !secondaryContextualAdmitted && !secondaryLexicalAdmitted && morphologyExact && contextual?.gloss && parsingAgreement && contextualBaseDictionary.length);
    const rpLexemes = secondary.lexemesByStrong.get(source.strong) ?? [];
    const rpLexemeGlosses = [...new Set(rpLexemes.map((entry) => entry.gloss?.trim()).filter(Boolean))];
    const rpLexeme = rpLexemeGlosses.length === 1 ? rpLexemes.find((entry) => entry.gloss?.trim() === rpLexemeGlosses[0]) : null;
    const rpLexiconAdmitted = Boolean(!contextualAdmitted && !generatedLexicalAdmitted && !secondaryContextualAdmitted && !secondaryLexicalAdmitted && !rpTagntMorphologyAdmitted && morphologyExact && rpLexeme?.gloss);
    const admitted = contextualAdmitted || generatedLexicalAdmitted || secondaryContextualAdmitted || secondaryLexicalAdmitted || rpTagntMorphologyAdmitted || rpLexiconAdmitted;
    if (contextualAdmitted) totals.contextualAdmitted += 1;
    if (generatedLexicalAdmitted) totals.generatedLexicalAdmitted += 1;
    if (secondaryContextualAdmitted) totals.secondaryContextualAdmitted += 1;
    if (secondaryLexicalAdmitted) totals.secondaryLexicalAdmitted += 1;
    if (rpTagntMorphologyAdmitted) totals.rpTagntMorphologyAdmitted += 1;
    if (rpLexiconAdmitted) totals.rpLexiconAdmitted += 1;
    if (admitted) totals.admitted += 1; else totals.held += 1;
    const status = contextualAdmitted ? 'ADMITTED_CONTEXTUAL_GLOSS' : generatedLexicalAdmitted ? 'ADMITTED_GENERATED_LEXICAL_GLOSS' : secondaryContextualAdmitted ? 'ADMITTED_SECONDARY_VALIDATED_CONTEXTUAL_GLOSS' : secondaryLexicalAdmitted ? 'ADMITTED_SECONDARY_LEXICAL_GLOSS' : rpTagntMorphologyAdmitted ? 'ADMITTED_RP_TAGNT_MORPHOLOGY_GLOSS' : rpLexiconAdmitted ? 'ADMITTED_RP_MORPHGNT_LEXICON_GLOSS' : 'HELD';
    const english = contextualAdmitted || secondaryContextualAdmitted || rpTagntMorphologyAdmitted ? contextual.gloss : generatedLexicalAdmitted ? lexical.briefGloss : secondaryLexicalAdmitted ? secondaryLexeme.gloss : rpLexiconAdmitted ? rpLexeme.gloss : null;
    decisions.push({ reference, sourceToken: index + 1, rowId: cell.rowId, greek: cell.text, rp2018: { strong: source.strong, parsing: source.parsing }, tagnt: contextual ?? null, tbesg: lexical ? { extended: lexical.extended, lemma: lexical.lemma, briefGloss: lexical.briefGloss } : null, secondary: { morphgntLemmas: [...morphLemmas], proielLemmas: [...proielLemmas], sharedLemmas, selectedLemma: secondaryContextualAdmitted || secondaryLexicalAdmitted ? uniqueSharedLemma : null, morphgntLexicon: secondaryLexeme ?? null, rpStrongLexicon: rpLexeme ?? null, contextualDictionaryEntry: contextualDictionaryEntry ?? null, lexical: secondaryLexical ? { strong: secondaryStrong, lemma: secondaryLexical.lemma, briefGloss: secondaryLexical.briefGloss } : null }, status, english, display: contextualAdmitted ? 'normal' : admitted ? 'orange' : 'blank', reasons: admitted ? [] : [!morphologyExact && 'RP2018_MORPHOLOGY_MISMATCH', !tagntExact && 'NO_EXACT_TAGNT_BYZANTINE_ALIGNMENT', contextual && !strongAgreement && 'STRONG_DISAGREEMENT', !lexical && 'TBESG_IDENTITY_UNRESOLVED', !contextual?.gloss && 'NO_CONTEXTUAL_GLOSS', sharedLemmas.length !== 1 && 'NO_UNIQUE_MORPHGNT_PROIEL_LEMMA'].filter(Boolean) });
  }
}

const report = {
  generatedAt: new Date().toISOString(), status: APPLY ? 'applied-internal-source-admission' : 'shadow-not-applied',
  method: 'RP2018 surface + RP2018 morphology/Strong + TAGNT explicit Byzantine alignment + TBESG/Abbott-Smith lexical identity',
  displayPolicy: 'Direct TAGNT Byzantine contextual English displays normally after RP2018 and TBESG identity agreement. Unambiguous TBESG lexical output displays orange. Unresolved output remains blank.',
  sources: { rp2018Morphology: morphology.files, tagnt: { file: tagnt.file, sha256: tagnt.sha256 }, tbesg: { file: tbesg.file, sha256: tbesg.sha256 }, secondaryGreek: secondary.files },
  totals, decisions,
};

if (APPLY) {
  const byReference = new Map();
  for (const decision of decisions) {
    if (!byReference.has(decision.reference)) byReference.set(decision.reference, new Map());
    byReference.get(decision.reference).set(decision.rowId, decision);
  }
  for (const [reference, rowDecisions] of byReference) {
    const match = reference.match(/^(\w+) (\d+):(\d+)$/u);
    const file = path.join(ROOT, 'data', match[1], match[2], `${match[3]}.json`);
    const document = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const row of document.rows) {
      if (row.byzantine?.type !== 'text') continue;
      const decision = rowDecisions.get(row.id);
      if (!decision || decision.status === 'HELD') { delete row.byzantine.gloss; continue; }
      const generated = decision.status !== 'ADMITTED_CONTEXTUAL_GLOSS';
      const lexicalGloss = decision.tbesg?.briefGloss ?? decision.secondary?.lexical?.briefGloss ?? decision.secondary?.morphgntLexicon?.gloss ?? decision.secondary?.rpStrongLexicon?.gloss ?? decision.english;
      row.byzantine.gloss = {
        gloss: decision.english,
        source: generated ? 'System' : 'TAGNT',
        ...(generated ? { generated: true } : {}),
        tooltip: `RP2018 Strong G${String(decision.rp2018.strong).padStart(4, '0')} · ${decision.rp2018.parsing} · TBESG/Abbott-Smith: ${lexicalGloss}`,
      };
    }
    fs.writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`);
  }
}
const publishedReport = {
  ...report,
  decisionCount: decisions.length,
  decisionSha256: crypto.createHash('sha256').update(JSON.stringify(decisions)).digest('hex'),
  decisionLedgerIncluded: false,
};
delete publishedReport.decisions;
fs.writeFileSync(path.join(ROOT, 'docs/audits/byzantine-english-shadow.json'), `${JSON.stringify(publishedReport, null, 2)}\n`);
console.log(JSON.stringify(totals, null, 2));
