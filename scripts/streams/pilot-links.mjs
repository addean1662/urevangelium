import crypto from 'node:crypto';
import { streamFingerprintInput } from '../../lib/alignment/streamFingerprint.mjs';

// These decisions apply only to the examined source/English snapshot. Regeneration
// after corpus changes must fail until the examples are reviewed again.
const snapshots = {
  'matthew 1:1': 'f7c04bf1adf555c5552d83cf8e8766c8f7ba185566f9b328acd3fc962fe141f7',
  'mark 1:1': '30b29c2d88704b6aed5d8c146084a396e403d9472e80956dc3ea80b5f2a3059d',
  'luke 1:1': 'eeafd4737fce2d6f484d69c3d6961f5ca5a213bb7ca6ade4d33d30b06607d5d3',
  'john 1:1': '7f3e7f8a8248c45bf7f21900a0c11b7575057798b4ec51faed1ac3bea3619cb0',
  'matthew 12:19': '011afe9c03b64267e620370baf3b61400cd0e8727ccf1d11eea6a83af991f9bf',
};
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
