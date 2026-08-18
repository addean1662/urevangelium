import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const sha = (value) => crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const strip = (value = '') => String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ').replace(/[^α-ωϛϲ]/gu, '');

const exceptions = read('data/vaticanus-english-exceptions.json');
const classification = read('docs/audits/vaticanus-english-shadow/orthographic-classification.json');
const morpheus = read('data/sources/greek-shared/perseus-morpheus/vaticanus-exceptions.json');
const lsj = read('data/sources/greek-shared/perseus-lsj/vaticanus-exception-entries.json');
const contextualAdjudications = read('data/sources/vaticanus/english-contextual-adjudications.json');
const tbesgText = fs.readFileSync(path.join(ROOT, 'data/sources/greek-shared/TBESG-CC-BY.txt'), 'utf8');
const tagntText = fs.readFileSync(path.join(ROOT, 'data/sources/greek-shared/TAGNT-Mat-Jhn-CC-BY.txt'), 'utf8');

const tagntByReference = new Map();
const tagntByForm = new Map();
for (const line of tagntText.split(/\r?\n/)) {
  const fields = line.split('\t');
  const match = fields[0]?.match(/^((?:Mat|Mrk|Luk|Jhn)\.\d+\.\d+)#/);
  if (!match || !fields[1]) continue;
  const strong = fields[3]?.match(/(G\d{4}[A-Z]?)/)?.[1] ?? null;
  const record = { reference: match[1], greek: fields[1].replace(/\s*\([^)]*\)\s*$/, ''), strong, morphology: fields[3]?.split('=')[1] ?? null, lemma: fields[4]?.split('=')[0] ?? null };
  if (!tagntByReference.has(match[1])) tagntByReference.set(match[1], []);
  tagntByReference.get(match[1]).push(record);
  const form = strip(record.greek);
  if (!tagntByForm.has(form)) tagntByForm.set(form, []);
  tagntByForm.get(form).push(record);
}

const tagntBook = { matthew: 'Mat', mark: 'Mrk', luke: 'Luk', john: 'Jhn' };
const lexicalIdentity = (item) => `${item.strong?.match(/^G\d{4}/)?.[0] ?? item.strong}|${strip(item.lemma)}`;
const contextualByKey = new Map(contextualAdjudications.decisions.map((item) => [`${item.reference}|${item.rowId}`, item]));
const intfBook = {
  matthew: { file: 'matthew.xml', code: 'B01' },
  mark: { file: 'mark.xml', code: 'B02' },
  luke: { file: 'luke.xml', code: 'B03' },
  john: { file: 'john.xml', code: 'B04' },
};
const intfXml = new Map(Object.entries(intfBook).map(([book, source]) => [
  book,
  fs.readFileSync(path.join(ROOT, 'data/sources/vaticanus/intf', source.file), 'utf8'),
]));
const recurrenceRaw = new Map();
for (const gospel of ['matthew', 'mark', 'luke', 'john']) {
  const gospelDir = path.join(ROOT, 'data', gospel);
  for (const chapter of fs.readdirSync(gospelDir).filter((name) => /^\d+$/.test(name))) {
    for (const filename of fs.readdirSync(path.join(gospelDir, chapter)).filter((name) => /^\d+\.json$/.test(name))) {
      const verseData = JSON.parse(fs.readFileSync(path.join(gospelDir, chapter, filename), 'utf8'));
      for (const row of verseData.rows) {
        const cell = row.vaticanus;
        const verification = cell?.provenance?.englishCertification?.lexicalVerification;
        if (cell?.type !== 'text' || !verification?.strong || !verification?.lemma) continue;
        const key = strip(cell.text);
        if (!recurrenceRaw.has(key)) recurrenceRaw.set(key, []);
        recurrenceRaw.get(key).push({ strong: verification.strong, lemma: verification.lemma, greek: cell.provenance.englishCertification.alignment?.tagntGreek ?? verification.lemma, sourceReference: cell.provenance.sourceReference });
      }
    }
  }
}
const recurrenceByForm = new Map();
for (const [form, occurrences] of recurrenceRaw) {
  const identities = [...new Set(occurrences.map(lexicalIdentity))];
  if (identities.length === 1 && occurrences.length >= 2) recurrenceByForm.set(form, { ...occurrences[0], occurrences: occurrences.length, examples: occurrences.slice(0, 5).map((item) => item.sourceReference) });
}

