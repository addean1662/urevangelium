/**
 * Generates phonetic transliterations for all unique Syriac tokens in the Peshitta
 * (four Gospels) by calling the Claude API, then writes the results to
 * data/sources/peshitta/phonetics.json.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/generateSyriacPhonetics.ts
 *
 * The script is resumable: any tokens already present in phonetics.json are skipped.
 */

import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

// ── Config ────────────────────────────────────────────────────────────────────

const BATCH_SIZE   = 50;   // words per API request
const CONCURRENCY  = 5;    // parallel requests
const OUTPUT_PATH  = path.join(process.cwd(), 'data/sources/peshitta/phonetics.json');
const SOURCE_PATH  = path.join(process.cwd(), 'data/sources/peshitta/Peshitta.txt');

const SYSTEM_PROMPT = `\
You are a Classical Syriac linguist. Provide phonetic transliterations of \
Syriac words from the Peshitta New Testament using Western Syriac \
(Jacobite/Serto) pronunciation.

Transliteration conventions (match the style used for NT Greek):
• Long vowels: ā ē ī ū (macrons) — e.g. zqāpā → ā, rwāhā → ū
• Short vowels: a e i u
• ܫ shin  → sh       ܬ taw (Western) → th
• ܒ beth  → b (word-initial/final), v (between vowels in Western Syriac)
• ܟ kaph  → k (or kh when spirantised after a vowel)
• ܦ pe    → p (or f when spirantised)
• ܚ heth  → ḥ        ܥ ayin → ʿ
• ܐ alaph → ʾ when it is a glottal consonant; silent when a vowel marker
• All other consonants: standard Latin equivalents
• Proper nouns: capitalise the first letter
• Return null for any word you are genuinely uncertain about.

Return ONLY a JSON object: { "<syriac>": "<phonetic>" | null, … }
Include every word provided. No explanation, no markdown fences.`;

// ── Helpers ───────────────────────────────────────────────────────────────────

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

async function fetchPhonetics(
  client: Anthropic,
  words: string[],
): Promise<Record<string, string | null>> {
  const wordList = words.join('\n');
  const response = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system:     SYSTEM_PROMPT,
    messages: [{
      role:    'user',
      content: `Transliterate these Syriac words. Return JSON only.\n\n${wordList}`,
    }],
  });

  const block = response.content.find(b => b.type === 'text');
  if (!block || block.type !== 'text') return {};

  try {
    // Strip any accidental markdown fences before parsing
    const raw = block.text.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
    return JSON.parse(raw) as Record<string, string | null>;
  } catch {
    console.warn('  ⚠ JSON parse failed for batch, skipping');
    return {};
  }
}

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const client = new Anthropic();

  const tokens = extractTokens();
  console.log(`Unique Syriac tokens: ${tokens.length}`);

  // Load any previously generated phonetics (for resumability)
  const existing: Record<string, string | null> = fs.existsSync(OUTPUT_PATH)
    ? (JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8')) as Record<string, string | null>)
    : {};

  const todo = tokens.map(t => t.word).filter(w => !(w in existing));
  console.log(`Already processed: ${tokens.length - todo.length}  |  Remaining: ${todo.length}`);

  if (todo.length === 0) {
    console.log('Nothing to do. phonetics.json is up to date.');
    return;
  }

  // Slice into batches
  const batches: string[][] = [];
  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    batches.push(todo.slice(i, i + BATCH_SIZE));
  }

  console.log(`Processing ${batches.length} batches (${BATCH_SIZE} words each, ${CONCURRENCY} concurrent)…`);

  let done = 0;
  const tasks = batches.map((batch, i) => async () => {
    const result = await fetchPhonetics(client, batch);
    Object.assign(existing, result);
    done++;
    const covered = Object.values(existing).filter(v => v !== null).length;
    process.stdout.write(`\r  ${done}/${batches.length} batches  |  ${covered} phonetics resolved`);
    // Checkpoint: write after every batch so a crash loses at most one batch
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(existing, null, 2), 'utf8');
    return result;
  });

  await runWithConcurrency(tasks, CONCURRENCY);
  console.log('\nDone.');

  const total    = Object.keys(existing).length;
  const resolved = Object.values(existing).filter(v => v !== null).length;
  console.log(`Saved ${total} entries  |  ${resolved} resolved  |  ${total - resolved} null (uncertain)`);
  console.log(`Output: ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
