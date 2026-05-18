// Peshitta Matthew chapter 1 — full realignment from Peshitta.txt source.
// Every row of every verse is explicitly set. Articles/δὲ rows → empty.
// Glosses reflect the actual Syriac word, not the Greek row gloss.
'use strict';
const fs = require('fs');

function set(gospel, ch, v, cells) {
  const path = `data/${gospel}/${ch}/${v}.json`;
  const d = JSON.parse(fs.readFileSync(path, 'utf8'));
  const map = {};
  cells.forEach(c => { map[c.r] = c; });
  d.rows = d.rows.map(row => {
    const c = map[row.id];
    if (!c) return row;
    return {
      ...row,
      peshitta: c.t
        ? { type: 'text', text: c.t, gloss: { gloss: c.g, source: 'PayneSmith' } }
        : { type: 'empty' },
    };
  });
  fs.writeFileSync(path, JSON.stringify(d, null, 2));
  console.log(`matthew ${ch}:${v}`);
}

const E = r => ({ r, t: null });
const W = (r, t, g) => ({ r, t, g });

// 1:1 — ܟܬܒܐ ܕܝܠܝܕܘܬܗ ܕܝܫܘܥ ܡܫܝܚܐ ܒܪܗ ܕܕܘܝܕ ܒܪܗ ܕܐܒܪܗܡ
set('matthew', 1, 1, [
  W('r1', 'ܟܬܒܐ',        'book'),
  W('r2', 'ܕܝܠܝܕܘܬܗ',   'of the generation'),
  W('r3', 'ܕܝܫܘܥ',       'of Jesus'),
  W('r4', 'ܡܫܝܚܐ',       'Christ'),
  W('r5', 'ܒܪܗ',          'son of'),
  W('r6', 'ܕܕܘܝܕ',        'of David'),
  W('r7', 'ܒܪܗ',          'son of'),
  W('r8', 'ܕܐܒܪܗܡ',      'of Abraham'),
]);

// 1:2 — ܐܒܪܗܡ ܐܘܠܕ ܠܐܝܤܚܩ ܐܝܤܚܩ ܐܘܠܕ ܠܝܥܩܘܒ ܝܥܩܘܒ ܐܘܠܕ ܠܝܗܘܕܐ ܘܠܐܚܘܗܝ
set('matthew', 1, 2, [
  W('r1',  'ܐܒܪܗܡ',      'Abraham'),
  W('r2',  'ܐܘܠܕ',        'begat'),
  E('r3'),
  W('r4',  'ܠܐܝܤܚܩ',     'Isaac'),
  W('r5',  'ܐܝܤܚܩ',       'Isaac'),
  E('r6'),
  W('r7',  'ܐܘܠܕ',        'begat'),
  E('r8'),
  W('r9',  'ܠܝܥܩܘܒ',     'Jacob'),
  W('r10', 'ܝܥܩܘܒ',       'Jacob'),
  E('r11'),
  W('r12', 'ܐܘܠܕ',        'begat'),
  E('r13'),
  W('r14', 'ܠܝܗܘܕܐ',     'Judah'),
  E('r15'),
  E('r16'),
  W('r17', 'ܘܠܐܚܘܗܝ',   'and his brothers'),
  E('r18'),
]);

// 1:3 — ܝܗܘܕܐ ܐܘܠܕ ܠܦܪܨ ܘܠܙܪܚ ܡܢ ܬܡܪ ܦܪܨ ܐܘܠܕ ܠܚܨܪܘܢ ܚܨܪܘܢ ܐܘܠܕ ܠܐܪܡ
set('matthew', 1, 3, [
  W('r1',  'ܝܗܘܕܐ',      'Judah'),
  E('r2'),
  W('r3',  'ܐܘܠܕ',        'begat'),
  E('r4'),
  W('r5',  'ܠܦܪܨ',        'Perez'),
  E('r6'),
  E('r7'),
  W('r8',  'ܘܠܙܪܚ',      'and Zerah'),
  W('r9',  'ܡܢ',           'from'),
  E('r10'),
  W('r11', 'ܬܡܪ',          'Tamar'),
  W('r12', 'ܦܪܨ',          'Perez'),
  E('r13'),
  W('r14', 'ܐܘܠܕ',        'begat'),
  E('r15'),
  W('r16', 'ܠܚܨܪܘܢ',     'Hezron'),
  W('r17', 'ܚܨܪܘܢ',       'Hezron'),
  E('r18'),
  W('r19', 'ܐܘܠܕ',        'begat'),
  E('r20'),
  W('r21', 'ܠܐܪܡ',        'Aram'),
]);