function editDistance(left, right) {
  const a = [...left], b = [...right];
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const prior = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = prior;
    }
  }
  return row[b.length];
}

function xmlWords(xml = '') {
  return [...xml.matchAll(/<w(?:\s[^>]*)?>([\s\S]*?)<\/w>/g)]
    .map((match) => match[1].replace(/<[^>]+>/g, ''));
}

function correctorEvidence(item) {
  const { gospel, chapter, verse } = coordinates(item);
  const source = intfBook[gospel];
  const xml = intfXml.get(gospel) ?? '';
  const start = xml.indexOf(`n="${source.code}K${chapter}V${verse}"`);
  const verseXml = start < 0 ? '' : xml.slice(start, xml.indexOf('</ab>', start));
  return [...verseXml.matchAll(/<app>([\s\S]*?)<\/app>/g)].map((match) => {
    const originalXml = match[1].match(/<rdg type="orig"[\s\S]*?<\/rdg>/)?.[0] ?? '';
    const correctedXml = match[1].match(/<rdg type="corr"[\s\S]*?<\/rdg>/)?.[0] ?? '';
    return { original: xmlWords(originalXml), correction: xmlWords(correctedXml) };
  }).find((entry) => entry.original.includes(item.vaticanusGreek ?? item.greek)) ?? null;
}

function recoverFromCorrector(item) {
  const evidence = correctorEvidence(item);
  if (!evidence || evidence.original.length !== 1 || evidence.correction.length !== 1) return null;
  const { gospel, chapter, verse } = coordinates(item);
  const source = strip(evidence.original[0]);
  const target = strip(evidence.correction[0]);
  const distance = editDistance(source, target);
  const threshold = Math.max(1, Math.floor(Math.max(source.length, target.length) * 0.35));
  const repeated = source === target + target;
  const incomplete = source.length >= 2 && (target.startsWith(source) || target.endsWith(source));
  if (!(distance <= threshold || repeated || incomplete)) return null;
  const verseRecords = (tagntByReference.get(`${tagntBook[gospel]}.${chapter}.${verse}`) ?? [])
    .filter((record) => strip(record.greek) === target && record.strong);
  // Some Vaticanus first-hand/corrector sequences are absent from the base
  // critical-text verse. In those cases, establish only the lexical identity
  // of the corrected Greek form from its corpus-wide TAGNT recurrence.
  const matchingRecords = verseRecords.length ? verseRecords : (tagntByForm.get(target) ?? []).filter((record) => record.strong);
  const identities = new Map(matchingRecords.map((record) => [lexicalIdentity(record), record]));
  if (identities.size !== 1) return null;
  return {
    ...[...identities.values()][0],
    recovery: {
      rule: repeated ? 'VGE-R05-VATICANUS-CORRECTOR-DITTOGRAPHY' : incomplete ? 'VGE-R06-VATICANUS-CORRECTOR-INCOMPLETE' : 'VGE-R07-VATICANUS-CORRECTOR-ORTHOGRAPHIC',
      original: evidence.original,
      correction: evidence.correction,
      editDistance: distance,
      threshold,
      notice: 'The correction establishes lexical identity inside the Vaticanus transmission; it does not replace the displayed first-hand reading.',
    },
  };
}

