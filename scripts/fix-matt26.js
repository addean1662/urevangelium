// Fix Matthew 26 papyrus issues
//
// 26:2  [P45]:      r17 "σναι" → "σρναι" (NS abbreviation for σταυρωθῆναι)
//
// 26:6  [P45]:      r4 "γενομενου" → "γενομενωι" (dative iota subscript)
//
// 26:10 [P45]:      r1-r5 lost→extant P45 only (γνους δε ο ιη ειπεν);
//                   removes P64+P67 from those rows (P64 starts at r8)
//
// 26:19 [P37+P45]:  full restructure — r1-r3→P45 only (και εποιησαν οι);
//                   r4-r13→P37+P45 (μαθηται…πασχα); strip trailing ditto
//
// 26:20 [P37]:      r8 "μαθητων." → empty (P37 omits Vaticanus "μαθητῶν")
//
// 26:26 [P37+P45]:  r23-r24 trailing ditto → empty
//
// 26:29 [P37+P45+P53]: r1-r9→extant P37+P45 (leading displacement; 9 words);
//                   r4→empty (P37+P45 omit Vaticanus "ὅτι");
//                   r10→extant P37+P45+P53 "εκ" (P53 starts here)
//
// 26:33 [P45+P53]:  r14-r16 trailing ditto → empty
//
// 26:35 [P45]:      r20 fragments → P37 only (remove P45; P45's "ειπαν" is at r21)
//
// 26:47 [P37]:      insert missing "ιβ" — shift r9-r24 texts forward one position;
//                   r25 empty→extant P37 "του"; r26 strip trailing period
//
// 26:49 [P37]:      r5 "ιησυ"→"ιηου"; r7 "χαιρε"→"αυτω"; r8-r11→lacuna
//
// 26:50 [P37]:      leading displacement (missing "δε ο ις") + trailing ditto;
//                   shift r2-r17 texts forward; r20 strip period

const fs   = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '../data/matthew');

const lacuna = { type: 'lacuna' };
const empty  = { type: 'empty' };

const P37      = (t,g) => mk([{id:'P37',     date:'c. 250–300 CE'}],          t, g);
const P45      = (t,g) => mk([{id:'P45',     date:'c. 200–250 CE'}],          t, g);
const P37P45   = (t,g) => mk([{id:'P37',date:'c. 250–300 CE'},
                               {id:'P45',date:'c. 200–250 CE'}],               t, g);
const P37P45P53= (t,g) => mk([{id:'P37',date:'c. 250–300 CE'},
                               {id:'P45',date:'c. 200–250 CE'},
                               {id:'P53',date:'c. 250 CE'}],                   t, g);

function mk(fragments, text, gloss) {
  return { type:'extant', fragments, text, gloss:{ gloss, source:'TAGNT' } };
}

function patchRows(d, patches) {
  for (const row of d.rows) {
    if (patches[row.id] !== undefined) row.papyrus = patches[row.id];
  }
}

// ── Matt 26:2 [P45] ──────────────────────────────────────────────────────────

{
  const f = path.join(BASE, '26/2.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const row of d.rows) {
    if (row.id === 'r17' && row.papyrus?.type === 'extant') {
      row.papyrus.text = 'σρναι';  // INTF P45 reads σρναι (full NS for σταυρωθῆναι)
    }
  }
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 26:2');
}

// ── Matt 26:6 [P45] ──────────────────────────────────────────────────────────

{
  const f = path.join(BASE, '26/6.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const row of d.rows) {
    if (row.id === 'r4' && row.papyrus?.type === 'extant') {
      row.papyrus.text = 'γενομενωι';  // dative iota subscript
    }
  }
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 26:6');
}

// ── Matt 26:10 [P45] ─────────────────────────────────────────────────────────
// P45 INTF: γνους δε ο ιη ειπεν αυτοις… (starts at r1, not r6)
// P64+P67 INTF starts at r8 "κοπους" — so r1-r5 should be P45 only

{
  const f = path.join(BASE, '26/10.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  patchRows(d, {
    r1: P45('γνους',  'knowing'),
    r2: P45('δε',     'but'),
    r3: P45('ο',      'the'),
    r4: P45('ιη',     'Jesus'),
    r5: P45('ειπεν',  'said'),
  });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 26:10');
}

