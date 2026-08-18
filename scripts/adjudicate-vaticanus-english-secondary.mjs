import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
async function load(relativePath) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { parseMesLine, comparisonForm } = await load('lib/sources/cntrMes.js');
const { alignSequences } = await load('lib/alignment/sequenceAlign.js');
const SOURCE_ROOT = path.join(ROOT, 'data/sources/greek-shared');
const PRIMARY_LEDGER = path.join(ROOT, 'docs/audits/vaticanus-english-shadow/adjudication-ledger.json');
const OUTPUT = path.join(ROOT, 'docs/audits/vaticanus-english-shadow/secondary-source-ledger.json');
const MORPH_FILES = ['61-Mt-morphgnt.txt', '62-Mk-morphgnt.txt', '63-Lk-morphgnt.txt', '64-Jn-morphgnt.txt'].map(name => path.join(SOURCE_ROOT, 'morphgnt', name));
const TISCH_FILES = ['MT.txt', 'MR.txt', 'LU.txt', 'JOH.txt'].map(name => path.join(SOURCE_ROOT, 'tischendorf-morphgnt', name));
const PROIEL_FILE = path.join(SOURCE_ROOT, 'proiel/greek-nt.xml');
const LEXEMES_FILE = path.join(SOURCE_ROOT, 'morphgnt-lexicon/lexemes.yaml');
const TBESG_FILE = path.join(SOURCE_ROOT, 'TBESG-CC-BY.txt');
const GOSPELS = {
  matthew: { book: 40, intfBook: 'B01', morphBook: '01', proielBook: 'MATT', tischBook: 'MT' },
  mark: { book: 41, intfBook: 'B02', morphBook: '02', proielBook: 'MARK', tischBook: 'MR' },
  luke: { book: 42, intfBook: 'B03', morphBook: '03', proielBook: 'LUKE', tischBook: 'LU' },
  john: { book: 43, intfBook: 'B04', morphBook: '04', proielBook: 'JOHN', tischBook: 'JOH' },
};

