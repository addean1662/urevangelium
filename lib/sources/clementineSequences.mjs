// Shared Clementine verse-boundary concordance used by the builder and verifier.
import fs from 'node:fs';
import path from 'node:path';
const HEADINGS = { Matthew: 'matthew', Mark: 'mark', Luke: 'luke', John: 'john' };
const tokenize = value => value.normalize('NFC').replace(/[\p{P}\p{S}]+/gu, ' ').trim().split(/\s+/u).filter(Boolean);
const normalized = value => value.toLocaleLowerCase('la').replaceAll('j','i').replaceAll('v','u');
export function loadClementineSequences(dataRoot) {
  const result = new Map();
  let gospel = null;
  for (const line of fs.readFileSync(path.join(dataRoot, 'sources/vulgate/VulgClementine.txt'), 'utf8').split(/\r?\n/u)) {
    const heading = line.match(/^###\s+(\S+)\s*$/u);
    if (heading) {
      gospel = HEADINGS[heading[1]] ?? null;
      continue;
    }
    const match = line.match(/^\[(\d+):(\d+)\]\s+(.+)$/u);
    if (!gospel || !match) continue;
    const sourceReference = `${gospel} ${Number(match[1])}:${Number(match[2])}`;
    result.set(sourceReference, { tokens: tokenize(match[3]), sourceReference });
  }
  const splitAt = (record, marker) => {
    const index = record.tokens.findIndex((token) => normalized(token) === normalized(marker));
    if (index < 0) throw new Error(`Cannot split ${record.sourceReference} at ${marker}`);
    return [
      { tokens: record.tokens.slice(0, index), sourceReference: record.sourceReference },
      { tokens: record.tokens.slice(index), sourceReference: record.sourceReference },
    ];
  };

  // Clementine/modern verse-boundary concordance. No words are added or removed.
  const originals = new Map(result);
  const matthew14 = originals.get('matthew 17:14');
  const [matthewSite14, matthewSite15] = splitAt(matthew14, 'Domine');
  result.set('matthew 17:14', matthewSite14);
  result.set('matthew 17:15', matthewSite15);
  for (let verse = 16; verse <= 27; verse += 1) result.set(`matthew 17:${verse}`, originals.get(`matthew 17:${verse - 1}`));

  const mark40 = originals.get('mark 4:40');
  const splitMark40 = mark40.tokens.findIndex((token, index) => index > 0 && normalized(token) === 'et' && normalized(mark40.tokens[index + 1] ?? '') === 'timuerunt');
  if (splitMark40 < 0) throw new Error('Cannot split mark 4:40/41');
  result.set('mark 4:40', { tokens: mark40.tokens.slice(0, splitMark40), sourceReference: mark40.sourceReference });
  result.set('mark 4:41', { tokens: mark40.tokens.slice(splitMark40), sourceReference: mark40.sourceReference });

  const mark839 = originals.get('mark 8:39');
  result.set('mark 9:1', mark839);
  for (let verse = 2; verse <= 50; verse += 1) result.set(`mark 9:${verse}`, originals.get(`mark 9:${verse - 1}`));

  const john56 = originals.get('john 11:56');
  const [johnSite56, johnSite57] = splitAt(john56, 'Dederant');
  result.set('john 11:56', johnSite56);
  result.set('john 11:57', johnSite57);

  // Clementine divides the material displayed as John 6:51 into 6:51–52.
  result.set('john 6:51', {
    tokens: [...originals.get('john 6:51').tokens, ...originals.get('john 6:52').tokens],
    sourceReference: 'john 6:51–52',
  });
  for (let verse = 52; verse <= 71; verse += 1) result.set(`john 6:${verse}`, originals.get(`john 6:${verse + 1}`));
  return result;
}
