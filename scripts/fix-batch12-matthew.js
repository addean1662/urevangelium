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

// ── Matt 5:12 — "merces" at ὁ (r5); "cælis" at τοῖς (r10); "prophetas" at τοὺς (r15) ──
// GK: χαίρετε καὶ ἀγαλλιᾶσθε ὅτι ὁ μισθὸς ὑμῶν πολὺς ἐν τοῖς οὐρανοῖς·
//     οὕτως γὰρ ἐδίωξαν τοὺς προφήτας τοὺς πρὸ ὑμῶν (19r)
// VL: gaudete et exsultate quoniam merces vestra copiosa est in caelis sic enim
//     persecuti sunt prophetas qui fuerunt ante vos
applyVulgate('matthew', '5', '12', [
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'merces',           gloss: 'reward' },
  { r: 'r7',  text: 'vestra',           gloss: 'your' },
  { r: 'r8',  text: 'copiosa est',      gloss: 'is great' },
  { r: 'r10', text: null },
  { r: 'r11', text: 'caelis',           gloss: 'heavens' },
  { r: 'r12', text: 'Sic',             gloss: 'so' },
  { r: 'r13', text: 'enim',            gloss: 'for' },
  { r: 'r14', text: 'persecuti sunt',  gloss: 'they persecuted' },
  { r: 'r15', text: null },
  { r: 'r16', text: 'prophetas',        gloss: 'prophets' },
  { r: 'r17', text: 'qui fuerunt',      gloss: 'who were' },
  { r: 'r18', text: 'ante',            gloss: 'before' },
  { r: 'r19', text: 'vos',             gloss: 'you' },
]);

// ── Matt 5:16 — "cælis" at τό (r3); "est" at τῶν (r7); cascade at r11-14, r20-23 ──
// GK: οὕτως λαμψάτω τὸ φῶς ὑμῶν ἔμπροσθεν τῶν ἀνθρώπων ὅπως ἴδωσιν ὑμῶν
//     τὰ καλὰ ἔργα καὶ δοξάσωσιν τὸν πατέρα ὑμῶν τὸν ἐν τοῖς οὐρανοῖς (23r)
// VL: Sic luceat lux vestra coram hominibus ut videant opera vestra bona et
//     glorificent Patrem vestrum qui est in caelis
applyVulgate('matthew', '5', '16', [
  { r: 'r3',  text: null },
  { r: 'r7',  text: null },
  { r: 'r11', text: 'vestra',           gloss: 'your' },
  { r: 'r12', text: null },
  { r: 'r13', text: 'bona',            gloss: 'good' },
  { r: 'r14', text: 'opera',           gloss: 'works' },
  { r: 'r20', text: 'qui est',         gloss: 'who is' },
  { r: 'r21', text: 'in',              gloss: 'in' },
  { r: 'r22', text: null },
  { r: 'r23', text: 'caelis',          gloss: 'heavens' },
]);

// ── Matt 5:27 — "est" at τοῖς (r4); "dictum" alone at r3; combine ───────────────
// GK: Ἠκούσατε ὅτι ἐρρέθη τοῖς ἀρχαίοις· οὐ μοιχεύσεις (7r)
// VL: Audistis quia dictum est antiquis Non mœchaberis
applyVulgate('matthew', '5', '27', [
  { r: 'r3', text: 'dictum est',       gloss: 'it was said' },
  { r: 'r4', text: null },
]);

// ── Matt 5:28 — "corde" at ὁ (r7); full cascade r8-r20 ──────────────────────────
// GK: πᾶς ὁ βλέπων γυναῖκα πρὸς τὸ ἐπιθυμῆσαι αὐτὴν ἤδη ἐμοίχευσεν αὐτὴν
//     ἐν τῇ καρδίᾳ αὐτοῦ (20r)
// VL: omnis qui viderit mulierem ad concupiscendum eam iam moechatus est eam
//     in corde suo
applyVulgate('matthew', '5', '28', [
  { r: 'r7',  text: 'qui',             gloss: 'who' },
  { r: 'r8',  text: 'viderit',         gloss: 'shall have seen' },
  { r: 'r9',  text: 'mulierem',        gloss: 'a woman' },
  { r: 'r10', text: 'ad',             gloss: 'unto' },
  { r: 'r11', text: null },
  { r: 'r12', text: 'concupiscendum', gloss: 'lusting' },
  { r: 'r13', text: 'eam',            gloss: 'her' },
  { r: 'r14', text: 'jam',            gloss: 'already' },
  { r: 'r15', text: 'moechatus est',  gloss: 'has committed adultery' },
  { r: 'r16', text: 'eam',            gloss: 'her' },
  { r: 'r17', text: 'in',             gloss: 'in' },
  { r: 'r18', text: null },
  { r: 'r19', text: 'corde',          gloss: 'heart' },
  { r: 'r20', text: 'suo',            gloss: 'his' },
]);

