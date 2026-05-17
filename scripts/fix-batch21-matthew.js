const fs = require('fs');

function applyVulgate(gospel, ch, v, mapping) {
  const path = `data/${gospel}/${ch}/${v}.json`;
  const d = JSON.parse(fs.readFileSync(path, 'utf8'));
  const map = {};
  mapping.forEach(m => { map[m.r] = m; });
  d.rows = d.rows.map(row => {
    const m = map[row.id];
    if (!m) return row;
    const cell = m.text
      ? { type: 'text', text: m.text, gloss: { gloss: m.gloss || m.text, source: 'Whitaker' } }
      : { type: 'empty' };
    return { ...row, vulgate: cell };
  });
  fs.writeFileSync(path, JSON.stringify(d, null, 2));
  console.log('Fixed ' + gospel + ' ' + ch + ':' + v);
}

// ── Matt 18:1 — "cælorum" at τῇ r3; cascade r9-r19 ──────────────────────────
// GK: Ἐν ἐκείνῃ τῇ ὥρᾳ προσῆλθον οἱ μαθηταὶ τῷ Ἰησοῦ λέγοντες τίς ἄρα
//     μείζων ἐστὶν ἐν τῇ βασιλείᾳ τῶν οὐρανῶν (19r)
// VL: In illa hora accesserunt discipuli ad Jesum dicentes Quis putas major est
//     in regno cælorum
applyVulgate('matthew', '18', '1', [
  { r: 'r3',  text: null },
  { r: 'r9',  text: 'ad Jesum',  gloss: 'to Jesus' },
  { r: 'r10', text: 'dicentes',  gloss: 'saying' },
  { r: 'r11', text: 'Quis',      gloss: 'who' },
  { r: 'r12', text: 'putas',     gloss: 'do you think' },
  { r: 'r13', text: 'major',     gloss: 'greater' },
  { r: 'r14', text: 'est',       gloss: 'is' },
  { r: 'r15', text: 'in',        gloss: 'in' },
  { r: 'r17', text: 'regno',     gloss: 'the kingdom' },
  { r: 'r19', text: 'cælorum',   gloss: 'of heaven' },
]);

// ── Matt 18:6 — "maris" at τῶν r6; "scandalizaverit" at ἂν r3; full rebuild ─
// GK: ὃς δ᾽ ἂν σκανδαλίσῃ ἕνα τῶν μικρῶν τούτων τῶν πιστευόντων εἰς ἐμέ
//     συμφέρει αὐτῷ ἵνα κρεμασθῇ μύλος ὀνικὸς περὶ τὸν τράχηλον αὐτοῦ καὶ
//     καταποντισθῇ ἐν τῷ πελάγει τῆς θαλάσσης (29r)
// VL: qui autem scandalizaverit unum de pusillis istis qui in me credunt expedit
//     ei ut suspendatur mola asinaria in collo ejus et demergatur in profundum maris
applyVulgate('matthew', '18', '6', [
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'scandalizaverit', gloss: 'shall scandalize' },
  { r: 'r5',  text: 'unum',            gloss: 'one' },
  { r: 'r6',  text: null },
  { r: 'r7',  text: 'de pusillis',     gloss: 'of these little ones' },
  { r: 'r10', text: 'qui credunt',     gloss: 'who believe' },
  { r: 'r13', text: 'expedit',         gloss: 'it is better' },
  { r: 'r14', text: 'ei',              gloss: 'for him' },
  { r: 'r15', text: 'ut',              gloss: 'that' },
  { r: 'r16', text: 'suspendatur',     gloss: 'be hung' },
  { r: 'r17', text: 'mola',            gloss: 'a millstone' },
  { r: 'r18', text: 'asinaria',        gloss: 'of a donkey' },
  { r: 'r19', text: null },
  { r: 'r21', text: 'in collo',        gloss: 'around his neck' },
  { r: 'r22', text: 'ejus',            gloss: 'his' },
  { r: 'r23', text: 'et',              gloss: 'and' },
  { r: 'r24', text: 'demergatur',      gloss: 'be drowned' },
  { r: 'r25', text: 'in',              gloss: 'in' },
  { r: 'r27', text: 'profundum',       gloss: 'the depth' },
  { r: 'r29', text: 'maris',           gloss: 'of the sea' },
]);

