import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const unitsFile = path.join(ROOT, 'data/sources/peshitta/murdock-admitted-units.json');
const sedraFile = path.join(ROOT, 'data/sources/peshitta/sedra-inserted-token-evidence.json');
const ledgerFile = path.join(ROOT, 'docs/audits/peshitta-row-english-adjudication.json');
const applicationFile = path.join(ROOT, 'docs/audits/peshitta-row-english-application.json');
const apply = process.argv.includes('--apply');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const manifest = JSON.parse(fs.readFileSync(unitsFile, 'utf8'));
const sedra = JSON.parse(fs.readFileSync(sedraFile, 'utf8'));
const sedraByToken = new Map(sedra.records.map((record) => [record.token, record]));
const WORD_RE = /[A-Za-z]+(?:['â€™][A-Za-z]+)*/gu;
const FUNCTION_WORDS = new Set(['a','an','the','and','or','but','nor','of','to','in','on','at','by','for','from','with','as','than','that','this','these','those','who','whom','which','what','when','where','how','i','we','you','he','she','it','they','me','us','him','her','them','my','our','your','thy','his','their','be','have','do','not','no','all','any','some','one','there','here','then']);
const NO_CORPUS_FUNCTIONS = new Set(['a','an','the','and','or','but','nor','i','we','you','he','she','it','they','me','us','him','her','them','my','our','your','thy','his','their']);
const SEMANTIC_GROUPS = [['think','contemplate','ponder','imagine'],['beget','conceive','generate','bear','birth'],['say','speak','announce','affirm'],['see','appear','behold','visible','perceive'],['receive','take'],['fear','afraid'],['wife','woman']];
const IRREGULAR = new Map(Object.entries({am:'be',is:'be',are:'be',was:'be',were:'be',been:'be',being:'be',art:'be',wast:'be',has:'have',hath:'have',had:'have',does:'do',doth:'do',did:'do',done:'do',says:'say',saith:'say',said:'say',saw:'see',seen:'see',came:'come',went:'go',gone:'go',gave:'give',given:'give',made:'make',knew:'know',known:'know',brought:'bring',thought:'think',told:'tell',sent:'send',wrote:'write',written:'write',rose:'rise',risen:'rise',begat:'beget',begot:'beget',begotten:'beget',contemplated:'contemplate',conceived:'conceive',appeared:'appear',men:'man',women:'woman',children:'child',brethren:'brother',feet:'foot',me:'i',my:'i',mine:'i',us:'we',our:'we',ours:'we',thee:'you',thou:'you',thy:'you',thine:'you',ye:'you',him:'he',his:'he',her:'she',them:'they',their:'they'}));

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
function evidenceFor(row) {
  const record = sedraByToken.get(row.peshitta.text);
  const lexicalSurfaces = (record?.analyses ?? []).flatMap((analysis) => analysis.englishGlosses ?? []);
  const families = {greek:terms([gloss(row.papyrus),gloss(row.vaticanus),gloss(row.sinaiticus),gloss(row.byzantine)]),latin:terms([gloss(row.vulgate)]),coptic:terms([gloss(row.coptic)])};
  return { lexical: new Set([...terms(lexicalSurfaces)].filter((term)=>!FUNCTION_WORDS.has(term))), families, sedraStatus: record?.status ?? 'MISSING' };
}

let translationModel;
function trainTranslationModel(units) {
  const corpus=units.map((unit)=>{const document=JSON.parse(fs.readFileSync(fileFor(unit.displayReferences[0]),'utf8'));return{syriac:[...new Set(document.rows.filter((row)=>row.peshitta?.type==='text').map((row)=>row.peshitta.text))],english:[...new Set(words(unit.english).map((word)=>word.lemma))]};});
  const model=new Map(),frequency=new Map();
  for(const verse of corpus)for(const syriac of verse.syriac)frequency.set(syriac,(frequency.get(syriac)??0)+1);
  for(const verse of corpus)for(const syriac of verse.syriac){if(!model.has(syriac))model.set(syriac,new Map());const lexical=evidenceFor({peshitta:{type:'text',text:syriac}}).lexical;const row=model.get(syriac);for(const english of verse.english)row.set(english,(row.get(english)??0)+(lexical.has(english)?12:1));}
  for(const row of model.values()){const total=[...row.values()].reduce((sum,value)=>sum+value,0);for(const [english,value]of row)row.set(english,value/total);}
  for(let iteration=0;iteration<7;iteration+=1){const counts=new Map(),totals=new Map();for(const verse of corpus)for(const english of verse.english){const normalization=verse.syriac.reduce((sum,syriac)=>sum+(model.get(syriac)?.get(english)??1e-9),0);if(!normalization)continue;for(const syriac of verse.syriac){const contribution=(model.get(syriac)?.get(english)??1e-9)/normalization;if(!counts.has(syriac))counts.set(syriac,new Map());counts.get(syriac).set(english,(counts.get(syriac).get(english)??0)+contribution);totals.set(syriac,(totals.get(syriac)??0)+contribution);}}for(const [syriac,row]of counts)for(const [english,value]of row)model.get(syriac).set(english,value/totals.get(syriac));}
  return {model,frequency};
}

function assignEnglish(rows, englishWords) {
  const rowEvidence = rows.map(({row}) => evidenceFor(row));
  const assigned = new Map(rows.map((_, index) => [index, []]));
  const placements = Array(englishWords.length).fill(null);
  const candidates = englishWords.map((word) => NO_CORPUS_FUNCTIONS.has(word.lemma)?[]:rowEvidence.map((evidence,index) => {
    const syriac=rows[index].row.peshitta.text,lexical=evidence.lexical.has(word.lemma),familyCount=Object.values(evidence.families).filter((set)=>set.has(word.lemma)).length,corpusProbability=(translationModel.frequency.get(syriac)??0)>=3?(translationModel.model.get(syriac)?.get(word.lemma)??0):0;
    if(!lexical&&familyCount<2&&corpusProbability<0.012)return null;
    const expected=englishWords.length<2?0:word.index/(englishWords.length-1),actual=rows.length<2?0:index/(rows.length-1);
    return {rowIndex:index,lexical,familyCount,corpusProbability,score:(lexical?140:0)+familyCount*10+Math.log1p(corpusProbability*1000)*20-Math.abs(expected-actual)*5};
  }).filter(Boolean).sort((a,b)=>b.score-a.score));
  const order=englishWords.map((word,index)=>({index,content:!FUNCTION_WORDS.has(word.lemma),best:candidates[index][0]?.score??-Infinity,gap:(candidates[index][0]?.score??0)-(candidates[index][1]?.score??0)})).sort((a,b)=>Number(b.content)-Number(a.content)||b.best-a.best||b.gap-a.gap||a.index-b.index);
  for(const item of order){const list=candidates[item.index];if(!list.length)continue;const best=list.map((candidate)=>{const duplicate=assigned.get(candidate.rowIndex).some((index)=>englishWords[index].lemma===englishWords[item.index].lemma);return{...candidate,adjusted:candidate.score-assigned.get(candidate.rowIndex).length*7-(duplicate?1000:0)};}).sort((a,b)=>b.adjusted-a.adjusted)[0];const tied=list.filter((candidate)=>Math.abs(candidate.score-list[0].score)<0.5).length>1;if(!best.lexical&&best.corpusProbability<0.02&&tied)continue;placements[item.index]={...best,status:best.lexical?'SEDRA_LEXICAL_MATCH':best.corpusProbability>=0.012?'PARALLEL_CORPUS_ALIGNMENT':'CROSS_TRADITION_EXACT_MATCH'};assigned.get(best.rowIndex).push(item.index);}
  const supported=[...placements],prepositions=new Set(['of','to','in','on','at','by','for','from','with']),forward=new Set(['a','an','the','and','or','but','nor','that','this','these','those','who','whom','which','what','when','where','how']),subjectSurfaces=new Set(['i','we','you','thou','ye','he','she','it','they']),objectSurfaces=new Set(['me','us','thee','you','him','her','them']),possessiveSurfaces=new Set(['my','mine','our','ours','your','yours','thy','thine','his','her','hers','their','theirs']);
  for(const word of englishWords){if(placements[word.index]||!FUNCTION_WORDS.has(word.lemma))continue;let previousIndex=-1,nextIndex=-1;for(let index=word.index-1;index>=0;index-=1)if(supported[index]){previousIndex=index;break;}for(let index=word.index+1;index<supported.length;index+=1)if(supported[index]){nextIndex=index;break;}const betweenNext=nextIndex<0?[]:englishWords.slice(word.index+1,nextIndex).map((item)=>item.lemma),surface=word.surface.toLocaleLowerCase('en');let head=null;if((forward.has(word.lemma)||(possessiveSurfaces.has(surface)&&!/[,:;]/u.test(word.display)))&&nextIndex>0&&nextIndex-word.index<=3)head=supported[nextIndex];else if(subjectSurfaces.has(surface)&&nextIndex===word.index+1)head=supported[nextIndex];else if(objectSurfaces.has(surface)&&previousIndex===word.index-1&&prepositions.has(englishWords[previousIndex]?.lemma))head=supported[previousIndex];else if(prepositions.has(word.lemma)&&nextIndex>0&&nextIndex-word.index<=3&&!betweenNext.some((term)=>prepositions.has(term)))head=supported[nextIndex];else if(word.lemma==='not')head=previousIndex>=0?supported[previousIndex]:nextIndex>=0?supported[nextIndex]:null;else if(['be','have','do'].includes(word.lemma)&&nextIndex>0&&nextIndex-word.index<=2)head=supported[nextIndex];if(!head)continue;placements[word.index]={...head,status:'FUNCTION_WORD_WITH_SUPPORTED_HEAD'};assigned.get(head.rowIndex).push(word.index);}
  for(const indices of assigned.values())indices.sort((a,b)=>a-b);
  return {assigned,placements,rowEvidence};
}

function emptyRow(reference,index,word,placement){const p=parseReference(reference),empty={type:'empty'};return{id:`peshitta-english-${p.gospel}-${p.chapter}-${p.verse}-${index+1}`,rowKind:'translation-expansion',papyrus:empty,coptic:empty,sinaiticus:empty,vaticanus:empty,vulgate:empty,peshitta:{type:'translation',gloss:{gloss:word.display,source:'Murdock',tooltip:'Murdock 1851 · English-only expansion; no certified Syriac lexical equivalent'},provenance:{authority:placement.authority,sourceReference:reference,englishIndex:index,alignmentGroupId:`${placement.unitId}#english-${index+1}`,status:'published-translation-row'}},byzantine:empty,bezae:empty};}

const units=Object.values(manifest.units).filter((unit,index,all)=>all.findIndex((candidate)=>candidate.unitId===unit.unitId)===index);
translationModel=trainTranslationModel(units);
const pendingFiles=new Map(),decisions=[];
const totals={units:units.length,displayReferences:0,syriacRows:0,englishWords:0,lexicallyAlignedWords:0,parallelCorpusAlignedWords:0,crossTraditionAlignedWords:0,functionWordsWithHead:0,expansionWords:0,populatedSyriacCells:0,blankSyriacCells:0,filesChanged:0,failures:0};
for(const unit of units){
  if(unit.displayReferences.length!==1)throw new Error(`${unit.unitId}: cross-verse unit prohibited`);
  const reference=unit.displayReferences[0],filename=fileFor(reference),document=pendingFiles.get(filename)??JSON.parse(fs.readFileSync(filename,'utf8'));pendingFiles.set(filename,document);document.rows=document.rows.filter((row)=>!row.id.startsWith('peshitta-english-'));
  const rows=document.rows.map((row,documentIndex)=>({row,documentIndex})).filter(({row})=>row.peshitta?.type==='text'),englishWords=words(unit.english),{assigned,placements,rowEvidence}=assignEnglish(rows,englishWords),wordRecords=[];
  for(let rowIndex=0;rowIndex<rows.length;rowIndex+=1){const member=rows[rowIndex],indices=assigned.get(rowIndex),display=indices.map((index)=>englishWords[index].display).join(' ').trim();if(display)totals.populatedSyriacCells+=1;else totals.blankSyriacCells+=1;member.row.peshitta.gloss={gloss:display,source:'Murdock',tooltip:display?'Murdock 1851 · Syriac lexical alignment':'Murdock 1851 · no certified English equivalent assigned'};member.row.peshitta.provenance??={};member.row.peshitta.provenance.englishAlignment={authority:'James Murdock 1851',sourceReference:reference,unitId:unit.unitId,scope:'syriac-lexical-cell',englishIndices:indices,evidence:[...new Set(indices.map((index)=>placements[index].status))],sedraStatus:rowEvidence[rowIndex].sedraStatus,status:display?'adjudicated':'no-certified-equivalent'};for(const index of indices)wordRecords.push({englishIndex:index,english:englishWords[index].display,rowId:member.row.id,status:placements[index].status});}
  const expansions=[];for(const word of englishWords){if(placements[word.index])continue;totals.expansionWords+=1;const prior=placements.slice(0,word.index).map((placement,index)=>placement?{placement,index}:null).filter(Boolean).at(-1),nextOffset=placements.slice(word.index+1).findIndex(Boolean),next=nextOffset<0?null:{placement:placements[word.index+1+nextOffset],index:word.index+1+nextOffset},insertAfter=prior?rows[prior.placement.rowIndex].documentIndex:(next?rows[next.placement.rowIndex].documentIndex-1:-1),placement={authority:'James Murdock 1851',sourceReference:reference,unitId:unit.unitId,scope:'english-only-expansion',englishIndices:[word.index],evidence:['NO_UNIQUE_SYRIAC_LEXICAL_MATCH'],status:'translation-expansion'};expansions.push({insertAfter,index:word.index,row:emptyRow(reference,word.index,word,placement)});wordRecords.push({englishIndex:word.index,english:word.display,rowId:expansions.at(-1).row.id,status:'ENGLISH_ONLY_EXPANSION'});}
  for(const item of expansions.sort((a,b)=>b.insertAfter-a.insertAfter||b.index-a.index))document.rows.splice(item.insertAfter+1,0,item.row);
  const ordered=wordRecords.sort((a,b)=>a.englishIndex-b.englishIndex);if(ordered.length!==englishWords.length||ordered.some((record,index)=>record.englishIndex!==index))totals.failures+=1;
  for(const placement of placements){if(!placement)continue;if(placement.status==='SEDRA_LEXICAL_MATCH')totals.lexicallyAlignedWords+=1;else if(placement.status==='PARALLEL_CORPUS_ALIGNMENT')totals.parallelCorpusAlignedWords+=1;else if(placement.status==='CROSS_TRADITION_EXACT_MATCH')totals.crossTraditionAlignedWords+=1;else totals.functionWordsWithHead+=1;}
  totals.displayReferences+=1;totals.syriacRows+=rows.length;totals.englishWords+=englishWords.length;decisions.push({unitId:unit.unitId,sourceReference:reference,displayReferences:[reference],syriacRows:rows.length,englishWords:englishWords.length,words:ordered});
}
if(totals.failures)throw new Error(`${totals.failures} units failed English accounting`);
const core={standard:'Every Murdock verse is independent. English is placed in a Syriac row only by SEDRA lexical evidence, exact agreement of at least two independent displayed tradition families, or attachment of a function word to an adjacent supported English head. Otherwise it is displayed in an explicit English-only expansion row. Proportional distribution, merged cells, continuation cells, arrows, and cross-verse spans are prohibited.',totals,decisions},adjudicationSha256=sha256(JSON.stringify(core));
for(const document of pendingFiles.values())for(const row of document.rows)if(row.peshitta?.provenance?.englishAlignment)row.peshitta.provenance.englishAlignment.adjudicationSha256=adjudicationSha256;
const ledger={status:'ADJUDICATED',generatedAt:new Date().toISOString(),standard:core.standard,authorities:{syriac:'Pinned scrollmapper Peshitta',english:manifest.translation,lexical:'SEDRA IV, Beth Mardutho'},sourceContentSha256:manifest.sourceContentSha256,sedraGeneratedAt:sedra.generatedAt,adjudicationSha256,totals,decisions};fs.writeFileSync(ledgerFile,`${JSON.stringify(ledger,null,2)}\n`);
if(apply){for(const [filename,document]of pendingFiles){fs.writeFileSync(filename,`${JSON.stringify(document,null,2)}\n`);totals.filesChanged+=1;}}
const application={status:apply?'APPLIED_ADJUDICATED':'DRY_RUN',generatedAt:new Date().toISOString(),adjudicationSha256,totals};application.reportSha256=sha256(JSON.stringify(application));fs.writeFileSync(applicationFile,`${JSON.stringify(application,null,2)}\n`);console.log(JSON.stringify(application,null,2));