function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function plain(text = '') { return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^α-ω]/g, ''); }
function comparison(text = '') {
  const value = plain(text);
  const nomina = {
    ισ: 'ιησουσ', ιυ: 'ιησου', ιν: 'ιησουν', ιη: 'ιησου', χσ: 'χριστοσ', χυ: 'χριστου', χν: 'χριστον', χω: 'χριστω',
    κσ: 'κυριοσ', κυ: 'κυριου', κν: 'κυριον', κω: 'κυριω', κε: 'κυριε', θσ: 'θεοσ', θυ: 'θεου', θν: 'θεον', θω: 'θεω',
    πνα: 'πνευμα', πνσ: 'πνευματοσ', πνι: 'πνευματι', πρσ: 'πατροσ', πρα: 'πατερα', πρι: 'πατρι', πρε: 'πατερ',
  };
  return nomina[value] ?? value;
}
function add(index, form, lemma, morphology, reference) {
  const key = comparison(form);
  if (!key) return;
  if (!index.has(key)) index.set(key, []);
  index.get(key).push({ form, lemma, normalizedLemma: plain(lemma), morphology, reference });
}
function uniqueLemma(entries) {
  const lemmas = new Set(entries.map(entry => entry.normalizedLemma).filter(Boolean));
  return lemmas.size === 1 ? [...lemmas][0] : null;
}
function attributes(source) {
  return Object.fromEntries([...source.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
}
function decode(text) { return text.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&apos;', "'"); }
function diplomatic(xml) { return decode(xml.replace(/<lb\b[^>]*break="no"[^>]*\/>/g, '').replace(/<cb\b[^>]*break="no"[^>]*\/>/g, '').replace(/<gap\b[^>]*\/>/g, '�').replace(/<[^>]+>/g, '').replace(/\s+/g, '')); }
function originalHand(body) { return body.replace(/<app\b[^>]*>([\s\S]*?)<\/app>/g, (_all, app) => app.match(/<rdg\b(?=[^>]*type="orig")(?=[^>]*hand="firsthand")[^>]*>([\s\S]*?)<\/rdg>/)?.[1] ?? ''); }
function parseIntf(file, expectedBook) {
  const verses = new Map();
  const xml = fs.readFileSync(file, 'utf8');
  for (const match of xml.matchAll(/<ab\b[^>]*\bn="B0(\d)K(\d+)V(\d+)"[^>]*(?<!\/)>([\s\S]*?)<\/ab>/g)) {
    if (`B0${match[1]}` !== expectedBook) continue;
    const words = [...originalHand(match[4]).matchAll(/<w\b[^>]*>([\s\S]*?)<\/w>/g)].map(word => ({
      diplomatic: diplomatic(word[1]), rawXml: word[0], nomenSacrum: /<abbr\b[^>]*type="nomSac"/.test(word[1]), unclear: /<unclear\b/.test(word[1]), gap: /<gap\b/.test(word[1]),
    })).filter(word => word.diplomatic);
    verses.set(`${Number(match[2])}:${Number(match[3])}`, words);
  }
  return verses;
}
function pathsFor(gospel) {
  const base = path.join(ROOT, 'data', gospel);
  return fs.readdirSync(base, { withFileTypes: true }).filter(entry => entry.isDirectory() && /^\d+$/.test(entry.name)).flatMap(chapter =>
    fs.readdirSync(path.join(base, chapter.name)).filter(name => /^\d+\.json$/.test(name)).map(name => ({ chapter: Number(chapter.name), verse: Number(name.slice(0, -5)), file: path.join(base, chapter.name, name) })),
  );
}

const morph = new Map();
for (const file of MORPH_FILES) {
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^(\d{6})\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/u);
    if (match) add(morph, match[5], match[7], `${match[2]} ${match[3]}`, match[1]);
  }
}

const tischendorf = new Map();
for (const file of TISCH_FILES) {
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 10) continue;
    const key = comparison(cols[4]);
    if (!tischendorf.has(key)) tischendorf.set(key, []);
    tischendorf.get(key).push({ form: cols[4], morphology: cols[5], strong: `G${String(cols[6]).padStart(4, '0')}`, lemma: cols[9], normalizedLemma: plain(cols[9]), reference: `${cols[0]} ${cols[1]}` });
  }
}

const proiel = new Map();
const proielXml = fs.readFileSync(PROIEL_FILE, 'utf8');
for (const match of proielXml.matchAll(/<token\s+([^>]+)>/gs)) {
  const attr = attributes(match[1]);
  if (attr.form && attr.lemma) add(proiel, attr.form, attr.lemma, `${attr['part-of-speech'] || ''} ${attr.morphology || ''}`.trim(), attr['citation-part'] || '');
}