// 1:4 — ܐܪܡ ܐܘܠܕ ܠܥܡܝܢܕܒ ܥܡܝܢܕܒ ܐܘܠܕ ܠܢܚܫܘܢ ܢܚܫܘܢ ܐܘܠܕ ܠܤܠܡܘܢ
set('matthew', 1, 4, [
  W('r1',  'ܐܪܡ',         'Aram'),
  E('r2'),
  W('r3',  'ܐܘܠܕ',        'begat'),
  E('r4'),
  W('r5',  'ܠܥܡܝܢܕܒ',   'Amminadab'),
  W('r6',  'ܥܡܝܢܕܒ',     'Amminadab'),
  E('r7'),
  W('r8',  'ܐܘܠܕ',        'begat'),
  E('r9'),
  W('r10', 'ܠܢܚܫܘܢ',     'Nahshon'),
  W('r11', 'ܢܚܫܘܢ',       'Nahshon'),
  E('r12'),
  W('r13', 'ܐܘܠܕ',        'begat'),
  E('r14'),
  W('r15', 'ܠܤܠܡܘܢ',     'Salmon'),
]);

// 1:5 — ܤܠܡܘܢ ܐܘܠܕ ܠܒܥܙ ܡܢ ܪܚܒ ܒܥܙ ܐܘܠܕ ܠܥܘܒܝܕ ܡܢ ܪܥܘܬ ܥܘܒܝܕ ܐܘܠܕ ܠܐܝܫܝ
set('matthew', 1, 5, [
  W('r1',  'ܤܠܡܘܢ',      'Salmon'),
  E('r2'),
  W('r3',  'ܐܘܠܕ',        'begat'),
  E('r4'),
  W('r5',  'ܠܒܥܙ',        'Boaz'),
  W('r6',  'ܡܢ',           'from'),
  E('r7'),
  W('r8',  'ܪܚܒ',          'Rahab'),
  W('r9',  'ܒܥܙ',          'Boaz'),
  E('r10'),
  W('r11', 'ܐܘܠܕ',        'begat'),
  E('r12'),
  W('r13', 'ܠܥܘܒܝܕ',     'Obed'),
  W('r14', 'ܡܢ',           'from'),
  E('r15'),
  W('r16', 'ܪܥܘܬ',        'Ruth'),
  W('r17', 'ܥܘܒܝܕ',       'Obed'),
  E('r18'),
  W('r19', 'ܐܘܠܕ',        'begat'),
  E('r20'),
  W('r21', 'ܠܐܝܫܝ',       'Jesse'),
]);

// 1:6 — ܐܝܫܝ ܐܘܠܕ ܠܕܘܝܕ ܡܠܟܐ ܕܘܝܕ ܐܘܠܕ ܠܫܠܝܡܘܢ ܡܢ ܐܢܬܬܗ ܕܐܘܪܝܐ
// Peshitta omits δὲ both times; omits second 'king'
set('matthew', 1, 6, [
  W('r1',  'ܐܝܫܝ',        'Jesse'),
  E('r2'),
  W('r3',  'ܐܘܠܕ',        'begat'),
  E('r4'),
  W('r5',  'ܠܕܘܝܕ',       'David'),
  E('r6'),
  W('r7',  'ܡܠܟܐ',        'king'),
  W('r8',  'ܕܘܝܕ',         'David'),
  E('r9'),
  E('r10'),
  E('r11'),
  W('r12', 'ܐܘܠܕ',        'begat'),
  E('r13'),
  W('r14', 'ܠܫܠܝܡܘܢ',   'Solomon'),
  W('r15', 'ܡܢ',           'from'),
  W('r16', 'ܐܢܬܬܗ',      'wife of'),
  E('r17'),
  W('r18', 'ܕܐܘܪܝܐ',     'of Uriah'),
]);