// ── Matt 18:7 — "venit" at τῷ r2; cascade r8-r22 ────────────────────────────
// GK: Οὐαὶ τῷ κόσμῳ ἀπὸ τῶν σκανδάλων ἀνάγκη γὰρ ἐστιν ἐλθεῖν τὰ σκάνδαλα
//     πλὴν οὐαὶ τῷ ἀνθρώπῳ ἐκείνῳ δι᾽ οὗ τὸ σκάνδαλον ἔρχεται (22r)
// VL: Væ mundo a scandalis Necesse est enim ut veniant scandala verumtamen væ
//     homini illi per quem scandalum venit
applyVulgate('matthew', '18', '7', [
  { r: 'r2',  text: null },
  { r: 'r8',  text: 'enim',        gloss: 'indeed' },
  { r: 'r9',  text: 'est',         gloss: 'is' },
  { r: 'r10', text: 'ut veniant',  gloss: 'that they come' },
  { r: 'r12', text: 'scandala',    gloss: 'scandals' },
  { r: 'r13', text: 'verumtamen',  gloss: 'nevertheless' },
  { r: 'r14', text: 'væ',          gloss: 'woe' },
  { r: 'r16', text: 'homini',      gloss: 'to the man' },
  { r: 'r17', text: 'illi',        gloss: 'that' },
  { r: 'r18', text: 'per',         gloss: 'through' },
  { r: 'r19', text: 'quem',        gloss: 'whom' },
  { r: 'r21', text: 'scandalum',   gloss: 'the scandal' },
  { r: 'r22', text: 'venit',       gloss: 'comes' },
]);

// ── Matt 18:9 — "gehennam" at ὁ r3; "ignis" at τὴν r19; cascade r17-r31 ─────
// GK: καὶ εἰ ὁ ὀφθαλμός σου σκανδαλίζει σε ἔξελε αὐτὸν καὶ βάλε ἀπὸ σοῦ
//     καλόν σοί ἐστιν μονόφθαλμον εἰς τὴν ζωὴν εἰσελθεῖν ἢ δύο ὀφθαλμοὺς
//     ἔχοντα βληθῆναι εἰς τὴν γέενναν τοῦ πυρός (31r)
// VL: Et si oculus tuus scandalizat te erue eum et projice abs te bonum tibi est
//     cum uno oculo in vitam intrare quam duos oculos habentem mitti in gehennam ignis
applyVulgate('matthew', '18', '9', [
  { r: 'r3',  text: null },
  { r: 'r17', text: 'cum uno oculo', gloss: 'with one eye' },
  { r: 'r18', text: 'in',            gloss: 'into' },
  { r: 'r19', text: null },
  { r: 'r20', text: 'vitam',         gloss: 'life' },
  { r: 'r21', text: 'intrare',       gloss: 'to enter' },
  { r: 'r22', text: 'quam',          gloss: 'than' },
  { r: 'r23', text: 'duos',          gloss: 'two' },
  { r: 'r24', text: 'oculos',        gloss: 'eyes' },
  { r: 'r25', text: 'habentem',      gloss: 'having' },
  { r: 'r26', text: 'mitti',         gloss: 'to be cast' },
  { r: 'r27', text: 'in',            gloss: 'into' },
  { r: 'r29', text: 'gehennam',      gloss: 'hell' },
  { r: 'r31', text: 'ignis',         gloss: 'of fire' },
]);

