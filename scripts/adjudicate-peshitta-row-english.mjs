import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const unitsFile = path.join(ROOT, 'data/sources/peshitta/murdock-admitted-units.json');
const sedraFile = path.join(ROOT, 'data/sources/peshitta/sedra-inserted-token-evidence.json');
const morphologyFile = path.join(ROOT, 'docs/audits/peshitta-etcbc-morphology-concordance.json');
const ledgerFile = path.join(ROOT, 'docs/audits/peshitta-row-english-adjudication.json');
const applicationFile = path.join(ROOT, 'docs/audits/peshitta-row-english-application.json');
const apply = process.argv.includes('--apply');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const manifest = JSON.parse(fs.readFileSync(unitsFile, 'utf8'));
const sedra = JSON.parse(fs.readFileSync(sedraFile, 'utf8'));
const sedraByToken = new Map(sedra.records.map((record) => [record.token, record]));
const morphologyReport = JSON.parse(fs.readFileSync(morphologyFile, 'utf8'));
const morphologyByRow = new Map(morphologyReport.records.flatMap((verse) => verse.mappedTokens.map((token) => [`${verse.reference}#${token.rowId}`, token])));
const morphologyBySourceToken = new Map(morphologyReport.records.flatMap((verse) => verse.mappedTokens.map((token) => [`${verse.reference}#${token.sourceToken}`, token])));
const WORD_RE = /[A-Za-z]+(?:['â€™][A-Za-z]+)*/gu;
const FUNCTION_WORDS = new Set(['a','an','the','and','or','but','nor','of','to','in','on','at','by','for','from','with','as','than','that','this','these','those','who','whom','which','what','when','where','how','i','we','you','he','she','it','they','me','us','him','her','them','my','our','your','thy','his','their','be','have','do','will','shall','not','no','all','any','some','one','there','here','then']);
const SEMANTIC_GROUPS = [['think','contemplate','ponder','imagine'],['beget','conceive','generate','bear','birth','nativity','generation','genealogy','origin'],['say','speak','announce','affirm'],['see','appear','behold','visible','perceive'],['receive','take'],['fear','afraid'],['wife','woman'],['pharez','perez','phares'],['abia','abijah'],['zebulon','zebulun'],['raka','raca'],['holy','holiness']];
// Controlled grammatical equivalents. SEDRA definitions are prose and may
// contain incidental function words, so only these governed equivalents may
// supply a function-word lexical match.
const SYRIAC_FUNCTION_GLOSSES = new Map(Object.entries({
  '\u0721\u0722':['of','from','out','than'],
  '\u0715\u0721\u0722\u0717':['whom'],
  '\u0720\u0717':['to','him'], '\u0720\u0717\u0718\u0722':['to','them'],
  '\u0720\u0710':['not','no'], '\u0718\u0720\u0710':['and','not','no'], '\u0715\u0720\u0710':['not','without'],
  '\u0713\u071d\u072a':['for'], '\u071f\u0715':['when','while','as'], '\u0718\u071f\u0715':['and','when','while','as'],
  '\u0710\u0722\u0710':['i'], '\u0710\u0722\u072c':['you','thou'], '\u0710\u0722\u072c\u0718\u0722':['you','ye'],
  '\u0712\u0717':['in','him','her'], '\u0725\u0720':['on','upon','against','over'],
  '\u0725\u0721':['with'], '\u0721\u071b\u0720':['for','because'],
  '\u0715\u071d\u0722':['but','and','then','now'], '\u0718\u0715\u071d\u0722':['and','but','now'],
  '\u0717\u0718':['he','it','be'], '\u0717\u071d':['she','it','be'], '\u0717\u0722\u0718\u0722':['they'],
  '\u0710\u0722':['if'], '\u0710\u0720\u0710':['but','unless'], '\u0710\u0726':['also','even'],
  '\u071f\u0720':['all','every'], '\u071a\u0715':['one'], '\u072c\u0718\u0712':['again'],
  '\u0717\u072a\u071f\u0710':['here'], '\u072c\u0721\u0722':['there'], '\u0717\u071d\u0715\u071d\u0722':['then'],
  '\u0710\u071d\u071f':['as','like'], '\u0721\u071b\u0720\u0717\u0722\u0710':['therefore']
}));
const SYRIAC_FUNCTION_CAPACITY = new Map([['\u0720\u0717',2],['\u0720\u0717\u0718\u0722',2],['\u0718\u0720\u0710',2],['\u0718\u071f\u0715',2],['\u0712\u0717',2],['\u0718\u0715\u071d\u0722',2]]);
const IRREGULAR = new Map(Object.entries({am:'be',is:'be',are:'be',was:'be',were:'be',been:'be',being:'be',art:'be',wast:'be',has:'have',hath:'have',had:'have',does:'do',doth:'do',did:'do',done:'do',says:'say',saith:'say',said:'say',saw:'see',seen:'see',came:'come',went:'go',gone:'go',gave:'give',given:'give',made:'make',knew:'know',known:'know',brought:'bring',thought:'think',told:'tell',sent:'send',wrote:'write',written:'write',rose:'rise',risen:'rise',begat:'beget',begot:'beget',begotten:'beget',born:'bear',contemplated:'contemplate',conceived:'conceive',appeared:'appear',men:'man',women:'woman',children:'child',brethren:'brother',feet:'foot',me:'i',my:'i',mine:'i',us:'we',our:'we',ours:'we',thee:'you',thou:'you',thy:'you',thine:'you',ye:'you',him:'he',his:'he',her:'she',them:'they',their:'they',judaea:'judea',holiness:'holy'}));
const SYRIAC_COMPOUNDS = new Map([['\u0712\u0712\u071d\u072c \u0720\u071a\u0721', { english: 'bethlehem', leading: ['in', 'at'] }]]);

function lemma(value) {
  const word = value.toLocaleLowerCase('en').replace(/[^a-z]/gu, '');
  if (IRREGULAR.has(word)) return IRREGULAR.get(word);
  if (word.length > 5 && /(?:eth|est)$/u.test(word)) return word.slice(0, -3);
  if (word.length > 5 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 5 && word.endsWith('ing')) return word.slice(0, -3).replace(/(.)\1$/u, '$1');
  if (word.length > 4 && word.endsWith('ied')) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith('ed')) return word.slice(0, -2).replace(/(.)\1$/u, '$1');
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1);
  return word;
}

