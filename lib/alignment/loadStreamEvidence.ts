import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { Gospel, VerseData } from '@/lib/types';
import type { StreamEvidence } from './streams';
import { streamFingerprintInput } from './streamFingerprint.mjs';

type EvidenceIndex = { schema: 1; verses: Record<string, StreamEvidence> };
const indexes = new Map<Gospel, EvidenceIndex>();

export function loadStreamEvidence(data: VerseData): StreamEvidence | undefined {
  let index = indexes.get(data.gospel);
  if (!index) {
    try {
      index = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/alignment-streams', `${data.gospel}.json`), 'utf8')) as EvidenceIndex;
      if (index.schema !== 1) return undefined;
      indexes.set(data.gospel, index);
    } catch { return undefined; }
  }
  const evidence = index.verses[`${data.chapter}:${data.verse}`];
  const fingerprint = createHash('sha256').update(streamFingerprintInput(data)).digest('hex');
  // A corpus edit invalidates its occurrence links instead of silently assigning
  // old correspondence decisions to new words at the same visual position.
  return evidence?.fingerprint === fingerprint ? evidence : undefined;
}
