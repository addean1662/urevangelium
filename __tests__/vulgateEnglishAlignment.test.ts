import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');

describe('Vulgate English lexical-row adjudication', () => {
  const finalLedger = path.join(root, 'docs/audits/vulgate-lexical-row-adjudication-final.json');
  const ledger = JSON.parse(fs.readFileSync(fs.existsSync(finalLedger) ? finalLedger : path.join(root, 'docs/audits/vulgate-lexical-row-adjudication.json'), 'utf8'));
  const application = JSON.parse(fs.readFileSync(path.join(root, 'docs/audits/vulgate-lexical-row-application.json'), 'utf8'));

  it('accounts for every Latin and published English token exactly once', () => {
    const totals = ledger.totals;
    expect(totals.accountingErrors).toBe(0);
    expect(totals.displayedEnglishTokens + totals.pendingEnglishTokens).toBe(totals.englishTokens);
    expect(totals.displayedLatinRows + totals.compressedSharedLatinRows + totals.reorderedLatinRows + totals.unexpressedLatinRows + (totals.translationUnitLatinRows ?? 0) + totals.heldLatinRows).toBe(totals.latinTokens);
  });

  it('contains no continuation-arrow display cells', () => {
    expect(application.totals.arrowsRemaining).toBe(0);
  });

  it('does not shift the final John 1:1 clause onto the wrong Latin words', () => {
    const verse = JSON.parse(fs.readFileSync(path.join(root, 'data/john/1/1.json'), 'utf8'));
    const cells = verse.rows.filter((row: { vulgate?: { type?: string } }) => row.vulgate?.type === 'text').map((row: { vulgate: { text: string; gloss?: { gloss?: string }; provenance?: { englishAlignment?: { action?: string } } } }) => row.vulgate);
    const apud = cells.find((cell: { text: string }) => cell.text === 'apud');
    const deum = cells.find((cell: { text: string }) => cell.text === 'Deum');
    const deus = cells.find((cell: { text: string }) => cell.text === 'Deus');
    expect(apud?.gloss?.gloss).toBe('with');
    expect(deum?.gloss?.gloss).toBe('God');
    expect(deus?.gloss?.gloss).toBe('God');
    expect(cells.some((cell: { gloss?: { gloss?: string } }) => cell.gloss?.gloss === 'the Word was God')).toBe(false);
    const deusIndex = cells.indexOf(deus);
    expect(cells[deusIndex + 1]?.gloss?.gloss).toBe('was');
    expect(cells[deusIndex + 2]?.gloss?.gloss).toBe('the Word');
    expect(cells.slice(deusIndex).every((cell: { provenance?: { englishAlignment?: { action?: string } } }) => cell.provenance?.englishAlignment?.action === 'display')).toBe(true);
  });

  it('keeps John 1:3 pronouns and relative particles on their Latin owners', () => {
    const verse = JSON.parse(fs.readFileSync(path.join(root, 'data/john/1/3.json'), 'utf8'));
    const cells = verse.rows.filter((row: { vulgate?: { type?: string } }) => row.vulgate?.type === 'text').map((row: { vulgate: { text: string; gloss?: { gloss?: string } } }) => row.vulgate);
    const glosses = (latin: string) => cells.filter((cell: { text: string }) => cell.text === latin).map((cell: { gloss?: { gloss?: string } }) => cell.gloss?.gloss);
    expect(glosses('ipsum')).toEqual(['him']);
    expect(glosses('ipso')).toEqual(['him']);
    expect(glosses('quod')).toEqual(['that']);
    expect(glosses('et')).toEqual(['and']);
    expect(glosses('est')).toEqual(['was', 'was']);
  });

  it('uses explicit genitive evidence for supplied “of” in Matthew 1:1', () => {
    const verse = JSON.parse(fs.readFileSync(path.join(root, 'data/matthew/1/1.json'), 'utf8'));
    const cells = verse.rows.filter((row: { vulgate?: { type?: string } }) => row.vulgate?.type === 'text').map((row: { vulgate: { text: string; gloss?: { gloss?: string }; provenance?: { englishAlignment?: { evidence?: string[] } } } }) => row.vulgate);
    const generationis = cells.find((cell: { text: string }) => cell.text === 'generationis');
    const jesu = cells.find((cell: { text: string }) => cell.text === 'Jesu');
    const david = cells.find((cell: { text: string }) => cell.text === 'David');
    const abraham = cells.find((cell: { text: string }) => cell.text === 'Abraham');
    expect(generationis?.gloss?.gloss).toBe('of the generation');
    expect(jesu?.gloss?.gloss).toBe('of Jesus');
    expect(david?.gloss?.gloss).toBe('of David');
    expect(abraham?.gloss?.gloss).toBe('of Abraham');
    expect(generationis?.provenance?.englishAlignment?.evidence).toContain('WHITAKER_MORPHOLOGY_SUPPORTED_ENGLISH_FUNCTION');
  });

  it('keeps repeated pronouns and inverted auxiliaries within their source clause', () => {
    const verse = JSON.parse(fs.readFileSync(path.join(root, 'data/luke/2/48.json'), 'utf8'));
    const cells = verse.rows.filter((row: { vulgate?: { type?: string } }) => row.vulgate?.type === 'text').map((row: { vulgate: { text: string; gloss?: { gloss?: string } } }) => row.vulgate);
    const gloss = (latin: string) => cells.find((cell: { text: string }) => cell.text === latin)?.gloss?.gloss;
    expect(gloss('ad')).toBe('to');
    expect(gloss('illum')).toBe('him');
    expect(gloss('fecisti')).toBe('hast thou done');
    expect(gloss('nobis')).toBe('to us');
    expect(cells.some((cell: { gloss?: { gloss?: string } }) => /\b(to to|him him)\b/u.test(cell.gloss?.gloss ?? ''))).toBe(false);
  });
});