function words(value) {
  const matches = [...value.matchAll(WORD_RE)];
  return matches.map((match, index) => ({ surface: match[0], lemma: lemma(match[0]), index, display: value.slice(match.index, matches[index + 1]?.index ?? value.length).trim() }));
}
function parseReference(reference) { const m=reference.match(/^(matthew|mark|luke|john) (\d+):(\d+)$/u); if(!m) throw new Error(`Invalid reference: ${reference}`); return {gospel:m[1],chapter:m[2],verse:m[3]}; }
function fileFor(reference) { const p=parseReference(reference); return path.join(ROOT,'data',p.gospel,p.chapter,`${p.verse}.json`); }
function gloss(cell) { return cell?.type === 'text' ? cell.gloss?.gloss ?? '' : ''; }
function terms(values) { const result=new Set(values.flatMap((value) => words(value).map((word) => word.lemma)).filter(Boolean));for(const group of SEMANTIC_GROUPS)if(group.some((term)=>result.has(term)))for(const term of group)result.add(term);return result; }
function independentRowTerms(row){const counts=new Map();for(const family of [['papyrus','vaticanus','sinaiticus','byzantine'],['vulgate'],['coptic']]){const familyTerms=terms(family.map((column)=>gloss(row[column])).filter(Boolean));for(const term of familyTerms)counts.set(term,(counts.get(term)??0)+1);}return new Set([...counts].filter(([term,count])=>count>=2&&!FUNCTION_WORDS.has(term)).map(([term])=>term));}
function morphologyTerms(m){const r=new Set();if(!m)return r;const ps=m.sfps!=='NA'?m.sfps:m.sp==='verb'?m.ps:'NA',gn=m.sfps!=='NA'?m.sfgn:m.gn,nu=m.sfps!=='NA'?m.sfnu:m.nu;if(ps==='1')for(const w of nu==='p'?['we','us','our']:['i','me','my'])r.add(w);if(ps==='2')for(const w of ['you','thou','thee','thy','ye'])r.add(w);if(ps==='3')for(const w of nu==='p'?['they','them','their']:gn==='f'?['she','her']:['he','him','his'])r.add(w);if(m.sp==='verb'&&(m.vt==='participle'||['ethpeal','ethpaal','ettaphal'].includes(m.vs)))for(const w of ['be','is','was','were','been'])r.add(w);if(m.sp==='verb'&&m.vt==='imperfect')for(const w of ['will','shall'])r.add(w);return r;}
function evidenceFor(row, reference) {
  const record = sedraByToken.get(row.peshitta.text);
  const analyses = record?.analyses ?? [];
  const atomicTerms=terms(analyses.flatMap((analysis) => (analysis.englishGlosses ?? []).map((surface) => analysis.category === 'proper noun' ? surface.trim().match(/^([A-Za-z]+)/u)?.[1] : surface.trim().match(/^(?:to )?([A-Za-z]+)[.!?]?$/u)?.[1])).filter(Boolean));
  const sourceToken = row.peshitta.provenance?.sourceToken;
  const morphologyRecord=morphologyBySourceToken.get(`${reference}#${sourceToken}`) ?? morphologyByRow.get(`${reference}#${row.id}`);
  return { lexical: atomicTerms, parallel: independentRowTerms(row), morphology:morphologyTerms(morphologyRecord?.morphology), morphologyRecord, sedraStatus: record?.status ?? 'MISSING' };
}

