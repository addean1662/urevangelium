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
const WORD_RE = /[A-Za-z]+(?:['â€™][A-Za-z]+)*/gu;
const FUNCTION_WORDS = new Set(['a','an','the','and','or','but','nor','of','to','in','on','at','by','for','from','with','as','than','that','this','these','those','who','whom','which','what','when','where','how','i','we','you','he','she','it','they','me','us','him','her','them','my','our','your','thy','his','their','be','have','do','will','shall','not','no','all','any','some','one','there','here','then']);
const SEMANTIC_GROUPS = [['think','contemplate','ponder','imagine'],['beget','conceive','generate','bear','birth','nativity','generation','genealogy','origin'],['say','speak','announce','affirm'],['see','appear','behold','visible','perceive'],['receive','take'],['fear','afraid'],['wife','woman'],['pharez','perez','phares'],['abia','abijah'],['zebulon','zebulun'],['raka','raca']];
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
  '\u0715\u071d\u0722':['but','and','then'], '\u0718\u0715\u071d\u0722':['and','but'],
  '\u0717\u0718':['he','it','be'], '\u0717\u071d':['she','it','be'], '\u0717\u0722\u0718\u0722':['they'],
  '\u0710\u0722':['if'], '\u0710\u0720\u0710':['but','unless'], '\u0710\u0726':['also','even'],
  '\u071f\u0720':['all','every'], '\u071a\u0715':['one'], '\u072c\u0718\u0712':['again'],
  '\u0717\u072a\u071f\u0710':['here'], '\u072c\u0721\u0722':['there'], '\u0717\u071d\u0715\u071d\u0722':['then'],
  '\u0710\u071d\u071f':['as','like'], '\u0721\u071b\u0720\u0717\u0722\u0710':['therefore']
}));
const SYRIAC_FUNCTION_CAPACITY = new Map([['\u0720\u0717',2],['\u0720\u0717\u0718\u0722',2],['\u0718\u0720\u0710',2],['\u0718\u071f\u0715',2],['\u0712\u0717',2],['\u0718\u0715\u071d\u0722',2]]);
const IRREGULAR = new Map(Object.entries({am:'be',is:'be',are:'be',was:'be',were:'be',been:'be',being:'be',art:'be',wast:'be',has:'have',hath:'have',had:'have',does:'do',doth:'do',did:'do',done:'do',says:'say',saith:'say',said:'say',saw:'see',seen:'see',came:'come',went:'go',gone:'go',gave:'give',given:'give',made:'make',knew:'know',known:'know',brought:'bring',thought:'think',told:'tell',sent:'send',wrote:'write',written:'write',rose:'rise',risen:'rise',begat:'beget',begot:'beget',begotten:'beget',born:'bear',contemplated:'contemplate',conceived:'conceive',appeared:'appear',men:'man',women:'woman',children:'child',brethren:'brother',feet:'foot',me:'i',my:'i',mine:'i',us:'we',our:'we',ours:'we',thee:'you',thou:'you',thy:'you',thine:'you',ye:'you',him:'he',his:'he',her:'she',them:'they',their:'they'}));

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
function morphologyTerms(m){const r=new Set();if(!m)return r;const p=m.prefix??'';if(p.includes('\u0718'))r.add('and');if(p.includes('\u0715'))for(const w of ['of','that','which','who'])r.add(w);if(p.includes('\u0720'))for(const w of ['to','for'])r.add(w);if(p.includes('\u0712'))for(const w of ['in','by','with'])r.add(w);const ps=m.sfps!=='NA'?m.sfps:m.sp==='verb'?m.ps:'NA',gn=m.sfps!=='NA'?m.sfgn:m.gn,nu=m.sfps!=='NA'?m.sfnu:m.nu;if(ps==='1')for(const w of nu==='p'?['we','us','our']:['i','me','my'])r.add(w);if(ps==='2')for(const w of ['you','thou','thee','thy','ye'])r.add(w);if(ps==='3')for(const w of nu==='p'?['they','them','their']:gn==='f'?['she','her']:['he','him','his'])r.add(w);if(m.sp==='verb'&&(m.vt==='participle'||['ethpeal','ethpaal','ettaphal'].includes(m.vs)))for(const w of ['be','is','was','were','been'])r.add(w);if(m.sp==='verb'&&m.vt==='imperfect')for(const w of ['will','shall'])r.add(w);return r;}
function evidenceFor(row, reference) {
  const record = sedraByToken.get(row.peshitta.text);
  const lexicalSurfaces = (record?.analyses ?? []).flatMap((analysis) => analysis.englishGlosses ?? []);
  const atomicTerms=terms(lexicalSurfaces.map((surface)=>surface.trim().match(/^(?:to )?([A-Za-z]+)[.!?]?$/u)?.[1]).filter(Boolean));
  const morphologyRecord=morphologyByRow.get(`${reference}#${row.id}`);
  return { lexical: atomicTerms, morphology:morphologyTerms(morphologyRecord?.morphology), morphologyRecord, sedraStatus: record?.status ?? 'MISSING' };
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
  const overflow=Math.max(0,englishWords.length-sourceOrder.length*3);
  let states=new Map([['0:0',{score:0,englishIndex:0,skipped:0,groups:[]}]]);
  for(let rank=0;rank<sourceOrder.length;rank+=1){const rowIndex=sourceOrder[rank],next=new Map(),remainingRows=sourceOrder.length-rank-1;for(const state of states.values())for(let skip=0;skip<=overflow-state.skipped&&state.englishIndex+skip<=englishWords.length;skip+=1)for(let take=0;take<=3&&state.englishIndex+skip+take<=englishWords.length;take+=1){const englishIndex=state.englishIndex+skip,skipped=state.skipped+skip,remainingWords=englishWords.length-englishIndex-take-(overflow-skipped);if(remainingWords<0||remainingWords>remainingRows*3)continue;let score=state.score;for(let offset=0;offset<skip;offset+=1)score-=candidates[state.englishIndex+offset].length?100000:1;for(let offset=0;offset<take;offset+=1){const wordIndex=englishIndex+offset,match=candidates[wordIndex].find((candidate)=>candidate.rowIndex===rowIndex);score+=match?.lexical?10000:match?.morphological?1000:candidates[wordIndex].length?-10000:0;score-=Math.abs((wordIndex/(Math.max(1,englishWords.length-1)))-(rank/(Math.max(1,sourceOrder.length-1))));}const candidate={score,englishIndex:englishIndex+take,skipped,groups:[...state.groups,{rowIndex,start:englishIndex,take}]},key=`${candidate.englishIndex}:${skipped}`;if(!next.has(key)||next.get(key).score<candidate.score)next.set(key,candidate);}states=next;}
  const solution=states.get(`${englishWords.length}:${overflow}`);
  if(solution)for(const group of solution.groups)for(let offset=0;offset<group.take;offset+=1){const wordIndex=group.start+offset,match=candidates[wordIndex].find((candidate)=>candidate.rowIndex===group.rowIndex),status=match?.lexical?'SEDRA_LEXICAL_MATCH':match?.morphological?'ETCBC_MORPHOLOGICAL_MATCH':'MURDOCK_PHRASE_CONTEXT';placements[wordIndex]={...(match??{rowIndex:group.rowIndex,lexical:false,morphological:false,sourceRank:sourceRank.get(group.rowIndex)}),status};assigned.get(group.rowIndex).push(wordIndex);}
  for(const indices of assigned.values())indices.sort((a,b)=>a-b);
  return {assigned,placements,rowEvidence};
}

