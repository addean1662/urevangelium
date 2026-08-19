import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const { parseTTChapterSequence } = require('../scripts/coptic/parse-tt.js');

describe('Sahidica source certification', () => {
  it('preserves the embedded John 8 boundary instead of overwriting John 7', () => {
    const source = fs.readFileSync(path.join(root, 'data/sources/coptic-tt/43_John_07.tt'), 'utf8');
    const records = parseTTChapterSequence(source);
    const references: string[] = [];
    let chapter = 7;
    let passedSevenFiftyThree = false;
    let wordGroups = 0;
    for (const record of records) {
      if (passedSevenFiftyThree) chapter = 8;
      else if (record.verse === 53) passedSevenFiftyThree = true;
      if (record.words.length === 0) continue;
      references.push(`${chapter}:${record.verse}`);
      wordGroups += record.words.length;
    }
    expect(references).toContain('7:12');
    expect(references).toContain('8:12');
    expect(references).toContain('8:59');
    expect(new Set(references).size).toBe(100);
    expect(wordGroups).toBe(1349);
  });

  it('records a zero-gap four-Gospel occurrence concordance', () => {
    const report = JSON.parse(fs.readFileSync(path.join(root, 'docs/audits/coptic-live-certification.json'), 'utf8'));
    expect(report.totals.sourceTokens).toBe(48275);
    expect(report.totals.displayedTokens).toBe(48275);
    expect(report.totals.occurrenceMatches).toBe(48275);
    expect(report.totals.exactDiplomaticMatches).toBe(48275);
    expect(report.totals.missingSourceTokens).toBe(0);
    expect(report.totals.unexpectedDisplayedTokens).toBe(0);
    expect(report.totals.provenancePresent).toBe(48275);
    expect(report.certificationGate).toContain('row-placement certification pending');
  });

  it('keeps the monotonic realignment proposal shadow-only', () => {
    const report = JSON.parse(fs.readFileSync(path.join(root, 'docs/audits/coptic-monotonic-shadow.json'), 'utf8'));
    expect(report.status).toBe('shadow-only');
    expect(report.totals.sourceTokens).toBe(48275);
    expect(report.totals.proposedOrderBreaks).toBe(0);
    expect(report.warning).toContain('not contextual or scholarly alignment certification');
  });

  it('resolves SCRIPTORIUM named entities through their explicit head token', () => {
    const source = fs.readFileSync(path.join(root, 'data/sources/coptic-tt/40_Matthew_01.tt'), 'utf8');
    const firstVerse = parseTTChapterSequence(source).find((record: { verse: number }) => record.verse === 1);
    const jesus = firstVerse.words.find((word: { lemma: string }) => word.lemma === 'ⲓⲏⲥⲟⲩⲥ');
    expect(jesus).toMatchObject({ pos: 'NPROP', identity: 'Jesus' });
  });

  it('keeps lexical evidence distinct from published Sahidic translation', () => {
    const report = JSON.parse(fs.readFileSync(path.join(root, 'docs/audits/coptic-english-reclassification.json'), 'utf8'));
    expect(report.totals.lexicalAidRetained).toBe(43880);
    expect(report.totals.publishedTranslationRetained).toBe(0);
    expect(report.totals.removedFromTranslationLayer).toBe(1534);
    expect(report.totals.nowWithoutPublishedTranslationOrLexicalAid).toBe(4395);
    expect(report.removedEvidence).toHaveLength(1534);
  });
});