function assignEnglish(rows, englishWords, reference) {
  const rowEvidence = rows.map(({row}) => evidenceFor(row, reference));
  const sourceOrder=[...rows.keys()].sort((a,b)=>(rowEvidence[a].morphologyRecord?.sourceToken??rows[a].row.peshitta.provenance?.sourceToken??a)-(rowEvidence[b].morphologyRecord?.sourceToken??rows[b].row.peshitta.provenance?.sourceToken??b));
  const sourceRank=new Map(sourceOrder.map((rowIndex,rank)=>[rowIndex,rank]));
  const assigned = new Map(rows.map((_, index) => [index, []]));
  const placements = Array(englishWords.length).fill(null);
  const candidates = englishWords.map((word) => rowEvidence.map((evidence,index) => {
    const syriac=rows[index].row.peshitta.text,surface=word.surface.toLocaleLowerCase('en').replace(/[^a-z]/gu,''),governedFunction=(SYRIAC_FUNCTION_GLOSSES.get(syriac)??[]).includes(surface),morphological=evidence.morphology.has(word.lemma)||evidence.morphology.has(surface),lexical=evidence.lexical.has(word.lemma)||governedFunction;
    if(!lexical&&!morphological)return null;
    return {rowIndex:index,lexical,morphological,governedFunction,sourceRank:sourceRank.get(index)};
  }).filter(Boolean).sort((a,b)=>a.sourceRank-b.sourceRank||a.rowIndex-b.rowIndex));
  function capacity(rowIndex) {
    return (SYRIAC_FUNCTION_CAPACITY.get(rows[rowIndex].row.peshitta.text) ?? 3) - assigned.get(rowIndex).length;
  }
  function place(wordIndex, rowIndex, status, match = null) {
    if (placements[wordIndex] || capacity(rowIndex) <= 0) return false;
    const existing = assigned.get(rowIndex);
    if (existing.length > 0) {
      const minimum = Math.min(...existing);
      const maximum = Math.max(...existing);
      if (wordIndex !== minimum - 1 && wordIndex !== maximum + 1) return false;
    }
    placements[wordIndex] = {
      ...(match ?? { rowIndex, lexical: false, morphological: false, sourceRank: sourceRank.get(rowIndex) }),
      rowIndex,
      status,
    };
    assigned.get(rowIndex).push(wordIndex);
    return true;
  }

  // Preserve an existing exact Murdock proper-name parent only when the Syriac
  // token has no atomic SEDRA headword. This recovers source forms absent from
  // SEDRA (for example Herod) without allowing legacy phrase placement to
  // override an independently attested lexical anchor.
  for (let wordIndex = 0; wordIndex < englishWords.length; wordIndex += 1) {
    const word = englishWords[wordIndex];
    if (!/^[A-Z]/u.test(word.surface)) continue;
    const matches = rows.map((member, rowIndex) => {
      if (rowEvidence[rowIndex].lexical.size > 0) return null;
      const prior = words(member.row.peshitta.gloss?.gloss ?? '');
      return prior.some((item) => item.lemma === word.lemma) ? rowIndex : null;
    }).filter((rowIndex) => rowIndex !== null);
    if (matches.length !== 1) continue;
    place(wordIndex, matches[0], 'MURDOCK_PROPER_NAME_CONTINUITY');
    const leadingIndex = wordIndex - 1;
    if (leadingIndex >= 0 && ['of','to','in','from','at'].includes(englishWords[leadingIndex].lemma)) {
      place(leadingIndex, matches[0], 'MURDOCK_PHRASE_CONTEXT');
    }
  }
  // Governed multi-token source forms retain Murdock verbatim while assigning
  // the leading preposition and the place-name word to separate Syriac parents.
  for (let rank = 0; rank < sourceOrder.length - 1; rank += 1) {
    const first = sourceOrder[rank];
    const second = sourceOrder[rank + 1];
    const compound = SYRIAC_COMPOUNDS.get(`${rows[first].row.peshitta.text} ${rows[second].row.peshitta.text}`);
    if (!compound) continue;
    const nameIndex = englishWords.findIndex((word) => word.lemma === compound.english);
    if (nameIndex < 0) continue;
    place(nameIndex, second, 'MURDOCK_COMPOUND_CONTEXT');
    const leadingIndex = nameIndex - 1;
    if (leadingIndex >= 0 && compound.leading.includes(englishWords[leadingIndex].lemma)) {
      place(leadingIndex, first, 'MURDOCK_COMPOUND_CONTEXT');
    }
  }
  // Establish source-authorized anchors first. Anchors may cross because the
  // scholarly English and Syriac do not necessarily share word order. Repeated
  // English particles compete for a source occurrence instead of all claiming
  // the same token.
  const expectedRank = (wordIndex) => (wordIndex / Math.max(1, englishWords.length - 1)) * Math.max(0, sourceOrder.length - 1);
  const lexicalProposals = [];
  for (let wordIndex = 0; wordIndex < englishWords.length; wordIndex += 1) {
    const lexical = candidates[wordIndex].filter((candidate) => candidate.lexical);
    if (lexical.length === 1) lexicalProposals.push({ wordIndex, match: lexical[0] });
  }
  lexicalProposals.sort((a,b) => Math.abs(a.match.sourceRank-expectedRank(a.wordIndex))-Math.abs(b.match.sourceRank-expectedRank(b.wordIndex)) || a.wordIndex-b.wordIndex);
  const lexicalRows = new Set();
  for (const proposal of lexicalProposals) {
    if (lexicalRows.has(proposal.match.rowIndex)) continue;
    if (place(proposal.wordIndex, proposal.match.rowIndex, 'SEDRA_LEXICAL_MATCH', proposal.match)) lexicalRows.add(proposal.match.rowIndex);
  }

  const morphologyProposals = [];
  for (let wordIndex = 0; wordIndex < englishWords.length; wordIndex += 1) {
    if (placements[wordIndex]) continue;
    const morphological = candidates[wordIndex].filter((candidate) => candidate.morphological);
    if (morphological.length === 1) morphologyProposals.push({ wordIndex, match: morphological[0] });
  }
  morphologyProposals.sort((a,b) => Math.abs(a.match.sourceRank-expectedRank(a.wordIndex))-Math.abs(b.match.sourceRank-expectedRank(b.wordIndex)) || a.wordIndex-b.wordIndex);
  const morphologyRows = new Set();
  for (const proposal of morphologyProposals) {
    if (morphologyRows.has(proposal.match.rowIndex)) continue;
    if (place(proposal.wordIndex, proposal.match.rowIndex, 'ETCBC_MORPHOLOGICAL_MATCH', proposal.match)) morphologyRows.add(proposal.match.rowIndex);
  }

  // Governed helpers attach to the following anchored content word. This is
  // phrase context, never a claim of independent lexical equivalence.
  const attachForward = new Set(['a','an','the','to','of','in','on','at','by','for','from','with','as','than','be','have','will','shall','not']);
  for (let wordIndex = englishWords.length - 1; wordIndex >= 0; wordIndex -= 1) {
    if (placements[wordIndex] || !attachForward.has(englishWords[wordIndex].lemma)) continue;
    for (let next = wordIndex + 1; next < englishWords.length; next += 1) {
      if (!placements[next]) continue;
      if (place(wordIndex, placements[next].rowIndex, 'MURDOCK_PHRASE_CONTEXT')) break;
    }
  }

  // Resolve remaining evidenced words by fixed priority and proximity.
  for (let wordIndex = 0; wordIndex < englishWords.length; wordIndex += 1) {
    if (placements[wordIndex]) continue;
    const expected = (wordIndex / Math.max(1, englishWords.length - 1)) * Math.max(0, sourceOrder.length - 1);
    const ranked = candidates[wordIndex]
      .filter((candidate) => capacity(candidate.rowIndex) > 0)
      .sort((a,b) => Number(b.lexical)-Number(a.lexical) || Number(b.morphological)-Number(a.morphological) || Math.abs(a.sourceRank-expected)-Math.abs(b.sourceRank-expected) || a.sourceRank-b.sourceRank);
    if (!ranked.length) continue;
    const match = ranked[0];
    place(wordIndex, match.rowIndex, match.lexical ? 'SEDRA_LEXICAL_MATCH' : 'ETCBC_MORPHOLOGICAL_MATCH', match);
  }

  // Account for every remaining Murdock word without generating translation.
  // Prefer an unused parent, then the nearest parent in stable source order.
  for (let wordIndex = 0; wordIndex < englishWords.length; wordIndex += 1) {
    if (placements[wordIndex]) continue;
    const expected = (wordIndex / Math.max(1, englishWords.length - 1)) * Math.max(0, sourceOrder.length - 1);
    const available = sourceOrder
      .filter((rowIndex) => capacity(rowIndex) > 0)
      .sort((a,b) => {
        const occupied = Number(assigned.get(a).length > 0) - Number(assigned.get(b).length > 0);
        return occupied || Math.abs(sourceRank.get(a)-expected)-Math.abs(sourceRank.get(b)-expected) || sourceRank.get(a)-sourceRank.get(b);
      });
    if (available.length) place(wordIndex, available[0], 'MURDOCK_PHRASE_CONTEXT');
  }
  // Revisit skipped words until no contiguous phrase can grow further. A word
  // that was unavailable on the first left-to-right pass may become admissible
  // after its immediate Murdock neighbor establishes the parent span.
  let grew = true;
  while (grew) {
    grew = false;
    for (let wordIndex = 0; wordIndex < englishWords.length; wordIndex += 1) {
      if (placements[wordIndex]) continue;
      const expected = expectedRank(wordIndex);
      const eligible = sourceOrder.filter((rowIndex) => {
        if (capacity(rowIndex) <= 0) return false;
        const indices = assigned.get(rowIndex);
        if (!indices.length) return false;
        return wordIndex === Math.min(...indices) - 1 || wordIndex === Math.max(...indices) + 1;
      }).sort((a,b) => {
        const matchA = candidates[wordIndex].find((candidate) => candidate.rowIndex === a);
        const matchB = candidates[wordIndex].find((candidate) => candidate.rowIndex === b);
        const evidence = Number(Boolean(matchB?.lexical))-Number(Boolean(matchA?.lexical)) || Number(Boolean(matchB?.morphological))-Number(Boolean(matchA?.morphological));
        return evidence || Math.abs(sourceRank.get(a)-expected)-Math.abs(sourceRank.get(b)-expected) || sourceRank.get(a)-sourceRank.get(b);
      });
      if (eligible.length && place(wordIndex, eligible[0], 'MURDOCK_PHRASE_CONTEXT')) grew = true;
    }
  }
  for(const indices of assigned.values())indices.sort((a,b)=>a-b);
  return {assigned,placements,rowEvidence};
}

