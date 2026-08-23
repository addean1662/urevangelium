import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(import.meta.dirname,'..');
const ledger=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/audits/peshitta-row-english-adjudication.json'),'utf8'));
const failures=[];
const totals={units:0,verseFiles:0,syriacRows:0,englishExpansionRows:0,englishWords:0,mergedCells:0,continuationCells:0,arrowGlyphs:0,crossVerseUnits:0,failures:0};
const ARROW_RE=/[←→↔↕↑↓⇄⇆⟷⟶⟵↳]/u;
function documentFor(reference){const m=reference.match(/^(matthew|mark|luke|john) (\d+):(\d+)$/u);if(!m)throw new Error(`Invalid reference: ${reference}`);return JSON.parse(fs.readFileSync(path.join(ROOT,'data',m[1],m[2],`${m[3]}.json`),'utf8'));}

for(const unit of ledger.decisions){
  totals.units+=1;
  if(unit.displayReferences.length!==1){totals.crossVerseUnits+=1;failures.push({unitId:unit.unitId,issue:'CROSS_VERSE_UNIT'});continue;}
  const reference=unit.displayReferences[0],document=documentFor(reference),byId=new Map(document.rows.map((row)=>[row.id,row]));totals.verseFiles+=1;
  const syriacRows=document.rows.filter((row)=>row.peshitta?.type==='text'),expansionRows=document.rows.filter((row)=>row.peshitta?.type==='translation');totals.syriacRows+=syriacRows.length;totals.englishExpansionRows+=expansionRows.length;
  const seen=[];
  for(const record of unit.words){const row=byId.get(record.rowId),cell=row?.peshitta;seen.push(record.englishIndex);totals.englishWords+=1;if(!row)failures.push({reference,rowId:record.rowId,issue:'MISSING_ROW'});else if(record.status==='ENGLISH_ONLY_EXPANSION'&&cell.type!=='translation')failures.push({reference,rowId:record.rowId,issue:'EXPANSION_NOT_DISTINCT'});else if(record.status!=='ENGLISH_ONLY_EXPANSION'&&cell.type!=='text')failures.push({reference,rowId:record.rowId,issue:'ALIGNED_WORD_NOT_ON_SYRIAC'});else if(cell.type==='translation'&&cell.provenance?.englishIndex!==record.englishIndex)failures.push({reference,rowId:record.rowId,issue:'EXPANSION_INDEX_PROVENANCE_MISMATCH'});else if(cell.type==='text'&&!cell.provenance?.englishAlignment?.englishIndices?.includes(record.englishIndex))failures.push({reference,rowId:record.rowId,issue:'INDEX_PROVENANCE_MISMATCH'});else if(cell.type==='text'&&cell.provenance.englishAlignment.adjudicationSha256!==ledger.adjudicationSha256)failures.push({reference,rowId:record.rowId,issue:'ADJUDICATION_SHA_MISMATCH'});}
  if(seen.length!==unit.englishWords||seen.sort((a,b)=>a-b).some((value,index)=>value!==index))failures.push({reference,issue:'ENGLISH_ACCOUNTING'});
  for(const row of [...syriacRows,...expansionRows]){const cell=row.peshitta;if(cell.gloss?.spanId){totals.mergedCells+=1;failures.push({reference,rowId:row.id,issue:'FORBIDDEN_SPAN'});}if(cell.gloss?.spanRole==='continuation'){totals.continuationCells+=1;failures.push({reference,rowId:row.id,issue:'FORBIDDEN_CONTINUATION'});}if(ARROW_RE.test(cell.gloss?.gloss??'')||ARROW_RE.test(cell.gloss?.tooltip??'')){totals.arrowGlyphs+=1;failures.push({reference,rowId:row.id,issue:'FORBIDDEN_ARROW'});}if(cell.type==='translation'&&(cell.text||!row.id.startsWith('peshitta-english-')||row.rowKind!=='translation-expansion'))failures.push({reference,rowId:row.id,issue:'INVALID_EXPANSION_SHAPE'});}
}
totals.failures=failures.length;
const passed=!failures.length&&totals.units===3779&&totals.verseFiles===3779&&totals.syriacRows===ledger.totals.syriacRows&&totals.englishWords===ledger.totals.englishWords&&totals.crossVerseUnits===0;
console.log(JSON.stringify({status:passed?'CERTIFIED':'FAILED',adjudicationSha256:ledger.adjudicationSha256,totals,failures:failures.slice(0,30)},null,2));if(!passed)process.exitCode=1;
