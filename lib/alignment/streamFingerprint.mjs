/** Only display and occurrence identity fields; works before and after schema parsing. */
export function streamFingerprintInput(data) {
  const keys = ['papyrus', 'coptic', 'vaticanus', 'sinaiticus', 'vulgate', 'bezae', 'peshitta', 'byzantine'];
  return JSON.stringify([data.gospel, data.chapter, data.verse, data.rows.map(row => [row.id, ...keys.map(key => {
    const c = row[key] ?? { type: 'empty' };
    const isWord = c.type === 'text' || c.type === 'extant';
    const bilingual = key === 'bezae' && (c.type === 'text' || c.type === 'omitted');
    const hasEnglish = key !== 'bezae' && (isWord || c.type === 'translation');
    const gloss = hasEnglish && c.gloss ? ['gloss','source','deviation','generated','experimental','automaticAnnotation','tooltip','spanId','spanRole'].map(key => c.gloss[key] ?? null) : null;
    return [c.type, isWord ? c.text ?? null : null, bilingual ? c.greek ?? null : null, bilingual ? c.latin ?? null : null,
      bilingual ? c.greekLost ?? false : false, bilingual ? c.latinLost ?? false : false,
      bilingual ? c.greekOmitted ?? false : false, bilingual ? c.latinOmitted ?? false : false,
      gloss, hasEnglish ? stable(c.provenance) : null, isWord ? stable(c.nominaSacra) : null, isWord ? stable(c.sourceUnits) : null];
  })])]);
}

function stable(value) {
  if (value == null) return null;
  if (Array.isArray(value)) return value.map(stable);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
