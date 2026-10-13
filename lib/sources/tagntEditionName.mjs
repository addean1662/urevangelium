const greek = text => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/gu, 'σ').replace(/[^α-ω]/gu, '');

/** A shared Strong number is not evidence that variant names have the same
 * English. Resolve only an explicitly named edition spelling whose single
 * lemma and proper-name gloss agree within the same published TAGNT record.
 * Return existing source strings, never a transliteration generated here. */
export function tagntEditionName(columns, edition) {
  if (!/-P$/u.test(columns[3] ?? '')) return null;
  const lemmaParts = (columns[4] ?? '').split('=');
  if (lemmaParts.length !== 2) return null;
  const [lemma, gloss] = lemmaParts;
  if (!/^[\p{Script=Greek}\p{M}]+$/u.test(lemma) || !/^[A-Z][A-Za-z'-]*$/u.test(gloss)) return null;
  const names = (columns[7] ?? '').split(';').flatMap(note => {
    const parts = note.trim().split(':');
    if (parts.length !== 2 || !parts[0].split('+').includes(edition)) return [];
    const text = parts[1].trim();
    return /^[\p{Script=Greek}\p{M}]+$/u.test(text) && greek(text) === greek(lemma) ? [text] : [];
  });
  if (names.length !== 1) return null;
  // Leave ordinary contextual wording and punctuation untouched. This guard
  // applies when the base reading actually supplies a different English name.
  if ((columns[2] ?? '').match(/[A-Za-z]+/gu)?.join(' ') === gloss) return null;
  return { text: names[0], gloss, reference: columns[0], edition, evidence: columns[7], lemma: columns[4] };
}
