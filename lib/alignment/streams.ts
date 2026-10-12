import type { GlossCell, PapyrusCell, VerseData, WitnessCell } from '@/lib/types';

export const STREAM_KEYS = ['papyrus', 'coptic', 'vaticanus', 'sinaiticus', 'vulgate', 'bezaeGreek', 'bezaeLatin', 'peshitta', 'byzantine'] as const;
export type StreamKey = typeof STREAM_KEYS[number];
export type LinkStatus = 'documented' | 'exact-form' | 'provisional';
export type StreamLink = { id: string; members: string[]; status: LinkStatus; basis: string };
export type StreamWord = {
  id: string;
  column: StreamKey;
  rowId: string;
  rowIndex: number;
  sourceIndex?: number;
  text: string;
  cell: WitnessCell | PapyrusCell;
  gloss?: GlossCell;
  /** Explicitly source-specific is different from an unresolved link. */
  sourceSpecific?: boolean;
};
export type StreamAbsence = { rowId: string; state: 'lost' | 'lacuna' | 'omitted' | 'unpopulated'; notes?: string[] };
export type WordStream = { key: StreamKey; words: StreamWord[]; absences: StreamAbsence[]; expansions: Array<{ rowId: string; gloss: GlossCell }>; order: 'source' | 'composite' | 'comparison'; orderNote?: string };
export type StreamModel = { reference: string; columns: Record<StreamKey, WordStream>; links: StreamLink[] };
export type StreamEvidence = {
  fingerprint: string;
  orders: Partial<Record<StreamKey, Record<string, number>>>;
  links: StreamLink[];
  sourceSpecific: string[];
};

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value && typeof value === 'object' ? value as RecordValue : {};
export const wordId = (column: StreamKey, rowId: string) => `${column}:${rowId}`;

// Comparison only. Displayed contractions and manuscript spellings never change.
const NOMINA: Record<string, string> = {
  ισ: 'ιησουσ', ιυ: 'ιησου', ιν: 'ιησουν', ιη: 'ιησου',
  χσ: 'χριστοσ', χυ: 'χριστου', χν: 'χριστον', χω: 'χριστω',
  κσ: 'κυριοσ', κυ: 'κυριου', κν: 'κυριον', κω: 'κυριω', κε: 'κυριε',
  θσ: 'θεοσ', θυ: 'θεου', θν: 'θεον', θω: 'θεω',
  υσ: 'υιοσ', υυ: 'υιου', υν: 'υιον', υω: 'υιω',
  πνα: 'πνευμα', πνσ: 'πνευματοσ', πνι: 'πνευματι', δαδ: 'δαυιδ', ιηλ: 'ισραηλ',
};
export function comparisonGreek(text: string): string {
  const key = text.normalize('NFD').replace(/[\u0300-\u036f]/gu, '').toLocaleLowerCase('el').replaceAll('ς', 'σ').replaceAll('ϗ', 'και').replace(/[^α-ω]/gu, '');
  return NOMINA[key] ?? key;
}

// Compare Latin witnesses as Latin. Never infer bilingual correspondence from
// their displayed positions, or change either manuscript's spelling.
export function comparisonLatin(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/gu, '').toLocaleLowerCase('la')
    .replaceAll('æ', 'ae').replaceAll('œ', 'oe').replaceAll('j', 'i').replaceAll('u', 'v').replace(/[^a-z]/gu, '');
}

/** Retain only occurrence pairs common to every optimal exact-form alignment.
 * Unique displaced forms can be linked without reordering either source.
 * Repeated words with competing matches remain unresolved.
 */
