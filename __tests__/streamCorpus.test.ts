// @vitest-environment node
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, it, expect, vi } from 'vitest';
import { STREAM_KEYS, buildStreamModel, type StreamEvidence } from '@/lib/alignment/streams';
import { streamFingerprintInput } from '@/lib/alignment/streamFingerprint.mjs';
import { VerseDataSchema } from '@/lib/validate';
import type { VerseData } from '@/lib/types';
vi.mock('server-only',()=>({}));
import { materializeCopticAlignmentGaps } from '@/lib/data';
import { loadStreamEvidence } from '@/lib/alignment/loadStreamEvidence';

describe('stream migration corpus invariants', () => {
  it('preserves every displayed source occurrence and its English allocation across all stored verses', () => {
    const report = { verses: 0, words: 0, links: { documented: 0, 'exact-form': 0, provisional: 0 }, orderFallbacks: {} as Record<string,number>, unresolved: {} as Record<string,number> };
    for (const gospel of ['matthew','mark','luke','john']) {
      const index = JSON.parse(fs.readFileSync(`data/alignment-streams/${gospel}.json`,'utf8'));
      for (const chapter of fs.readdirSync(`data/${gospel}`).filter(x=>/^\d+$/.test(x))) for (const file of fs.readdirSync(`data/${gospel}/${chapter}`).filter(x=>/^\d+\.json$/.test(x))) {
        const raw = JSON.parse(fs.readFileSync(`data/${gospel}/${chapter}/${file}`,'utf8'));
        const data = VerseDataSchema.parse(materializeCopticAlignmentGaps(raw)) as VerseData;
        const ref = `${gospel} ${data.chapter}:${data.verse}`;
        const evidence = index.verses[`${data.chapter}:${data.verse}`] as StreamEvidence;
        expect(createHash('sha256').update(streamFingerprintInput(data)).digest('hex'), ref).toBe(evidence.fingerprint);
        const m = buildStreamModel(data,evidence);
        const allIds = new Set(STREAM_KEYS.flatMap(k=>m.columns[k].words.map(w=>w.id)));
        const linked = new Set(m.links.filter(l=>l.status !== 'provisional').flatMap(l=>l.members));
        for (const key of STREAM_KEYS) {
          const stream = m.columns[key];
          const expected = data.rows.flatMap(row=>{
            if (key === 'bezaeGreek' || key === 'bezaeLatin') {
              const b = row.bezae, side = key === 'bezaeGreek' ? 'greek' : 'latin';
              const unavailable = b?.type === 'text' && (side === 'greek' ? b.greekLost || b.greekOmitted : b.latinLost || b.latinOmitted);
              return b?.type === 'text' && b[side] && !unavailable ? [[`${key}:${row.id}`,b[side],undefined]] : [];
            }
            const cell = row[key];
            return cell && (cell.type === 'text' || cell.type === 'extant') ? [[`${key}:${row.id}`,cell.text,cell.gloss]] : [];
          });
          expect(stream.words.map(w=>[w.id,w.text,w.gloss]).sort(),`${ref} ${key} source and English preservation`).toEqual(expected.sort());
          expect(new Set(stream.words.map(w=>w.id)).size,`${ref} ${key} occurrence reuse`).toBe(stream.words.length);
          if (key !== 'bezaeGreek' && key !== 'bezaeLatin') {
            const expansions = data.rows.flatMap(row => {
              const cell = row[key];
              return cell?.type === 'translation' ? [{ rowId: row.id, gloss: cell.gloss }] : [];
            });
            expect(stream.expansions, `${ref} ${key} English-only expansion preservation`).toEqual(expansions);
          }
          for (const word of stream.words) if (!linked.has(word.id) && !word.sourceSpecific) report.unresolved[key] = (report.unresolved[key] ?? 0) + 1;
          if (stream.order === 'comparison') {
            expect(stream.orderNote).toBeTruthy(); report.orderFallbacks[key] = (report.orderFallbacks[key] ?? 0) + 1;
          } else if (key !== 'papyrus' && key !== 'vaticanus') {
            expect(stream.words.map(w=>w.sourceIndex),`${ref} ${key} source order`).toEqual(stream.words.map(w=>w.sourceIndex).sort((a,b)=>a!-b!));
          }
          report.words += stream.words.length;
        }
        for (const link of m.links) {
          expect(link.members.every(id=>allIds.has(id)),`${ref} no absence links`).toBe(true);
          expect(new Set(link.members).size).toBe(link.members.length);
          expect(link.members.some(id=>evidence.sourceSpecific.includes(id)),`${ref} no source-specific word gains a counterpart`).toBe(false);
          if (link.status === 'provisional') {
            // A positional fallback must not attach a second, competing word
            // from a witness already represented by a contextual decision.
            for (const reviewed of m.links.filter(l=>l.status === 'documented' && l.members.some(id=>link.members.includes(id)))) {
              for (const id of link.members.filter(id=>!reviewed.members.includes(id))) {
                expect(reviewed.members.some(member=>member.split(':')[0] === id.split(':')[0]),`${ref} provisional ${id} contradicts ${reviewed.id}`).toBe(false);
              }
            }
          }
          report.links[link.status]++;
        }
        report.verses++;
      }
    }
    expect(report.verses).toBe(3779);
    console.log('STREAM_CORPUS_AUDIT', JSON.stringify(report));
  },120000);

  it('fails closed when runtime source identities differ from the evidence snapshot', () => {
    const data = VerseDataSchema.parse(JSON.parse(fs.readFileSync('data/mark/1/1.json','utf8'))) as VerseData;
    expect(loadStreamEvidence(data)).toBeDefined();
    if (data.rows[0].vaticanus.type === 'text') data.rows[0].vaticanus.text = 'changed';
    expect(loadStreamEvidence(data)).toBeUndefined();
  });
});
