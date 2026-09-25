import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(import.meta.dirname,'..');
const WRITE=process.argv.includes('--write');
const REPAIR_ORDER=process.argv.includes('--repair-order');
const sourceCode=fs.readFileSync(path.join(ROOT,'lib/sources/cntrMes.js'),'utf8');
const {parseMesLine}=await import('data:text/javascript;base64,'+Buffer.from(sourceCode).toString('base64'));
const GOSPELS={40:'matthew',41:'mark',42:'luke',43:'john'};
const REVISION='4c0e9f94117ec3dc4ae40094aec044bb7a416a53';
const SOURCE_SHA256='a0812404a5ef2904a06f91f3a535ca30712f8bc0ee5f5388373c440964be2c5f';
const display=(text)=>{const expanded=text.replace(/¯/g,'ν').replace(/ϗ/g,'και').replace(/⳨/g,'τρ').replace(/\ue001/g,'μου');return expanded.endsWith('σ')?expanded.slice(0,-1)+'ς':expanded};
const records=new Map();
for(const line of fs.readFileSync(path.join(ROOT,'data/sources/sinaiticus/01.txt'),'utf8').split(/\r?\n/).filter(Boolean)){const p=parseMesLine(line);const g=GOSPELS[p.reference.book];if(g)records.set(g+' '+p.reference.chapter+':'+p.reference.verse,p)}
const totals={records:0,sourceTokens:0,displayedTokens:0,exact:0,damaged:0,missingCharacters:0,supplied:0,nominaSacra:0,textualOmissionCells:0,emptyCells:0,failures:0};
const failures=[];
for(const [key,parsed] of records){const m=key.match(/^(\w+) (\d+):(\d+)$/);const file=path.join(ROOT,'data',m[1],m[2],m[3]+'.json');const data=JSON.parse(fs.readFileSync(file,'utf8'));const source=parsed.baseWords.filter(w=>w.presence!=='absent');const cells=data.rows.filter(r=>r.sinaiticus?.type==='text');totals.records++;totals.sourceTokens+=source.length;totals.displayedTokens+=cells.length;totals.textualOmissionCells+=data.rows.filter(r=>r.sinaiticus?.type==='omitted').length;totals.emptyCells+=data.rows.filter(r=>r.sinaiticus?.type==='empty').length;if(source.length!==cells.length){failures.push(key+': token count '+source.length+' != '+cells.length);totals.failures++;continue}for(let i=0;i<source.length;i++){const word=source[i],cell=cells[i].sinaiticus,projected=display(word.diplomatic);if(cell.text!==projected){if(REPAIR_ORDER){cell.text=projected}else{failures.push(key+' #'+(i+1)+': '+JSON.stringify(cell.text)+' != '+JSON.stringify(projected));totals.failures++;continue}}totals.exact++;if(word.conditions.some(x=>x.kind==='damaged'))totals.damaged++;if(word.conditions.some(x=>x.kind==='missing'))totals.missingCharacters++;if(word.supplied)totals.supplied++;if(word.abbreviation==='nomina-sacra')totals.nominaSacra++;cell.provenance={witness:'GA 01',source:'CNTR Class 1 transcription',cntrRevision:REVISION,sourceSha256:SOURCE_SHA256,readingLayer:'base',sourceReference:parsed.reference.code,sourceToken:i+1,raw:word.raw,diplomatic:word.diplomatic,abbreviation:word.abbreviation,conditions:word.conditions,supplied:word.supplied,presence:word.presence,normalization:projected===word.diplomatic?[]:['expand-special-glyphs','modern-final-sigma'],verification:'source-transcription-verified'}}if(WRITE){data._sinaiticusCertification={authority:'CNTR Class 1 transcription of GA 01',readingLayer:'base reading: original scribe including recorded first-scribe corrections; later a-c correctors excluded from display',cntrRevision:REVISION,sourceSha256:SOURCE_SHA256,sourceReference:parsed.reference.code,verification:'source-token-order-verified'};fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n')}}
const report={status:totals.failures?'failed':WRITE?'certified-applied':'certification-clean',generatedAt:new Date().toISOString(),policy:'Every displayed GA 01 token must equal the same-position CNTR base-reading projection; later a-c correctors remain excluded; damaged, missing-character, supplied, and abbreviation states remain explicit in provenance.',totals,failures};
fs.mkdirSync(path.join(ROOT,'docs/audits/sinaiticus'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'docs/audits/sinaiticus/source-certificate.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,failures:failures.slice(0,40)},null,2));
if(totals.failures)process.exitCode=1;