// ── Matt 18:10 — "cælis" at τῶν r5; "est" at οἱ r12; cascade r6-r17, r25-r27 ─
// GK: Ὁράτε μὴ καταφρονήσητε ἑνὸς τῶν μικρῶν τούτων λέγω γὰρ ὑμῖν ὅτι οἱ
//     ἄγγελοι αὐτῶν ἐν οὐρανοῖς διὰ παντὸς βλέπουσιν τὸ πρόσωπον τοῦ πατρός
//     μου τοῦ ἐν οὐρανοῖς (27r)
// VL: Videte ne contemnatis unum ex his pusillis dico enim vobis quia angeli
//     eorum in cælis semper vident faciem Patris mei qui est in cælis
applyVulgate('matthew', '18', '10', [
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'ex pusillis',  gloss: 'of the little ones' },
  { r: 'r8',  text: 'dico',         gloss: 'I say' },
  { r: 'r9',  text: 'enim',         gloss: 'for' },
  { r: 'r10', text: 'vobis',        gloss: 'to you' },
  { r: 'r11', text: 'quia',         gloss: 'that' },
  { r: 'r12', text: null },
  { r: 'r13', text: 'angeli',       gloss: 'the angels' },
  { r: 'r14', text: 'eorum',        gloss: 'their' },
  { r: 'r15', text: 'in',           gloss: 'in' },
  { r: 'r16', text: 'cælis',        gloss: 'heaven' },
  { r: 'r17', text: null },
  { r: 'r25', text: 'qui est',      gloss: 'who is' },
  { r: 'r26', text: 'in',           gloss: 'in' },
  { r: 'r27', text: 'cælis',        gloss: 'heaven' },
]);

// ── Matt 18:12 — "erravit" at τὰ r17; full cascade r7-r27 ───────────────────
// GK: Τί ὑμῖν δοκεῖ ἐὰν γένηταί τινι ἀνθρώπῳ ἑκατὸν πρόβατα καὶ πλανηθῇ ἓν
//     ἐξ αὐτῶν οὐχὶ ἀφήσει τὰ ἐνενήκοντα ἐννέα ἐπὶ τὰ ὄρη καὶ πορευθεὶς
//     ζητεῖ τὸ πλανώμενον (27r)
// VL: Quid vobis videtur si fuerint alicui centum oves et erraverit una ex eis
//     nonne relinquit nonaginta novem in montibus et vadit quærere eam quæ erravit
applyVulgate('matthew', '18', '12', [
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'centum',           gloss: 'a hundred' },
  { r: 'r9',  text: 'oves',             gloss: 'sheep' },
  { r: 'r10', text: 'et',               gloss: 'and' },
  { r: 'r11', text: 'erraverit',        gloss: 'shall wander' },
  { r: 'r12', text: 'una',              gloss: 'one' },
  { r: 'r13', text: 'ex',               gloss: 'from' },
  { r: 'r14', text: 'eis',              gloss: 'them' },
  { r: 'r15', text: 'nonne',            gloss: 'does he not' },
  { r: 'r16', text: 'relinquit',        gloss: 'leave' },
  { r: 'r17', text: null },
  { r: 'r18', text: 'nonaginta',        gloss: 'ninety' },
  { r: 'r19', text: 'novem',            gloss: 'nine' },
  { r: 'r20', text: 'in',              gloss: 'in' },
  { r: 'r21', text: null },
  { r: 'r22', text: 'montibus',         gloss: 'the mountains' },
  { r: 'r23', text: 'et',               gloss: 'and' },
  { r: 'r24', text: 'vadit',            gloss: 'goes' },
  { r: 'r25', text: 'quærere',          gloss: 'to seek' },
  { r: 'r27', text: 'eam quæ erravit',  gloss: 'the one that strayed' },
]);