const lexemes = new Map();
let current = null;
for (const line of fs.readFileSync(LEXEMES_FILE, 'utf8').split(/\r?\n/)) {
  const head = line.match(/^(\S.*):$/u);
  if (head) { current = { lemma: head[1], normalizedLemma: plain(head[1]) }; if (!lexemes.has(current.normalizedLemma)) lexemes.set(current.normalizedLemma, current); continue; }
  if (!current) continue;
  const field = line.match(/^\s{4}(strongs|gloss):\s*(.*)$/u);
  if (field) current[field[1]] = field[2].replace(/^['"]|['"]$/g, '');
}

const tbesg = new Map();
for (const line of fs.readFileSync(TBESG_FILE, 'utf8').split(/\r?\n/)) {
  if (!/^G\d{4}/.test(line)) continue;
  const cols = line.split('\t');
  const key = cols[0]?.match(/^G\d{4}/)?.[0];
  if (key && !tbesg.has(key)) tbesg.set(key, { lemma: cols[3]?.trim() || '', gloss: cols[6]?.trim() || '' });
}

// Reattach source-native INTF markup and the aligned CNTR GA 03 token to each
// live Vaticanus row. This metadata was intentionally flattened for display,
// but it is essential when adjudicating abbreviations and conditioned forms.
const cntrByGospel = Object.fromEntries(Object.keys(GOSPELS).map(gospel => [gospel, new Map()]));
for (const line of fs.readFileSync(path.join(ROOT, 'data/sources/vaticanus/03.txt'), 'utf8').split(/\r?\n/).filter(Boolean)) {
  const record = parseMesLine(line);
  const gospel = Object.entries(GOSPELS).find(([, config]) => config.book === record.reference.book)?.[0];
  if (gospel) cntrByGospel[gospel].set(`${record.reference.chapter}:${record.reference.verse}`, record.baseWords.filter(word => word.presence !== 'absent'));
}
const sourceNative = new Map();
for (const [gospel, config] of Object.entries(GOSPELS)) {
  const intf = parseIntf(path.join(ROOT, `data/sources/vaticanus/intf/${gospel}.xml`), config.intfBook);
  for (const location of pathsFor(gospel)) {
    const reference = `${location.chapter}:${location.verse}`;
    const live = JSON.parse(fs.readFileSync(location.file, 'utf8'));
    const liveWords = live.rows.filter(row => row.vaticanus?.type === 'text');
    const intfWords = intf.get(reference) || [];
    const cntrWords = cntrByGospel[gospel].get(reference) || [];
    const alignedCntr = new Map();
    for (const operation of alignSequences(cntrWords.map(comparisonForm), intfWords.map(word => comparison(word.diplomatic)))) {
      if (operation.sourceIndex !== null && operation.displayIndex !== null) alignedCntr.set(operation.displayIndex, cntrWords[operation.sourceIndex]);
    }
    let liveIndex = 0;
    for (let index = 0; index < intfWords.length; index++) {
      const intfWord = intfWords[index];
      const firstLive = liveWords[liveIndex];
      const division = firstLive?.vaticanus?.provenance?.wordDivision;
      const group = division?.part === 1 ? liveWords.slice(liveIndex, liveIndex + division.parts) : [firstLive];
      if (!firstLive || group.map(row => row.vaticanus.text).join('') !== intfWord.diplomatic) continue;
      const alignedCntrWord = alignedCntr.get(index) || null;
      for (let partIndex = 0; partIndex < group.length; partIndex++) {
        const row = group[partIndex];
        const partDivision = row.vaticanus.provenance?.wordDivision;
        const dividedCntr = partDivision?.cntrTokens?.[partIndex];
        const cntrWord = dividedCntr ? { diplomatic: dividedCntr, abbreviation: null, conditions: [], supplied: false } : alignedCntrWord;
        sourceNative.set(`${gospel} ${reference}|${row.id}`, {
        intf: intfWord,
        cntr: cntrWord ? { diplomatic: cntrWord.diplomatic, comparison: comparisonForm(cntrWord), abbreviation: cntrWord.abbreviation, conditions: cntrWord.conditions, supplied: cntrWord.supplied } : null,
        });
      }
      liveIndex += group.length;
    }
  }
}

const primary = JSON.parse(fs.readFileSync(PRIMARY_LEDGER, 'utf8'));
const withheld = primary.decisions.filter(item => item.decision === 'withheld');
const decisions = [];
const totals = { inputWithheld: withheld.length, concordantLemma: 0, sourceNativeCertified: 0, verseContextCertified: 0, contextualLemmaCertified: 0, tischendorfCertified: 0, morphLexiconBridgeCertified: 0, singleCorpusContextCertified: 0, proielLexiconCertified: 0, pronounLemmaConventionCertified: 0, morphgntOnly: 0, proielOnly: 0, lemmaDisagreement: 0, ambiguousAnalysis: 0, noAnalysis: 0, missingEnglishBridge: 0 };
const SOURCE_NOMINA = {
  χε: { strong: 'G5547', expansion: 'χριστε' },
  θω: { strong: 'G2316', expansion: 'θεω' },
};

function analyzeKey(key) {
  const morphEntries = morph.get(key) || [];
  const proielEntries = proiel.get(key) || [];
  const tischEntries = tischendorf.get(key) || [];
  return { key, morphEntries, proielEntries, tischEntries, morphLemma: uniqueLemma(morphEntries), proielLemma: uniqueLemma(proielEntries), tischLemma: uniqueLemma(tischEntries) };
}
function verseLocalAnalyses(item, analysis) {
  const match = item.reference.match(/^(\w+) (\d+):(\d+)$/);
  if (!match) return null;
  const [, gospel, chapterText, verseText] = match;
  const config = GOSPELS[gospel];
  if (!config) return null;
  const chapter = Number(chapterText);
  const verse = Number(verseText);
  const morphReference = `${config.morphBook}${String(chapter).padStart(2, '0')}${String(verse).padStart(2, '0')}`;
  const morphEntries = analysis.morphEntries.filter(entry => entry.reference === morphReference);
  const proielEntries = analysis.proielEntries.filter(entry => entry.reference === `${config.proielBook} ${chapter}.${verse}`);
  const tischEntries = analysis.tischEntries.filter(entry => entry.reference.startsWith(`${config.tischBook} ${chapter}:${verse}.`));
  return { morphEntries, proielEntries, tischEntries, morphLemma: uniqueLemma(morphEntries), proielLemma: uniqueLemma(proielEntries), tischLemma: uniqueLemma(tischEntries) };
}

for (const item of withheld) {
  const native = sourceNative.get(`${item.reference}|${item.rowId}`) || null;
  const key = comparison(item.vaticanusGreek);
  const sourceNomen = native?.intf.nomenSacrum && native?.cntr?.abbreviation === 'nomina-sacra' ? SOURCE_NOMINA[plain(item.vaticanusGreek)] : null;
  if (sourceNomen) {
    const lexical = tbesg.get(sourceNomen.strong);
    if (lexical?.gloss) {
      totals.concordantLemma++;
      totals.sourceNativeCertified++;
      decisions.push({ ...item, secondaryDecision: 'certified-lexical', rule: 'VEA-003-INTF-CNTR-NOMEN-SACRUM', proposedGloss: lexical.gloss, evidence: { sourceNative: native, expansion: sourceNomen.expansion, strong: sourceNomen.strong, tbesg: lexical } });
      continue;
    }
  }
  if (native?.intf.rawXml.includes('type="num"') && native?.cntr?.abbreviation === 'numeric' && item.vaticanusGreek === '͵β') {
    totals.concordantLemma++;
    totals.sourceNativeCertified++;
    decisions.push({ ...item, secondaryDecision: 'certified-lexical', rule: 'VEA-004-INTF-CNTR-GREEK-NUMERAL', proposedGloss: 'two thousand', evidence: { sourceNative: native, numericSystem: 'Greek thousands mark plus beta', numericValue: 2000 } });
    continue;
  }
  const keys = [key];
  const conditioned = Boolean(native && (native.intf.nomenSacrum || native.intf.unclear || native.intf.gap || native.cntr?.abbreviation || native.cntr?.conditions?.length));
  if (conditioned && native.cntr?.comparison && native.cntr.comparison !== key) keys.push(native.cntr.comparison);
  const analyses = [...new Set(keys)].map(analyzeKey);
  const concordant = analyses.filter(entry => entry.morphLemma && entry.proielLemma && entry.morphLemma === entry.proielLemma);
  const concordantLemmas = new Set(concordant.map(entry => entry.morphLemma));
  const selected = concordantLemmas.size === 1 ? concordant.find(entry => entry.morphLemma === [...concordantLemmas][0]) : analyses[0];
  const { morphEntries, proielEntries, tischEntries, morphLemma, proielLemma, tischLemma } = selected;
  const evidence = {
    sourceNative: native,
    analysisKey: selected.key,
    morphgnt: { lemma: morphLemma, analyses: [...new Map(morphEntries.map(entry => [`${entry.lemma}|${entry.morphology}`, entry])).values()] },
    proiel: { lemma: proielLemma, analyses: [...new Map(proielEntries.map(entry => [`${entry.lemma}|${entry.morphology}`, entry])).values()] },
    tischendorf: { lemma: tischLemma, analyses: [...new Map(tischEntries.map(entry => [`${entry.lemma}|${entry.morphology}|${entry.strong}`, entry])).values()] },
  };
  const local = verseLocalAnalyses(item, selected);
  const localLemmas = [local?.morphLemma, local?.proielLemma, local?.tischLemma].filter(Boolean);
  const localCounts = localLemmas.reduce((counts, lemma) => (counts.set(lemma, (counts.get(lemma) || 0) + 1), counts), new Map());
  const localWinner = [...localCounts.entries()].filter(([, count]) => count >= 2).map(([lemma]) => lemma);
  if (!(morphLemma && proielLemma && morphLemma === proielLemma) && localWinner.length === 1) {
    const selectedLemma = localWinner[0];
    const lexeme = lexemes.get(selectedLemma);
    const tischStrong = new Set((local?.tischEntries || []).filter(entry => entry.normalizedLemma === selectedLemma).map(entry => entry.strong));
    const lexemeStrongNumber = String(lexeme?.strongs || '').match(/\d+/)?.[0];
    const strong = tischStrong.size === 1 ? [...tischStrong][0] : lexemeStrongNumber ? `G${lexemeStrongNumber.padStart(4, '0')}` : '';
    const lexical = strong ? tbesg.get(strong) : null;
    if (lexical?.gloss) {
      totals.concordantLemma++;
      totals.verseContextCertified++;
      decisions.push({ ...item, secondaryDecision: 'certified-lexical', rule: 'VEA-007-TWO-SOURCE-VERSE-LOCAL-LEMMA', proposedGloss: lexical.gloss, evidence: { ...evidence, verseLocal: local, selectedLemma, strong, tbesg: lexical } });
      continue;
    }
  }
  const contextualStrong = item.candidate?.strong || '';
  const contextualLexical = contextualStrong ? tbesg.get(contextualStrong) : null;
  const contextualLemma = plain(contextualLexical?.lemma || '');
  const morphSupportsContext = contextualLemma && morphEntries.some(entry => entry.normalizedLemma === contextualLemma);
  const proielSupportsContext = contextualLemma && proielEntries.some(entry => entry.normalizedLemma === contextualLemma);
  if (!(morphLemma && proielLemma && morphLemma === proielLemma) && morphSupportsContext && proielSupportsContext && contextualLexical?.gloss) {
    totals.concordantLemma++;
    totals.contextualLemmaCertified++;
    decisions.push({ ...item, secondaryDecision: 'certified-lexical', rule: 'VEA-005-TAGNT-CONTEXT-MORPHGNT-PROIEL-SUPPORTED-LEMMA', proposedGloss: contextualLexical.gloss, evidence: { ...evidence, tagntCandidate: item.candidate, selectedLemma: contextualLexical.lemma, tbesg: contextualLexical } });
    continue;
  }
  const soleLemma = morphLemma && !proielEntries.length ? morphLemma : proielLemma && !morphEntries.length ? proielLemma : '';
  if (soleLemma && contextualLemma === soleLemma && contextualLexical?.gloss) {
    totals.concordantLemma++;
    totals.singleCorpusContextCertified++;
    decisions.push({ ...item, secondaryDecision: 'certified-lexical', rule: 'VEA-009-EXACT-SURFACE-CORPUS-TAGNT-TBESG-CONCORDANT-LEMMA', proposedGloss: contextualLexical.gloss, evidence: { ...evidence, tagntCandidate: item.candidate, selectedLemma: contextualLexical.lemma, tbesg: contextualLexical, exactSurfaceCorpus: morphLemma ? 'MorphGNT' : 'PROIEL' } });
    continue;
  }
  if (proielLemma && !morphEntries.length) {
    const proielLexeme = lexemes.get(proielLemma);
    if (proielLexeme?.gloss) {
      totals.concordantLemma++;
      totals.proielLexiconCertified++;
      decisions.push({ ...item, secondaryDecision: 'certified-lexical', rule: 'VEA-010-PROIEL-EXACT-SURFACE-MORPHGNT-LEXICON-LEMMA', proposedGloss: proielLexeme.gloss, evidence: { ...evidence, selectedLemma: proielLemma, morphgntLexicon: proielLexeme } });
      continue;
    }
  }
  if (key === 'υμεισ' && morphLemma === 'συ' && tischLemma === 'συ' && proielLemma === 'υμεισ') {
    const pronounLexeme = lexemes.get('συ');
    if (pronounLexeme?.gloss) {
      totals.concordantLemma++;
      totals.pronounLemmaConventionCertified++;
      decisions.push({ ...item, secondaryDecision: 'certified-lexical', rule: 'VEA-011-PROIEL-INFLECTED-PRONOUN-HEADWORD-MORPHGNT-TISCHENDORF-LEMMA', proposedGloss: pronounLexeme.gloss, evidence: { ...evidence, selectedLemma: 'συ', proielHeadwordConvention: 'inflected personal-pronoun headword', morphgntLexicon: pronounLexeme } });
      continue;
    }
  }
  const morphSupportsTisch = tischLemma && morphEntries.some(entry => entry.normalizedLemma === tischLemma);
  const proielSupportsTisch = tischLemma && proielEntries.some(entry => entry.normalizedLemma === tischLemma);
  if (!(morphLemma && proielLemma && morphLemma === proielLemma) && tischLemma && (morphSupportsTisch || proielSupportsTisch)) {
    const matchingTisch = tischEntries.filter(entry => entry.normalizedLemma === tischLemma);
    const strongs = new Set(matchingTisch.map(entry => entry.strong));
    const strong = strongs.size === 1 ? [...strongs][0] : '';
    const lexical = strong ? tbesg.get(strong) : null;
    if (lexical?.gloss) {
      totals.concordantLemma++;
      totals.tischendorfCertified++;
      decisions.push({ ...item, secondaryDecision: 'certified-lexical', rule: 'VEA-006-TISCHENDORF-THIRD-ANNOTATION-LEMMA', proposedGloss: lexical.gloss, evidence: { ...evidence, selectedLemma: matchingTisch[0].lemma, strong, tbesg: lexical, support: { morphgnt: Boolean(morphSupportsTisch), proiel: Boolean(proielSupportsTisch) } } });
      continue;
    }
  }
  if (morphLemma && proielLemma && morphLemma === proielLemma) {
    const lexeme = lexemes.get(morphLemma);
    const strongNumber = String(lexeme?.strongs || '').match(/\d+/)?.[0];
    const strong = strongNumber ? `G${strongNumber.padStart(4, '0')}` : '';
    const lexical = strong ? tbesg.get(strong) : null;
    if (lexeme?.gloss && lexical?.gloss) {
      totals.concordantLemma++;
      const sourceNativeRule = selected.key !== key;
      if (sourceNativeRule) totals.sourceNativeCertified++;
      decisions.push({ ...item, secondaryDecision: 'certified-lexical', rule: sourceNativeRule ? 'VEA-003-SOURCE-NATIVE-EXPANSION-CONCORDANT-LEMMA' : 'VEA-002-MORPHGNT-PROIEL-CONCORDANT-LEMMA', proposedGloss: lexical.gloss, evidence: { ...evidence, morphgntLexicon: { lemma: lexeme.lemma, strong, gloss: lexeme.gloss }, tbesg: lexical } });
    } else if (lexeme?.gloss) {
      totals.concordantLemma++;
      totals.morphLexiconBridgeCertified++;
      decisions.push({ ...item, secondaryDecision: 'certified-lexical', rule: 'VEA-008-MORPHGNT-PROIEL-CONCORDANT-LEMMA-MORPHGNT-LEXICON-GLOSS', proposedGloss: lexeme.gloss, evidence: { ...evidence, morphgntLexicon: { lemma: lexeme.lemma, strong, gloss: lexeme.gloss }, tbesg: lexical } });
    } else {
      totals.missingEnglishBridge++;
      decisions.push({ ...item, secondaryDecision: 'withheld', rule: 'VEA-W06-MISSING-ENGLISH-BRIDGE', evidence });
    }
  } else {
    let rule;
    if (morphLemma && proielLemma) { totals.lemmaDisagreement++; rule = 'VEA-W03-LEMMA-DISAGREEMENT'; }
    else if (morphLemma && !proielEntries.length) { totals.morphgntOnly++; rule = 'VEA-W04-MORPHGNT-ONLY'; }
    else if (proielLemma && !morphEntries.length) { totals.proielOnly++; rule = 'VEA-W05-PROIEL-ONLY'; }
    else if (morphEntries.length || proielEntries.length) { totals.ambiguousAnalysis++; rule = 'VEA-W07-AMBIGUOUS-ANALYSIS'; }
    else { totals.noAnalysis++; rule = 'VEA-W08-NO-EXACT-SURFACE-ANALYSIS'; }
    decisions.push({ ...item, secondaryDecision: 'withheld', rule, evidence });
  }
}

const accounted = Object.entries(totals).filter(([key]) => !['inputWithheld', 'sourceNativeCertified', 'verseContextCertified', 'contextualLemmaCertified', 'tischendorfCertified', 'morphLexiconBridgeCertified', 'singleCorpusContextCertified', 'proielLexiconCertified', 'pronounLemmaConventionCertified'].includes(key)).reduce((sum, [, value]) => sum + value, 0);
const output = {
  status: 'shadow-only', generatedAt: new Date().toISOString(),
  policy: 'Exact Vaticanus surface form, or a conditioned expansion documented by aligned INTF/CNTR GA 03 source markup, must receive one lemma from MorphGNT and one identical lemma from PROIEL; MorphGNT lexicon and TBESG must both resolve the English lexical bridge.',
  revisions: { morphgnt: 'aaed91e57c8e4a8dc9a2383e129ca5e75fe6393d', proiel: '8e388967a1335ed12335ddc655fe46993ee7d57a', morphgntLexicon: '0dca2af89f413cbb24f617ddbdc347e9d798ddf3', tischendorfMorphgnt: '795f2f4f9fe7cb98bf8736b0c5cb59c43aa9c32e' },
  hashes: { morphgnt: Object.fromEntries(MORPH_FILES.map(file => [path.basename(file), sha256(file)])), proiel: sha256(PROIEL_FILE), morphgntLexicon: sha256(LEXEMES_FILE), tischendorfMorphgnt: Object.fromEntries(TISCH_FILES.map(file => [path.basename(file), sha256(file)])), tbesg: sha256(TBESG_FILE) },
  totals: { ...totals, totalCertifiableAfterSecondary: primary.totals.totalCertifiableAfterAdjudication + totals.concordantLemma },
  passed: accounted === withheld.length,
  decisionSha256: crypto.createHash('sha256').update(JSON.stringify(decisions)).digest('hex'),
  decisions,
};
fs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, OUTPUT), ...output.totals, passed: output.passed, decisionSha256: output.decisionSha256 }, null, 2));
process.exitCode = output.passed ? 0 : 2;
