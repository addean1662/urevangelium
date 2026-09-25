import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve(import.meta.dirname,'..');
const OUT=path.join(ROOT,'data/sources/sinaiticus-english/anderson-1918');
const BOOKS={33:'matthew',34:'mark',35:'luke',36:'john'};
const sha=(value)=>crypto.createHash('sha256').update(value).digest('hex');
const decode=(text)=>text.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const clean=(html)=>decode(html.replace(/<b>[\s\S]*?<\/b>/i,'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
const requests=[];for(let q=74;q<=86;q++)for(let f=1;f<=8;f++)for(const s of ['r','v'])requests.push({q,f,s,url:'https://codexsinaiticus.org/handler/translation.ashx?lid=en&q='+q+'&f='+f+'&s='+s});
async function get(item){const response=await fetch(item.url);if(!response.ok)throw new Error(item.url+' '+response.status);const html=await response.text();return{...item,html,sha256:sha(html)}}
const results=[];for(let i=0;i<requests.length;i+=8)results.push(...await Promise.all(requests.slice(i,i+8).map(get)));
const verses=Object.fromEntries(Object.values(BOOKS).map(g=>[g,new Map()]));const conflicts=[];
for(const page of results){for(const match of page.html.matchAll(/<p id="(3[3-6])-(\d+)-(\d+)">([\s\S]*?)<\/p>/g)){const gospel=BOOKS[Number(match[1])],key=Number(match[2])+':'+Number(match[3]),text=clean(match[4]);if(!text)continue;const prior=verses[gospel].get(key);if(prior&&prior.text!==text)conflicts.push({gospel,key,prior:prior.text,next:text});else verses[gospel].set(key,{chapter:Number(match[2]),verse:Number(match[3]),text,sourcePages:[...(prior?.sourcePages||[]),{q:page.q,f:page.f,s:page.s,sha256:page.sha256}]})}}
if(conflicts.length)throw new Error('Translation conflicts: '+JSON.stringify(conflicts.slice(0,10)));
fs.mkdirSync(OUT,{recursive:true});const totals={};for(const [gospel,map] of Object.entries(verses)){const list=[...map.values()].sort((a,b)=>a.chapter-b.chapter||a.verse-b.verse);totals[gospel]={verses:list.length,words:list.reduce((n,v)=>n+v.text.split(/\s+/).length,0)};fs.writeFileSync(path.join(OUT,gospel+'.json'),JSON.stringify({authority:'Henry Tompkins Anderson, 1918',source:'Codex Sinaiticus Project public translation endpoint',gospel,verses:list},null,2)+'\n')}
const manifest={generatedAt:new Date().toISOString(),authority:'Henry Tompkins Anderson, The New Testament: translated from the Sinaitic manuscript discovered by Constantine Tischendorf at Mt. Sinai (Cincinnati: Standard Publishing Company, 1918)',projectStatement:'The Codex Sinaiticus Project identifies Anderson 1918 as its New Testament English; it cautions that the translation is not literal and serves as a navigational aid.',sourcePage:'https://codexsinaiticus.org/en/project/translation.aspx',endpoint:'https://codexsinaiticus.org/handler/translation.ashx',requestRange:{quires:[74,86],folios:[1,8],sides:['r','v'],language:'en'},requests:results.map(({q,f,s,url,sha256,html})=>({q,f,s,url,sha256,bytes:Buffer.byteLength(html)})),totals};fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({output:path.relative(ROOT,OUT),totals,requests:results.length,conflicts:0},null,2));