// 1:7 — ܫܠܝܡܘܢ ܐܘܠܕ ܠܪܚܒܥܡ ܪܚܒܥܡ ܐܘܠܕ ܠܐܒܝܐ ܐܒܝܐ ܐܘܠܕ ܠܐܤܐ
set('matthew', 1, 7, [
  W('r1',  'ܫܠܝܡܘܢ',     'Solomon'),
  E('r2'),
  W('r3',  'ܐܘܠܕ',        'begat'),
  E('r4'),
  W('r5',  'ܠܪܚܒܥܡ',     'Rehoboam'),
  W('r6',  'ܪܚܒܥܡ',       'Rehoboam'),
  E('r7'),
  W('r8',  'ܐܘܠܕ',        'begat'),
  E('r9'),
  W('r10', 'ܠܐܒܝܐ',       'Abijah'),
  W('r11', 'ܐܒܝܐ',         'Abijah'),
  E('r12'),
  W('r13', 'ܐܘܠܕ',        'begat'),
  E('r14'),
  W('r15', 'ܠܐܤܐ',        'Asa'),
]);

// 1:8 — ܐܤܐ ܐܘܠܕ ܠܝܗܘܫܦܛ ܝܗܘܫܦܛ ܐܘܠܕ ܠܝܘܪܡ ܝܘܪܡ ܐܘܠܕ ܠܥܘܙܝܐ
set('matthew', 1, 8, [
  W('r1',  'ܐܤܐ',         'Asa'),
  E('r2'),
  W('r3',  'ܐܘܠܕ',        'begat'),
  E('r4'),
  W('r5',  'ܠܝܗܘܫܦܛ',   'Jehoshaphat'),
  W('r6',  'ܝܗܘܫܦܛ',     'Jehoshaphat'),
  E('r7'),
  W('r8',  'ܐܘܠܕ',        'begat'),
  E('r9'),
  W('r10', 'ܠܝܘܪܡ',       'Joram'),
  W('r11', 'ܝܘܪܡ',         'Joram'),
  E('r12'),
  W('r13', 'ܐܘܠܕ',        'begat'),
  E('r14'),
  W('r15', 'ܠܥܘܙܝܐ',     'Uzziah'),
]);

// 1:9 — ܥܘܙܝܐ ܐܘܠܕ ܠܝܘܬܡ ܝܘܬܡ ܐܘܠܕ ܠܐܚܙ ܐܚܙ ܐܘܠܕ ܠܚܙܩܝܐ
set('matthew', 1, 9, [
  W('r1',  'ܥܘܙܝܐ',      'Uzziah'),
  E('r2'),
  W('r3',  'ܐܘܠܕ',        'begat'),
  E('r4'),
  W('r5',  'ܠܝܘܬܡ',      'Jotham'),
  W('r6',  'ܝܘܬܡ',        'Jotham'),
  E('r7'),
  W('r8',  'ܐܘܠܕ',        'begat'),
  E('r9'),
  W('r10', 'ܠܐܚܙ',        'Ahaz'),
  W('r11', 'ܐܚܙ',          'Ahaz'),
  E('r12'),
  W('r13', 'ܐܘܠܕ',        'begat'),
  E('r14'),
  W('r15', 'ܠܚܙܩܝܐ',     'Hezekiah'),
]);

// 1:10 — ܚܙܩܝܐ ܐܘܠܕ ܠܡܢܫܐ ܡܢܫܐ ܐܘܠܕ ܠܐܡܘܢ ܐܡܘܢ ܐܘܠܕ ܠܝܘܫܝܐ
set('matthew', 1, 10, [
  W('r1',  'ܚܙܩܝܐ',      'Hezekiah'),
  E('r2'),
  W('r3',  'ܐܘܠܕ',        'begat'),
  E('r4'),
  W('r5',  'ܠܡܢܫܐ',      'Manasseh'),
  W('r6',  'ܡܢܫܐ',        'Manasseh'),
  E('r7'),
  W('r8',  'ܐܘܠܕ',        'begat'),
  E('r9'),
  W('r10', 'ܠܐܡܘܢ',      'Amon'),
  W('r11', 'ܐܡܘܢ',        'Amon'),
  E('r12'),
  W('r13', 'ܐܘܠܕ',        'begat'),
  E('r14'),
  W('r15', 'ܠܝܘܫܝܐ',     'Josiah'),
]);

