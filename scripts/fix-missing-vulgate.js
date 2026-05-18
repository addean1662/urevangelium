'use strict';
// Fix verses with entirely missing or wrong Vulgate content:
//   Mark 4:41  — Vulgate was all empty (verse text embedded in Clementine 4:40)
//   Mark 9:49  — Vulgate had Bonum est sal (shifted from 9:50); correct = Omnis igne salietur
//   Mark 9:50  — Vulgate all empty; correct = Bonum est sal + full Peshitta
//   John 11:57 — Vulgate all empty (verse text embedded in Clementine 11:56)
const fs = require('fs');
const path = require('path');

function load(gospel, ch, v) {
  const fp = path.join(__dirname, '..', 'data', gospel, String(ch), v + '.json');
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const map = {};
  for (const r of data.rows) map[r.id] = r;
  return { fp, data, map };
}

function setVg(row, text, gloss) {
  row.vulgate = text === null
    ? { type: 'empty' }
    : { type: 'text', text, gloss: { gloss, source: 'Whitaker' } };
}

function setPe(row, text, gloss) {
  row.peshitta = text === null
    ? { type: 'empty' }
    : { type: 'text', text, gloss: { gloss, source: 'PayneSmith' } };
}

function save({ fp, data }) {
  fs.writeFileSync(fp, JSON.stringify(data, null, 2));
  console.log('  saved ' + fp.split(/[/\\]/).slice(-3).join('/'));
}

// ── Mark 4:41 ─────────────────────────────────────────────────────────────────
// Clementine source [4:40] ends: "et timuerunt timore magno, et dicebant ad
// alterutrum : Quis, putas, est iste, quia et ventus et mare obediunt ei ?"
// Greek rows: καὶ ἐφοβήθησαν φόβον μέγαν καὶ ἔλεγον πρὸς ἀλλήλους τίς ἄρα
//   οὗτός ἐστιν ὅτι καὶ ὁ ἄνεμος καὶ ἡ θάλασσα ὑπακούει αὐτῷ
{
  const { fp, data, map } = load('mark', 4, 41);
  const patches = [
    { id: 'r1',  vg: 'et',        gl: 'and' },
    { id: 'r2',  vg: 'timuerunt', gl: 'they feared' },
    { id: 'r3',  vg: 'timore',    gl: 'fear' },
    { id: 'r4',  vg: 'magno',     gl: 'great' },
    { id: 'r5',  vg: 'et',        gl: 'and' },
    { id: 'r6',  vg: 'dicebant',  gl: 'they said' },
    { id: 'r7',  vg: 'ad',        gl: 'to' },
    { id: 'r8',  vg: 'alterutrum',gl: 'one another' },
    { id: 'r9',  vg: 'Quis',      gl: 'who' },
    { id: 'r10', vg: 'putas',     gl: 'do you think' },
    { id: 'r11', vg: 'iste',      gl: 'this' },
    { id: 'r12', vg: 'est',       gl: 'is' },
    { id: 'r13', vg: 'quia',      gl: 'that' },
    { id: 'r14', vg: 'et',        gl: 'even' },
    // r15 = ὁ (article) → empty
    { id: 'r16', vg: 'ventus',    gl: 'wind' },
    { id: 'r17', vg: 'et',        gl: 'and' },
    // r18 = ἡ (article) → empty
    { id: 'r19', vg: 'mare',      gl: 'sea' },
    { id: 'r20', vg: 'obediunt',  gl: 'obey' },
    { id: 'r21', vg: 'ei',        gl: 'him' },
  ];
  for (const p of patches) {
    const row = map[p.id];
    if (!row) { console.error('MISSING ' + p.id); continue; }
    setVg(row, p.vg, p.gl);
  }
  save({ fp, data });
}