export function exactOccurrencePairs(left: string[], right: string[]): Array<[number, number]> {
  const n = left.length, m = right.length;
  const prefix = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0) as number[]);
  const suffix = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0) as number[]);
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) prefix[i + 1][j + 1] = left[i] && left[i] === right[j] ? prefix[i][j] + 1 : Math.max(prefix[i][j + 1], prefix[i + 1][j]);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) suffix[i][j] = left[i] && left[i] === right[j] ? suffix[i + 1][j + 1] + 1 : Math.max(suffix[i + 1][j], suffix[i][j + 1]);
  const candidates: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) if (left[i] && left[i] === right[j] && prefix[i][j] + 1 + suffix[i + 1][j + 1] === prefix[n][m]) candidates.push([i, j]);
  // A pair is certain only if excluding it lowers the optimum. Having a single
  // candidate on each side is insufficient for crossed alternatives (AB / BA).
  const result = candidates.filter(([i, j]) => {
    if (candidates.filter(([a]) => a === i).length !== 1 || candidates.filter(([, b]) => b === j).length !== 1) return false;
    // With equal unique occurrences, a displaced word is an explicit form link.
    if (left.filter(x => x === left[i]).length === 1 && right.filter(x => x === left[i]).length === 1) return true;
    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0) as number[]);
    for (let a = 0; a < n; a++) for (let b = 0; b < m; b++) dp[a + 1][b + 1] = left[a] && left[a] === right[b] && !(a === i && b === j) ? dp[a][b] + 1 : Math.max(dp[a][b + 1], dp[a + 1][b]);
    return dp[n][m] < prefix[n][m];
  });
  for (let i = 0; i < n; i++) {
    if (!left[i] || result.some(([a]) => a === i)) continue;
    if (left.filter(x => x === left[i]).length === 1 && right.filter(x => x === left[i]).length === 1) result.push([i, right.indexOf(left[i])]);
  }
  return result;
}

function papyrusOrder(words: StreamWord[]): StreamWord[] | null {
  const byWitness = new Map<string, Array<{ id: string; index: number }>>();
  for (const word of words) {
    const p = record(record(word.cell).provenance);
    const attestations = Array.isArray(p.sourceAttestations) ? p.sourceAttestations.map(record) : [{ siglum: p.governingSiglum, sourceToken: p.sourceToken }];
    for (const a of attestations) {
      if (a.evidenceStatus === 'fully-supplied') continue;
      if (typeof a.siglum !== 'string' || typeof a.sourceToken !== 'number') return null;
      const list = byWitness.get(a.siglum) ?? [];
      list.push({ id: word.id, index: a.sourceToken }); byWitness.set(a.siglum, list);
    }
  }
  const edges = new Map(words.map(w => [w.id, new Set<string>()]));
  const indegree = new Map(words.map(w => [w.id, 0]));
  for (const occurrences of byWitness.values()) {
    occurrences.sort((a, b) => a.index - b.index);
    for (let i = 1; i < occurrences.length; i++) {
      const a = occurrences[i - 1], b = occurrences[i];
      if (a.index === b.index && a.id !== b.id) return null;
      if (a.id !== b.id && !edges.get(a.id)!.has(b.id)) { edges.get(a.id)!.add(b.id); indegree.set(b.id, indegree.get(b.id)! + 1); }
    }
  }
  const result: StreamWord[] = [];
  const remaining = new Set(words.map(w => w.id));
  while (remaining.size) {
    const next = words.find(w => remaining.has(w.id) && indegree.get(w.id) === 0);
    if (!next) return null;
    result.push(next); remaining.delete(next.id);
    for (const id of edges.get(next.id)!) indegree.set(id, indegree.get(id)! - 1);
  }
  return result;
}