// ── Matt 5:33 — "tua" at τοῖς (r5); "est" at ἀρχαίοις (r6); full cascade ────────
// GK: ἐρρέθη τοῖς ἀρχαίοις· οὐκ ἐπιορκήσεις, ἀποδώσεις δὲ τῷ κυρίῳ τοὺς ὅρκους σου (15r)
// VL: dictum est antiquis Non perjurabis reddes autem Domino juramenta tua
applyVulgate('matthew', '5', '33', [
  { r: 'r4',  text: 'dictum est',      gloss: 'it was said' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'antiquis',        gloss: 'to the ancients' },
  { r: 'r7',  text: 'Non',            gloss: 'not' },
  { r: 'r8',  text: 'perjurabis',     gloss: 'you shall swear falsely' },
  { r: 'r9',  text: 'reddes',         gloss: 'you shall render' },
  { r: 'r10', text: 'autem',          gloss: 'but' },
  { r: 'r11', text: null },
  { r: 'r12', text: 'Domino',         gloss: 'to the Lord' },
  { r: 'r13', text: null },
  { r: 'r14', text: 'juramenta',      gloss: 'oaths' },
  { r: 'r15', text: 'tua',            gloss: 'your' },
]);

// ── Matt 5:37 — "malo" at ὁ (r3); cascade r10-r17 ───────────────────────────────
// GK: ἔστω δὲ ὁ λόγος ὑμῶν ναὶ ναί, οὒ οὔ· τὸ δὲ περισσὸν τούτων ἐκ τοῦ
//     πονηροῦ ἐστιν (17r)
// VL: Sit autem sermo vester est est non non quod autem his abundantius a malo est
applyVulgate('matthew', '5', '37', [
  { r: 'r3',  text: null },
  { r: 'r10', text: 'quod',           gloss: 'what' },
  { r: 'r11', text: 'autem',          gloss: 'but' },
  { r: 'r12', text: 'abundantius',    gloss: 'more' },
  { r: 'r13', text: 'his',           gloss: 'these' },
  { r: 'r14', text: 'a',             gloss: 'from' },
  { r: 'r15', text: null },
  { r: 'r16', text: 'malo',          gloss: 'evil' },
  { r: 'r17', text: 'est',           gloss: 'is' },
]);

// ── Matt 5:40 — "qui vult" split at r3/r4; cascade r5-r14 ───────────────────────
// GK: καὶ τῷ θέλοντί σοι κριθῆναι καὶ τὸν χιτῶνά σου λαβεῖν, ἄφες αὐτῷ καὶ τὸ
//     ἱμάτιον (15r)
// VL: et ei qui vult tecum judicio contendere et tunicam tuam tollere dimitte ei et
//     pallium
applyVulgate('matthew', '5', '40', [
  { r: 'r3',  text: 'qui vult',        gloss: 'who wishes' },
  { r: 'r4',  text: 'tecum',          gloss: 'with you' },
  { r: 'r5',  text: 'judicio contendere', gloss: 'to go to law' },
  { r: 'r6',  text: 'et',             gloss: 'and' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'tunicam',        gloss: 'tunic' },
  { r: 'r9',  text: 'tuam',           gloss: 'your' },
  { r: 'r10', text: 'tollere',        gloss: 'to take' },
  { r: 'r11', text: 'dimitte',        gloss: 'let go' },
  { r: 'r12', text: 'ei',             gloss: 'to him' },
  { r: 'r13', text: 'et',             gloss: 'and' },
  { r: 'r14', text: null },
]);

