import type { AlignmentRow, PapyrusCell, VerseData, WitnessCell } from '@/lib/types';

export const PUBLIC_COLUMNS = [
  ['papyrus', 'Earliest Papyri'],
  ['coptic', 'Sahidic'],
  ['vaticanus', 'Vaticanus'],
  ['sinaiticus', 'Sinaiticus'],
  ['bezaeGreek', 'Bezae Greek'],
  ['bezaeLatin', 'Bezae Latin'],
  ['vulgate', 'Vulgate'],
  ['peshitta', 'Peshitta'],
  ['byzantine', 'Byzantine'],
] as const;

export type PublicColumnKey = (typeof PUBLIC_COLUMNS)[number][0];
export type PublicCell = { state: string; sourceText: string | null; english: string | null; englishSource: string | null; witnesses?: string[]; provenance?: unknown };

function witnessCell(cell: WitnessCell | undefined): PublicCell {
  if (!cell) return { state: 'unpopulated', sourceText: null, english: null, englishSource: null };
  if (cell.type === 'text') return { state: cell.manuscriptStatus ?? 'text', sourceText: cell.text, english: cell.gloss?.gloss || null, englishSource: cell.gloss?.gloss ? cell.gloss.source : null, provenance: cell.provenance };
  if (cell.type === 'translation') return { state: 'translation-expansion', sourceText: null, english: cell.gloss.gloss, englishSource: cell.gloss.source, provenance: cell.provenance };
  return { state: cell.type, sourceText: null, english: null, englishSource: null };
}

function papyrusCell(cell: PapyrusCell): PublicCell {
  if (cell.type !== 'extant') return { state: cell.type, sourceText: null, english: null, englishSource: null };
  return { state: cell.condition?.damaged ? 'damaged' : 'extant', sourceText: cell.text, english: cell.gloss?.gloss || null, englishSource: cell.gloss?.gloss ? cell.gloss.source : null, witnesses: cell.fragments.map((fragment) => fragment.id), provenance: cell.condition };
}

export function publicCell(row: AlignmentRow, column: PublicColumnKey): PublicCell {
  if (column === 'papyrus') return papyrusCell(row.papyrus);
  if (column === 'bezaeGreek' || column === 'bezaeLatin') {
    const cell = row.bezae;
    if (!cell) return { state: 'unpopulated', sourceText: null, english: null, englishSource: null };
    if (cell.type !== 'text') return { state: cell.type, sourceText: null, english: null, englishSource: null };
    const greek = column === 'bezaeGreek';
    return { state: greek ? cell.greekLost ? 'lost' : cell.greekOmitted ? 'omitted' : cell.greek ? 'text' : 'empty' : cell.latinLost ? 'lost' : cell.latinOmitted ? 'omitted' : cell.latin ? 'text' : 'empty', sourceText: (greek ? cell.greek : cell.latin) || null, english: null, englishSource: null };
  }
  return witnessCell(row[column]);
}

export function publicVerse(data: VerseData) {
  return {
    schema: 'https://urevangelium.com/schemas/verse-v1',
    reference: `${data.gospel} ${data.chapter}:${data.verse}`,
    canonicalUrl: `https://urevangelium.com/${data.gospel}/${data.chapter}/${data.verse}`,
    transcriptUrl: `https://urevangelium.com/transcript/${data.gospel}/${data.chapter}/${data.verse}`,
    license: 'CC BY-SA 4.0; individual source licenses and attribution remain attached to the project source manifest',
    columns: Object.fromEntries(PUBLIC_COLUMNS.map(([key, label]) => [key, { label, sequence: data.rows.map((row) => ({ rowId: row.id, ...publicCell(row, key) })) }])),
    rows: data.rows.map((row) => ({ rowId: row.id, alignmentGroupIds: row.alignmentGroupIds ?? [], rowKind: row.rowKind ?? 'source', cells: Object.fromEntries(PUBLIC_COLUMNS.map(([key]) => [key, publicCell(row, key)])) })),
  };
}