function recoverCandidate(item, row) {
  const { gospel, chapter, verse } = coordinates(item);
  const source = strip(item.vaticanusGreek ?? item.greek);
  const forms = ['sinaiticus', 'byzantine'].flatMap((witness) => row[witness]?.type === 'text' ? [{ witness, greek: row[witness].text, target: strip(row[witness].text) }] : []);
  const proposals = [];
  for (const target of [...new Set(forms.map((form) => form.target))]) {
    const matchingRecords = (tagntByReference.get(`${tagntBook[gospel]}.${chapter}.${verse}`) ?? []).filter((record) => strip(record.greek) === target && record.strong);
    const identities = new Map(matchingRecords.map((record) => [lexicalIdentity(record), record]));
    if (identities.size !== 1) continue;
    const distance = editDistance(source, target);
    const threshold = Math.max(1, Math.floor(Math.max(source.length, target.length) * 0.35));
    const repeated = source === target + target;
    const markedInitialPart = /\bpart="I"/.test(item.evidence?.sourceNative?.intf?.rawXml ?? '') && target.startsWith(source) && source.length >= 2;
    if (!(distance <= threshold || repeated || markedInitialPart)) continue;
    proposals.push({ ...[...identities.values()][0], recovery: { rule: repeated ? 'VGE-R02-DITTOGRAPHIC-FORM' : markedInitialPart ? 'VGE-R03-MARKED-INITIAL-PART' : 'VGE-R01-SAME-GREEK-ORTHOGRAPHIC', source, target, editDistance: distance, threshold, witnesses: forms.filter((form) => form.target === target).map((form) => form.witness) } });
  }
  const identities = new Map(proposals.map((proposal) => [lexicalIdentity(proposal), proposal]));
  return identities.size === 1 ? [...identities.values()][0] : null;
}

function recoverFromVaticanus(item) {
  const source = strip(item.vaticanusGreek ?? item.greek);
  const recurrence = recurrenceByForm.get(source);
  if (!recurrence) return null;
  return { greek: recurrence.greek, strong: recurrence.strong, lemma: recurrence.lemma, morphology: 'established-by-vaticanus-recurrence', recovery: { rule: 'VGE-R04-VATICANUS-RECURRENCE', source, occurrences: recurrence.occurrences, examples: recurrence.examples } };
}

function recoverFromContextualAdjudication(item) {
  const decision = contextualByKey.get(`${item.reference}|${item.rowId}`);
  if (!decision) return null;
  const source = item.vaticanusGreek ?? item.greek;
  if (strip(source) !== strip(decision.greek)) throw new Error(`Contextual adjudication Greek mismatch: ${item.reference} ${item.rowId}`);
  return {
    greek: decision.canonicalGreek,
    strong: decision.strong,
    lemma: decision.lemma,
    morphology: decision.morphology,
    components: decision.components ?? null,
    generatedGloss: decision.generatedGloss ?? null,
    certificationBasis: decision.certificationBasis ?? null,
    allowMarkedInitialPart: decision.allowMarkedInitialPart === true,
    recovery: {
      rule: 'VGE-R08-CONTEXTUAL-GREEK-SYNTAX',
      revision: contextualAdjudications.revision,
      rationale: decision.rationale,
      notice: 'This decision establishes Greek lexical identity only. Its English is independently retrieved from TBESG.',
    },
  };
}

function morphEntries(result) {
  const entry = result?.raw?.RDF?.Annotation?.Body?.rest?.entry;
  return entry ? (Array.isArray(entry) ? entry : [entry]) : [];
}

const morphByForm = new Map(morpheus.results.map((result) => [strip(result.word), {
  form: result.word,
  sha256: result.sha256,
  lemmas: [...new Set(morphEntries(result).map((entry) => entry.dict?.hdwd?.['$']).filter(Boolean))],
  analyses: result.analyses,
}]));
const lsjByLemma = new Map();
for (const entry of lsj.entries) {
  const key = strip(entry.key);
  if (!lsjByLemma.has(key)) lsjByLemma.set(key, []);
  lsjByLemma.get(key).push({ key: entry.key, entrySha256: entry.entrySha256, sourceSha256: entry.sourceSha256 });
}

function tbesgEntry(strong) {
  if (!strong) return null;
  const key = strong.match(/^G\d{4}/)?.[0] ?? strong;
  const match = tbesgText.match(new RegExp(`^${key}\\t[^\\n]*(?:\\n(?!G\\d{4}\\t)[^\\n]*)*`, 'm'));
  if (!match) return null;
  const fields = match[0].split('\t');
  return { strong: key, sourceStrong: strong, lemma: fields[3] ?? null, briefGloss: fields[6] ?? null, sha256: sha(match[0]) };
}