// ── Matt 18:13 — "eam" at ἀμὴν r6; cascade r6-r16 ───────────────────────────
// GK: καὶ ἐὰν γένηται εὑρεῖν αὐτό ἀμὴν λέγω ὑμῖν ὅτι χαίρει ἐπ᾽ αὐτῷ
//     μᾶλλον ἢ ἐπὶ τοῖς ἐνενήκοντα ἐννέα τοῖς μὴ πεπλανημένοις (21r)
// VL: Et si contigerit ut inveniat eam amen dico vobis quia gaudet super eam
//     magis quam super nonaginta novem quæ non erraverunt
// Note: r19 τοῖς="quæ" is LEGITIMATE (articular participle τοῖς μὴ πεπλανημένοις)
applyVulgate('matthew', '18', '13', [
  { r: 'r4',  text: 'ut inveniat', gloss: 'that he finds' },
  { r: 'r5',  text: 'eam',         gloss: 'it' },
  { r: 'r6',  text: 'amen',        gloss: 'amen' },
  { r: 'r7',  text: 'dico',        gloss: 'I say' },
  { r: 'r8',  text: 'vobis',       gloss: 'to you' },
  { r: 'r9',  text: 'quia',        gloss: 'that' },
  { r: 'r10', text: 'gaudet',      gloss: 'he rejoices' },
  { r: 'r11', text: 'super',       gloss: 'over' },
  { r: 'r12', text: 'eam',         gloss: 'it' },
  { r: 'r13', text: 'magis',       gloss: 'more' },
  { r: 'r14', text: 'quam',        gloss: 'than' },
  { r: 'r15', text: 'super',       gloss: 'over' },
  { r: 'r16', text: null },
]);

// ── Matt 18:14 — "Patrem" at τοῦ r6; "in" at τοῦ r9; "de" at τῶν r15 ────────
// GK: οὕτως οὐκ ἔστιν θέλημα ἔμπροσθεν τοῦ πατρὸς ὑμῶν τοῦ ἐν οὐρανοῖς ἵνα
//     ἀπόληται ἓν τῶν μικρῶν τούτων (17r)
// VL: Sic non est voluntas ante Patrem vestrum qui est in cælis ut pereat unus
//     de pusillis istis
applyVulgate('matthew', '18', '14', [
  { r: 'r6',  text: null },
  { r: 'r7',  text: 'Patrem',      gloss: 'the Father' },
  { r: 'r8',  text: 'vestrum',     gloss: 'your' },
  { r: 'r9',  text: 'qui est',     gloss: 'who is' },
  { r: 'r10', text: 'in',          gloss: 'in' },
  { r: 'r11', text: 'cælis',       gloss: 'heaven' },
  { r: 'r15', text: null },
  { r: 'r16', text: 'de pusillis', gloss: 'of these little ones' },
]);

// ── Matt 18:15 — "tuum" at ὁ r6; "eris" at ἀδελφόν r23; cascade r23-r24 ─────
// GK: Ἐὰν δὲ ἁμαρτήσῃ εἰς σὲ ὁ ἀδελφός σου ὕπαγε καὶ ἔλεγξον αὐτὸν μεταξὺ
//     σοῦ καὶ αὐτοῦ μόνου ἐάν σου ἀκούσῃ ἐκέρδησας τὸν ἀδελφόν σου (24r)
// VL: Si autem peccaverit in te frater tuus vade et corripe eum inter te et ipsum
//     solum si te audierit lucratus eris fratrem tuum
applyVulgate('matthew', '18', '15', [
  { r: 'r6',  text: null },
  { r: 'r21', text: 'lucratus eris', gloss: 'you will have gained' },
  { r: 'r23', text: 'fratrem',       gloss: 'the brother' },
  { r: 'r24', text: 'tuum',          gloss: 'your' },
]);

// ── Matt 18:17 — "publicanus" at τῇ r6; cascade r7-r21 ───────────────────────
// GK: ἐὰν δὲ παρακούσῃ αὐτῶν εἰπὲ τῇ ἐκκλησίᾳ ἐὰν δὲ καὶ τῆς ἐκκλησίας
//     παρακούσῃ ἔστω σοι ὥσπερ ὁ ἐθνικὸς καὶ ὁ τελώνης (21r)
// VL: Quod si non audierit eos dic ecclesiæ si autem et ecclesiam non audierit
//     sit tibi sicut ethnicus et publicanus
applyVulgate('matthew', '18', '17', [
  { r: 'r6',  text: null },
  { r: 'r7',  text: 'ecclesiæ',    gloss: 'to the church' },
  { r: 'r8',  text: 'si',          gloss: 'if' },
  { r: 'r9',  text: 'autem',       gloss: 'moreover' },
  { r: 'r10', text: 'et',          gloss: 'even' },
  { r: 'r13', text: 'non audierit', gloss: 'does not listen' },
  { r: 'r14', text: 'sit',         gloss: 'let him be' },
  { r: 'r15', text: 'tibi',        gloss: 'to you' },
  { r: 'r16', text: 'sicut',       gloss: 'as' },
  { r: 'r18', text: 'ethnicus',    gloss: 'a Gentile' },
  { r: 'r19', text: 'et',          gloss: 'and' },
  { r: 'r21', text: 'publicanus',  gloss: 'a tax collector' },
]);