function emptyRow(reference,index,word,placement){const p=parseReference(reference),empty={type:'empty'};return{id:`peshitta-english-${p.gospel}-${p.chapter}-${p.verse}-${index+1}`,rowKind:'translation-expansion',papyrus:empty,coptic:empty,sinaiticus:empty,vaticanus:empty,vulgate:empty,peshitta:{type:'translation',gloss:{gloss:word.display,source:'Murdock',tooltip:'Murdock 1851 · English-only expansion; no certified Syriac lexical equivalent'},provenance:{authority:placement.authority,sourceReference:reference,englishIndex:index,alignmentGroupId:`${placement.unitId}#english-${index+1}`,status:'published-translation-row'}},byzantine:empty,bezae:empty};}

const units=Object.values(manifest.units).filter((unit,index,all)=>all.findIndex((candidate)=>candidate.unitId===unit.unitId)===index);
const pendingFiles=new Map(),decisions=[];
const totals={units:units.length,displayReferences:0,syriacRows:0,englishWords:0,lexicallyAlignedWords:0,morphologicallyAlignedWords:0,phraseContextWords:0,expansionWords:0,populatedSyriacCells:0,blankSyriacCells:0,filesChanged:0,failures:0};
for(const unit of units){
  if(unit.displayReferences.length!==1)throw new Error(`${unit.unitId}: cross-verse unit prohibited`);
  const reference=unit.displayReferences[0],filename=fileFor(reference),document=pendingFiles.get(filename)??JSON.parse(fs.readFileSync(filename,'utf8'));pendingFiles.set(filename,document);document.rows=document.rows.filter((row)=>!row.id.startsWith('peshitta-english-'));
  const rows=document.rows.map((row,documentIndex)=>({row,documentIndex})).filter(({row})=>row.peshitta?.type==='text'),englishWords=words(unit.english);
  const {assigned,placements,rowEvidence}=assignEnglish(rows,englishWords,reference);
  const wordRecords=[];
  for(let rowIndex=0;rowIndex<rows.length;rowIndex+=1){const member=rows[rowIndex],indices=assigned.get(rowIndex),display=indices.map((index)=>englishWords[index].display).join(' ').trim();if(display)totals.populatedSyriacCells+=1;else totals.blankSyriacCells+=1;member.row.peshitta.gloss={gloss:display,source:'Murdock',tooltip:display?'Murdock 1851 · Syriac lexical alignment':'Murdock 1851 · no certified English equivalent assigned'};member.row.peshitta.provenance??={};member.row.peshitta.provenance.englishAlignment={authority:'James Murdock 1851',sourceReference:reference,unitId:unit.unitId,scope:'syriac-lexical-cell',englishIndices:indices,evidence:[...new Set(indices.map((index)=>placements[index].status))],sedraStatus:rowEvidence[rowIndex].sedraStatus,status:display?'adjudicated':'no-certified-equivalent'};for(const index of indices)wordRecords.push({englishIndex:index,english:englishWords[index].display,rowId:member.row.id,status:placements[index].status});}
  const expansions=[];for(const word of englishWords){if(placements[word.index])continue;totals.expansionWords+=1;const prior=placements.slice(0,word.index).map((placement,index)=>placement?{placement,index}:null).filter(Boolean).at(-1),nextOffset=placements.slice(word.index+1).findIndex(Boolean),next=nextOffset<0?null:{placement:placements[word.index+1+nextOffset],index:word.index+1+nextOffset},insertAfter=prior?rows[prior.placement.rowIndex].documentIndex:(next?rows[next.placement.rowIndex].documentIndex-1:-1),placement={authority:'James Murdock 1851',sourceReference:reference,unitId:unit.unitId,scope:'english-only-expansion',englishIndices:[word.index],evidence:['NO_UNIQUE_SYRIAC_LEXICAL_MATCH'],status:'translation-expansion'};expansions.push({insertAfter,index:word.index,row:emptyRow(reference,word.index,word,placement)});wordRecords.push({englishIndex:word.index,english:word.display,rowId:expansions.at(-1).row.id,status:'ENGLISH_ONLY_EXPANSION'});}
  for(const item of expansions.sort((a,b)=>b.insertAfter-a.insertAfter||b.index-a.index))document.rows.splice(item.insertAfter+1,0,item.row);
  const ordered=wordRecords.sort((a,b)=>a.englishIndex-b.englishIndex);if(ordered.length!==englishWords.length||ordered.some((record,index)=>record.englishIndex!==index))totals.failures+=1;
  for(const placement of placements){if(!placement)continue;if(placement.status==='SEDRA_LEXICAL_MATCH')totals.lexicallyAlignedWords+=1;else if(placement.status==='ETCBC_MORPHOLOGICAL_MATCH')totals.morphologicallyAlignedWords+=1;else if(placement.status==='MURDOCK_PHRASE_CONTEXT')totals.phraseContextWords+=1;}
  totals.displayReferences+=1;totals.syriacRows+=rows.length;totals.englishWords+=englishWords.length;decisions.push({unitId:unit.unitId,sourceReference:reference,displayReferences:[reference],syriacRows:rows.length,englishWords:englishWords.length,words:ordered});
}
if(totals.failures)throw new Error(`${totals.failures} units failed English accounting`);
const core={standard:'Every Murdock verse is independent and Murdock wording is preserved verbatim. Peshitta rows are processed in pinned Syriac source-token order. A deterministic dynamic program partitions the English sequence into zero-to-three-word phrases per Syriac token. SEDRA IV exact headword matches have first priority, pinned ETCBC/SyrNT morphology has second priority, and otherwise a word may accompany its source-ordered Murdock phrase parent with explicit MURDOCK_PHRASE_CONTEXT provenance; phrase context is never represented as lexical equivalence. Conflicts with explicit lexical or morphological evidence rank below unattested phrase context. Stable source order and fixed tie-breaking make identical inputs produce identical output. Words exceeding source capacity remain explicit English-only expansion rows. Parallel-corpus probability, cross-tradition voting, AI inference, generated translation, merged cells, continuation cells, arrows, and cross-verse spans are prohibited.',totals,decisions},adjudicationSha256=sha256(JSON.stringify(core));
for(const document of pendingFiles.values())for(const row of document.rows)if(row.peshitta?.provenance?.englishAlignment)row.peshitta.provenance.englishAlignment.adjudicationSha256=adjudicationSha256;
const ledger={status:'ADJUDICATED',generatedAt:new Date().toISOString(),standard:core.standard,authorities:{syriac:'Pinned scrollmapper Peshitta',english:manifest.translation,lexical:'SEDRA IV, Beth Mardutho'},sourceContentSha256:manifest.sourceContentSha256,sedraGeneratedAt:sedra.generatedAt,adjudicationSha256,totals,decisions};fs.writeFileSync(ledgerFile,`${JSON.stringify(ledger,null,2)}\n`);
if(apply){for(const [filename,document]of pendingFiles){fs.writeFileSync(filename,`${JSON.stringify(document,null,2)}\n`);totals.filesChanged+=1;}}
const application={status:apply?'APPLIED_ADJUDICATED':'DRY_RUN',generatedAt:new Date().toISOString(),adjudicationSha256,totals};application.reportSha256=sha256(JSON.stringify(application));fs.writeFileSync(applicationFile,`${JSON.stringify(application,null,2)}\n`);console.log(JSON.stringify(application,null,2));