// ── Mark 9:49 ─────────────────────────────────────────────────────────────────
// Greek: πᾶς γὰρ πυρὶ ἁλισθήσεται καὶ πᾶσα θυσία ἁλὶ ἁλισθήσεται
// Correct Vulgate (Clementine [9:48]): "Omnis enim igne salietur, et omnis
//   victima sale salietur."
// Also fix r9 Peshitta which has corrupt value "50".
{
  const { fp, data, map } = load('mark', 9, 49);
  const vgPatches = [
    { id: 'r1', vg: 'Omnis',   gl: 'everyone' },
    { id: 'r2', vg: 'enim',    gl: 'for' },
    { id: 'r3', vg: 'igne',    gl: 'with fire' },
    { id: 'r4', vg: 'salietur',gl: 'will be salted' },
    { id: 'r5', vg: 'et',      gl: 'and' },
    { id: 'r6', vg: 'omnis',   gl: 'all' },
    { id: 'r7', vg: 'victima', gl: 'sacrifice' },
    { id: 'r8', vg: 'sale',    gl: 'with salt' },
    { id: 'r9', vg: 'salietur',gl: 'will be salted' },
  ];
  for (const p of vgPatches) {
    const row = map[p.id];
    if (!row) { console.error('MISSING ' + p.id); continue; }
    setVg(row, p.vg, p.gl);
  }
  // Fix corrupt Peshitta at r9 (currently "50")
  if (map['r9']) setPe(map['r9'], null, '');
  save({ fp, data });
}

// ── Mark 9:50 ─────────────────────────────────────────────────────────────────
// Greek: καλὸν τὸ ἅλας· ἐὰν δὲ τὸ ἅλας ἄναλον γένηται, ἐν τίνι αὐτὸ
//   ἀρτύσετε; ἔχετε ἐν ἑαυτοῖς ἅλα καὶ εἰρηνεύετε ἐν ἀλλήλοις.
// Clementine (source [9:49]): "Bonum est sal : quod si sal insulsum fuerit, in
//   quo illud condietis ? Habete in vobis sal, et pacem habete inter vos."
// Peshitta: ܛܒ ܗܘ ܡܠܚܐ ܐܢ ܕܝܢ ܡܠܚܐ ܦܟܝܗ ܢܗܘܐ ܒܡܢܐ ܬܬܪܣܘܢܝܗܝ ܗܘܘ ܠܟܘܢ ܡܠܚܐ ܘܫܠܡܘ ܚܕ ܥܡ ܚܕ
{
  const { fp, data, map } = load('mark', 9, 50);
  const patches = [
    // r1 καλὸν → Bonum est (bundle: Latin adds copula)
    { id: 'r1',  vg: 'Bonum est',    gl: 'good is',       pe: 'ܛܒ ܗܘ',    pg: 'good' },
    // r2 τὸ (article) → empty / empty
    // r3 ἅλας → sal
    { id: 'r3',  vg: 'sal',          gl: 'salt',          pe: 'ܡܠܚܐ',      pg: 'salt' },
    // r4 ἐὰν → quod si (bundle absorbs δὲ at r5)
    { id: 'r4',  vg: 'quod si',      gl: 'but if',        pe: 'ܐܢ',         pg: 'if' },
    // r5 δὲ → null (absorbed into quod si) / ܕܝܢ already there
    { id: 'r5',  vg: null,           gl: '' },
    // r6 τὸ (article) → empty / empty
    // r7 ἅλας → sal
    { id: 'r7',  vg: 'sal',          gl: 'salt',          pe: 'ܡܠܚܐ',      pg: 'salt' },
    // r8 ἄναλον → insulsum
    { id: 'r8',  vg: 'insulsum',     gl: 'unsalty',       pe: 'ܦܟܝܗ',      pg: 'tasteless' },
    // r9 γένηται → fuerit
    { id: 'r9',  vg: 'fuerit',       gl: 'becomes',       pe: 'ܢܗܘܐ',      pg: 'becomes' },
    // r10 ἐν → in / null (absorbed into ܒܡܢܐ)
    { id: 'r10', vg: 'in',           gl: 'with',          pe: null,          pg: '' },
    // r11 τίνι → quo / ܒܡܢܐ (preposition absorbed as ܒ prefix)
    { id: 'r11', vg: 'quo',          gl: 'what',          pe: 'ܒܡܢܐ',      pg: 'with what' },
    // r12 αὐτὸ → illud / null (absorbed as suffix)
    { id: 'r12', vg: 'illud',        gl: 'it',            pe: null,          pg: '' },
    // r13 ἀρτύσετε → condietis / ܬܬܪܣܘܢܝܗܝ
    { id: 'r13', vg: 'condietis',    gl: 'will you season',pe: 'ܬܬܪܣܘܢܝܗܝ', pg: 'you will season it' },
    // r14 ἔχετε → Habete / ܗܘܘ ܠܟܘܢ (Syriac idiom: "be to you")
    { id: 'r14', vg: 'Habete',       gl: 'have',          pe: 'ܗܘܘ ܠܟܘܢ',  pg: 'have' },
    // r15 ἐν → in / null
    { id: 'r15', vg: 'in',           gl: 'in',            pe: null,          pg: '' },
    // r16 ἑαυτοῖς → vobis / null (absorbed into ܠܟܘܢ bundle)
    { id: 'r16', vg: 'vobis',        gl: 'yourselves',    pe: null,          pg: '' },
    // r17 ἅλα → sal / ܡܠܚܐ
    { id: 'r17', vg: 'sal',          gl: 'salt',          pe: 'ܡܠܚܐ',      pg: 'salt' },
    // r18 καὶ → et / null (ܘ prefix on next word)
    { id: 'r18', vg: 'et',           gl: 'and',           pe: null,          pg: '' },
    // r19 εἰρηνεύετε → pacem habete (bundle) / ܘܫܠܡܘ
    { id: 'r19', vg: 'pacem habete', gl: 'be at peace',   pe: 'ܘܫܠܡܘ',     pg: 'be at peace' },
    // r20 ἐν → null / null
    { id: 'r20', vg: null,           gl: '',              pe: null,          pg: '' },
    // r21 ἀλλήλοις → inter vos (bundle) / ܚܕ ܥܡ ܚܕ (bundle: "one with one")
    { id: 'r21', vg: 'inter vos',    gl: 'with one another', pe: 'ܚܕ ܥܡ ܚܕ', pg: 'one with one' },
  ];
  for (const p of patches) {
    const row = map[p.id];
    if (!row) { console.error('MISSING ' + p.id); continue; }
    if ('vg' in p) setVg(row, p.vg, p.gl);
    if ('pe' in p) setPe(row, p.pe, p.pg);
  }
  save({ fp, data });
}

