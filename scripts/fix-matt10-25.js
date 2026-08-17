// Fix Matthew 10:25 P110 — 4-row leading displacement + r20/r21 word-order swap + r25 text variant
// P110 INTF: γενηται ως ο διδασκαλος αυτου και ο δουλος ως ο κς αυτου ει τον οικοδεσποτην
//            επεκαλεσεν βεελζεβουλ ποσω μαλλον τοις οικιοις τους οικιους αυτου
//
// Correct row mapping (Vaticanus rows):
//   r1-r4  → lacuna  (P110 omits αρκετον τω μαθητη ινα)
//   r5-r19 → shift current r1-r15 content down by 4
//   r20    → βεελζεβουλ  (word-order: P110 has επεκαλεσεν THEN name; align name at Vat βεελζεβουλ row)
//   r21    → επεκαλεσεν  (singular; Vaticanus has plural επεκαλεσαν)
//   r22-r24 → shift current r18-r20 content
//   r25    → οικιους  (P110 variant; Vaticanus has οικιακους)
//   r26    → αυτου

const fs = require('fs');
const path = require('path');

const f = path.join(__dirname, '../data/matthew/10/25.json');
const d = JSON.parse(fs.readFileSync(f, 'utf8'));

const P110_FRAG = [{ id: 'P110', date: 'c. 4th c. CE' }];
const lacuna = { type: 'lacuna' };

function extant(text, gloss) {
  return { type: 'extant', fragments: P110_FRAG, text, gloss: { gloss, source: 'TAGNT' } };
}

// Pull glosses from Vaticanus rows for reference
const vatGloss = {};
for (const row of d.rows) {
  if (row.vaticanus?.type === 'text') vatGloss[row.id] = row.vaticanus.gloss?.gloss || '';
}

// Build new papyrus map: rowId → new papyrus cell
const fixes = {
  r1:  lacuna,
  r2:  lacuna,
  r3:  lacuna,
  r4:  lacuna,
  r5:  extant('γενηται',       vatGloss['r5']  || 'should become'),
  r6:  extant('ωσ',            vatGloss['r6']  || 'as'),
  r7:  extant('ο',             vatGloss['r7']  || 'the'),
  r8:  extant('διδασκαλοσ',    vatGloss['r8']  || 'teacher'),
  r9:  extant('αυτου',         vatGloss['r9']  || 'his'),
  r10: extant('και',           vatGloss['r10'] || 'and'),
  r11: extant('ο',             vatGloss['r11'] || 'the'),
  r12: extant('δουλοσ',        vatGloss['r12'] || 'servant'),
  r13: extant('ωσ',            vatGloss['r13'] || 'as'),
  r14: extant('ο',             vatGloss['r14'] || 'the'),
  r15: extant('κσ',            vatGloss['r15'] || 'lord'),
  r16: extant('αυτου',         vatGloss['r16'] || 'his'),
  r17: extant('ει',            vatGloss['r17'] || 'if'),
  r18: extant('τον',           vatGloss['r18'] || 'the'),
  r19: extant('οικοδεσποτην',  vatGloss['r19'] || 'master of the house'),
  r20: extant('βεελζεβουλ',    vatGloss['r20'] || 'Beelzebul'),
  r21: extant('επεκαλεσεν',    vatGloss['r21'] || 'they called'),
  r22: extant('ποσω',          vatGloss['r22'] || 'how much'),
  r23: extant('μαλλον',        vatGloss['r23'] || 'more'),
  r24: extant('τους',          vatGloss['r24'] || 'the'),
  r25: extant('οικιους',       vatGloss['r25'] || 'household'),  // P110 variant
  r26: extant('αυτου',         vatGloss['r26'] || 'his'),
};

for (const row of d.rows) {
  if (fixes[row.id] !== undefined) row.papyrus = fixes[row.id];
}

fs.writeFileSync(f, JSON.stringify(d, null, 2));
console.log('Fixed Matt 10:25');
