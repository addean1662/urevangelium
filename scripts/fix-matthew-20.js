'use strict';
const fs = require('fs');
const path = require('path');
const BASE = path.join(__dirname, '..', 'data', 'matthew', '20');

function fix(v, patches) {
  const fp = path.join(BASE, `${v}.json`);
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const map = {};
  for (const r of data.rows) map[r.id] = r;
  for (const p of patches) {
    const row = map[p.id];
    if (!row) { console.error(`  MISSING ${p.id} in v${v}.json`); continue; }
    const gl = row.vaticanus?.gloss?.gloss || '?';
    if ('vg' in p) {
      row.vulgate = p.vg === null
        ? { type: 'empty' }
        : { type: 'text', text: p.vg, gloss: { gloss: gl, source: 'Whitaker' } };
    }
    if ('pe' in p) {
      row.peshitta = p.pe === null
        ? { type: 'empty' }
        : { type: 'text', text: p.pe, gloss: { gloss: gl, source: 'PayneSmith' } };
    }
  }
  fs.writeFileSync(fp, JSON.stringify(data, null, 2));
  console.log(`  fixed v${v}.json`);
}

// ── 20:8 ──────────────────────────────────────────────────────────────────────
// VG: "Cum sero" bundle at Ὀψίας; "factum esset" bundle at γενομένης; full cascade shift
// PE: ܪܡܫܐ at Ὀψίας; ܟܕ ܗܘܐ bundle at γενομένης; cascade shift; αὐτοῦ absorbed into ܠܪܒܝܬܗ; καὶ absorbed into ܘܗܒ
fix(8, [
  { id: 'r1',  vg: 'Cum sero',     pe: 'ܪܡܫܐ' },
  { id: 'r2',  vg: 'autem' },
  { id: 'r3',  vg: 'factum esset', pe: 'ܟܕ ܗܘܐ' },
  { id: 'r4',  vg: 'dicit',        pe: 'ܐܡܪ' },
  { id: 'r6',  vg: 'dominus',      pe: 'ܡܪܐ' },
  { id: 'r8',  vg: 'vineæ',        pe: 'ܟܪܡܐ' },
  { id: 'r10', vg: 'procuratori',  pe: 'ܠܪܒܝܬܗ' },
  { id: 'r11', vg: 'suo',          pe: null },
  { id: 'r12', vg: 'Voca' },
  { id: 'r14', vg: 'operarios',    pe: 'ܦܥܠܐ' },
  { id: 'r15', vg: 'et',           pe: null },
  { id: 'r16', vg: 'redde' },
  { id: 'r17', vg: 'illis' },
  { id: 'r19', vg: 'mercedem' },
  { id: 'r20', vg: 'incipiens' },
  { id: 'r21', vg: 'a' },
  { id: 'r23', vg: 'novissimis' },
  { id: 'r24', vg: 'usque' },
  { id: 'r26', vg: 'ad primos' },
]);

// ── 20:9 ──────────────────────────────────────────────────────────────────────
// VG: "qui circa" bundle; "horam venerant" bundle shifts undecimam forward
// PE: ܢܤܒܘ belongs at ὁμοίως row (r9), not venerant row (r8)
fix(9, [
  { id: 'r5', vg: 'qui circa' },
  { id: 'r7', vg: 'undecimam' },
  { id: 'r8', vg: 'horam venerant', pe: null },
  { id: 'r9', pe: 'ܢܤܒܘ' },
]);

// ── 20:10 ─────────────────────────────────────────────────────────────────────
// VG: Et/Venientes/autem rotated; "arbitrati sunt" bundle; "essent accepturi" bundle
// PE: ܕܝܢܪ shifts from r11 to r14
fix(10, [
  { id: 'r1',  vg: 'et' },
  { id: 'r2',  vg: 'Venientes' },
  { id: 'r3',  vg: 'autem' },
  { id: 'r5',  vg: 'primi' },
  { id: 'r6',  vg: 'arbitrati sunt' },
  { id: 'r9',  vg: 'essent accepturi' },
  { id: 'r10', vg: 'autem' },
  { id: 'r11', pe: null },
  { id: 'r13', vg: 'singulos' },
  { id: 'r14', vg: 'denarios', pe: 'ܕܝܢܪ' },
  { id: 'r15', vg: 'et' },
  { id: 'r16', vg: 'ipsi' },
]);

// ── 20:13 ─────────────────────────────────────────────────────────────────────
// VG: "At ille" bundle; nonne/ex denario/convenisti/mecum shift
// PE: ܘܐܡܪ/ܠܚܕ/ܡܢܗܘܢ rotate; "ܐܢܐ ܒܟ" and "ܠܐ ܗܘܐ" bundles; cascade shift
fix(13, [
  { id: 'r2',  vg: 'At ille' },
  { id: 'r4',  pe: 'ܠܚܕ' },
  { id: 'r5',  pe: 'ܡܢܗܘܢ' },
  { id: 'r6',  pe: 'ܘܐܡܪ' },
  { id: 'r10', pe: 'ܐܢܐ ܒܟ' },
  { id: 'r11', vg: 'nonne',      pe: 'ܠܐ ܗܘܐ' },
  { id: 'r12', vg: 'ex denario', pe: 'ܒܕܝܢܪ' },
  { id: 'r13', vg: 'convenisti', pe: 'ܩܨܬ' },
  { id: 'r14', vg: 'mecum',      pe: 'ܥܡܝ' },
]);