// 1:11 — ܝܘܫܝܐ ܐܘܠܕ ܠܝܘܟܢܝܐ ܘܠܐܚܘܗܝ ܒܓܠܘܬܐ ܕܒܒܠ
set('matthew', 1, 11, [
  W('r1',  'ܝܘܫܝܐ',      'Josiah'),
  E('r2'),
  W('r3',  'ܐܘܠܕ',        'begat'),
  E('r4'),
  W('r5',  'ܠܝܘܟܢܝܐ',   'Jechoniah'),
  E('r6'),
  E('r7'),
  W('r8',  'ܘܠܐܚܘܗܝ',   'and his brothers'),
  E('r9'),
  E('r10'),
  E('r11'),
  W('r12', 'ܒܓܠܘܬܐ',    'in the exile'),
  W('r13', 'ܕܒܒܠ',        'of Babylon'),
]);

// 1:12 — ܡܢ ܒܬܪ ܓܠܘܬܐ ܕܝܢ ܕܒܒܠ ܝܘܟܢܝܐ ܐܘܠܕ ܠܫܠܬܐܝܠ ܫܠܬܐܝܠ ܐܘܠܕ ܠܙܘܪܒܒܠ
// Here Peshitta DOES use ܕܝܢ (narrative verse, not bare genealogy)
set('matthew', 1, 12, [
  W('r1',  'ܡܢ ܒܬܪ',     'after'),
  W('r2',  'ܕܝܢ',          'but/then'),
  E('r3'),
  W('r4',  'ܓܠܘܬܐ',      'the exile'),
  W('r5',  'ܕܒܒܠ',        'of Babylon'),
  W('r6',  'ܝܘܟܢܝܐ',     'Jechoniah'),
  W('r7',  'ܐܘܠܕ',        'begat'),
  E('r8'),
  W('r9',  'ܠܫܠܬܐܝܠ',   'Salathiel'),
  W('r10', 'ܫܠܬܐܝܠ',     'Salathiel'),
  E('r11'),
  W('r12', 'ܐܘܠܕ',        'begat'),
  E('r13'),
  W('r14', 'ܠܙܘܪܒܒܠ',   'Zerubbabel'),
]);

// 1:13 — ܙܘܪܒܒܠ ܐܘܠܕ ܠܐܒܝܘܕ ܐܒܝܘܕ ܐܘܠܕ ܠܐܠܝܩܝܡ ܐܠܝܩܝܡ ܐܘܠܕ ܠܥܙܘܪ
set('matthew', 1, 13, [
  W('r1',  'ܙܘܪܒܒܠ',     'Zerubbabel'),
  E('r2'),
  W('r3',  'ܐܘܠܕ',        'begat'),
  E('r4'),
  W('r5',  'ܠܐܒܝܘܕ',     'Abiud'),
  W('r6',  'ܐܒܝܘܕ',       'Abiud'),
  E('r7'),
  W('r8',  'ܐܘܠܕ',        'begat'),
  E('r9'),
  W('r10', 'ܠܐܠܝܩܝܡ',   'Eliakim'),
  W('r11', 'ܐܠܝܩܝܡ',     'Eliakim'),
  E('r12'),
  W('r13', 'ܐܘܠܕ',        'begat'),
  E('r14'),
  W('r15', 'ܠܥܙܘܪ',       'Azor'),
]);

// 1:14 — ܥܙܘܪ ܐܘܠܕ ܠܙܕܘܩ ܙܕܘܩ ܐܘܠܕ ܠܐܟܝܢ ܐܟܝܢ ܐܘܠܕ ܠܐܠܝܘܕ
set('matthew', 1, 14, [
  W('r1',  'ܥܙܘܪ',        'Azor'),
  E('r2'),
  W('r3',  'ܐܘܠܕ',        'begat'),
  E('r4'),
  W('r5',  'ܠܙܕܘܩ',      'Zadok'),
  W('r6',  'ܙܕܘܩ',        'Zadok'),
  E('r7'),
  W('r8',  'ܐܘܠܕ',        'begat'),
  E('r9'),
  W('r10', 'ܠܐܟܝܢ',      'Achim'),
  W('r11', 'ܐܟܝܢ',        'Achim'),
  E('r12'),
  W('r13', 'ܐܘܠܕ',        'begat'),
  E('r14'),
  W('r15', 'ܠܐܠܝܘܕ',     'Eliud'),
]);

