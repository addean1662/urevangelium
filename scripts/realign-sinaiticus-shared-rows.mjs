import fs from 'node:fs';
import path from 'node:path';
import { similarity } from '../lib/alignment/sequenceAlign.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const APPLY = process.argv.includes('--apply');
const BOOKS = ['matthew', 'mark', 'luke', 'john'];
const OUT = path.join(ROOT, 'docs/audits/sinaiticus/shared-row-realignment.json');
const NS = new Map(Object.entries({
  ισ:'ιησουσ', ιυ:'ιησου', ιν:'ιησουν', ιη:'ιησου', χσ:'χριστοσ', χυ:'χριστου', χν:'χριστον', χω:'χριστω',
  κσ:'κυριοσ', κυ:'κυριου', κν:'κυριον', κω:'κυριω', κε:'κυριε', θσ:'θεοσ', θυ:'θεου', θν:'θεον', θω:'θεω',
  υσ:'υιοσ', υυ:'υιου', υν:'υιον', πνα:'πνευμα', πνσ:'πνευματοσ', πνι:'πνευματι',
  πρσ:'πατροσ', πρα:'πατερα', πρι:'πατρι', πρε:'πατερ', δαδ:'δαυιδ', ιηλ:'ισραηλ', ανου:'ανθρωπου',
}));

function norm(value='') {
  const base=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ς/g,'σ').replace(/[^α-ω]/g,'');
  return NS.get(base) ?? base;
}
function peers(row) {
  return ['vaticanus','byzantine','papyrus'].flatMap(column => row[column]?.text ? [norm(row[column].text)] : []).filter(Boolean);
}
function score(source, options) {
  if (!options.length) return -9;
  const likeness=Math.max(...options.map(option => similarity(source,option)));
  if (likeness===1) return 8;
  if (Math.min(source.length,...options.map(x=>x.length))<3) return -9;
  if (likeness>=0.9) return 5+likeness;
  if (likeness>=0.8) return 3+likeness;
  return -9;
}
function align(source, guide) {
  const rows=source.length+1,cols=guide.length+1,gap=-3;
  const dp=Array.from({length:rows},()=>new Float64Array(cols));
  const tr=Array.from({length:rows},()=>new Uint8Array(cols));
  for(let i=1;i<rows;i++){dp[i][0]=i*gap;tr[i][0]=2}
  for(let j=1;j<cols;j++){dp[0][j]=j*gap;tr[0][j]=3}
  for(let i=1;i<rows;i++)for(let j=1;j<cols;j++){
    const d=dp[i-1][j-1]+score(source[i-1],guide[j-1]),a=dp[i-1][j]+gap,b=dp[i][j-1]+gap;
    if(d>=a&&d>=b){dp[i][j]=d;tr[i][j]=1}else if(a>=b){dp[i][j]=a;tr[i][j]=2}else{dp[i][j]=b;tr[i][j]=3}
  }
  const out=[];let i=source.length,j=guide.length;
  while(i||j){if(tr[i][j]===1){out.push({source:i-1,guide:j-1,similarity:Math.max(...guide[j-1].map(x=>similarity(source[i-1],x)))});i--;j--}else if(tr[i][j]===2){i--}else{j--}}
  return out.reverse();
}

const report={status:APPLY?'APPLIED':'DRY_RUN',generatedAt:new Date().toISOString(),standard:'GA 01 tokens remain in certified source-token order. A token may move only to an unoccupied comparison row selected by global monotonic alignment against Vaticanus, Byzantine, and papyrus Greek; normalized identity or similarity of at least 0.9 is required. Nomina-sacra comparison expansion is lookup-only. Every proposed move must preserve strict row order for the complete GA 01 verse. Occupied rows, ambiguous low-similarity forms, and genuine variants are never overwritten.',totals:{records:0,tokens:0,alreadyShared:0,candidates:0,moved:0,blockedOccupied:0,blockedOrder:0,variantsRetained:0,failures:0},decisions:[]};

for(const book of BOOKS)for(const chapter of fs.readdirSync(path.join(ROOT,'data',book)).filter(x=>/^\d+$/.test(x)))for(const filename of fs.readdirSync(path.join(ROOT,'data',book,chapter)).filter(x=>/^\d+\.json$/.test(x))){
  const file=path.join(ROOT,'data',book,chapter,filename),document=JSON.parse(fs.readFileSync(file,'utf8')),reference=`${book} ${chapter}:${filename.slice(0,-5)}`;
  report.totals.records++;
  const source=document.rows.map((row,rowIndex)=>({row,rowIndex})).filter(x=>x.row.sinaiticus?.type==='text').sort((a,b)=>(a.row.sinaiticus.provenance?.sourceToken??a.rowIndex)-(b.row.sinaiticus.provenance?.sourceToken??b.rowIndex));
  const guide=document.rows.map((row,rowIndex)=>({row,rowIndex,forms:peers(row)})).filter(x=>x.forms.length);
  report.totals.tokens+=source.length;
  const operations=align(source.map(x=>norm(x.row.sinaiticus.text)),guide.map(x=>x.forms));
  const desired=source.map(x=>x.rowIndex),proposals=[];
  for(const op of operations){
    if(op.similarity<0.9)continue;
    const from=source[op.source].rowIndex,to=guide[op.guide].rowIndex;
    if(from===to){report.totals.alreadyShared++;continue}
    report.totals.candidates++;
    if(document.rows[to].sinaiticus?.type==='text'){report.totals.blockedOccupied++;continue}
    proposals.push({...op,from,to});
  }
  proposals.sort((a,b)=>b.similarity-a.similarity||a.source-b.source);
  const accepted=[];
  for(const proposal of proposals){
    const prior=desired[proposal.source-1]??-1,next=desired[proposal.source+1]??document.rows.length;
    if(proposal.to<=prior||proposal.to>=next){report.totals.blockedOrder++;continue}
    desired[proposal.source]=proposal.to;accepted.push(proposal);
  }
  for(const move of accepted){
    const cell=structuredClone(document.rows[move.from].sinaiticus);
    document.rows[move.from].sinaiticus={type:'empty'};
    cell.provenance.sharedRowAlignment={status:'deterministically-realigned',standard:'monotonic-greek-peer',previousRowId:document.rows[move.from].id,targetRowId:document.rows[move.to].id,similarity:move.similarity};
    document.rows[move.to].sinaiticus=cell;
    report.decisions.push({reference,sourceToken:cell.provenance.sourceToken,greek:cell.text,previousRowId:document.rows[move.from].id,targetRowId:document.rows[move.to].id,similarity:move.similarity});
  }
  report.totals.moved+=accepted.length;
  const final=document.rows.filter(row=>row.sinaiticus?.type==='text').map(row=>row.sinaiticus.provenance?.sourceToken);
  if(final.some((token,index)=>token!==index+1)){report.totals.failures++;throw new Error(`${reference}: source order changed`)}
  if(APPLY&&accepted.length)fs.writeFileSync(file,`${JSON.stringify(document,null,2)}\n`);
}
report.totals.variantsRetained=report.totals.tokens-report.totals.alreadyShared-report.totals.moved;
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify({status:report.status,totals:report.totals},null,2));