// ── Matt 5:46 — "hoc" at τοὺς (r4); "faciunt" at οἱ (r12); two cascades ─────────
// GK: ἐὰν γὰρ ἀγαπήσητε τοὺς ἀγαπῶντας ὑμᾶς τίνα μισθὸν ἔχετε; οὐχὶ καὶ
//     οἱ τελῶναι τὸ αὐτὸ ποιοῦσιν (16r)
// VL: Si enim diligitis eos qui diligunt vos quam mercedem habebitis nonne et
//     publicani hoc faciunt
applyVulgate('matthew', '5', '46', [
  { r: 'r4',  text: 'eos',            gloss: 'them' },
  { r: 'r5',  text: 'qui diligunt',   gloss: 'who love' },
  { r: 'r6',  text: 'vos',            gloss: 'you' },
  { r: 'r7',  text: 'quam',           gloss: 'what' },
  { r: 'r8',  text: 'mercedem',       gloss: 'reward' },
  { r: 'r9',  text: 'habebitis',      gloss: 'will you have' },
  { r: 'r10', text: 'nonne',          gloss: 'do not' },
  { r: 'r11', text: 'et',             gloss: 'also' },
  { r: 'r12', text: null },
  { r: 'r13', text: 'publicani',      gloss: 'tax collectors' },
  { r: 'r14', text: null },
  { r: 'r15', text: 'hoc',           gloss: 'this' },
  { r: 'r16', text: 'faciunt',       gloss: 'do' },
]);

// ── Matt 6:2 — "suam" at οἱ (r10); full 31-row cascade ──────────────────────────
// GK: μὴ σαλπίσῃς ἔμπροσθέν σου ὥσπερ οἱ ὑποκριταὶ ποιοῦσιν ἐν ταῖς συναγωγαῖς
//     καὶ ἐν ταῖς ῥύμαις ὅπως δοξασθῶσιν ὑπὸ τῶν ἀνθρώπων· ἀμὴν λέγω ὑμῖν·
//     ἀπέχουσιν τὸν μισθὸν αὐτῶν (31r)
// VL: noli tuba canere ante te sicut hypocritæ faciunt in synagogis et in vicis
//     ut honorificentur ab hominibus Amen dico vobis receperunt mercedem suam
applyVulgate('matthew', '6', '2', [
  { r: 'r6',  text: 'tuba canere',    gloss: 'sound a trumpet' },
  { r: 'r7',  text: 'ante',          gloss: 'before' },
  { r: 'r8',  text: 'te',            gloss: 'you' },
  { r: 'r9',  text: 'sicut',         gloss: 'as' },
  { r: 'r10', text: null },
  { r: 'r11', text: 'hypocritæ',     gloss: 'hypocrites' },
  { r: 'r12', text: 'faciunt',       gloss: 'do' },
  { r: 'r13', text: 'in',            gloss: 'in' },
  { r: 'r14', text: null },
  { r: 'r15', text: 'synagogis',     gloss: 'synagogues' },
  { r: 'r16', text: 'et',            gloss: 'and' },
  { r: 'r17', text: 'in',            gloss: 'in' },
  { r: 'r18', text: null },
  { r: 'r19', text: 'vicis',         gloss: 'streets' },
  { r: 'r20', text: 'ut',            gloss: 'so that' },
  { r: 'r21', text: 'honorificentur', gloss: 'they may be glorified' },
  { r: 'r22', text: 'ab',            gloss: 'by' },
  { r: 'r23', text: null },
  { r: 'r24', text: 'hominibus',     gloss: 'people' },
  { r: 'r25', text: 'Amen',          gloss: 'Amen' },
  { r: 'r26', text: 'dico',          gloss: 'I say' },
  { r: 'r27', text: 'vobis',         gloss: 'to you' },
  { r: 'r28', text: 'receperunt',    gloss: 'they have received' },
  { r: 'r29', text: null },
  { r: 'r30', text: 'mercedem',      gloss: 'reward' },
  { r: 'r31', text: 'suam',          gloss: 'their' },
]);

// ── Matt 6:7 — "exaudiantur" at οἱ (r6); "multum loqui" split; cascade r7-r15 ───
// GK: μὴ βατταλογήσητε ὥσπερ οἱ ἐθνικοί· δοκοῦσιν γὰρ ὅτι ἐν τῇ πολυλογίᾳ
//     αὐτῶν εἰσακουσθήσονται (15r)
// VL: nolite multum loqui sicut ethnici faciunt putant enim quia in multiloquio
//     suo exaudiantur
applyVulgate('matthew', '6', '7', [
  { r: 'r4',  text: 'multum loqui',   gloss: 'use vain repetitions' },
  { r: 'r5',  text: 'sicut',          gloss: 'as' },
  { r: 'r6',  text: null },
  { r: 'r7',  text: 'ethnici faciunt', gloss: 'the Gentiles do' },
  { r: 'r8',  text: 'putant',         gloss: 'they think' },
  { r: 'r9',  text: 'enim',           gloss: 'for' },
  { r: 'r10', text: 'quia',           gloss: 'that' },
  { r: 'r11', text: 'in',             gloss: 'in' },
  { r: 'r12', text: null },
  { r: 'r13', text: 'multiloquio',    gloss: 'much speaking' },
  { r: 'r14', text: 'suo',            gloss: 'their' },
  { r: 'r15', text: 'exaudiantur',    gloss: 'they will be heard' },
]);