// ── John 11:57 ────────────────────────────────────────────────────────────────
// Greek: δεδώκεισαν δὲ καὶ οἱ ἀρχιερεῖς καὶ οἱ Φαρισαῖοι ἐντολὰς ἵνα ἐάν
//   τις γνῷ ποῦ ἐστιν μηνύσῃ ὅπως πιάσωσιν αὐτόν
// Clementine (end of [11:56]): "Dederant autem pontifices et pharisæi mandatum
//   ut si quis cognoverit ubi sit, indicet, ut apprehendant eum."
{
  const { fp, data, map } = load('john', 11, 57);
  const patches = [
    { id: 'r1',  vg: 'Dederant',     gl: 'had given' },
    { id: 'r2',  vg: 'autem',        gl: 'now' },
    { id: 'r3',  vg: null,           gl: '' },       // καὶ absorbed in Latin restructure
    // r4 οἱ (article) → empty
    { id: 'r5',  vg: 'pontifices',   gl: 'chief priests' },
    { id: 'r6',  vg: 'et',           gl: 'and' },
    // r7 οἱ (article) → empty
    { id: 'r8',  vg: 'pharisæi',     gl: 'Pharisees' },
    { id: 'r9',  vg: 'mandatum',     gl: 'command' },
    { id: 'r10', vg: 'ut',           gl: 'that' },
    { id: 'r11', vg: 'si',           gl: 'if' },
    { id: 'r12', vg: 'quis',         gl: 'anyone' },
    { id: 'r13', vg: 'cognoverit',   gl: 'shall know' },
    { id: 'r14', vg: 'ubi',          gl: 'where' },
    { id: 'r15', vg: 'sit',          gl: 'he is' },
    { id: 'r16', vg: 'indicet',      gl: 'he shall show' },
    { id: 'r17', vg: 'ut',           gl: 'so that' },
    { id: 'r18', vg: 'apprehendant', gl: 'they may seize' },
    { id: 'r19', vg: 'eum',          gl: 'him' },
  ];
  for (const p of patches) {
    const row = map[p.id];
    if (!row) { console.error('MISSING ' + p.id); continue; }
    setVg(row, p.vg, p.gl);
  }
  save({ fp, data });
}

console.log('Done.');
