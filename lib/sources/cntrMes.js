/**
 * Lossless-enough parser for CNTR's Manuscript Encoding Specification (MES).
 * It preserves the raw source alongside a structured base-hand projection.
 * Source grammar: https://github.com/Center-for-New-Testament-Restoration/transcriptions/blob/main/MES.g4
 */

const BREAK_KIND = { '\\': 'page', '|': 'column', '/': 'line' };

/** Split only on spaces outside edited-text braces. */
export function splitMesSegments(text) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') depth = Math.max(0, depth - 1);
    else if (text[i] === ' ' && depth === 0) {
      if (i > start) parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  if (start < text.length) parts.push(text.slice(start));
  return parts;
}

function readBreaks(raw, cursor, breaks) {
  while (BREAK_KIND[raw[cursor]]) {
    const symbol = raw[cursor++];
    let digits = '';
    while (/\d/.test(raw[cursor] ?? '')) digits += raw[cursor++];
    breaks.push({ kind: BREAK_KIND[symbol], number: digits ? Number(digits) : null, offset: cursor - digits.length - 1 });
  }
  return cursor;
}

/** Parse one MES word without discarding diplomatic conditions. */
export function parseMesWord(raw) {
  let cursor = 0;
  let alternateVerse = null;
  const breaks = [];
  const conditions = [];

  if (raw[cursor] === '⋄') {
    cursor++;
    let digits = '';
    while (/\d/.test(raw[cursor] ?? '')) digits += raw[cursor++];
    alternateVerse = digits ? Number(digits) : null;
  }
  cursor = readBreaks(raw, cursor, breaks);

  let lineRemnant = false;
  let verseRemnant = false;
  if (raw[cursor] === '&') { lineRemnant = true; cursor++; }
  if (raw[cursor] === '*') { verseRemnant = true; cursor++; }

  let presence = 'unspecified';
  if (raw[cursor] === '+') { presence = 'present'; cursor++; }
  else if (raw[cursor] === '-') { presence = 'absent'; cursor++; }

  let supplied = null;
  if (raw[cursor] === '~') { supplied = 'editor'; cursor++; }
  else if (raw[cursor] === '+') { supplied = 'vid'; cursor++; }

  let abbreviation = null;
  if (raw[cursor] === '=') { abbreviation = 'nomina-sacra'; cursor++; }
  else if (raw[cursor] === '$') { abbreviation = 'numeric'; cursor++; }

  let diplomatic = '';
  while (cursor < raw.length) {
    const char = raw[cursor];
    if (BREAK_KIND[char]) { cursor = readBreaks(raw, cursor, breaks); continue; }
    if (char === '&') { lineRemnant = true; cursor++; continue; }
    if (char === '*') { verseRemnant = true; cursor++; continue; }
    if (char === '_') { conditions.push({ kind: 'altered-word-division', after: diplomatic.length }); cursor++; continue; }
    if (char === '%' || char === '^') {
      conditions.push({ kind: char === '%' ? 'damaged' : 'missing', after: diplomatic.length });
      cursor++;
      continue;
    }
    diplomatic += char;
    cursor++;
  }

  return { raw, diplomatic, alternateVerse, breaks, lineRemnant, verseRemnant, presence, supplied, abbreviation, conditions };
}

function parseEdit(raw, marker) {
  const open = raw.indexOf('{');
  if (open < 0 || !raw.endsWith('}')) throw new Error(`Malformed MES edit: ${raw}`);
  const content = raw.slice(open + 1, -1);
  return { marker, raw, words: content ? splitMesSegments(content).map(parseMesWord) : [] };
}

/** Group MES correction tokens: x{original} {base} a{later}. */
function parseCorrection(tokens, start) {
  const edits = [];
  let cursor = start;
  while (cursor < tokens.length) {
    const token = tokens[cursor];
    const match = token.match(/^([xabc])?\{.*\}$/s);
    if (!match) break;
    edits.push(parseEdit(token, match[1] ?? 'base'));
    cursor++;
    if (match[1] === undefined) {
      while (cursor < tokens.length && /^[abc]\{.*\}$/s.test(tokens[cursor])) {
        const later = tokens[cursor].match(/^([abc])\{.*\}$/s);
        edits.push(parseEdit(tokens[cursor], later[1]));
        cursor++;
      }
      break;
    }
  }
  if (!edits.some((edit) => edit.marker === 'base')) throw new Error(`MES correction lacks base reading near ${tokens[start]}`);
  return { segment: { type: 'correction', raw: tokens.slice(start, cursor).join(' '), edits }, next: cursor };
}

export function parseMesText(text) {
  const tokens = splitMesSegments(text);
  const segments = [];
  for (let i = 0; i < tokens.length;) {
    if (/^(?:x\{|\{)/s.test(tokens[i])) {
      const parsed = parseCorrection(tokens, i);
      segments.push(parsed.segment);
      i = parsed.next;
    } else {
      segments.push({ type: 'word', word: parseMesWord(tokens[i]) });
      i++;
    }
  }
  return segments;
}

export function baseWords(segments) {
  return segments.flatMap((segment) => {
    if (segment.type === 'word') return [segment.word];
    return segment.edits.find((edit) => edit.marker === 'base')?.words ?? [];
  });
}

export function parseMesLine(line) {
  const match = line.match(/^(\d{2})(\d{3})(\d{3}) (.*)$/s);
  if (!match) throw new Error(`Invalid MES line: ${line}`);
  const [, book, chapter, verse, text] = match;
  const segments = parseMesText(text);
  return {
    reference: { code: `${book}${chapter}${verse}`, book: Number(book), chapter: Number(chapter), verse: Number(verse) },
    raw: text,
    segments,
    baseWords: baseWords(segments),
  };
}

export function comparisonForm(word) {
  const normalized = word.diplomatic
    // CNTR Technical Reference §1.2.1.2: expand special manuscript glyphs
    // for collation only. The diplomatic field above remains untouched.
    .replace(/¯/g, 'ν')
    .replace(/ϗ/g, 'και')
    .replace(/⳨/g, 'τρ')
    .replace(/\ue001/g, 'μου')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ς/g, 'σ')
    .replace(/[^α-ωϛϟ�]/g, '');

  // Expand conventional nomina-sacra forms only in the collation key. The
  // diplomatic transcription remains abbreviated and is what we publish.
  if (word.abbreviation === 'nomina-sacra') {
    const expansions = {
      ισ: 'ιησουσ', ιυ: 'ιησου', ιν: 'ιησουν', ιη: 'ιησου',
      χσ: 'χριστοσ', χυ: 'χριστου', χν: 'χριστον', χω: 'χριστω',
      κσ: 'κυριοσ', κυ: 'κυριου', κν: 'κυριον', κω: 'κυριω', κε: 'κυριε',
      θσ: 'θεοσ', θυ: 'θεου', θν: 'θεον', θω: 'θεω',
      πνα: 'πνευμα', πνσ: 'πνευματοσ', πνι: 'πνευματι',
    };
    return expansions[normalized] ?? normalized;
  }
  return normalized;
}