// ── 20:14 ─────────────────────────────────────────────────────────────────────
// VG: "quod tuum est" bundle at tuum; full cascade shift downstream
// PE: ܨܒܐ absorbed into ܨܒܐ ܐܢܐ bundle at volo; ܕܝܢ→ܕܠܗܢܐ; cascade shift; ܐܝܟ row empties
fix(14, [
  { id: 'r3',  vg: 'quod tuum est' },
  { id: 'r4',  vg: 'et' },
  { id: 'r5',  vg: 'vade',         pe: null },
  { id: 'r6',  vg: 'volo',         pe: 'ܨܒܐ ܐܢܐ' },
  { id: 'r7',  vg: 'autem' },
  { id: 'r8',  vg: 'et huic',      pe: 'ܕܠܗܢܐ' },
  { id: 'r10', vg: 'novissimo',    pe: 'ܐܚܪܝܐ' },
  { id: 'r11', vg: 'dare',         pe: 'ܐܬܠ' },
  { id: 'r12', vg: 'sicut',        pe: 'ܐܝܟ' },
  { id: 'r13', vg: 'et',           pe: null },
  { id: 'r14', vg: 'tibi' },
]);

// ── 20:20 ─────────────────────────────────────────────────────────────────────
// VG: "ad eum" bundle at προσῆλθεν; full cascade shift of mater…eo
// PE: ܘܒܢܝܗ at filiorum (r11); ܘܫܐܠܐ ܗܘܬ bundle at προσεκύνει; ܡܕܡ shift; eo row empties
fix(20, [
  { id: 'r3',  vg: 'ad eum' },
  { id: 'r5',  vg: 'mater' },
  { id: 'r7',  vg: 'filiorum' },
  { id: 'r8',  vg: 'Zebedæi' },
  { id: 'r9',  vg: 'cum' },
  { id: 'r11', vg: 'filiis',           pe: 'ܘܒܢܝܗ' },
  { id: 'r12', vg: 'suis',             pe: null },
  { id: 'r13', vg: 'adorans' },
  { id: 'r14', vg: 'et' },
  { id: 'r15', vg: 'petens',           pe: 'ܘܫܐܠܐ ܗܘܬ' },
  { id: 'r16', vg: 'aliquid',          pe: 'ܡܕܡ' },
  { id: 'r17', vg: 'ab' },
  { id: 'r18', vg: 'eo',               pe: null },
]);

// ── 20:24 ─────────────────────────────────────────────────────────────────────
// VG: "indignati sunt" bundle; cascade de/duobus/fratribus shift
// PE: "ܟܕ ܕܝܢ" bundle at Καὶ; ܫܡܥܘ at ἀκούσαντες; "ܗܢܘܢ ܬܪܝܢ" bundle at δύο
fix(24, [
  { id: 'r1', pe: 'ܟܕ ܕܝܢ' },
  { id: 'r2', pe: 'ܫܡܥܘ' },
  { id: 'r5', vg: 'indignati sunt' },
  { id: 'r6', vg: 'de' },
  { id: 'r8', vg: 'duobus',   pe: 'ܗܢܘܢ ܬܪܝܢ' },
  { id: 'r9', vg: 'fratribus' },
]);

// ── 20:25 ─────────────────────────────────────────────────────────────────────
// VG: Jesus token shifted forward; "ad se et ait" bundle; "qui majores sunt" bundle;
//     "potestatem exercent" and "in eos" bundles at end
// PE: ܝܫܘܥ/ܘܩܪܐ/ܐܢܘܢ rotate; "ܘܐܡܪ ܠܗܘܢ" bundle; ܕܪܫܝܗܘܢ at r10; cascade shift; r15 empties
fix(25, [
  { id: 'r3',  vg: 'Jesus',              pe: 'ܝܫܘܥ' },
  { id: 'r4',  vg: 'vocavit',            pe: 'ܘܩܪܐ' },
  { id: 'r5',  vg: 'eos',               pe: 'ܐܢܘܢ' },
  { id: 'r6',  vg: 'ad se et ait',      pe: 'ܘܐܡܪ ܠܗܘܢ' },
  { id: 'r7',  vg: 'Scitis' },
  { id: 'r8',  vg: 'quia' },
  { id: 'r10', vg: 'principes',         pe: 'ܕܪܫܝܗܘܢ' },
  { id: 'r12', pe: 'ܕܥܡܡܐ' },
  { id: 'r13', pe: 'ܡܪܝܗܘܢ' },
  { id: 'r14', pe: 'ܐܢܘܢ' },
  { id: 'r15', pe: null },
  { id: 'r17', vg: 'qui majores sunt' },
  { id: 'r18', vg: 'potestatem exercent' },
  { id: 'r19', vg: 'in eos' },
]);

// ── 20:32 ─────────────────────────────────────────────────────────────────────
// VG: Jesus token shifted; "et vocavit" bundle; "ut faciam" bundle
// PE: ܝܫܘܥ absorbed from r2 to r4; cascade shift of ܘܩܪܐ/ܐܢܘܢ/ܘܐܡܪ/ܡܢܐ/ܨܒܝܢ;
//     "ܨܒܝܢ ܐܢܬܘܢ" bundle at ἀνθρώπων row
fix(32, [
  { id: 'r2',  pe: null },
  { id: 'r4',  vg: 'Jesus',            pe: 'ܝܫܘܥ' },
  { id: 'r5',  vg: 'et vocavit',       pe: 'ܘܩܪܐ' },
  { id: 'r6',  pe: 'ܐܢܘܢ' },
  { id: 'r8',  pe: 'ܘܐܡܪ' },
  { id: 'r9',  pe: 'ܡܢܐ' },
  { id: 'r10', pe: 'ܨܒܝܢ ܐܢܬܘܢ' },
  { id: 'r11', vg: 'ut faciam' },
  { id: 'r12', vg: 'vobis' },
]);

console.log('Done.');
