import fs from 'fs';
import path from 'path';

// Map from lowercase stem → first English definition
let stemMap: Map<string, string> | null = null;

function loadDictline(): Map<string, string> {
  if (stemMap) return stemMap;

  const filePath = path.join(process.cwd(), 'data/sources/glosses/whitaker/DICTLINE.GEN');
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const map = new Map<string, string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const tokens = trimmed.split(/\s+/);
    if (tokens.length < 7) continue;

    const stem = tokens[0].toLowerCase();

    // Find the 5-flag block: five consecutive single uppercase letters
    // The definition follows immediately after the flags.
    // Search from the right to find the last such group before non-single-letter text.
    let defStart = -1;
    for (let i = tokens.length - 6; i >= 0; i--) {
      const five = tokens.slice(i, i + 5);
      const nextTok = tokens[i + 5];
      if (
        five.every(t => /^[A-Z]$/.test(t)) &&
        nextTok &&
        !/^[A-Z]$/.test(nextTok)
      ) {
        defStart = i + 5;
        break;
      }
    }

    if (defStart < 0) continue;

    const def = tokens.slice(defStart).join(' ').replace(/;$/, '').split(';')[0].trim();
    if (def && !map.has(stem)) {
      map.set(stem, def);
    }
  }

  stemMap = map;
  return map;
}

// Common Latin inflectional endings to strip when looking up a stem
const ENDINGS = [
  'tionem', 'tionis', 'tioni', 'tione', 'tiones',
  'ationem', 'ationis', 'ationi', 'atione', 'ationes',
  'orum', 'arum', 'ibus', 'issimum', 'issimus', 'issima',
  'orum', 'orum',
  'isque', 'umque',
  'que',
  'ntis', 'ntem', 'nti', 'nte', 'ntes',
  'antis', 'antem', 'anti', 'ante', 'antes',
  'entis', 'entem', 'enti', 'ente', 'entes',
  'atis', 'ati', 'atis',
  'imus', 'itis', 'erunt', 'erat', 'erant', 'erit', 'erint',
  'amus', 'atis', 'abam', 'abas', 'abat', 'abamus', 'abatis', 'abant',
  'abo', 'abis', 'abit', 'abimus', 'abitis', 'abunt',
  'onem', 'onis', 'oni', 'one', 'ones',
  'itatis', 'itati', 'itatem', 'itate', 'itates',
  'atis', 'ate', 'ates',
  'orum', 'is', 'os', 'um', 'us', 'ae', 'am', 'as',
  'em', 'ei', 'eo', 'es', 'e',
  'i', 'o',
];

export function getLatinGloss(word: string): string | null {
  const map = loadDictline();
  const lower = word.toLowerCase().replace(/[.,;:!?]+$/, '');

  // Direct lookup first
  const direct = map.get(lower);
  if (direct) return direct;

  // Try progressive ending strips
  for (const ending of ENDINGS) {
    if (lower.endsWith(ending) && lower.length - ending.length >= 2) {
      const stem = lower.slice(0, lower.length - ending.length);
      const found = map.get(stem);
      if (found) return found;
    }
  }

  return null;
}