// ── Matt 18:21 — "septies" at ὁ r3; cascade r2-r19 ───────────────────────────
// GK: Τότε προσελθὼν ὁ Πέτρος εἶπεν αὐτῷ· κύριε ποσάκις ἁμαρτήσει εἰς ἐμὲ ὁ
//     ἀδελφός μου καὶ ἀφήσω αὐτῷ ἕως ἑπτάκις (19r)
// VL: Tunc accedens Petrus ad eum dixit ei Domine quoties peccabit in me frater
//     meus et dimittam ei usque septies
applyVulgate('matthew', '18', '21', [
  { r: 'r2',  text: 'accedens ad eum', gloss: 'approaching him' },
  { r: 'r3',  text: null },
  { r: 'r5',  text: 'dixit',           gloss: 'said' },
  { r: 'r6',  text: 'ei',              gloss: 'to him' },
  { r: 'r7',  text: 'Domine',          gloss: 'Lord' },
  { r: 'r8',  text: 'quoties',         gloss: 'how many times' },
  { r: 'r9',  text: 'peccabit',        gloss: 'will sin' },
  { r: 'r10', text: 'in',              gloss: 'against' },
  { r: 'r11', text: 'me',              gloss: 'me' },
  { r: 'r13', text: 'frater',          gloss: 'brother' },
  { r: 'r14', text: 'meus',            gloss: 'my' },
  { r: 'r15', text: 'et',              gloss: 'and' },
  { r: 'r16', text: 'dimittam',        gloss: 'shall I forgive' },
  { r: 'r17', text: 'ei',              gloss: 'him' },
  { r: 'r18', text: 'usque',           gloss: 'up to' },
  { r: 'r19', text: 'septies',         gloss: 'seven times' },
]);

// ── Matt 18:25 — "reddi" at ὁ r8; cascade r5-r24 ────────────────────────────
// GK: μὴ ἔχοντος δὲ αὐτοῦ ἀποδοῦναι ἐκέλευσεν αὐτὸν ὁ κύριος αὐτοῦ πραθῆναι
//     καὶ τὴν γυναῖκα αὐτοῦ καὶ τὰ τέκνα καὶ πάντα ὅσα ἔχει καὶ ἀποδοθῆναι (24r)
// VL: Cum autem non haberet unde redderet jussit eum dominus ejus venundari et
//     uxorem ejus et filios et omnia quæ habebat et reddi
applyVulgate('matthew', '18', '25', [
  { r: 'r5',  text: 'unde redderet', gloss: 'whence to repay' },
  { r: 'r6',  text: 'jussit',        gloss: 'commanded' },
  { r: 'r7',  text: 'eum',           gloss: 'him' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'dominus',       gloss: 'the lord' },
  { r: 'r10', text: 'ejus',          gloss: 'his' },
  { r: 'r11', text: 'venundari',     gloss: 'to be sold' },
  { r: 'r12', text: 'et',            gloss: 'and' },
  { r: 'r14', text: 'uxorem',        gloss: 'wife' },
  { r: 'r15', text: 'ejus',          gloss: 'his' },
  { r: 'r16', text: 'et',            gloss: 'and' },
  { r: 'r18', text: 'filios',        gloss: 'children' },
  { r: 'r19', text: 'et',            gloss: 'and' },
  { r: 'r20', text: 'omnia',         gloss: 'all' },
  { r: 'r21', text: 'quæ',           gloss: 'that' },
  { r: 'r22', text: 'habebat',       gloss: 'he had' },
  { r: 'r23', text: 'et',            gloss: 'and' },
  { r: 'r24', text: 'reddi',         gloss: 'to be repaid' },
]);

