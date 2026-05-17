const fs = require('fs');

function applyColumn(gospel, ch, v, field, source, mapping) {
  const path = `data/${gospel}/${ch}/${v}.json`;
  const d = JSON.parse(fs.readFileSync(path, 'utf8'));
  const map = {};
  mapping.forEach(m => { map[m.r] = m; });
  d.rows = d.rows.map(row => {
    const m = map[row.id];
    if (!m) return row;
    const cell = m.text
      ? { type: 'text', text: m.text, gloss: { gloss: m.gloss, source } }
      : { type: 'empty' };
    return { ...row, [field]: cell };
  });
  fs.writeFileSync(path, JSON.stringify(d, null, 2));
}

// Vulgate Matthew 1:6
// "Iesse autem genuit David regem David autem rex genuit Salomonem ex ea quæ fuit Uriæ"
// Root cause: r1 had "David" instead of "Iesse" — entire first clause was displaced.
applyColumn('matthew', 1, 6, 'vulgate', 'Whitaker', [
  { r: 'r1',  text: 'Iesse',      gloss: 'Jesse'     },
  { r: 'r2',  text: 'autem',      gloss: 'but'       },
  { r: 'r3',  text: 'genuit',     gloss: 'begat'     },
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'David',      gloss: 'David'     },
  { r: 'r6',  text: null },
  { r: 'r7',  text: 'regem',      gloss: 'king'      },
  { r: 'r8',  text: 'David',      gloss: 'David'     },
  { r: 'r9',  text: 'autem',      gloss: 'but'       },
  { r: 'r10', text: null },
  { r: 'r11', text: 'rex',        gloss: 'king'      },
  { r: 'r12', text: 'genuit',     gloss: 'begat'     },
  { r: 'r13', text: null },
  { r: 'r14', text: 'Salomonem',  gloss: 'Solomon'   },
  { r: 'r15', text: 'ex',         gloss: 'from'      },
  { r: 'r16', text: null },
  { r: 'r17', text: null },
  { r: 'r18', text: 'Uriæ',       gloss: 'of Uriah'  },
]);

// Peshitta Matthew 1:6
// ܐܝܫܝ ܕܝܢ ܐܘܠܕ ܠܕܘܝܕ ܡܠܟܐ ܕܘܝܕ ܕܝܢ ܡܠܟܐ ܐܘܠܕ ܠܫܠܝܡܘܢ ܡܢ ܐܢܬܬܗ ܕܐܘܪܝܐ
// r2 had ܐܘܠܕ (begat) instead of ܕܝܢ (but); r5 David was missing; subsequent words displaced.
applyColumn('matthew', 1, 6, 'peshitta', 'PayneSmith', [
  { r: 'r2',  text: 'ܕܝܢ',       gloss: 'but'       },
  { r: 'r3',  text: 'ܐܘܠܕ',      gloss: 'begat'     },
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'ܠܕܘܝܕ',     gloss: 'David'     },
  { r: 'r6',  text: null },
  { r: 'r9',  text: 'ܕܝܢ',       gloss: 'but'       },
  { r: 'r10', text: null },
  { r: 'r11', text: 'ܡܠܟܐ',      gloss: 'king'      },
  { r: 'r12', text: 'ܐܘܠܕ',      gloss: 'begat'     },
  { r: 'r13', text: null },
  { r: 'r14', text: 'ܠܫܠܝܡܘܢ',  gloss: 'Solomon'   },
  { r: 'r15', text: 'ܡܢ',        gloss: 'from'      },
  { r: 'r16', text: 'ܐܢܬܬܗ',    gloss: 'wife of'   },
  { r: 'r17', text: null },
]);

console.log('Fixed matthew 1:6 vulgate + peshitta');