function coordinates(item) {
  const match = item.reference?.match(/^(\w+) (\d+):(\d+)$/);
  return match ? { gospel: match[1], chapter: Number(match[2]), verse: Number(match[3]) } : item;
}

function liveRow(item) {
  const { gospel, chapter, verse } = coordinates(item);
  const verseData = read(`data/${gospel}/${chapter}/${verse}.json`);
  const row = verseData.rows.find((candidate) => candidate.id === item.rowId);
  if (!row) throw new Error(`Missing row ${gospel} ${chapter}:${verse} ${item.rowId}`);
  return row;
}

function parallelEvidence(row) {
  const witnesses = ['sinaiticus', 'byzantine'];
  const values = witnesses.map((witness) => ({
    witness,
    greek: row[witness]?.type === 'text' ? row[witness].text : null,
  }));
  return {
    values,
    notice: 'Greek forms are retained only as comparative evidence. No English meaning crosses from these columns into Vaticanus.',
  };
}

const decisions = classification.cases.map((item) => {
  const { gospel, chapter, verse } = coordinates(item);
  const row = liveRow(item);
  const correction = correctorEvidence(item);
  const candidate = recoverFromContextualAdjudication(item) ?? item.alignedCandidate ?? recoverFromCorrector(item) ?? recoverCandidate(item, row) ?? recoverFromVaticanus(item);
  const vaticanusGreek = item.vaticanusGreek ?? item.greek;
  const analysisForm = candidate?.greek ?? vaticanusGreek;
  const morph = morphByForm.get(strip(analysisForm)) ?? { form: analysisForm, lemmas: [], analyses: 0, sha256: null };
  const lsjMatches = morph.lemmas.flatMap((lemma) => lsjByLemma.get(strip(lemma)) ?? []);
  const componentLexicon = candidate?.components?.map((component) => ({ ...component, tbesg: tbesgEntry(component.strong) })) ?? null;
  const tbesg = componentLexicon
    ? componentLexicon.every((component) => component.tbesg) ? { composite: true, components: componentLexicon } : null
    : tbesgEntry(candidate?.strong);
  const proposedGloss = candidate?.generatedGloss ?? (componentLexicon ? null : (tbesg?.briefGloss ?? null));
  const parallel = parallelEvidence(row);
  const parallelGreekMatches = candidate ? parallel.values.filter((value) => strip(value.greek) === strip(candidate.greek)).map((value) => value.witness) : [];
  const sameVaticanusRecurrence = candidate?.recovery?.rule === 'VGE-R04-VATICANUS-RECURRENCE';
  const vaticanusCorrectorIdentity = candidate?.recovery?.rule?.includes('VATICANUS-CORRECTOR') ?? false;
  const contextualGreekSyntax = candidate?.recovery?.rule === 'VGE-R08-CONTEXTUAL-GREEK-SYNTAX';
  const displayPolicyCertified = ['diplomatic-transliteration', 'source-word-division'].includes(candidate?.certificationBasis);
  const families = {
    manuscript: Boolean(item.evidence?.sourceNative?.intf),
    cntrShadow: Boolean(item.evidence?.sourceNative?.cntr),
    vaticanusCorrectorIdentity,
    contextualGreekSyntax,
    morphology: morph.lemmas.length === 1 || Boolean(candidate?.morphology && (candidate?.strong || candidate?.components?.every((component) => component.strong))) || displayPolicyCertified,
    ntLexicon: Boolean(tbesg) || displayPolicyCertified,
    sameGreekGospelWitness: parallelGreekMatches.length > 0,
    sameVaticanusRecurrence,
    vaticanusLexicalEnglish: Boolean(proposedGloss && candidate),
  };
  const independentFamilies = Object.values(families).filter(Boolean).length;
const fragmentOrDamage = Boolean(
    item.evidence?.sourceNative?.intf?.gap ||
    vaticanusGreek.includes('�') ||
    /\bpart="[IFM]"/.test(item.evidence?.sourceNative?.intf?.rawXml ?? '')
  );
  const certified = Boolean(
    proposedGloss && candidate && families.manuscript && families.morphology && families.ntLexicon &&
    (families.cntrShadow || families.vaticanusCorrectorIdentity || families.contextualGreekSyntax) &&
    (families.sameGreekGospelWitness || families.sameVaticanusRecurrence || families.vaticanusCorrectorIdentity || families.contextualGreekSyntax) &&
    (!fragmentOrDamage || candidate?.allowMarkedInitialPart === true)
  );
  return {
    reference: `${gospel} ${chapter}:${verse}`,
    rowId: item.rowId,
    vaticanusGreek,
    proposedGloss,
    status: certified ? 'certified-generated' : proposedGloss ? 'provisional-generated' : 'withheld-no-convergent-gloss',
    rule: certified ? 'VGE-C01-FIVE-FAMILY-CONVERGENCE' : proposedGloss ? 'VGE-P01-CONTEXTUAL-PROPOSAL' : 'VGE-W01-ABSTAIN',
    independentFamilies,
    fragmentOrDamage,
    evidence: {
      sourceNative: item.evidence?.sourceNative ?? null,
      vaticanusCorrector: correction,
      alignedCandidate: candidate ?? null,
      candidateOrigin: candidate?.recovery?.rule === 'VGE-R08-CONTEXTUAL-GREEK-SYNTAX'
        ? 'contextual-greek-syntax'
        : item.alignedCandidate
          ? 'existing-alignment'
          : candidate?.recovery?.rule === 'VGE-R04-VATICANUS-RECURRENCE'
          ? 'vaticanus-recurrence'
          : candidate?.recovery?.rule?.startsWith('VGE-R0') && candidate.recovery.rule.includes('VATICANUS-CORRECTOR')
            ? 'vaticanus-corrector'
            : candidate
              ? 'same-greek-recovery'
              : null,
      morpheus: morph,
      lsj: lsjMatches,
      tbesg,
      parallel,
      parallelGreekMatches,
      sameVaticanusRecurrence,
      dependencyNotice: 'No English meaning crosses from another tradition column. TBESG incorporates corrected Abbott-Smith and is counted as one NT-lexicon family.',
    },
  };
});