// 1:15 — ܐܠܝܘܕ ܐܘܠܕ ܠܐܠܝܥܙܪ ܐܠܝܥܙܪ ܐܘܠܕ ܠܡܬܢ ܡܬܢ ܐܘܠܕ ܠܝܥܩܘܒ
set('matthew', 1, 15, [
  W('r1',  'ܐܠܝܘܕ',      'Eliud'),
  E('r2'),
  W('r3',  'ܐܘܠܕ',        'begat'),
  E('r4'),
  W('r5',  'ܠܐܠܝܥܙܪ',   'Eleazar'),
  W('r6',  'ܐܠܝܥܙܪ',     'Eleazar'),
  E('r7'),
  W('r8',  'ܐܘܠܕ',        'begat'),
  E('r9'),
  W('r10', 'ܠܡܬܢ',        'Matthan'),
  W('r11', 'ܡܬܢ',          'Matthan'),
  E('r12'),
  W('r13', 'ܐܘܠܕ',        'begat'),
  E('r14'),
  W('r15', 'ܠܝܥܩܘܒ',     'Jacob'),
]);

// 1:16 — ܝܥܩܘܒ ܐܘܠܕ ܠܝܘܤܦ ܓܒܪܗ ܕܡܪܝܡ ܕܡܢܗ ܐܬܝܠܕ ܝܫܘܥ ܕܡܬܩܪܐ ܡܫܝܚܐ
set('matthew', 1, 16, [
  W('r1',  'ܝܥܩܘܒ',      'Jacob'),
  E('r2'),
  W('r3',  'ܐܘܠܕ',        'begat'),
  E('r4'),
  W('r5',  'ܠܝܘܤܦ',      'Joseph'),
  E('r6'),
  W('r7',  'ܓܒܪܗ',        'husband of'),
  W('r8',  'ܕܡܪܝܡ',      'of Mary'),
  E('r9'),
  W('r10', 'ܕܡܢܗ',        'from whom'),
  W('r11', 'ܐܬܝܠܕ',      'was born'),
  W('r12', 'ܝܫܘܥ',        'Jesus'),
  E('r13'),
  W('r14', 'ܕܡܬܩܪܐ',    'who is called'),
  W('r15', 'ܡܫܝܚܐ',      'Christ'),
]);

// 1:17 — ܟܠܗܝܢ ܗܟܝܠ ܫܪܒܬܐ ܡܢ ܐܒܪܗܡ ܥܕܡܐ ܠܕܘܝܕ ܫܪܒܬܐ ܐܪܒܥܤܪܐ
//         ܘܡܢ ܕܘܝܕ ܥܕܡܐ ܠܓܠܘܬܐ ܕܒܒܠ ܫܪܒܬܐ ܐܪܒܥܤܪܐ
//         ܘܡܢ ܓܠܘܬܐ ܕܒܒܠ ܥܕܡܐ ܠܡܫܝܚܐ ܫܪܒܬܐ ܐܪܒܥܤܪܐ
set('matthew', 1, 17, [
  W('r1',  'ܟܠܗܝܢ',      'all'),
  W('r2',  'ܗܟܝܠ',        'therefore'),
  E('r3'),
  W('r4',  'ܫܪܒܬܐ',      'generations'),
  W('r5',  'ܡܢ',           'from'),
  W('r6',  'ܐܒܪܗܡ',      'Abraham'),
  W('r7',  'ܥܕܡܐ',        'until'),
  W('r8',  'ܠܕܘܝܕ',       'David'),
  W('r9',  'ܫܪܒܬܐ',      'generations'),
  W('r10', 'ܐܪܒܥܤܪܐ',   'fourteen'),
  W('r11', 'ܘܡܢ',          'and from'),
  E('r12'),
  W('r13', 'ܕܘܝܕ',         'David'),
  W('r14', 'ܥܕܡܐ',        'until'),
  E('r15'),
  W('r16', 'ܠܓܠܘܬܐ',    'to the exile'),
  W('r17', 'ܕܒܒܠ',        'of Babylon'),
  W('r18', 'ܫܪܒܬܐ',      'generations'),
  W('r19', 'ܐܪܒܥܤܪܐ',   'fourteen'),
  W('r20', 'ܘܡܢ',          'and from'),
  E('r21'),
  E('r22'),
  W('r23', 'ܓܠܘܬܐ',      'the exile'),
  W('r24', 'ܕܒܒܠ',        'of Babylon'),
  W('r25', 'ܥܕܡܐ',        'until'),
  E('r26'),
  W('r27', 'ܠܡܫܝܚܐ',    'Christ'),
  W('r28', 'ܫܪܒܬܐ',      'generations'),
  W('r29', 'ܐܪܒܥܤܪܐ',   'fourteen'),
]);

