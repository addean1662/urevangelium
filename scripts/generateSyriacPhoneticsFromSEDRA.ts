/**
 * Generates phonetic transliterations for all unique Syriac tokens in the
 * Peshitta (four Gospels) using the SEDRA III database (MIT-licensed via
 * sedrajs) as the primary source, with Claude API as fallback for the small
 * number of tokens SEDRA does not cover.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/generateSyriacPhoneticsFromSEDRA.ts
 *
 * Output: data/sources/peshitta/phonetics.json
 */

import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sedra = require('sedrajs') as { words: Array<{ word: string; vocalised: string } | undefined> };

// ── Config ────────────────────────────────────────────────────────────────────

const OUTPUT_PATH = path.join(process.cwd(), 'data/sources/peshitta/phonetics.json');
const SOURCE_PATH = path.join(process.cwd(), 'data/sources/peshitta/Peshitta.txt');

// ── Unicode → CAL ─────────────────────────────────────────────────────────────
// Maps Unicode Syriac codepoints to CAL ASCII letters.
// ܤ (U+0724, alternate samekh) is normalised to 's' — same as ܣ (U+0723).

const UNICODE_TO_CAL: Record<string, string> = {
  'ܐ': ')', 'ܒ': 'b', 'ܓ': 'g', 'ܕ': 'd', 'ܗ': 'h', 'ܘ': 'w',
  'ܙ': 'z', 'ܚ': 'x', 'ܛ': 'T', 'ܝ': 'y', 'ܟ': 'k', 'ܠ': 'l',
  'ܡ': 'm', 'ܢ': 'n', 'ܣ': 's', 'ܤ': 's',
  'ܥ': '(', 'ܦ': 'p', 'ܨ': 'c', 'ܩ': 'q', 'ܪ': 'r', 'ܫ': '$', 'ܬ': 't',
  'ܖ': 'r', 'ܜ': 'T', 'ܞ': 's',
};

function unicodeToCAL(word: string): string {
  let out = '';
  for (const ch of word) {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x0730 && cp <= 0x074A) continue; // skip diacritics / vowel points
    out += UNICODE_TO_CAL[ch] ?? '';
  }
  return out;
}

// ── CAL vocalised → Western Syriac phonetic ──────────────────────────────────
// SEDRA CAL vocalised notation:
//   Consonants: ) b g d h w z x T y k K l m M n N s ( p P c q r $ t
//   Vowels:     a=pthaha  A=zqapa  e=rbasa  E=zlama  i=hbasa  u=rwaha  o=esasa
//   , after consonant = qushaya/dagesh (hard plosive)
//   ' = separator / readability marker (not rukkakha) — skip
//
// Western Syriac (Beth Mardutho) conventions applied:
//   esasa (o) → ā   (Western ā-vowel, historically from original /ā/)
//   rwaha  (u) → ū
//   Post-process: yi → ī  (yod + hbasa = long ī)
//                 wu → ū  (waw + rwaha = long ū via vowel carrier)

const BGD_KPT_HARD: Record<string, string> = {
  b: 'b', g: 'g', d: 'd', k: 'k', K: 'k', p: 'p', P: 'p', t: 't',
};
const BGD_KPT_SOFT: Record<string, string> = {
  b: 'v', g: 'g', d: 'd', k: 'kh', K: 'kh', p: 'f', P: 'f', t: 'th',
};
const CONS_MAP: Record<string, string> = {
  ')': 'ʾ', h: 'h', w: 'w', z: 'z', x: 'ḥ', T: 'ṭ', y: 'y',
  l: 'l', m: 'm', M: 'm', n: 'n', N: 'n', s: 's',
  '(': 'ʿ', c: 'ṣ', q: 'q', r: 'r', $: 'sh',
};
const VOWEL_MAP: Record<string, string> = {
  a: 'a', A: 'ā', e: 'e', E: 'ē', i: 'i', u: 'ū',
  o: 'ā', // esasa = Western ā
};

function calToPhonetic(cal: string): string {
  let result = '';
  let i = 0;
  let prevWasVowel = false;

  while (i < cal.length) {
    const ch = cal[i];

    // ── Vowels ───────────────────────────────────────────────────────────────
    if (VOWEL_MAP[ch]) {
      result += VOWEL_MAP[ch];
      prevWasVowel = true;
      i++;
      continue;
    }

    // ── Separators / markers ─────────────────────────────────────────────────
    if (ch === "'" || ch === ',') {
      i++;
      continue;
    }

    // ── BGD-KPT consonants ───────────────────────────────────────────────────
    if (BGD_KPT_HARD[ch] !== undefined) {
      const next = cal[i + 1];
      let isHard: boolean;
      if (next === ',') {
        isHard = true;
        i++; // consume the dagesh marker — will be skipped on next iter
      } else {
        // No explicit marker: apply standard BGD-KPT rule.
        // Hard after a consonant or at word-start; soft after a vowel.
        isHard = !prevWasVowel;
      }
      result += isHard ? BGD_KPT_HARD[ch] : BGD_KPT_SOFT[ch];
      prevWasVowel = false;
      i++;
      continue;
    }

    // ── Non-BGD-KPT consonants ───────────────────────────────────────────────
    if (CONS_MAP[ch] !== undefined) {
      // Final alaph after a vowel = mater lectionis → silent, skip
      if (ch === ')' && prevWasVowel && i === cal.length - 1) {
        i++;
        continue;
      }
      // Internal alaph between two vowels = vowel carrier → skip consonant glyph
      if (ch === ')' && prevWasVowel && i + 1 < cal.length && VOWEL_MAP[cal[i + 1]]) {
        i++;
        prevWasVowel = false;
        continue;
      }
      result += CONS_MAP[ch];
      prevWasVowel = false;
      i++;
      continue;
    }

    i++;
  }

  // Post-process vowel-carrier sequences.
  // By this point u (rwaha) is already 'ū' and i (hbasa) is 'i',
  // so match the output forms, not the raw CAL chars.
  return result
    .replace(/yi/g, 'ī')  // yod + hbasa = long ī
    .replace(/wū/g, 'ū'); // waw + rwaha = long ū (waw is mater lectionis)
}