const totals = decisions.reduce((out, decision) => {
  out[decision.status] = (out[decision.status] ?? 0) + 1;
  return out;
}, { input: decisions.length });
const output = {
  status: 'shadow-only',
  generatedAt: new Date().toISOString(),
  policy: 'Generate candidates broadly, certify narrowly. Certification requires the governing INTF first-hand transcription and declared evidence appropriate to the output: lexical English normally requires uniquely identified morphology, TBESG/Abbott-Smith, and independent corroboration; diplomatic names may receive reversible transliteration; source-divided compounds retain their source divisions; and an INTF-marked initial part may be completed only when both peer Greek witnesses agree and the identified name is lexically verified. Genuinely gapped readings remain uncertified. Classical evidence is excluded. English never crosses from another tradition column.',
  sources: {
    exceptionsDecisionSha256: exceptions.decisionSha256,
    classificationDecisionSha256: classification.decisionSha256,
    morpheusRevision: morpheus.engineRevision,
    morpheusSha256: sha(morpheus),
    lsjRevision: lsj.revision,
    lsjSha256: sha(lsj),
    tbesgSha256: sha(tbesgText),
    contextualAdjudicationsRevision: contextualAdjudications.revision,
    contextualAdjudicationsSha256: sha(contextualAdjudications),
  },
  totals,
  decisionSha256: sha(decisions),
  decisions,
};

const outputFile = path.join(ROOT, 'docs/audits/vaticanus-english-shadow/generated-consensus-ledger.json');
fs.writeFileSync(outputFile, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ totals, decisionSha256: output.decisionSha256, output: path.relative(ROOT, outputFile) }, null, 2));
if (decisions.length !== 137) throw new Error(`Expected 137 decisions; found ${decisions.length}`);