// 1:18 — ܝܠܕܗ ܕܝܢ ܕܝܫܘܥ ܡܫܝܚܐ ܗܟܢܐ ܗܘܐ ܟܕ ܡܟܝܪܐ ܗܘܬ ܡܪܝܡ ܐܡܗ ܠܝܘܤܦ
//         ܥܕܠܐ ܢܫܬܘܬܦܘܢ ܐܫܬܟܚܬ ܒܛܢܐ ܡܢ ܪܘܚܐ ܕܩܘܕܫܐ
set('matthew', 1, 18, [
  E('r1'),
  W('r2',  'ܕܝܢ',              'but'),
  W('r3',  'ܕܝܫܘܥ',           'of Jesus'),
  W('r4',  'ܡܫܝܚܐ',           'Christ'),
  E('r5'),
  W('r6',  'ܝܠܕܗ',            'birth of him'),
  W('r7',  'ܗܟܢܐ',            'thus'),
  W('r8',  'ܗܘܐ',              'was'),
  W('r9',  'ܟܕ ܡܟܝܪܐ ܗܘܬ',  'when betrothed was'),
  E('r10'),
  E('r11'),
  W('r12', 'ܐܡܗ',              'his mother'),
  E('r13'),
  W('r14', 'ܡܪܝܡ',            'Mary'),
  E('r15'),
  W('r16', 'ܠܝܘܤܦ',           'to Joseph'),
  W('r17', 'ܥܕܠܐ',            'before'),
  E('r18'),
  W('r19', 'ܢܫܬܘܬܦܘܢ',       'they would come together'),
  E('r20'),
  W('r21', 'ܐܫܬܟܚܬ',         'was found'),
  E('r22'),
  W('r23', 'ܒܛܢܐ',            'with child'),
  E('r24'),
  W('r25', 'ܡܢ',               'from'),
  W('r26', 'ܪܘܚܐ',            'spirit'),
  W('r27', 'ܕܩܘܕܫܐ',         'of holiness'),
]);

// 1:19 — ܝܘܤܦ ܕܝܢ ܒܥܠܗ ܟܐܢܐ ܗܘܐ ܘܠܐ ܨܒܐ ܕܢܦܪܤܝܗ ܘܐܬܪܥܝ ܗܘܐ ܕܡܛܫܝܐܝܬ ܢܫܪܝܗ
set('matthew', 1, 19, [
  W('r1',  'ܝܘܤܦ',            'Joseph'),
  W('r2',  'ܕܝܢ',              'but'),
  E('r3'),
  W('r4',  'ܒܥܠܗ',            'husband of her'),
  E('r5'),
  W('r6',  'ܟܐܢܐ',            'righteous'),
  W('r7',  'ܗܘܐ',              'was'),
  E('r8'),
  W('r9',  'ܘܠܐ',              'and not'),
  W('r10', 'ܨܒܐ',              'willing'),
  E('r11'),
  W('r12', 'ܕܢܦܪܤܝܗ',        'to expose her'),
  W('r13', 'ܘܐܬܪܥܝ ܗܘܐ',    'and he resolved'),
  W('r14', 'ܕܡܛܫܝܐܝܬ',      'secretly'),
  W('r15', 'ܢܫܪܝܗ',           'to release her'),
  E('r16'),
]);

