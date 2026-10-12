/** Source evidence, not a comparison text, controls admission to the papyrus column. */
export function papyrusWordEvidence(word) {
  const missing = new Set(word.conditions.filter(c => c.kind === 'missing').map(c => c.after - 1));
  // MES '+' before a word is supplied by vid, not surviving ink.
  const supplied = Boolean(word.supplied || word.presence === 'present');
  const surviving = [...word.diplomatic].some((c, i) => !missing.has(i) && /\p{L}/u.test(c));
  const status = (supplied && !missing.size) || !surviving ? 'fully-supplied' : missing.size ? 'partial' : 'attested';
  const visible = status === 'fully-supplied' ? '' : [...word.diplomatic].map((c, i) => missing.has(i) ? '·' : c).join('');
  return { status, visible, supplied, missingAfter: [...missing].map(i => i + 1) };
}

export function papyrusDisplayText(text) {
  return text.replaceAll('¯', 'ν').replaceAll('ϗ', 'και').replaceAll('ϫ', 'τρ').replaceAll('\ue001', 'μου');
}
const normalized = text => papyrusDisplayText(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replaceAll('ς', 'σ');

/** Rebuild one cell from exact witness/verse/token coordinates. Never borrow Greek from another column. */
export function admitPapyrusCell(cell, reference, index) {
  if (!cell) return cell;
  if (cell.type !== 'extant' && !cell.provenance?.attestationPolicy) return cell;
  const coordinates = cell.provenance?.sourceAttestations;
  if (!coordinates?.length) throw new Error(`Missing papyrus word-level provenance: ${reference}`);
  const attestations = coordinates.map(a => {
    const word = index.words.get(`${reference} ${a.siglum}`)?.[a.sourceToken - 1];
    if (!word || normalized(word.diplomatic) !== normalized(a.diplomatic)) throw new Error(`Unresolved papyrus coordinate: ${reference} ${a.siglum} #${a.sourceToken}`);
    const evidence = papyrusWordEvidence(word);
    return { ...a, evidenceStatus: evidence.status, raw: word.raw, visible: evidence.visible, conditions: word.conditions, supplied: word.supplied ?? (word.presence === 'present' ? 'vid' : null) };
  });
  const groups = new Map();
  for (const a of attestations) {
    if (!index.dates.has(a.siglum)) throw new Error(`Undeclared papyrus: ${a.siglum}`);
    const members = groups.get(a.siglum) ?? [];
    members.push(a);
    groups.set(a.siglum, members);
  }
  const readings = [...groups.entries()].map(([siglum, members]) => {
    members.sort((a, b) => a.sourceToken - b.sourceToken);
    const preserved = members.filter(a => a.evidenceStatus !== 'fully-supplied');
    return { siglum, members, preserved, text: members.map(a => a.diplomatic).join(' '), visible: members.map(a => a.visible || '···').join(' '), status: !preserved.length ? 'fully-supplied' : members.every(a => a.evidenceStatus === 'attested') ? 'attested' : 'partial' };
  });
  const dateRank = a => Number(index.dates.get(a.siglum)?.match(/\d{3,4}/)?.[0] ?? 9999);
  const rank = (a, b) => Number(a.status !== 'attested') - Number(b.status !== 'attested') || dateRank(a) - dateRank(b) || Number(a.siglum.match(/\d+/)[0]) - Number(b.siglum.match(/\d+/)[0]);
  const surviving = readings.filter(a => a.status !== 'fully-supplied').sort(rank);
  const selected = surviving[0];
  const editorialNotes = readings.filter(a => a.status !== 'attested').map(a => `${a.siglum}: ${a.status === 'fully-supplied' ? 'editorial restoration; no readable text recorded for this word' : 'partially preserved; dots replace missing letters'}. Transcription proposes: ${papyrusDisplayText(a.text)}.`);
  const provenance = {
    ...cell.provenance,
    attestationPolicy: 'surviving-papyrus-evidence-v1',
    sourceAttestations: attestations,
    // Keep an earlier gloss only as archival evidence when its reconstructed Greek is suppressed.
    ...((cell.gloss && !cell.provenance?.archivalGloss) ? { archivalGloss: cell.gloss, archivalGlossReading: cell.provenance?.diplomatic ?? cell.text } : {}),
    evidenceStatus: selected?.status ?? 'fully-supplied',
    governingSiglum: selected?.siglum ?? null,
    sourceToken: selected?.preserved[0].sourceToken ?? null,
    diplomatic: selected?.text ?? null,
    agreeingSigla: selected ? surviving.filter(a => a.status === selected.status && normalized(a.text) === normalized(selected.text)).map(a => a.siglum) : [],
    dissentingReadings: selected ? readings.filter(a => normalized(a.text) !== normalized(selected.text)).map(a => ({ siglum: a.siglum, sourceToken: a.members[0].sourceToken, diplomatic: a.text, evidenceStatus: a.status })) : [],
    verification: 'pinned-transcription-evidence-checked; not-image-certified',
  };
  if (!selected) return { type: 'lost', provenance, editorialNotes };
  const matching = surviving.filter(a => a.status === selected.status && normalized(a.text) === normalized(selected.text));
  const condition = {};
  if (selected.members.some(a => a.conditions.some(c => c.kind === 'damaged'))) condition.damaged = true;
  if (selected.status === 'partial') condition.partial = true;
  if (cell.condition?.manuscriptStatus && cell.provenance?.governingSiglum === selected.siglum) condition.manuscriptStatus = cell.condition.manuscriptStatus;
  if (cell.condition?.sourceImageUrl && cell.provenance?.governingSiglum === selected.siglum) condition.sourceImageUrl = cell.condition.sourceImageUrl;
  const gloss = cell.provenance?.archivalGloss ?? cell.gloss;
  // A gloss of a different reading or of a reconstructed word is not an attested-word gloss.
  const sameReading = normalized(cell.provenance?.archivalGlossReading ?? cell.provenance?.diplomatic ?? cell.text ?? '') === normalized(selected.text);
  return {
    type: 'extant',
    fragments: matching.map(a => ({ id: a.siglum, date: index.dates.get(a.siglum) })),
    text: papyrusDisplayText(selected.visible),
    ...(Object.keys(condition).length ? { condition } : {}),
    ...(selected.status === 'attested' && sameReading && gloss ? { gloss } : {}),
    ...(selected.status === 'attested' && sameReading && cell.nominaSacra ? { nominaSacra: cell.nominaSacra } : {}),
    provenance,
    ...(editorialNotes.length ? { editorialNotes } : {}),
  };
}

export function admitPapyrusVerse(data, index) {
  return { ...data, rows: data.rows.map(row => ({ ...row, papyrus: admitPapyrusCell(row.papyrus, `${data.gospel} ${data.chapter}:${data.verse}`, index) })) };
}
