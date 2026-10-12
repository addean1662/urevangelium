import fs from 'node:fs';
import path from 'node:path';
import { buildStreamModel, STREAM_KEYS } from '../lib/alignment/streams.ts';

const root = path.resolve(import.meta.dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const report = { schema: 1, verses: 0, sources: {}, links: { documented: 0, 'exact-form': 0, provisional: 0 }, sequenceExceptions: [] };
for (const gospel of ['matthew','mark','luke','john']) {
  const index = read(`data/alignment-streams/${gospel}.json`);
  for (const chapter of fs.readdirSync(path.join(root,'data',gospel)).filter(x=>/^\d+$/.test(x))) for (const file of fs.readdirSync(path.join(root,'data',gospel,chapter)).filter(x=>/^\d+\.json$/.test(x))) {
    const d = read(`data/${gospel}/${chapter}/${file}`), m = buildStreamModel(d,index.verses[`${d.chapter}:${d.verse}`]);
    const linked = new Set(m.links.filter(l=>l.status !== 'provisional').flatMap(l=>l.members));
    const visibleLinks = new Set(m.links.flatMap(l=>l.members));
    for (const key of STREAM_KEYS) {
      const c = m.columns[key];
      const stats = report.sources[key] ??= { words: 0, linked: 0, sourceSpecific: 0, unresolved: 0, highlightedWithCounterpart: 0, provisionalOnly: 0, sequenceFallbackVerses: 0, translationExpansions: 0 };
      stats.words += c.words.length; stats.translationExpansions += c.expansions.length;
      for (const w of c.words) {
        if (visibleLinks.has(w.id)) stats.highlightedWithCounterpart++;
        if (visibleLinks.has(w.id) && !linked.has(w.id)) stats.provisionalOnly++;
        if (w.sourceSpecific) stats.sourceSpecific++;
        else if (linked.has(w.id)) stats.linked++;
        else stats.unresolved++;
      }
      if (c.order === 'comparison') {
        stats.sequenceFallbackVerses++;
        report.sequenceExceptions.push({ reference: m.reference, source: key, reason: c.orderNote });
      }
    }
    for (const l of m.links) report.links[l.status]++;
    report.verses++;
  }
}
fs.writeFileSync(path.join(root,'docs/audits/alignment-streams/model-coverage.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({ ...report, sequenceExceptions: report.sequenceExceptions.length },null,2));
