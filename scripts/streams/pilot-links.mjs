import crypto from 'node:crypto';
import { streamFingerprintInput } from '../../lib/alignment/streamFingerprint.mjs';

// These decisions apply only to the examined source/English snapshot. Regeneration
// after corpus changes must fail until the examples are reviewed again.
const snapshots = {
  'matthew 1:1': '221ece7fce9154acfe669d1635219b91aed89086694eb34852de406de875c706',
  'mark 1:1': '7c6d999670fee78f3cbc8dc1479ab8bc93acf881b3b2bf84c22859af31aa43db',
  'luke 1:1': 'eeafd4737fce2d6f484d69c3d6961f5ca5a213bb7ca6ade4d33d30b06607d5d3',
  'john 1:1': '19ddfceb68c6638085cd110c78869922c1d99a6716c7f1857792cbaff4693449',
  'matthew 12:19': '011afe9c03b64267e620370baf3b61400cd0e8727ccf1d11eea6a83af991f9bf',
  'matthew 3:1': '3025993457fa828cb4d830c0162a28aec460125d585e5e3e28d6cbd6ea221e8b',
};
// Papyrus admission reviewed 2026-10-12: Matthew 1:1 r7 and Matthew 3:1 r1-r5
// become loss records; Matthew 3:1 r6 retains only its surviving letters.
// textAt excludes lost members. Other columns and occurrence identities are unchanged.
// Project-authored correspondence examples, not independent scholarly certification.
// Source wording and English allocations are never modified here.
export function pilotLinks(reference, document) {
  if (snapshots[reference] && crypto.createHash('sha256').update(streamFingerprintInput(document)).digest('hex') !== snapshots[reference]) throw new Error(`${reference}: pilot snapshot changed; review its correspondence decisions before regenerating`);
  const rows = new Map(document.rows.map(row => [row.id, row]));
  const links = [], sourceSpecific = [];
  const all = ['papyrus', 'coptic', 'vaticanus', 'sinaiticus', 'vulgate', 'bezaeGreek', 'bezaeLatin', 'peshitta', 'byzantine'];
  const greek = ['papyrus', 'vaticanus', 'sinaiticus', 'bezaeGreek', 'byzantine'];
  const textAt = (key, rowId) => {
    const row = rows.get(rowId);
    if (!row) throw new Error(`${reference}: missing pilot row ${rowId}`);
    if (key.startsWith('bezae')) {
      const cell = row.bezae;
      return cell?.type === 'text' ? cell[key === 'bezaeGreek' ? 'greek' : 'latin'] : undefined;
    }
    const cell = row[key];
    return ['text', 'extant'].includes(cell?.type) ? cell.text : undefined;
  };
  const at = (row, columns) => columns.filter(key => textAt(key, row)).map(key => `${key}:${row}`);
  const add = (label, members, basis) => {
    for (const id of members) { const [key, row] = id.split(':'); if (!textAt(key, row)) throw new Error(`${reference}: non-text pilot member ${id}`); }
    links.push({ id: `pilot:${reference}:${label}`, members: [...new Set(members)], status: 'documented', basis: `Project-authored pilot: ${basis} Source forms and admitted English remain unchanged; independent scholarly review is not claimed.` });
  };
  if (reference === 'matthew 1:1') {
    for (const [row, label] of [['r1','book'],['r2','genealogy'],['r3','Jesus'],['r4','Christ'],['r5','son-David'],['r6','David'],['r7','son-Abraham'],['r8','Abraham']]) add(label, at(row, all), `Clause-specific ${label} correspondence, keyed to occurrences. The two occurrences of “son” are separate groups; Bezae physical loss is excluded.`);
  }
  if (reference === 'matthew 3:1') {
    const same = (row, columns) => at(row, columns);
    const latin = ['vulgate', 'bezaeLatin'];
    add('in-days', [...same('r1', [...greek, ...latin, 'coptic', 'peshitta'])], 'Opening temporal expression; keep the intact Coptic and Syriac word-groups and distinguish the later locative expression.');
    add('connector', [...same('r2', [...greek, 'coptic', 'peshitta']), ...same('r4', latin)], 'Greek δε, Coptic ⲇⲉ and Syriac ܕܝܢ correspond to displaced Latin autem. Latin diebus is days, not this connector.');
    add('days', [...same('r4', [...greek, 'coptic', 'peshitta']), ...same('r2', latin)], 'Greek ημεραις/ημερες, Latin diebus, Coptic ϩⲛⲛⲉϩⲟⲟⲩ and Syriac ܒܝܘܡܬܐ; incorporated prepositions remain attached to the day word-group.');
    for (const [row, label] of [['r5','those'], ['r6','comes'], ['r15','Judea']]) add(label, same(row, all), `Contextual ${label} correspondence; preserve each source spelling and independent sequence.`);
    add('John', [...same('r7', all.filter(k => k !== 'bezaeLatin')), 'bezaeLatin:r3'], 'Displaced Bezae Latin iohannes corresponds to John. There is no displayed Bezae Greek John occurrence to invent or fill.');
    add('Baptist', [...same('r9', all.filter(k => k !== 'coptic')), 'coptic:r12'], 'Coptic ⲡⲃⲁⲡⲧⲓⲥⲧⲏⲥ is the Baptist, not the Greek article at its former comparison position.');
    add('preaching', [...same('r10', [...greek, 'vulgate', 'peshitta']), 'coptic:r9', 'bezaeLatin:r14', 'peshitta:r11'], 'κηρυσσων / prædicans / praedicans / ⲉϥⲧⲁϣⲉⲟⲉⲓϣ and the Syriac verbal unit ܘܡܟܪܙ ܗܘܐ. The Syriac auxiliary is part of the verbal unit, not the following locative expression; existing English allocation is retained.');
    add('in-wilderness', [...same('r11', [...greek, ...latin]), 'coptic:r10'], 'The second discrete locative expression, kept distinct from the opening temporal preposition. Fused material stays with the wilderness head.');
    add('wilderness', [...same('r13', [...greek, ...latin, 'peshitta']), 'coptic:r11'], 'Displaced Coptic ϩⲙⲡϫⲁⲓⲉ and Syriac ܒܚܘܪܒܐ retain their incorporated prepositions and link to wilderness/desert.');
    for (const row of ['r3','r8','r12','r14']) add(`article-${row}`, same(row, greek), 'Discrete Greek article occurrence only; do not attach displaced Latin names or verbs, or a fused Coptic/Syriac article.');
  }
  if (reference === 'mark 1:1') {
    for (const [row, label] of [['r1','beginning'],['r3','gospel'],['r4','Jesus'],['r5','Christ'],['r6','Son']]) add(label, at(row, all), `Opening-clause ${label} correspondence. A missing discrete counterpart contributes no member.`);
    add('article-gospel', at('r2', greek), 'The discrete Greek article modifying gospel; fused affixes and missing Latin/Syriac articles do not become separate counterpart words.');
    add('God', [...at('r7', all.filter(k => k !== 'byzantine' && k !== 'sinaiticus')), ...at('byzantine-mark-1-1-1', ['byzantine','sinaiticus'])], 'The God occurrence links θυ / θεοῦ, Dei / dei, ⲙⲡⲛⲟⲩⲧⲉ, and ܕܐܠܗܐ across displaced rows. Byzantine τοῦ is explicitly excluded.');
    sourceSpecific.push('byzantine:r7');
  }
  if (reference === 'john 1:1') {
    const base = [...greek, 'vulgate'];
    // The fused Coptic opening covers a phrase; Syriac follows the documented
    // semantic-head policy in docs/ALIGNMENT_RULE.md (beginning, not the preposition).
    add('in', at('r1', base), 'Discrete preposition “in”; incorporated prefixes do not become separate counterpart words.');
    add('beginning', [...at('r2', base), 'coptic:r1', 'peshitta:r2'], 'The semantic head beginning, with incorporated prepositional force in the intact Coptic and Syriac word-groups.');
    add('was-1', [...at('r3', base), 'coptic:r2', 'peshitta:r3', 'peshitta:r4'], 'First clause existence/tense unit: Greek ἦν, Latin erat, Coptic ⲛⲉϥϣⲟⲟⲡ, Syriac ܐܝܬܘܗܝ ܗܘܐ.');
    add('Word-1', [...at('r6', base), 'coptic:r3', 'peshitta:r6'], 'First occurrence of Word, including the displaced Coptic subject word-group.');
    add('and-1', [...at('r7', base), 'coptic:r6', 'peshitta:r7'], 'First clause connector; Syriac ܘܗܘ retains its fused pronoun.');
    add('Word-2', [...at('r9', base), 'coptic:r9', 'peshitta:r9'], 'Second occurrence of Word, distinct from the first and third occurrences.');
    add('was-2', [...at('r10', base), 'coptic:r10', 'peshitta:r10', 'peshitta:r11'], 'Second existence/tense unit.');
    add('with', [...at('r12', base), 'peshitta:r12'], 'Discrete relational word with; the Coptic phrase is kept intact under its semantic head God.');
    add('God-2', [...at('r14', base), 'coptic:r12', 'peshitta:r14'], 'Second-clause God occurrence, including the intact Coptic word-group with incorporated relational material.');
    add('and-2', [...at('r15', base), 'coptic:r14'], 'Third-clause discrete connector; Syriac fused conjunction remains with its semantic head.');
    add('God-3', [...at('r16', base), 'coptic:r16', 'peshitta:r15'], 'Third-clause God predicate, preserving fused material without inventing separate tokens.');
    add('was-3', [...at('r17', base), 'coptic:r17', 'peshitta:r17', 'peshitta:r18'], 'Third copular unit.');
    add('Word-3', [...at('r20', base), 'coptic:r20', 'peshitta:r20'], 'Third occurrence of Word.');
    for (const row of ['r5','r8','r13','r19']) add(`article-${row}`, at(row, greek), 'This particular discrete Greek article occurrence; repeated articles are kept distinct.');
  }
  if (reference === 'luke 1:1') {
    // Bezae Latin comparative rows are demonstrably displaced here. Links are
    // named by the actual source form, not inherited from its paired Greek cell.
    add('many', [...at('r2', [...greek,'coptic']), 'vulgate:vulgate-luke-1-1-1', 'peshitta:vulgate-luke-1-1-1', 'bezaeLatin:r5'], 'πολλοί / multi / ⲁϩⲁϩ / ܕܤܓܝܐܐ; both displaced Latin multi occurrences are linked to many. Bezae quidem is excluded.');
    add('undertook', [...at('r3', greek), 'vulgate:r3', 'vulgate:r4', 'bezaeLatin:r7', 'peshitta:r3'], 'Greek ἐπεχείρησαν corresponds to the Latin compound conati sunt and Bezae temptauerunt; English allocations remain separate.');
  }
  if (reference === 'matthew 12:19') {
    add('streets', [...at('r10', [...greek,'vulgate','bezaeLatin','peshitta']), 'coptic:r12'], 'Coptic ϩⲛⲛⲉⲡⲗⲁⲧⲓⲁ has admitted Horner “in the streets”; its row previously coincided with Greek voice. Preserve the source phrase and connect its street contribution.');
    add('voice', [...at('r12', [...greek,'vulgate','bezaeLatin','peshitta']), 'coptic:r10'], 'Coptic ⲉⲧⲉϥⲥⲙⲏ is the voice word-group; separate it from the displaced streets word-group.');
  }
  return { links, sourceSpecific };
}