function assignEnglishSpans(rows, englishWords, reference) {
  const rowEvidence = rows.map(({row}) => evidenceFor(row, reference));
  const sourceOrder = [...rows.keys()].sort((a,b) => (rows[a].row.peshitta.provenance?.sourceToken ?? a) - (rows[b].row.peshitta.provenance?.sourceToken ?? b));
  const sourceRank = new Map(sourceOrder.map((rowIndex, rank) => [rowIndex, rank]));
  const assigned = new Map(rows.map((_, index) => [index, []]));
  const placements = Array(englishWords.length).fill(null);
  const candidates = englishWords.map((word) => rowEvidence.map((evidence, rowIndex) => {
    const syriac = rows[rowIndex].row.peshitta.text;
    const surface = word.surface.toLocaleLowerCase('en').replace(/[^a-z]/gu, '');
    const governedFunction = (SYRIAC_FUNCTION_GLOSSES.get(syriac) ?? []).includes(surface);
    const morphological = evidence.morphology.has(word.lemma) || evidence.morphology.has(surface);
    const lexical = evidence.lexical.has(word.lemma) || governedFunction;
    return lexical || morphological ? { rowIndex, lexical, morphological, governedFunction, sourceRank: sourceRank.get(rowIndex) } : null;
  }).filter(Boolean));

  function expected(wordIndex) {
    return (wordIndex / Math.max(1, englishWords.length - 1)) * Math.max(0, sourceOrder.length - 1);
  }
  function capacity(rowIndex) {
    return 3 - assigned.get(rowIndex).length;
  }
  function place(wordIndex, rowIndex, status, match = null) {
    if (placements[wordIndex] || capacity(rowIndex) <= 0) return false;
    const indices = assigned.get(rowIndex);
    if (indices.length && wordIndex !== Math.min(...indices) - 1 && wordIndex !== Math.max(...indices) + 1) return false;
    placements[wordIndex] = { ...(match ?? { rowIndex, lexical: false, morphological: false, sourceRank: sourceRank.get(rowIndex) }), rowIndex, status };
    indices.push(wordIndex);
    return true;
  }

  for (let rank = 0; rank < sourceOrder.length - 1; rank += 1) {
    const first = sourceOrder[rank], second = sourceOrder[rank + 1];
    const compound = SYRIAC_COMPOUNDS.get(`${rows[first].row.peshitta.text} ${rows[second].row.peshitta.text}`);
    if (!compound) continue;
    const nameIndex = englishWords.findIndex((word) => word.lemma === compound.english);
    if (nameIndex < 0) continue;
    place(nameIndex, second, 'MURDOCK_COMPOUND_CONTEXT');
    if (nameIndex > 0 && compound.leading.includes(englishWords[nameIndex - 1].lemma)) place(nameIndex - 1, first, 'MURDOCK_COMPOUND_CONTEXT');
  }

  for (let wordIndex = 0; wordIndex < englishWords.length; wordIndex += 1) {
    if (placements[wordIndex] || !/^[A-Z]/u.test(englishWords[wordIndex].surface)) continue;
    const matches = rows.map((member, rowIndex) => {
      if (rowEvidence[rowIndex].lexical.size) return null;
      return words(member.row.peshitta.gloss?.gloss ?? '').some((word) => word.lemma === englishWords[wordIndex].lemma) ? rowIndex : null;
    }).filter((rowIndex) => rowIndex !== null);
    if (matches.length === 1) {
      place(wordIndex, matches[0], 'MURDOCK_PROPER_NAME_CONTINUITY');
      if (wordIndex > 0 && ['of','to','in','from','at'].includes(englishWords[wordIndex - 1].lemma)) place(wordIndex - 1, matches[0], 'MURDOCK_PHRASE_CONTEXT');
    }
  }

  const lexicalProposals = [];
  for (let wordIndex = 0; wordIndex < englishWords.length; wordIndex += 1) {
    if (placements[wordIndex]) continue;
    const matches = candidates[wordIndex].filter((candidate) => candidate.lexical);
    if (matches.length === 1) lexicalProposals.push({ wordIndex, match: matches[0] });
  }
  lexicalProposals.sort((a,b) => Math.abs(a.match.sourceRank-expected(a.wordIndex))-Math.abs(b.match.sourceRank-expected(b.wordIndex)) || a.wordIndex-b.wordIndex);
  const contentRows = new Set([...placements].filter(Boolean).map((placement) => placement.rowIndex));
  for (const proposal of lexicalProposals) {
    if (contentRows.has(proposal.match.rowIndex)) continue;
    if (place(proposal.wordIndex, proposal.match.rowIndex, 'SEDRA_LEXICAL_MATCH', proposal.match)) contentRows.add(proposal.match.rowIndex);
  }

  const morphologyProposals = [];
  for (let wordIndex = 0; wordIndex < englishWords.length; wordIndex += 1) {
    if (placements[wordIndex]) continue;
    const matches = candidates[wordIndex].filter((candidate) => candidate.morphological);
    if (matches.length === 1) morphologyProposals.push({ wordIndex, match: matches[0] });
  }
  morphologyProposals.sort((a,b) => Math.abs(a.match.sourceRank-expected(a.wordIndex))-Math.abs(b.match.sourceRank-expected(b.wordIndex)) || a.wordIndex-b.wordIndex);
  const morphologyRows = new Set();
  for (const proposal of morphologyProposals) {
    if (morphologyRows.has(proposal.match.rowIndex)) continue;
    if (place(proposal.wordIndex, proposal.match.rowIndex, 'ETCBC_MORPHOLOGICAL_MATCH', proposal.match)) morphologyRows.add(proposal.match.rowIndex);
  }

  // Cover each still-unassigned Murdock interval with the minimum number of
  // additional one-to-three-word spans. Unused Syriac parents remain explicit
  // no-equivalent cells rather than receiving fabricated phrase equivalence.
  const unusedRows = new Set(sourceOrder.filter((index) => assigned.get(index).length === 0));
  const runs = [];
  for (let index = 0; index < englishWords.length;) {
    if (placements[index]) { index += 1; continue; }
    const start = index;
    while (index < englishWords.length && !placements[index]) index += 1;
    runs.push({ start, end: index - 1 });
  }
  for (const run of runs) {
    const length = run.end - run.start + 1;
    const spanCount = Math.ceil(length / 3);
    for (let span = 0; span < spanCount; span += 1) {
      if (!unusedRows.size) break;
      const spanStart = run.start + Math.floor((span * length) / spanCount);
      const spanEnd = run.start + Math.floor(((span + 1) * length) / spanCount) - 1;
      const seed = Math.floor((spanStart + spanEnd) / 2);
      const rowIndex = [...unusedRows].sort((a,b) => Math.abs(sourceRank.get(a)-expected(seed))-Math.abs(sourceRank.get(b)-expected(seed)) || sourceRank.get(a)-sourceRank.get(b))[0];
      if (place(seed, rowIndex, 'MURDOCK_PHRASE_CONTEXT')) unusedRows.delete(rowIndex);
    }
  }

  // Grow each seed into one contiguous phrase, never exceeding three words.
  let grew = true;
  while (grew) {
    grew = false;
    for (let wordIndex = 0; wordIndex < englishWords.length; wordIndex += 1) {
      if (placements[wordIndex]) continue;
      const neighboringRows = [placements[wordIndex - 1]?.rowIndex, placements[wordIndex + 1]?.rowIndex].filter((value, index, all) => value !== undefined && all.indexOf(value) === index && capacity(value) > 0);
      neighboringRows.sort((a,b) => {
        const matchA = candidates[wordIndex].find((candidate) => candidate.rowIndex === a);
        const matchB = candidates[wordIndex].find((candidate) => candidate.rowIndex === b);
        return Number(Boolean(matchB?.lexical))-Number(Boolean(matchA?.lexical)) || Number(Boolean(matchB?.morphological))-Number(Boolean(matchA?.morphological)) || Math.abs(sourceRank.get(a)-expected(wordIndex))-Math.abs(sourceRank.get(b)-expected(wordIndex));
      });
      if (neighboringRows.length && place(wordIndex, neighboringRows[0], 'MURDOCK_PHRASE_CONTEXT')) grew = true;
    }
  }

  for (const indices of assigned.values()) indices.sort((a,b) => a-b);
  return { assigned, placements, rowEvidence };
}
function assignEnglishChunks(rows, englishWords, reference) {
  const rowEvidence = rows.map(({row}) => evidenceFor(row, reference));
  const sourceOrder = [...rows.keys()].sort((a,b) => (rows[a].row.peshitta.provenance?.sourceToken ?? a) - (rows[b].row.peshitta.provenance?.sourceToken ?? b));
  const sourceRank = new Map(sourceOrder.map((rowIndex, rank) => [rowIndex, rank]));
  const anchors = Array(englishWords.length).fill(null);
  const tokenAnchor = new Map();
  function expected(wordIndex) { return (wordIndex / Math.max(1, englishWords.length - 1)) * Math.max(0, sourceOrder.length - 1); }
  function setAnchor(wordIndex, rowIndex, status, match = null, allowAdjacent = false) {
    if (anchors[wordIndex]) return false;
    const prior = tokenAnchor.get(rowIndex);
    if (prior !== undefined && (!allowAdjacent || Math.abs(prior - wordIndex) > 2)) return false;
    anchors[wordIndex] = { rowIndex, status, match };
    if (prior === undefined) tokenAnchor.set(rowIndex, wordIndex);
    return true;
  }
  const candidates = englishWords.map((word) => rowEvidence.map((evidence, rowIndex) => {
    const syriac = rows[rowIndex].row.peshitta.text;
    const surface = word.surface.toLocaleLowerCase('en').replace(/[^a-z]/gu, '');
    const governedFunction = (SYRIAC_FUNCTION_GLOSSES.get(syriac) ?? []).includes(surface);
    const morphological = evidence.morphology.has(word.lemma) || evidence.morphology.has(surface);
    const lexical = evidence.lexical.has(word.lemma) || governedFunction;
    const parallel = evidence.parallel.has(word.lemma) || evidence.parallel.has(surface);
    return lexical || parallel || morphological ? { rowIndex, lexical, parallel, morphological, governedFunction, sourceRank: sourceRank.get(rowIndex) } : null;
  }).filter(Boolean));

  for (let rank = 0; rank < sourceOrder.length - 1; rank += 1) {
    const first = sourceOrder[rank], second = sourceOrder[rank + 1];
    const compound = SYRIAC_COMPOUNDS.get(`${rows[first].row.peshitta.text} ${rows[second].row.peshitta.text}`);
    if (!compound) continue;
    const nameIndex = englishWords.findIndex((word) => word.lemma === compound.english);
    if (nameIndex < 0) continue;
    setAnchor(nameIndex, second, 'MURDOCK_COMPOUND_CONTEXT');
    if (nameIndex > 0 && compound.leading.includes(englishWords[nameIndex - 1].lemma)) setAnchor(nameIndex - 1, first, 'MURDOCK_COMPOUND_CONTEXT');
  }
  const lexical = [];
  for (let wordIndex = 0; wordIndex < englishWords.length; wordIndex += 1) {
    if (anchors[wordIndex]) continue;
    const matches = candidates[wordIndex].filter((candidate) => candidate.lexical || candidate.parallel).sort((a,b) => Number(b.parallel)-Number(a.parallel) || Number(b.lexical)-Number(a.lexical) || Math.abs(a.sourceRank-expected(wordIndex))-Math.abs(b.sourceRank-expected(wordIndex)) || a.sourceRank-b.sourceRank);
    if (matches.length && (matches.length === 1 || Math.abs(matches[0].sourceRank-expected(wordIndex)) < Math.abs(matches[1].sourceRank-expected(wordIndex)))) lexical.push({ wordIndex, match: matches[0] });
  }
  lexical.sort((a,b) => Math.abs(a.match.sourceRank-expected(a.wordIndex))-Math.abs(b.match.sourceRank-expected(b.wordIndex)) || a.wordIndex-b.wordIndex);
  for (const proposal of lexical) setAnchor(proposal.wordIndex, proposal.match.rowIndex, proposal.match.parallel ? 'INDEPENDENT_WITNESS_ROW_MATCH' : 'SEDRA_LEXICAL_MATCH', proposal.match, true);
  const morphology = [];
  for (let wordIndex = 0; wordIndex < englishWords.length; wordIndex += 1) {
    if (anchors[wordIndex]) continue;
    const matches = candidates[wordIndex].filter((candidate) => candidate.morphological).sort((a,b) => Math.abs(a.sourceRank-expected(wordIndex))-Math.abs(b.sourceRank-expected(wordIndex)) || a.sourceRank-b.sourceRank);
    if (matches.length && (matches.length === 1 || Math.abs(matches[0].sourceRank-expected(wordIndex)) < Math.abs(matches[1].sourceRank-expected(wordIndex)))) morphology.push({ wordIndex, match: matches[0] });
  }
  morphology.sort((a,b) => Math.abs(a.match.sourceRank-expected(a.wordIndex))-Math.abs(b.match.sourceRank-expected(b.wordIndex)) || a.wordIndex-b.wordIndex);
  for (const proposal of morphology) setAnchor(proposal.wordIndex, proposal.match.rowIndex, 'ETCBC_MORPHOLOGICAL_MATCH', proposal.match, true);

  const chunks = [];
  let current = [];
  let owner = null;
  function flush() {
    if (!current.length) return;
    chunks.push({ indices: current, owner });
    current = [];
    owner = null;
  }
  const forwardHelpers = new Set(['a','an','the','and','but','to','of','in','on','at','by','for','from','with','as','than','be','have','will','shall','not','there']);
  for (let wordIndex = 0; wordIndex < englishWords.length; wordIndex += 1) {
    const anchorOwner = anchors[wordIndex]?.rowIndex ?? null;
    let nextOwner = null;
    for (let lookahead = wordIndex + 1; lookahead < Math.min(englishWords.length, wordIndex + 4); lookahead += 1) {
      if (anchors[lookahead]) { nextOwner = anchors[lookahead].rowIndex; break; }
      if (!forwardHelpers.has(englishWords[lookahead].lemma)) break;
    }
    const startsNextPhrase = owner !== null && anchorOwner === null && forwardHelpers.has(englishWords[wordIndex].lemma) && nextOwner !== null && nextOwner !== owner;
    if (current.length === 3 || startsNextPhrase || (owner !== null && anchorOwner !== null && owner !== anchorOwner)) flush();
    current.push(wordIndex);
    if (anchorOwner !== null) owner = anchorOwner;
  }
  flush();
  // Increase granularity toward one populated English cell per Syriac parent.
  // Consolidate avoidable anchor boundaries until the phrase count fits the
  // available Syriac parents. Only adjacent chunks totaling at most three words
  // may merge; stronger governed evidence retains ownership.
  const anchorWeight = { MURDOCK_COMPOUND_CONTEXT: 5, SEDRA_LEXICAL_MATCH: 4, INDEPENDENT_WITNESS_ROW_MATCH: 3, ETCBC_MORPHOLOGICAL_MATCH: 2 };
  while (chunks.length > sourceOrder.length) {
    const options = [];
    for (let index = 0; index < chunks.length - 1; index += 1) {
      const left = chunks[index], right = chunks[index + 1];
      if (left.indices.length + right.indices.length > 3 || (left.owner !== null && right.owner !== null && left.owner !== right.owner)) continue;
      const leftWeight = Math.max(0, ...left.indices.map((wordIndex) => anchorWeight[anchors[wordIndex]?.status] ?? 0));
      const rightWeight = Math.max(0, ...right.indices.map((wordIndex) => anchorWeight[anchors[wordIndex]?.status] ?? 0));
      const conflict = Number(left.owner !== null && right.owner !== null && left.owner !== right.owner);
      options.push({ index, leftWeight, rightWeight, conflict });
    }
    options.sort((a,b) => a.conflict-b.conflict || Math.min(a.leftWeight,a.rightWeight)-Math.min(b.leftWeight,b.rightWeight) || a.index-b.index);
    if (!options.length) break;
    const choice = options[0], left = chunks[choice.index], right = chunks[choice.index + 1];
    const keepLeft = choice.leftWeight >= choice.rightWeight;
    const owner = keepLeft ? (left.owner ?? right.owner) : (right.owner ?? left.owner);
    const losingOwner = keepLeft ? right.owner : left.owner;
    if (losingOwner !== null && losingOwner !== owner) {
      for (const wordIndex of (keepLeft ? right.indices : left.indices)) if (anchors[wordIndex]?.rowIndex === losingOwner) anchors[wordIndex] = null;
    }
    chunks.splice(choice.index, 2, { indices: [...left.indices, ...right.indices], owner });
  }
  // Rebalance bounded windows when pairwise merging cannot reach capacity.
  // Example: three adjacent two-word chunks become two three-word chunks.
  while (chunks.length > sourceOrder.length) {
    let replacement = null;
    for (let width = 3; width <= chunks.length && !replacement; width += 1) {
      for (let start = 0; start + width <= chunks.length; start += 1) {
        const window = chunks.slice(start, start + width);
        const indices = window.flatMap((chunk) => chunk.indices);
        const count = width - 1;
        if (indices.length > count * 3) continue;
        const ownerWeights = new Map();
        for (const chunk of window) {
          if (chunk.owner === null) continue;
          const weight = Math.max(0, ...chunk.indices.map((wordIndex) => anchorWeight[anchors[wordIndex]?.status] ?? 0));
          ownerWeights.set(chunk.owner, Math.max(ownerWeights.get(chunk.owner) ?? 0, weight));
        }
        if (ownerWeights.size > count) continue;
        const owners = [...ownerWeights].sort((a,b) => b[1]-a[1] || sourceRank.get(a[0])-sourceRank.get(b[0])).map(([rowIndex]) => rowIndex);
        const groups = [];
        for (let group = 0; group < count; group += 1) {
          const groupStart = Math.floor((group * indices.length) / count);
          const groupEnd = Math.floor(((group + 1) * indices.length) / count);
          const groupIndices = indices.slice(groupStart, groupEnd);
          const midpoint = groupIndices.reduce((sum, index) => sum + index, 0) / groupIndices.length;
          const owner = owners.splice(owners.map((rowIndex) => Math.abs(sourceRank.get(rowIndex)-expected(midpoint))).indexOf(Math.min(...owners.map((rowIndex) => Math.abs(sourceRank.get(rowIndex)-expected(midpoint))))), 1)[0] ?? null;
          groups.push({ indices: groupIndices, owner });
        }
        for (const chunk of window) for (const wordIndex of chunk.indices) if (!groups.some((group) => group.owner === anchors[wordIndex]?.rowIndex && group.indices.includes(wordIndex))) anchors[wordIndex] = null;
        replacement = { start, width, groups };
        break;
      }
    }
    if (!replacement) break;
    chunks.splice(replacement.start, replacement.width, ...replacement.groups);
  }
  // A Syriac parent may own only one contiguous Murdock span. If repeated
  // English wording produced separated anchors for the same token, retain the
  // first stable span and release later spans to phrase-context allocation.
  const seenOwners = new Set();
  for (const chunk of chunks) {
    if (chunk.owner === null) continue;
    if (!seenOwners.has(chunk.owner)) {
      seenOwners.add(chunk.owner);
      continue;
    }
    for (const wordIndex of chunk.indices) {
      if (anchors[wordIndex]?.rowIndex === chunk.owner) anchors[wordIndex] = null;
    }
    chunk.owner = null;
  }
  // Increase granularity to one populated English cell per Syriac parent whenever
  // the published Murdock unit contains at least as many words as source tokens.
  // Split the least disruptive phrase edge first. If an anchored phrase must be
  // divided, retain its strongest governed anchor on one side and release the
  // other side to stable source-position allocation; no English is invented.
  const targetChunks = Math.min(englishWords.length, sourceOrder.length);
  while (chunks.length < targetChunks) {
    const choices = [];
    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      if (chunk.indices.length < 2) continue;
      for (let split = 1; split < chunk.indices.length; split += 1) {
        const leftIndices = chunk.indices.slice(0, split), rightIndices = chunk.indices.slice(split);
        const sideWeight = (indices) => Math.max(0, ...indices.map((wordIndex) => anchorWeight[anchors[wordIndex]?.status] ?? 0));
        const leftWeight = sideWeight(leftIndices), rightWeight = sideWeight(rightIndices);
        const anchoredSide = leftWeight === 0 && rightWeight === 0 ? null : (leftWeight >= rightWeight ? 'left' : 'right');
        const releasedWeight = anchoredSide === 'left' ? rightWeight : (anchoredSide === 'right' ? leftWeight : 0);
        choices.push({ index, split, anchoredSide, releasedWeight, imbalance: Math.abs(leftIndices.length-rightIndices.length), length: chunk.indices.length });
      }
    }
    choices.sort((a,b) => a.releasedWeight-b.releasedWeight || b.length-a.length || a.imbalance-b.imbalance || a.index-b.index || a.split-b.split);
    if (!choices.length) break;
    const choice = choices[0], chunk = chunks[choice.index];
    const leftIndices = chunk.indices.slice(0, choice.split), rightIndices = chunk.indices.slice(choice.split);
    const released = choice.anchoredSide === 'left' ? rightIndices : (choice.anchoredSide === 'right' ? leftIndices : []);
    for (const wordIndex of released) anchors[wordIndex] = null;
    const left = { indices: leftIndices, owner: choice.anchoredSide === 'left' ? chunk.owner : null };
    const right = { indices: rightIndices, owner: choice.anchoredSide === 'right' ? chunk.owner : null };
    chunks.splice(choice.index, 1, left, right);
  }

  const ownedRows = new Set(chunks.map((chunk) => chunk.owner).filter((value) => value !== null));
  const unusedRows = new Set(sourceOrder.filter((rowIndex) => !ownedRows.has(rowIndex)));
  for (const chunk of chunks.filter((item) => item.owner === null).sort((a,b) => b.indices.length-a.indices.length || a.indices[0]-b.indices[0])) {
    if (!unusedRows.size) continue;
    const midpoint = chunk.indices.reduce((sum, index) => sum + index, 0) / chunk.indices.length;
    const rowIndex = [...unusedRows].sort((a,b) => Math.abs(sourceRank.get(a)-expected(midpoint))-Math.abs(sourceRank.get(b)-expected(midpoint)) || sourceRank.get(a)-sourceRank.get(b))[0];
    chunk.owner = rowIndex;
    unusedRows.delete(rowIndex);
  }

  // Capacity-tight fallback: if anchor boundaries strand more words than the
  // three-word ceiling mathematically requires, repartition only this verse
  // into the available number of contiguous cells. Unique governed anchors are
  // retained; remaining cells follow stable source position.
  const expansionFloor = Math.max(0, englishWords.length - sourceOrder.length * 3);
  const strandedWords = chunks.filter((chunk) => chunk.owner === null).reduce((sum, chunk) => sum + chunk.indices.length, 0);
  if (strandedWords > expansionFloor) {
    const assignableWords = englishWords.length - expansionFloor;
    const groupCount = Math.min(sourceOrder.length, assignableWords);
    const rebuilt = [];
    const usedOwners = new Set();
    for (let group = 0; group < groupCount; group += 1) {
      const start = Math.floor((group * assignableWords) / groupCount);
      const end = Math.floor(((group + 1) * assignableWords) / groupCount);
      const indices = Array.from({ length: end - start }, (_, offset) => start + offset);
      const governed = [...new Set(indices.map((wordIndex) => anchors[wordIndex]?.rowIndex).filter((value) => value !== undefined && !usedOwners.has(value)))];
      const owner = governed.length === 1 ? governed[0] : null;
      if (owner !== null) usedOwners.add(owner);
      rebuilt.push({ indices, owner });
    }
    const availableOwners = new Set(sourceOrder.filter((rowIndex) => !usedOwners.has(rowIndex)));
    for (const chunk of rebuilt.filter((item) => item.owner === null)) {
      const midpoint = chunk.indices.reduce((sum, index) => sum + index, 0) / chunk.indices.length;
      const owner = [...availableOwners].sort((a,b) => Math.abs(sourceRank.get(a)-expected(midpoint))-Math.abs(sourceRank.get(b)-expected(midpoint)) || sourceRank.get(a)-sourceRank.get(b))[0];
      chunk.owner = owner;
      availableOwners.delete(owner);
    }
    chunks.splice(0, chunks.length, ...rebuilt);
  }
  const assigned = new Map(rows.map((_, index) => [index, []]));
  const placements = Array(englishWords.length).fill(null);
  for (const chunk of chunks) {
    if (chunk.owner === null) continue;
    for (const wordIndex of chunk.indices) {
      const anchor = anchors[wordIndex];
      const match = anchor?.match ?? candidates[wordIndex].find((candidate) => candidate.rowIndex === chunk.owner) ?? null;
      placements[wordIndex] = { ...(match ?? { rowIndex: chunk.owner, lexical: false, morphological: false, sourceRank: sourceRank.get(chunk.owner) }), rowIndex: chunk.owner, status: anchor?.status ?? 'MURDOCK_PHRASE_CONTEXT' };
      assigned.get(chunk.owner).push(wordIndex);
    }
  }
  return { assigned, placements, rowEvidence };
}