// ── Matt 6:14 — "delicta" at τοῖς (r4); "vestra" at τά (r6); simple clear ───────
// GK: ἐὰν γὰρ ἀφῆτε τοῖς ἀνθρώποις τὰ παραπτώματα αὐτῶν ἀφήσει καὶ ὑμῖν
//     ὁ πατὴρ ὑμῶν ὁ οὐράνιος (16r)
// VL: Si enim dimiseritis hominibus peccata eorum dimittet et vobis Pater vester
//     cælestis
applyVulgate('matthew', '6', '14', [
  { r: 'r4', text: null },
  { r: 'r6', text: null },
]);

// ── Matt 6:23 — "ipsæ" at ὁ (r3); multiple article cascades; r6/r7 swapped ──────
// GK: ἐὰν δὲ ὁ ὀφθαλμός σου πονηρὸς ᾖ, ὅλον τὸ σῶμά σου σκοτεινὸν ἔσται·
//     εἰ οὖν τὸ φῶς τὸ ἐν σοὶ σκότος ἐστίν, τὸ σκότος πόσον (25r)
// VL: Si autem oculus tuus nequam fuerit totum corpus tuum tenebrosum erit
//     Si ergo lumen quod in te est tenebrae sunt ipsae tenebrae quantae erunt
applyVulgate('matthew', '6', '23', [
  { r: 'r3',  text: null },
  { r: 'r6',  text: 'nequam',         gloss: 'evil' },
  { r: 'r7',  text: 'fuerit',         gloss: 'shall be' },
  { r: 'r9',  text: null },
  { r: 'r16', text: null },
  { r: 'r18', text: 'quod',           gloss: 'which' },
  { r: 'r19', text: 'in',             gloss: 'in' },
  { r: 'r20', text: 'te',             gloss: 'you' },
  { r: 'r21', text: 'tenebrae',       gloss: 'darkness' },
  { r: 'r22', text: 'est sunt',       gloss: 'is' },
  { r: 'r23', text: null },
  { r: 'r24', text: 'ipsæ tenebrae',  gloss: 'that darkness' },
  { r: 'r25', text: 'quantae erunt',  gloss: 'how great will be' },
]);

// ── Matt 6:34 — "sufficit" at τήν (r5); "diei" at ἡ (r7); two cascades ──────────
// GK: μὴ οὖν μεριμνήσητε εἰς τὴν αὔριον· ἡ γὰρ αὔριον μεριμνήσει τὰ ἑαυτῆς.
//     ἀρκετὸν τῇ ἡμέρᾳ ἡ κακία αὐτῆς (18r)
// VL: Nolite ergo solliciti esse in crastinum crastinus enim dies sollicitus erit
//     sibi ipsi sufficit diei malitia sua
applyVulgate('matthew', '6', '34', [
  { r: 'r3',  text: 'solliciti esse', gloss: 'be anxious' },
  { r: 'r4',  text: 'in',             gloss: 'about' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'crastinum',      gloss: 'tomorrow' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'enim',           gloss: 'for' },
  { r: 'r9',  text: 'crastinus dies', gloss: 'tomorrow\'s day' },
  { r: 'r10', text: 'sollicitus erit', gloss: 'will be anxious' },
  { r: 'r11', text: 'sibi',           gloss: 'for itself' },
  { r: 'r12', text: 'ipsi',           gloss: 'itself' },
  { r: 'r13', text: 'sufficit',       gloss: 'is sufficient' },
  { r: 'r14', text: null },
  { r: 'r15', text: 'diei',           gloss: 'for the day' },
  { r: 'r17', text: 'malitia',        gloss: 'evil' },
  { r: 'r18', text: 'sua',            gloss: 'its own' },
]);

// Verify
const verses = [
  ['matthew', '5', '12'], ['matthew', '5', '16'], ['matthew', '5', '27'],
  ['matthew', '5', '28'], ['matthew', '5', '33'], ['matthew', '5', '37'],
  ['matthew', '5', '40'], ['matthew', '5', '46'],
  ['matthew', '6', '2'],  ['matthew', '6', '7'],  ['matthew', '6', '14'],
  ['matthew', '6', '23'], ['matthew', '6', '34'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