// 1:20 — ܟܕ ܗܠܝܢ ܕܝܢ ܐܬܪܥܝ ܐܬܚܙܝ ܠܗ ܡܠܐܟܐ ܕܡܪܝܐ ܒܚܠܡܐ ܘܐܡܪ ܠܗ
//         ܝܘܤܦ ܒܪܗ ܕܕܘܝܕ ܠܐ ܬܕܚܠ ܠܡܤܒ ܠܡܪܝܡ ܐܢܬܬܟ
//         ܗܘ ܓܝܪ ܕܐܬܝܠܕ ܒܗ ܡܢ ܪܘܚܐ ܗܘ ܕܩܘܕܫܐ
set('matthew', 1, 20, [
  W('r1',  'ܗܠܝܢ',            'these things'),
  W('r2',  'ܕܝܢ',              'but/then'),
  E('r3'),
  W('r4',  'ܟܕ ܐܬܪܥܝ',       'when he pondered'),
  E('r5'),
  W('r6',  'ܡܠܐܟܐ',          'angel'),
  W('r7',  'ܕܡܪܝܐ',           'of the Lord'),
  E('r8'),
  W('r9',  'ܒܚܠܡܐ',           'in a dream'),
  W('r10', 'ܐܬܚܙܝ',           'appeared'),
  W('r11', 'ܠܗ',               'to him'),
  W('r12', 'ܘܐܡܪ ܠܗ',         'and said to him'),
  W('r13', 'ܝܘܤܦ',            'Joseph'),
  W('r14', 'ܒܪܗ',              'son of'),
  W('r15', 'ܕܕܘܝܕ',           'of David'),
  W('r16', 'ܠܐ',               'not'),
  W('r17', 'ܬܕܚܠ',            'fear'),
  W('r18', 'ܠܡܤܒ',            'to take'),
  W('r19', 'ܠܡܪܝܡ',          'Mary'),
  E('r20'),
  W('r21', 'ܐܢܬܬܟ',          'your wife'),
  E('r22'),
  E('r23'),
  W('r24', 'ܗܘ ܓܝܪ',          'for it is'),
  W('r25', 'ܒܗ',               'in her'),
  E('r26'),
  W('r27', 'ܕܐܬܝܠܕ',         'who was born'),
  W('r28', 'ܡܢ',               'from'),
  W('r29', 'ܪܘܚܐ',            'spirit'),
  W('r30', 'ܗܘ',               'is'),
  W('r31', 'ܕܩܘܕܫܐ',         'of holiness'),
]);

// 1:21 — ܬܐܠܕ ܕܝܢ ܒܪܐ ܘܬܩܪܐ ܫܡܗ ܝܫܘܥ ܗܘ ܓܝܪ ܢܚܝܘܗܝ ܠܥܡܗ ܡܢ ܚܛܗܝܗܘܢ
set('matthew', 1, 21, [
  W('r1',  'ܬܐܠܕ',            'she will bear'),
  W('r2',  'ܕܝܢ',              'but/then'),
  W('r3',  'ܒܪܐ',              'son'),
  E('r4'),
  W('r5',  'ܘܬܩܪܐ',           'and you will call'),
  E('r6'),
  W('r7',  'ܫܡܗ',              'his name'),
  E('r8'),
  W('r9',  'ܝܫܘܥ',            'Jesus'),
  W('r10', 'ܗܘ',               'he'),
  W('r11', 'ܓܝܪ',              'for'),
  W('r12', 'ܢܚܝܘܗܝ',         'will save him'),
  E('r13'),
  W('r14', 'ܠܥܡܗ',            'his people'),
  E('r15'),
  W('r16', 'ܡܢ',               'from'),
  E('r17'),
  W('r18', 'ܚܛܗܝܗܘܢ',        'their sins'),
  E('r19'),
]);

// 1:22 — ܗܕܐ ܕܝܢ ܟܠܗ ܕܗܘܬ ܕܢܬܡܠܐ ܡܕܡ ܕܐܬܐܡܪ ܡܢ ܡܪܝܐ ܒܝܕ ܢܒܝܐ
set('matthew', 1, 22, [
  W('r1',  'ܗܕܐ',              'this'),
  W('r2',  'ܕܝܢ',              'but'),
  W('r3',  'ܟܠܗ',              'all'),
  W('r4',  'ܕܗܘܬ',            'that it happened'),
  E('r5'),
  W('r6',  'ܕܢܬܡܠܐ',         'might be fulfilled'),
  E('r7'),
  W('r8',  'ܡܕܡ ܕܐܬܐܡܪ',    'what was said'),
  W('r9',  'ܡܢ',               'by'),
  E('r10'),
  W('r11', 'ܡܪܝܐ',            'the Lord'),
  W('r12', 'ܒܝܕ',              'through'),
  E('r13'),
  W('r14', 'ܢܒܝܐ',            'the prophet'),
  E('r15'),
]);

