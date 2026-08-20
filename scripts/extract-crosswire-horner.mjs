import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(import.meta.dirname, '..');
const moduleDir = path.join(ROOT, 'data/sources/crosswire-copsahhorner/raw/modules/texts/ztext/copsahhorner');
const swordData = JSON.parse(fs.readFileSync(path.join(ROOT, 'tmp/swordjs/node_modules/swordjs/data/kjv.json'), 'utf8'));
const bzs = fs.readFileSync(path.join(moduleDir, 'nt.bzs'));
const bzv = fs.readFileSync(path.join(moduleDir, 'nt.bzv'));
const bzz = fs.readFileSync(path.join(moduleDir, 'nt.bzz'));
const outFile = path.join(ROOT, 'data/sources/crosswire-copsahhorner/gospel-verses.json');

const readU16 = (buffer, offset) => buffer.readUInt16LE(offset);
const readU32 = (buffer, offset) => buffer.readUInt32LE(offset);
const readU48Sword = (buffer, offset) =>
  buffer[offset + 1] * 0x100000000000 + buffer[offset] * 0x100000000 +
  buffer[offset + 5] * 0x1000000 + buffer[offset + 4] * 0x10000 +
  buffer[offset + 3] * 0x100 + buffer[offset + 2];

const blocks = [];
for (let offset = 0; offset + 12 <= bzs.length; offset += 12) {
  blocks.push({ start: readU32(bzs, offset), length: readU32(bzs, offset + 4), unused: readU32(bzs, offset + 8) });
}

const inflated = new Map();
function inflateBlock(index) {
  if (!inflated.has(index)) {
    const block = blocks[index];
    if (!block) throw new Error(`Missing compressed block ${index}`);
    inflated.set(index, zlib.inflateSync(bzz.subarray(block.start, block.start + block.length)));
  }
  return inflated.get(index);
}

let cursor = 40; // four testament-header records
const records = {};
const wanted = new Set(['Matt', 'Mark', 'Luke', 'John']);
for (let bookIndex = 0; bookIndex < swordData.nt.length; bookIndex++) {
  const book = swordData.nt[bookIndex];
  for (let chapter = 1; chapter <= book.maxChapter; chapter++) {
    const verseCount = swordData.versesInChapter[bookIndex + swordData.ot.length][chapter - 1];
    for (let verse = 1; verse <= verseCount; verse++) {
      const block = readU16(bzv, cursor);
      const start = readU48Sword(bzv, cursor + 2);
      const length = readU16(bzv, cursor + 8);
      cursor += 10;
      if (wanted.has(book.abbrev) && length > 0) {
        const raw = inflateBlock(block).subarray(start, start + length).toString('utf8');
        records[`${book.abbrev}.${chapter}.${verse}`] = raw;
      }
    }
    cursor += 10; // chapter break record
  }
  cursor += 10; // book break record
}

fs.writeFileSync(outFile, `${JSON.stringify({
  source: 'CrossWire CopSahHorner 1.5',
  role: 'structured Coptic comparison candidate; facsimile remains authoritative',
  generatedAt: new Date().toISOString(),
  verses: records,
}, null, 2)}\n`);

console.log(JSON.stringify({ status: 'extracted', blocks: blocks.length, gospelVerses: Object.keys(records).length, output: path.relative(ROOT, outFile), samples: { 'Matt.1.1': records['Matt.1.1'], 'Mark.16.8': records['Mark.16.8'], 'John.1.1': records['John.1.1'] } }, null, 2));