// ── Matt 26:19 [P37+P45] ─────────────────────────────────────────────────────
// P45 INTF (13 words): και εποιησαν οι μαθηται ως συνεταξεν αυτοις ο ιη και ητοιμασαν το πασχα
// P37 INTF (10 words): μαθηται ως συνεταξεν αυτοις ο ιης και ητοιμασαν το πασχα
// Our data was displaced (started at "συνεταξεν") with trailing dittography.

{
  const f = path.join(BASE, '26/19.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  patchRows(d, {
    r1:  P45('και',          'and'),
    r2:  P45('εποιησαν',     'they did'),
    r3:  P45('οι',           'the'),
    r4:  P37P45('μαθηται',   'disciples'),
    r5:  P37P45('ως',        'as'),
    r6:  P37P45('συνεταξεν', 'he instructed'),
    r7:  P37P45('αυτοισ',    'them'),
    r8:  P37P45('ο',         'the'),
    r9:  P37P45('ιη',        'Jesus'),   // P45 form; P37 uses ιης (minor residual diff)
    r10: P37P45('και',       'and'),
    r11: P37P45('ητοιμασαν', 'they prepared'),
    r12: P37P45('το',        'the'),
    r13: P37P45('πασχα',     'Passover'),
  });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 26:19');
}

// ── Matt 26:20 [P37] ─────────────────────────────────────────────────────────
// P37 INTF ends at "ιβ" (7 words); our r8 has "μαθητων." which P37 omits

{
  const f = path.join(BASE, '26/20.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  patchRows(d, { r8: empty });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 26:20');
}

// ── Matt 26:26 [P37+P45] ─────────────────────────────────────────────────────
// r23-r24 are ditto of r22-r23 (σωμα μου repeated); both papyri end at r22

{
  const f = path.join(BASE, '26/26.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  patchRows(d, { r23: empty, r24: empty });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 26:26');
}

// ── Matt 26:29 [P37+P45+P53] ─────────────────────────────────────────────────
// P37 INTF (30 words): λεγω δε υμιν ου μη πιω απ αρτι εκ τουτου…
// P45 INTF (30 words): same leading words; P53 INTF (22 words) starts at "εκ" (r10)
// r1-r10 were "lost" — fix the 10 leading positions

{
  const f = path.join(BASE, '26/29.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  patchRows(d, {
    r1:  P37P45('λεγω',  'say'),
    r2:  P37P45('δε',    'but'),
    r3:  P37P45('υμιν',  'you'),
    r4:  empty,                          // P37+P45 omit Vaticanus "ὅτι"
    r5:  P37P45('ου',    'not'),
    r6:  P37P45('μη',    'not'),
    r7:  P37P45('πιω',   'I drink'),
    r8:  P37P45('απ',    'from'),
    r9:  P37P45('αρτι',  'now'),
    r10: P37P45P53('εκ', 'from'),        // P53 begins here
  });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 26:29');
}

// ── Matt 26:33 [P45+P53] ─────────────────────────────────────────────────────
// r14-r16 are trailing ditto (δε ουδεποτε σκανδαλισθησομαι repeated)

{
  const f = path.join(BASE, '26/33.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  patchRows(d, { r14: empty, r15: empty, r16: empty });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 26:33');
}

// ── Matt 26:35 [P45] ─────────────────────────────────────────────────────────
// r20 has P37+P45 fragments with text "ειπον" (P37 reading)
// r21 has P45 only with text "ειπαν.¶" (P45 reading)
// Remove P45 from r20 so P45's word list only sees r21 "ειπαν"

{
  const f = path.join(BASE, '26/35.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const row of d.rows) {
    if (row.id === 'r20' && row.papyrus?.type === 'extant') {
      row.papyrus.fragments = row.papyrus.fragments.filter(fr => fr.id !== 'P45');
    }
  }
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 26:35');
}

// ── Matt 26:47 [P37] ─────────────────────────────────────────────────────────
// P37 INTF: "…εις των ιβ ηλθεν…" but our r9="ηλθεν", missing "ιβ" before it.
// Fix: shift r9-r24 texts one position forward; r25 empty→extant "του"; r26 strip period.