function assignEnglishSequence(rows, englishWords, reference) {
  if (englishWords.length > rows.length * 3) return assignEnglishChunks(rows, englishWords, reference);
  const rowEvidence = rows.map(({row}) => evidenceFor(row, reference));
  const sourceOrder = [...rows.keys()].sort((a,b) => (rows[a].row.peshitta.provenance?.sourceToken ?? a) - (rows[b].row.peshitta.provenance?.sourceToken ?? b));
  const sourceRank = new Map(sourceOrder.map((rowIndex, rank) => [rowIndex, rank]));
  const candidates = englishWords.map((word) => rowEvidence.map((evidence, rowIndex) => {
    const syriac = rows[rowIndex].row.peshitta.text;
    const surface = word.surface.toLocaleLowerCase('en').replace(/[^a-z]/gu, '');
    const governedFunction = (SYRIAC_FUNCTION_GLOSSES.get(syriac) ?? []).includes(surface);
    const morphological = evidence.morphology.has(word.lemma) || evidence.morphology.has(surface);
    const lexical = evidence.lexical.has(word.lemma) || governedFunction;
    return { rowIndex, lexical, morphological, governedFunction, sourceRank: sourceRank.get(rowIndex) };
  }));
  const stateCount = sourceOrder.length * 3;
  const back = Array.from({length: englishWords.length}, () => new Int32Array(stateCount).fill(-2));
  let previous = new Float64Array(stateCount).fill(Number.POSITIVE_INFINITY);
  function wordCost(wordIndex, rank) {
    const rowIndex = sourceOrder[rank];
    const match = candidates[wordIndex][rowIndex];
    const expected = (wordIndex / Math.max(1, englishWords.length - 1)) * Math.max(0, sourceOrder.length - 1);
    let cost = Math.abs(rank - expected) * 3;
    if (match.governedFunction) cost -= 180;
    else if (match.lexical) cost -= 120;
    else if (match.morphological) cost -= 45;
    if (!match.lexical && candidates[wordIndex].some((candidate) => candidate.lexical)) cost += 35;
    else if (!match.morphological && candidates[wordIndex].some((candidate) => candidate.morphological)) cost += 10;
    return cost;
  }
  for (let rank = 0; rank < sourceOrder.length; rank += 1) previous[rank * 3] = wordCost(0, rank) - 10000;
  for (let wordIndex = 1; wordIndex < englishWords.length; wordIndex += 1) {
    const current = new Float64Array(stateCount).fill(Number.POSITIVE_INFINITY);
    let prefixCost = Number.POSITIVE_INFINITY;
    let prefixState = -1;
    for (let rank = 0; rank < sourceOrder.length; rank += 1) {
      const base = rank * 3;
      const startCost = prefixCost + wordCost(wordIndex, rank) - 10000;
      if (startCost < current[base]) {
        current[base] = startCost;
        back[wordIndex][base] = prefixState;
      }
      for (let count = 1; count < 3; count += 1) {
        const priorState = base + count - 1;
        const cost = previous[priorState] + wordCost(wordIndex, rank);
        if (cost < current[base + count]) {
          current[base + count] = cost;
          back[wordIndex][base + count] = priorState;
        }
      }
      for (let count = 0; count < 3; count += 1) {
        const state = base + count;
        if (previous[state] < prefixCost) {
          prefixCost = previous[state];
          prefixState = state;
        }
      }
    }
    previous = current;
  }
  let state = 0;
  for (let candidate = 1; candidate < stateCount; candidate += 1) if (previous[candidate] < previous[state]) state = candidate;
  const owners = Array(englishWords.length);
  for (let wordIndex = englishWords.length - 1; wordIndex >= 0; wordIndex -= 1) {
    owners[wordIndex] = sourceOrder[Math.floor(state / 3)];
    state = back[wordIndex][state];
  }
  const assigned = new Map(rows.map((_, index) => [index, []]));
  const placements = owners.map((rowIndex, wordIndex) => {
    assigned.get(rowIndex).push(wordIndex);
    const match = candidates[wordIndex][rowIndex];
    const status = match.lexical ? 'SEDRA_LEXICAL_MATCH' : match.morphological ? 'ETCBC_MORPHOLOGICAL_MATCH' : 'MURDOCK_PHRASE_CONTEXT';
    return { ...match, rowIndex, status };
  });
  return { assigned, placements, rowEvidence };
}
function emptyRow(reference,index,word,placement){const p=parseReference(reference),empty={type:'empty'};return{id:`peshitta-english-${p.gospel}-${p.chapter}-${p.verse}-${index+1}`,rowKind:'translation-expansion',papyrus:empty,coptic:empty,sinaiticus:empty,vaticanus:empty,vulgate:empty,peshitta:{type:'translation',gloss:{gloss:word.display,source:'Murdock',tooltip:'Murdock 1851 · English-only expansion; no certified Syriac lexical equivalent'},provenance:{authority:placement.authority,sourceReference:reference,englishIndex:index,alignmentGroupId:`${placement.unitId}#english-${index+1}`,status:'published-translation-row'}},byzantine:empty,bezae:empty};}