export function buildStreamModel(data: VerseData, evidence?: StreamEvidence): StreamModel {
  const columns = Object.fromEntries(STREAM_KEYS.map(key => [key, { key, words: [], absences: [], expansions: [], order: 'source' }])) as unknown as Record<StreamKey, WordStream>;
  data.rows.forEach((row, rowIndex) => {
    for (const key of STREAM_KEYS) {
      const stream = columns[key];
      let cell: WitnessCell | PapyrusCell | undefined;
      if (key === 'bezaeGreek' || key === 'bezaeLatin') {
        const b = row.bezae, side = key === 'bezaeGreek' ? 'greek' : 'latin';
        if (b?.type === 'text') {
          const lost = side === 'greek' ? b.greekLost : b.latinLost;
          const omitted = side === 'greek' ? b.greekOmitted : b.latinOmitted;
          cell = lost ? { type: 'lost' } : omitted ? { type: 'omitted' } : b[side] ? { type: 'text', text: b[side]! } : { type: 'empty' };
        } else if (b?.type === 'omitted') cell = b[side] ? { type: 'omitted' } : { type: 'empty' };
        else if (b?.type === 'lost' || b?.type === 'empty') cell = { type: b.type };
      } else cell = row[key];
      if (!cell) { stream.absences.push({ rowId: row.id, state: 'unpopulated' }); continue; }
      if (cell.type === 'empty') continue;
      if (cell.type === 'translation') { stream.expansions.push({ rowId: row.id, gloss: cell.gloss }); continue; }
      if (cell.type !== 'text' && cell.type !== 'extant') { stream.absences.push({ rowId: row.id, state: cell.type, ...('editorialNotes' in cell ? { notes: cell.editorialNotes } : {}) }); continue; }
      const index = evidence?.orders[key]?.[row.id] ?? record(record(cell).provenance).sourceToken;
      stream.words.push({ id: wordId(key, row.id), column: key, rowId: row.id, rowIndex, sourceIndex: typeof index === 'number' ? index : undefined, text: cell.text, cell, gloss: cell.gloss, sourceSpecific: evidence?.sourceSpecific.includes(wordId(key, row.id)) });
    }
  });
  for (const key of STREAM_KEYS) {
    const stream = columns[key];
    if (key === 'papyrus') {
      stream.order = 'composite';
      const ordered = papyrusOrder(stream.words);
      if (ordered) stream.words = ordered;
      else { stream.order = 'comparison'; stream.orderNote = 'Papyrus witnesses have conflicting or unavailable sequence evidence; comparative order is retained.'; }
    } else if (stream.words.every(w => w.sourceIndex !== undefined) && new Set(stream.words.map(w => w.sourceIndex)).size === stream.words.length) stream.words.sort((a, b) => a.sourceIndex! - b.sourceIndex!);
    else if (key !== 'vaticanus' && stream.words.length) { stream.order = 'comparison'; stream.orderNote = 'Source sequence is not fully documented here; comparative order is retained.'; }
  }
  const ids = new Set(STREAM_KEYS.flatMap(k => columns[k].words.map(w => w.id)));
  const links = (evidence?.links ?? []).filter(link => link.members.every(id => ids.has(id))).map(link => ({ ...link, members: [...link.members] }));
  const anchor = columns.vaticanus.words;
  const normalized = anchor.map(w => comparisonGreek(w.text));
  const exactGroups = new Map(anchor.map(w => [w.id, [w.id]]));
  const comparisonRows = new Map(STREAM_KEYS.flatMap(k => columns[k].words.map(w => [w.id, w.rowId] as const)));
  const preferredOccurrences = new Map<string, string>();
  for (const key of ['papyrus', 'sinaiticus', 'bezaeGreek', 'byzantine'] as const) {
    const words = columns[key].words;
    for (const [a, b] of exactOccurrencePairs(normalized, words.map(w => comparisonGreek(w.text)))) {
      const member = words[b];
      // A documented explicit mapping overrides automatic occurrence matching.
      if (evidence?.sourceSpecific.includes(member.id)) continue;
      if (links.some(l => l.members.includes(member.id) && !l.members.includes(anchor[a].id))) continue;
      exactGroups.get(anchor[a].id)!.push(member.id);
      comparisonRows.set(member.id, anchor[a].rowId);
      preferredOccurrences.set(wordId(key, anchor[a].rowId), member.id);
    }
  }
  const latin = columns.vulgate.words, bezaeLatin = columns.bezaeLatin.words;
  for (const [a, b] of exactOccurrencePairs(latin.map(w => comparisonLatin(w.text)), bezaeLatin.map(w => comparisonLatin(w.text)))) {
    const left = latin[a], right = bezaeLatin[b];
    if (left.sourceSpecific || right.sourceSpecific) continue;
    if (links.some(l => l.members.includes(left.id) !== l.members.includes(right.id) && l.members.some(id => id.startsWith(l.members.includes(left.id) ? 'bezaeLatin:' : 'vulgate:')))) continue;
    exactGroups.set(left.id, [left.id, right.id]);
    comparisonRows.set(right.id, left.rowId);
    preferredOccurrences.set(wordId('bezaeLatin', left.rowId), right.id);
  }
  // Expand a documented target only by its unambiguous same-language forms.
  // Do not transitively join distinct semantic or phrase links.
  const equivalentsById = new Map<string, string[]>();
  for (const members of exactGroups.values()) for (const id of members) equivalentsById.set(id, members);
  for (const link of links) {
    const equivalents = link.members.flatMap(id => equivalentsById.get(id) ?? []);
    if (equivalents.some(id => !link.members.includes(id))) {
      link.members = [...new Set([...link.members, ...equivalents])];
      link.basis += ' Additional members are unambiguous same-language form correspondences.';
    }
  }
  for (const [id, members] of exactGroups) if (members.length > 1 && !links.some(l => members.every(member => l.members.includes(member)))) links.push({ id: `form:${id}`, members, status: 'exact-form', basis: id.startsWith('vulgate:') ? 'Unambiguous Latin occurrence between Vulgate and Bezae after case, accents, ligatures and i/j, u/v comparison. This is a form correspondence, not independent scholarly certification.' : 'Unambiguous Greek occurrence after declared case, accent, sigma and contraction comparison. This is a form correspondence, not independent scholarly certification.' });
  // The old grid remains inspectable evidence; it never becomes an established
  // semantic link merely because two cells share a row. A displaced exact form
  // inherits its anchor's comparison group instead of retaining a conflicting
  // positional link. Documented decisions and source-specific words win.
  const documented = new Set(links.filter(l => l.status === 'documented').flatMap(l => l.members));
  const provisionalRows = new Map<string, string[]>();
  for (const [id, rowId] of comparisonRows) {
    if (evidence?.sourceSpecific.includes(id) || documented.has(id)) continue;
    const preferred = preferredOccurrences.get(`${id.split(':')[0]}:${rowId}`);
    if (preferred && preferred !== id) continue;
    const members = provisionalRows.get(rowId) ?? [];
    members.push(id); provisionalRows.set(rowId, members);
  }
  for (const row of data.rows) {
    const contextual = links.filter(l => l.status === 'documented' && l.members.includes(wordId('vaticanus', row.id)) && l.members.filter(id => id.startsWith('vaticanus:')).length === 1);
    // A reviewed word may still have an unreviewed counterpart in another
    // source. Admit that existing association provisionally, but never add a
    // competing word from a source already represented by the reviewed group.
    const candidates = (provisionalRows.get(row.id) ?? []).filter(id => !contextual.some(l => l.members.some(member => member.split(':')[0] === id.split(':')[0])));
    const members = [...new Set([...candidates, ...(candidates.length ? contextual.flatMap(l => l.members) : [])])];
    if (members.length > 1 && !links.some(l => members.every(id => l.members.includes(id)))) links.push({ id: `legacy:${row.id}`, members, status: 'provisional', basis: 'Existing comparison alignment, with unambiguous Greek/Latin form matches following their corresponding occurrence. Still under review: comparison placement alone does not establish semantic equivalence.' });
  }
  return { reference: `${data.gospel} ${data.chapter}:${data.verse}`, columns, links };
}

export function linkedWordIds(model: StreamModel, activeId: string | null, includeProvisional = false): Set<string> {
  if (!activeId) return new Set();
  const result = new Set([activeId]);
  for (const link of model.links) if ((includeProvisional || link.status !== 'provisional') && link.members.includes(activeId)) for (const id of link.members) result.add(id);
  // Deliberately no transitive graph traversal: a phrase spanning two meanings
  // must not merge every word related to either meaning into one large group.
  return result;
}
