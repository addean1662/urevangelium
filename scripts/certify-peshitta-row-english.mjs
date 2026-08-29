import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(import.meta.dirname,'..');
const ledger=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/audits/peshitta-row-english-adjudication.json'),'utf8'));
const failures=[];
const totals={units:0,verseFiles:0,syriacRows:0,englishExpansionRows:0,englishWords:0,blankSyriacRows:0,unavoidableBlankSyriacRows:0,leadingExpansionRows:0,noncontiguousCells:0,displayOrderDifferences:0,absorbableExpansionRows:0,mergedCells:0,continuationCells:0,arrowGlyphs:0,crossVerseUnits:0,failures:0};
const ARROW_RE=/[←→↔↕↑↓⇄⇆⟷⟶⟵↳]/u;
function documentFor(reference){const m=reference.match(/^(matthew|mark|luke|john) (\d+):(\d+)$/u);if(!m)throw new Error(`Invalid reference: ${reference}`);return JSON.parse(fs.readFileSync(path.join(ROOT,'data',m[1],m[2],`${m[3]}.json`),'utf8'));}

for(const unit of ledger.decisions){
  totals.units+=1;
  if(unit.displayReferences.length!==1){totals.crossVerseUnits+=1;failures.push({unitId:unit.unitId,issue:'CROSS_VERSE_UNIT'});continue;}
  const reference=unit.displayReferences[0],document=documentFor(reference),byId=new Map(document.rows.map((row)=>[row.id,row]));totals.verseFiles+=1;
  const syriacRows=document.rows.filter((row)=>row.peshitta?.type==='text'),expansionRows=document.rows.filter((row)=>row.peshitta?.type==='translation');totals.syriacRows+=syriacRows.length;totals.englishExpansionRows+=expansionRows.length;
  const blankSyriacRows=syriacRows.filter((row)=>(row.peshitta?.provenance?.englishAlignment?.englishIndices?.length??0)===0);totals.blankSyriacRows+=blankSyriacRows.length;const unavoidableBlankSyriacRows=Math.max(0,syriacRows.length-unit.englishWords);totals.unavoidableBlankSyriacRows+=unavoidableBlankSyriacRows;if(blankSyriacRows.length!==unavoidableBlankSyriacRows)failures.push({reference,issue:'AVOIDABLE_BLANK_SYRIAC_PARENT',actual:blankSyriacRows.length,unavoidable:unavoidableBlankSyriacRows});
  const displayedRows=document.rows.filter((row)=>row.peshitta?.type==='text'||row.peshitta?.type==='translation'),displayedIndices=[];
  if(displayedRows[0]?.peshitta?.type==='translation'){totals.leadingExpansionRows+=1;failures.push({reference,rowId:displayedRows[0].id,issue:'LEADING_ENGLISH_ONLY_ROW'});}
  for(let displayIndex=0;displayIndex<displayedRows.length;displayIndex+=1){const row=displayedRows[displayIndex],cell=row.peshitta,indices=cell.type==='text'?(cell.provenance?.englishAlignment?.englishIndices??[]):[cell.provenance?.englishIndex];if(indices.some((value,index)=>index>0&&value!==indices[index-1]+1)){totals.noncontiguousCells+=1;failures.push({reference,rowId:row.id,issue:'NONCONTIGUOUS_ENGLISH_PHRASE',indices});}displayedIndices.push(...indices);if(cell.type==='translation'){const previous=displayedRows[displayIndex-1]?.peshitta,next=displayedRows[displayIndex+1]?.peshitta,previousCount=previous?.type==='text'?(previous.provenance?.englishAlignment?.englishIndices?.length??0):3,nextCount=next?.type==='text'?(next.provenance?.englishAlignment?.englishIndices?.length??0):3;if(previousCount<3||nextCount<3){totals.absorbableExpansionRows+=1;failures.push({reference,rowId:row.id,issue:'ABSORBABLE_ENGLISH_ONLY_ROW'});}}}
  // Cross-row Murdock order is diagnostic only: semantic shared-row placement
  // may legitimately reorder Syriac parents. Per-cell contiguity and complete
  // Murdock accounting remain mandatory above and below.
  if(displayedIndices.some((value,index)=>index>0&&value<displayedIndices[index-1]))totals.displayOrderDifferences+=1;
  const seen=[];
  for(const record of unit.words){const row=byId.get(record.rowId),cell=row?.peshitta;seen.push(record.englishIndex);totals.englishWords+=1;if(!row)failures.push({reference,rowId:record.rowId,issue:'MISSING_ROW'});else if(record.status==='ENGLISH_ONLY_EXPANSION'&&cell.type!=='translation')failures.push({reference,rowId:record.rowId,issue:'EXPANSION_NOT_DISTINCT'});else if(record.status!=='ENGLISH_ONLY_EXPANSION'&&cell.type!=='text')failures.push({reference,rowId:record.rowId,issue:'ALIGNED_WORD_NOT_ON_SYRIAC'});else if(cell.type==='translation'&&cell.provenance?.englishIndex!==record.englishIndex)failures.push({reference,rowId:record.rowId,issue:'EXPANSION_INDEX_PROVENANCE_MISMATCH'});else if(cell.type==='text'&&!cell.provenance?.englishAlignment?.englishIndices?.includes(record.englishIndex))failures.push({reference,rowId:record.rowId,issue:'INDEX_PROVENANCE_MISMATCH'});else if(cell.type==='text'&&cell.provenance.englishAlignment.adjudicationSha256!==ledger.adjudicationSha256)failures.push({reference,rowId:record.rowId,issue:'ADJUDICATION_SHA_MISMATCH'});}
  if(seen.length!==unit.englishWords||seen.sort((a,b)=>a-b).some((value,index)=>value!==index))failures.push({reference,issue:'ENGLISH_ACCOUNTING'});
  for(const row of [...syriacRows,...expansionRows]){const cell=row.peshitta;if(cell.type==='text'&&(cell.provenance?.englishAlignment?.englishIndices?.length??0)>3)failures.push({reference,rowId:row.id,issue:'MORE_THAN_THREE_ENGLISH_WORDS'});if(cell.gloss?.spanId){totals.mergedCells+=1;failures.push({reference,rowId:row.id,issue:'FORBIDDEN_SPAN'});}if(cell.gloss?.spanRole==='continuation'){totals.continuationCells+=1;failures.push({reference,rowId:row.id,issue:'FORBIDDEN_CONTINUATION'});}if(ARROW_RE.test(cell.gloss?.gloss??'')||ARROW_RE.test(cell.gloss?.tooltip??'')){totals.arrowGlyphs+=1;failures.push({reference,rowId:row.id,issue:'FORBIDDEN_ARROW'});}if(cell.type==='translation'&&(cell.text||!row.id.startsWith('peshitta-english-')||row.rowKind!=='translation-expansion'))failures.push({reference,rowId:row.id,issue:'INVALID_EXPANSION_SHAPE'});}
}
totals.failures=failures.length;
const passed=!failures.length&&totals.units===3779&&totals.verseFiles===3779&&totals.syriacRows===ledger.totals.syriacRows&&totals.englishWords===ledger.totals.englishWords&&totals.crossVerseUnits===0&&totals.blankSyriacRows===totals.unavoidableBlankSyriacRows;
console.log(JSON.stringify({status:passed?'CERTIFIED':'FAILED',adjudicationSha256:ledger.adjudicationSha256,totals,failures:failures.slice(0,30)},null,2));if(!passed)process.exitCode=1;