{
  const f = path.join(BASE, '26/47.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));

  // Save current r9-r24 text+gloss (they shift to r10-r25)
  const saved = {};
  for (const row of d.rows) {
    const n = parseInt(row.id.slice(1));
    if (n >= 9 && n <= 24 && row.papyrus?.type === 'extant') {
      saved[n] = { text: row.papyrus.text, gloss: row.papyrus.gloss?.gloss || '' };
    }
  }

  for (const row of d.rows) {
    const n = parseInt(row.id.slice(1));
    if (n === 9) {
      row.papyrus.text  = 'ιβ';
      row.papyrus.gloss = { gloss: 'twelve', source: 'TAGNT' };
    } else if (n >= 10 && n <= 25) {
      if (n <= 24) {
        // shift from saved[n-1]
        row.papyrus.text  = saved[n - 1].text;
        row.papyrus.gloss = { gloss: saved[n - 1].gloss, source: 'TAGNT' };
      } else {
        // r25 was empty; now becomes extant P37 "του" (shifted from r24)
        row.papyrus = P37('του', 'of the');
      }
    } else if (n === 26 && row.papyrus?.type === 'extant') {
      row.papyrus.text = row.papyrus.text.replace(/[.¶\s]+$/, '');
    }
  }

  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 26:47');
}

// ── Matt 26:49 [P37] ─────────────────────────────────────────────────────────
// P37 INTF: και ευθεως προσελθων τω ιηου ειπεν αυτω (7 words, ends at "αυτω")
// r5 "ιησυ" → "ιηου"; r7 "χαιρε" → "αυτω" (P37 reads "αυτω" not "χαιρε");
// r8-r11 are beyond P37 coverage → lacuna

{
  const f = path.join(BASE, '26/49.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  patchRows(d, {
    r5:  P37('ιηου',  'Jesus'),
    r7:  P37('αυτω',  'him'),
    r8:  lacuna,
    r9:  lacuna,
    r10: lacuna,
    r11: lacuna,
  });
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 26:49');
}

// ── Matt 26:50 [P37] ─────────────────────────────────────────────────────────
// P37 INTF (20 words): ειπεν δε ο ις αυτω εταιρε εφ ο παρει τοτε
//                      προσελθοντες επεβαλον τας χειρας επι τον ιην και εκρατησαν αυτον
// Our data was displaced: missing "δε ο ις" after "ειπεν", causing 3-word right-shift.
// Also had trailing ditto at r18-r20.
// Fix: shift r2-r17 texts forward by 3 slots; r18-r20 become correct words.

{
  const f = path.join(BASE, '26/50.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));

  const fixes = [
    // [rowId, newText, newGloss]
    ['r2',  'δε',              'but'],
    ['r3',  'ο',               'the'],
    ['r4',  'ις',              'Jesus'],
    ['r5',  'αυτω',            'him'],
    ['r6',  'εταιρε',          'friend'],
    ['r7',  'εφ',              'upon'],
    ['r8',  'ο',               'which'],
    ['r9',  'παρει',           'you are here'],
    ['r10', 'τοτε',            'then'],
    ['r11', 'προσελθοντεσ',    'coming to'],
    ['r12', 'επεβαλον',        'they laid'],
    ['r13', 'τασ',             'the'],
    ['r14', 'χειρασ',          'hands'],
    ['r15', 'επι',             'on'],
    ['r16', 'τον',             'the'],
    ['r17', 'ιην',             'Jesus'],
    ['r18', 'και',             'and'],
    ['r19', 'εκρατησαν',       'they seized'],
    ['r20', 'αυτον',           'him'],
  ];

  for (const row of d.rows) {
    const fix = fixes.find(([id]) => id === row.id);
    if (fix && row.papyrus?.type === 'extant') {
      row.papyrus.text  = fix[1];
      row.papyrus.gloss = { gloss: fix[2], source: 'TAGNT' };
    }
  }

  fs.writeFileSync(f, JSON.stringify(d, null, 2));
  console.log('Fixed Matt 26:50');
}