// ── Token extraction ──────────────────────────────────────────────────────────

function extractTokens(): { word: string; freq: number }[] {
  const text  = fs.readFileSync(SOURCE_PATH, 'utf8');
  const lines = text.split('\n');
  const freq  = new Map<string, number>();
  let inGospel = false;

  for (const line of lines) {
    const t = line.trim();
    if (/^### (Matthew|Mark|Luke|John)/.test(t)) { inGospel = true; continue; }
    if (inGospel && t.startsWith('### '))         { inGospel = false; continue; }
    if (!inGospel) continue;

    const m = t.match(/^\[\d+:\d+\]\s+(.+)$/);
    if (!m) continue;

    for (const raw of m[1].split(/\s+/)) {
      const w = raw.replace(/[܀-܍܏]+$/, '').replace(/^[܀-܍܏]+/, '').trim();
      if (w) freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }

  return [...freq.entries()]
    .map(([word, f]) => ({ word, freq: f }))
    .sort((a, b) => b.freq - a.freq);
}

// ── SEDRA lookup map ──────────────────────────────────────────────────────────

function buildSEDRAIndex(): Map<string, string> {
  const index = new Map<string, string>();
  for (const w of sedra.words) {
    if (!w) continue;
    if (!index.has(w.word)) {
      index.set(w.word, w.vocalised);
    }
  }
  return index;
}

// ── Claude API fallback (for tokens not in SEDRA) ────────────────────────────

const FALLBACK_SYSTEM_PROMPT = `\
You are a Classical Syriac linguist. Provide phonetic transliterations of \
Syriac words from the Peshitta New Testament using Western Syriac \
(Jacobite/Serto) pronunciation.

Transliteration conventions (Beth Mardutho standard, all lowercase):
• Long vowels: ā ē ī ū (macrons)
• Short vowels: a e i u
• ܫ shin  → sh       ܬ taw (Western) → th (spirantised) / t (plosive)
• ܒ beth  → b (hard) / v (spirantised between vowels)
• ܟ kaph  → k (hard) / kh (spirantised)
• ܦ pe    → p (hard) / f (spirantised)
• ܚ heth  → ḥ        ܥ ayin → ʿ
• ܐ alaph → ʾ when consonantal; silent when vowel-carrier
• All other consonants: standard Latin equivalents
• All output must be lowercase — do not capitalise any word.
• Return null for any word you are genuinely uncertain about.

Return ONLY a JSON object: { "<syriac>": "<phonetic>" | null, … }
Include every word provided. No explanation, no markdown fences.`;

async function fetchFallbackPhonetics(
  client: Anthropic,
  words: string[],
): Promise<Record<string, string | null>> {
  const response = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system:     FALLBACK_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Transliterate these Syriac words. Return JSON only.\n\n${words.join('\n')}` }],
  });
  const block = response.content.find(b => b.type === 'text');
  if (!block || block.type !== 'text') return {};
  try {
    const raw = block.text.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
    return JSON.parse(raw) as Record<string, string | null>;
  } catch {
    console.warn('  ⚠ JSON parse failed for fallback batch');
    return {};
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const tokens = extractTokens();
  console.log(`Unique Syriac tokens: ${tokens.length}`);

  const sedraIndex = buildSEDRAIndex();
  console.log(`SEDRA index size: ${sedraIndex.size} CAL forms`);

  const result: Record<string, string | null> = {};
  let sedraHits = 0, fallbackNeeded: string[] = [];

  for (const { word } of tokens) {
    const cal = unicodeToCAL(word);
    const vocalised = sedraIndex.get(cal);
    if (vocalised) {
      result[word] = calToPhonetic(vocalised);
      sedraHits++;
    } else {
      fallbackNeeded.push(word);
    }
  }

  console.log(`SEDRA resolved: ${sedraHits}  |  Fallback needed: ${fallbackNeeded.length}`);

  if (fallbackNeeded.length > 0) {
    console.log(`Fallback tokens: ${fallbackNeeded.join('  ')}`);
    if (process.env.ANTHROPIC_API_KEY) {
      const client = new Anthropic();
      const fallback = await fetchFallbackPhonetics(client, fallbackNeeded);
      Object.assign(result, fallback);
      console.log(`Claude fallback resolved: ${Object.keys(fallback).length} entries`);
    } else {
      console.warn('  ANTHROPIC_API_KEY not set — fallback tokens left as null');
      for (const w of fallbackNeeded) result[w] = null;
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), 'utf8');

  const resolved = Object.values(result).filter(v => v !== null).length;
  console.log(`\nSaved ${tokens.length} entries  |  ${resolved} resolved  |  ${tokens.length - resolved} null`);
  console.log(`Output: ${OUTPUT_PATH}`);
}

main().catch(err => { console.error(err); process.exit(1); });