// ── Matt 18:26 — "servus" at ὁ r3; cascade r4-r9 ────────────────────────────
// GK: Πεσὼν οὖν ὁ δοῦλος προσεκύνει αὐτῷ λέγων· κύριε μακροθύμησον ἐπ᾽ ἐμοί
//     καὶ πάντα ἀποδώσω σοι (15r)
// VL: Procidens autem servus ille orabat eum dicens Patientiam habe in me et
//     omnia reddam tibi
applyVulgate('matthew', '18', '26', [
  { r: 'r3', text: null },
  { r: 'r4', text: 'servus ille',    gloss: 'that servant' },
  { r: 'r8', text: 'Domine',         gloss: 'Lord' },
  { r: 'r9', text: 'Patientiam habe', gloss: 'have patience' },
]);

// ── Matt 18:31 — "conservi" at οἱ r3; "fiebant" at τὰ r6; "narraverunt" at
//    τῷ r13; "quæ" at τὰ r17; cascade throughout ───────────────────────────────
// GK: Ἰδόντες οὖν οἱ σύνδουλοι αὐτοῦ τὰ γενόμενα ἐλυπήθησαν σφόδρα καὶ
//     ἐλθόντες διεσάφησαν τῷ κυρίῳ ἑαυτῶν πάντα τὰ γενόμενα (18r)
// VL: Videntes autem conservi ejus quæ fiebant contristati sunt valde et venerunt
//     et narraverunt domino suo omnia quæ facta fuerant
applyVulgate('matthew', '18', '31', [
  { r: 'r3',  text: null },
  { r: 'r4',  text: 'conservi',         gloss: 'fellow servants' },
  { r: 'r5',  text: 'ejus',             gloss: 'his' },
  { r: 'r6',  text: null },
  { r: 'r7',  text: 'quæ fiebant',      gloss: 'what was happening' },
  { r: 'r8',  text: 'contristati sunt', gloss: 'were grieved' },
  { r: 'r12', text: 'et narraverunt',   gloss: 'and told' },
  { r: 'r13', text: null },
  { r: 'r17', text: null },
  { r: 'r18', text: 'quæ facta fuerant', gloss: 'what had happened' },
]);

// ── Matt 18:33 — "misereri" at τὸν r6; cascade r2-r12 ───────────────────────
// GK: οὐκ ἔδει καὶ σὲ ἐλεῆσαι τὸν σύνδουλόν σου ὡς κἀγὼ σὲ ἠλέησα (12r)
// VL: Nonne ergo oportuit et te misereri conservi tui sicut et ego tui misertus sum
applyVulgate('matthew', '18', '33', [
  { r: 'r2',  text: 'ergo oportuit', gloss: 'therefore it was necessary' },
  { r: 'r3',  text: 'et',            gloss: 'also' },
  { r: 'r4',  text: 'te',            gloss: 'you' },
  { r: 'r5',  text: 'misereri',      gloss: 'to have mercy on' },
  { r: 'r6',  text: null },
  { r: 'r10', text: 'et ego',        gloss: 'I also' },
  { r: 'r11', text: 'tui',           gloss: 'you' },
  { r: 'r12', text: 'misertus sum',  gloss: 'showed mercy' },
]);

// ── Verify ────────────────────────────────────────────────────────────────────
const verses = [
  ['matthew','18','1'], ['matthew','18','6'], ['matthew','18','7'],
  ['matthew','18','9'], ['matthew','18','10'], ['matthew','18','12'],
  ['matthew','18','13'], ['matthew','18','14'], ['matthew','18','15'],
  ['matthew','18','17'], ['matthew','18','21'], ['matthew','18','25'],
  ['matthew','18','26'], ['matthew','18','31'], ['matthew','18','33'],
];
verses.forEach(([g,c,v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
