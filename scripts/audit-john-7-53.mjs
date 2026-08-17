import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const verse = JSON.parse(read('data/john/7/53.json'));
const rows = verse.rows;
const words = (column) => rows.flatMap((row) => row[column]?.type === 'text' ? [row[column].text] : []);
const bezaeWords = (side) => rows.flatMap((row) => row.bezae?.type === 'text' && row.bezae[side] ? [row.bezae[side]] : []);
const xmlWords = (xml, reference) => {
  const body = xml.match(new RegExp(`<ab n="${reference}"[^>]*>([\\s\\S]*?)<\\/ab>`))?.[1];
  if (!body) throw new Error(`Missing ${reference}`);
  return [...body.matchAll(/<w\b[^>]*>([\s\S]*?)<\/w>/g)].map((match) => match[1].replace(/<[^>]+>/g, '').trim());
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const same = (actual, expected, label) => assert(JSON.stringify(actual) === JSON.stringify(expected), `${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);

const byzantineLine = read('data/sources/byzantine/JOH.csv').split(/\r?\n/).find((line) => line.startsWith('7,53,'));
same(words('byzantine'), byzantineLine.slice(byzantineLine.indexOf(',', 2) + 1).replace(/[··]/g, '').trim().split(/\s+/), 'Byzantine');

const vulgateLine = read('data/sources/vulgate/VulgClementine.txt').split(/\r?\n/).find((line) => line.includes('[7:53] Et reversi sunt'));
same(words('vulgate'), vulgateLine.replace(/^.*?\[7:53\]\s*/, '').replace(/[.·]/g, '').trim().split(/\s+/), 'Vulgate');

const peshittaLine = read('data/sources/peshitta/Peshitta.txt').split(/\r?\n/).find((line) => line.includes('[7:53] ܐܙܠ ܗܟܝܠ'));
same(words('peshitta'), peshittaLine.replace(/^.*?\[7:53\]\s*/, '').replace(/܀/g, '').trim().split(/\s+/), 'Peshitta');

same(bezaeWords('greek'), xmlWords(read('data/sources/bezae/Bezae-Greek.xml'), 'B04K7V53'), 'Bezae Greek');
same(bezaeWords('latin'), xmlWords(read('data/sources/bezae/Bezae-Latin.xml'), 'B04K7V53'), 'Bezae Latin');

for (const column of ['vaticanus', 'sinaiticus']) assert(rows.every((row) => row[column]?.type === 'omitted'), `${column} must be omitted on every shared row`);
assert(/<ab n="B04K7V53"[^>]*\/>/.test(read('data/sources/vaticanus/intf/john.xml')), 'INTF must explicitly encode Vaticanus John 7:53 as empty');
for (const [column, file] of [['vaticanus', 'data/sources/vaticanus/03.txt'], ['sinaiticus', 'data/sources/sinaiticus/01.txt']]) {
  assert(read(file).split(/\r?\n/).some((line) => line.startsWith('43007053 ') && /-\s*$/.test(line)), `${column} source must explicitly omit John 7:53`);
}
assert(rows.every((row) => row.coptic?.type === 'lost'), 'Coptic must remain unavailable');
assert(/<verse_n verse_n="53"[^>]*>[\s\r\n]*\[--\]/.test(read('data/sources/coptic-tt/43_John_07.tt')), 'Coptic source must mark John 7:53 unavailable');
assert(rows.every((row) => row.papyrus?.type === 'lost'), 'Papyrus must remain non-extant');

console.log(JSON.stringify({ status: 'pass', reference: 'John 7:53', rows: rows.length, sourcesVerified: 8 }, null, 2));