const units=Object.values(manifest.units).filter((unit,index,all)=>all.findIndex((candidate)=>candidate.unitId===unit.unitId)===index);
const pendingFiles=new Map(),decisions=[];
const totals={units:units.length,displayReferences:0,syriacRows:0,englishWords:0,lexicallyAlignedWords:0,morphologicallyAlignedWords:0,independentWitnessAlignedWords:0,phraseContextWords:0,expansionWords:0,populatedSyriacCells:0,blankSyriacCells:0,filesChanged:0,failures:0};
for(const unit of units){
  if(unit.displayReferences.length!==1)throw new Error(`${unit.unitId}: cross-verse unit prohibited`);
  const reference=unit.displayReferences[0],filename=fileFor(reference),document=pendingFiles.get(filename)??JSON.parse(fs.readFileSync(filename,'utf8'));pendingFiles.set(filename,document);document.rows=document.rows.filter((row)=>!row.id.startsWith('peshitta-english-'));
  const rows=document.rows.map((row,documentIndex)=>({row,documentIndex})).filter(({row})=>row.peshitta?.type==='text'),englishWords=words(unit.english);
  const {assigned,placements,rowEvidence}=assignEnglishChunks(rows,englishWords,reference);
  const wordRecords=[];
  for(let rowIndex=0;rowIndex<rows.length;rowIndex+=1){const member=rows[rowIndex],indices=assigned.get(rowIndex),display=indices.map((index)=>englishWords[index].display).join(' ').trim();if(display)totals.populatedSyriacCells+=1;else totals.blankSyriacCells+=1;member.row.peshitta.gloss={gloss:display,source:'Murdock',tooltip:display?'Murdock 1851 · Syriac lexical alignment':'Murdock 1851 · no certified English equivalent assigned'};member.row.peshitta.provenance??={};member.row.peshitta.provenance.englishAlignment={authority:'James Murdock 1851',sourceReference:reference,unitId:unit.unitId,scope:'syriac-lexical-cell',englishIndices:indices,evidence:[...new Set(indices.map((index)=>placements[index].status))],sedraStatus:rowEvidence[rowIndex].sedraStatus,status:display?'adjudicated':'no-certified-equivalent'};for(const index of indices)wordRecords.push({englishIndex:index,english:englishWords[index].display,rowId:member.row.id,status:placements[index].status});}
  const expansions=[];for(const word of englishWords){if(placements[word.index])continue;totals.expansionWords+=1;const prior=placements.slice(0,word.index).map((placement,index)=>placement?{placement,index}:null).filter(Boolean).at(-1),nextOffset=placements.slice(word.index+1).findIndex(Boolean),next=nextOffset<0?null:{placement:placements[word.index+1+nextOffset],index:word.index+1+nextOffset},insertAfter=prior?rows[prior.placement.rowIndex].documentIndex:(next?rows[next.placement.rowIndex].documentIndex-1:-1),placement={authority:'James Murdock 1851',sourceReference:reference,unitId:unit.unitId,scope:'english-only-expansion',englishIndices:[word.index],evidence:['NO_UNIQUE_SYRIAC_LEXICAL_MATCH'],status:'translation-expansion'};expansions.push({insertAfter,index:word.index,row:emptyRow(reference,word.index,word,placement)});wordRecords.push({englishIndex:word.index,english:word.display,rowId:expansions.at(-1).row.id,status:'ENGLISH_ONLY_EXPANSION'});}
  for(const item of expansions.sort((a,b)=>b.insertAfter-a.insertAfter||b.index-a.index))document.rows.splice(item.insertAfter+1,0,item.row);
  const ordered=wordRecords.sort((a,b)=>a.englishIndex-b.englishIndex);if(ordered.length!==englishWords.length||ordered.some((record,index)=>record.englishIndex!==index))totals.failures+=1;
  for(const placement of placements){if(!placement)continue;if(placement.status==='SEDRA_LEXICAL_MATCH')totals.lexicallyAlignedWords+=1;else if(placement.status==='ETCBC_MORPHOLOGICAL_MATCH')totals.morphologicallyAlignedWords+=1;else if(placement.status==='INDEPENDENT_WITNESS_ROW_MATCH')totals.independentWitnessAlignedWords+=1;else if(placement.status==='MURDOCK_PHRASE_CONTEXT')totals.phraseContextWords+=1;}
  totals.displayReferences+=1;totals.syriacRows+=rows.length;totals.englishWords+=englishWords.length;decisions.push({unitId:unit.unitId,sourceReference:reference,displayReferences:[reference],syriacRows:rows.length,englishWords:englishWords.length,words:ordered});
}
if(totals.failures)throw new Error(`${totals.failures} units failed English accounting`);
const core={standard:'Every Murdock verse is independent and Murdock wording is preserved verbatim. Peshitta rows are processed in pinned Syriac source-token order. A deterministic dynamic program partitions the English sequence into zero-to-three-word phrases per Syriac token. SEDRA IV exact headword matches have first priority, pinned ETCBC/SyrNT morphology has second priority, and otherwise a word may accompany its source-ordered Murdock phrase parent with explicit MURDOCK_PHRASE_CONTEXT provenance; phrase context is never represented as lexical equivalence. Conflicts with explicit lexical or morphological evidence rank below unattested phrase context. Stable source order and fixed tie-breaking make identical inputs produce identical output. Words exceeding source capacity remain explicit English-only expansion rows. Parallel-corpus probability, cross-tradition voting, AI inference, generated translation, merged cells, continuation cells, arrows, and cross-verse spans are prohibited.',totals,decisions},adjudicationSha256=sha256(JSON.stringify(core));
for(const document of pendingFiles.values())for(const row of document.rows)if(row.peshitta?.provenance?.englishAlignment)row.peshitta.provenance.englishAlignment.adjudicationSha256=adjudicationSha256;
const ledger={status:'ADJUDICATED',generatedAt:new Date().toISOString(),standard:core.standard,authorities:{syriac:'Pinned scrollmapper Peshitta',english:manifest.translation,lexical:'SEDRA IV, Beth Mardutho'},sourceContentSha256:manifest.sourceContentSha256,sedraGeneratedAt:sedra.generatedAt,adjudicationSha256,totals,decisions};fs.writeFileSync(ledgerFile,`${JSON.stringify(ledger,null,2)}\n`);
if(apply){for(const [filename,document]of pendingFiles){fs.writeFileSync(filename,`${JSON.stringify(document,null,2)}\n`);totals.filesChanged+=1;}}
const application={status:apply?'APPLIED_ADJUDICATED':'DRY_RUN',generatedAt:new Date().toISOString(),adjudicationSha256,totals};application.reportSha256=sha256(JSON.stringify(application));fs.writeFileSync(applicationFile,`${JSON.stringify(application,null,2)}\n`);console.log(JSON.stringify(application,null,2));