// 1:23 — ܕܗܐ ܒܬܘܠܬܐ ܬܒܛܢ ܘܬܐܠܕ ܒܪܐ ܘܢܩܪܘܢ ܫܡܗ ܥܡܢܘܐܝܠ ܕܡܬܬܪܓܡ ܥܡܢ ܐܠܗܢ
set('matthew', 1, 23, [
  W('r1',  'ܕܗܐ',              'behold'),
  E('r2'),
  W('r3',  'ܒܬܘܠܬܐ',         'virgin'),
  E('r4'),
  E('r5'),
  W('r6',  'ܬܒܛܢ',            'will conceive'),
  E('r7'),
  W('r8',  'ܘܬܐܠܕ',          'and will bear'),
  W('r9',  'ܒܪܐ',              'son'),
  E('r10'),
  W('r11', 'ܘܢܩܪܘܢ',         'and they will call'),
  E('r12'),
  W('r13', 'ܫܡܗ',              'his name'),
  E('r14'),
  W('r15', 'ܥܡܢܘܐܝܠ',        'Emmanuel'),
  E('r16'),
  E('r17'),
  W('r18', 'ܕܡܬܬܪܓܡ',       'which is translated'),
  W('r19', 'ܥܡܢ',              'with us'),
  E('r20'),
  E('r21'),
  W('r22', 'ܐܠܗܢ',            'our God'),
]);

// 1:24 — ܟܕ ܩܡ ܕܝܢ ܝܘܤܦ ܡܢ ܫܢܬܗ ܥܒܕ ܐܝܟܢܐ ܕܦܩܕ ܠܗ ܡܠܐܟܗ ܕܡܪܝܐ ܘܕܒܪܗ ܠܐܢܬܬܗ
set('matthew', 1, 24, [
  W('r1',  'ܟܕ ܩܡ',           'when he rose'),
  W('r2',  'ܕܝܢ',              'but/then'),
  E('r3'),
  W('r4',  'ܝܘܤܦ',            'Joseph'),
  W('r5',  'ܡܢ',               'from'),
  E('r6'),
  W('r7',  'ܫܢܬܗ',            'his sleep'),
  W('r8',  'ܥܒܕ',              'he did'),
  W('r9',  'ܐܝܟܢܐ',           'as'),
  W('r10', 'ܕܦܩܕ',            'that he commanded'),
  W('r11', 'ܠܗ',               'to him'),
  E('r12'),
  W('r13', 'ܡܠܐܟܗ',          'his angel'),
  W('r14', 'ܕܡܪܝܐ',           'of the Lord'),
  E('r15'),
  W('r16', 'ܘܕܒܪܗ',          'and he took'),
  E('r17'),
  W('r18', 'ܠܐܢܬܬܗ',         'his wife'),
  E('r19'),
]);

// 1:25 — ܘܠܐ ܚܟܡܗ ܥܕܡܐ ܕܝܠܕܬܗ ܠܒܪܗ ܒܘܟܪܐ ܘܩܪܬ ܫܡܗ ܝܫܘܥ
set('matthew', 1, 25, [
  E('r1'),
  W('r2',  'ܘܠܐ',              'and not'),
  W('r3',  'ܚܟܡܗ',            'he knew her'),
  E('r4'),
  W('r5',  'ܥܕܡܐ',            'until'),
  E('r6'),
  W('r7',  'ܕܝܠܕܬܗ',         'that she bore him'),
  E('r8'),
  W('r9',  'ܠܒܪܗ',            'his son'),
  E('r10'),
  E('r11'),
  W('r12', 'ܒܘܟܪܐ',          'firstborn'),
  E('r13'),
  W('r14', 'ܘܩܪܬ',            'and she called'),
  E('r15'),
  W('r16', 'ܫܡܗ',              'his name'),
  E('r17'),
  W('r18', 'ܝܫܘܥ',            'Jesus'),
]);

console.log('Matthew 1 Peshitta complete.');
