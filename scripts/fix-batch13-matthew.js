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

// ── Matt 7:4 — log in brother's eye ─────────────────────────────────────────
// GK: ἢ πῶς ἐρεῖς τῷ ἀδελφῷ σου· ἄφες ἐκβάλω τὸ κάρφος ἐκ τοῦ ὀφθαλμοῦ
//     σου, καὶ ἰδοὺ ἡ δοκὸς ἐν τῷ ὀφθαλμῷ σοῦ (22r)
// VL: aut quomodo dices fratri tuo sine ejiciam festucam de oculo tuo et ecce
//     trabs est in oculo tuo
// Problem: "trabs est" at τό r4 (accusative article); cascade r18-r22
applyVulgate('matthew', '7', '4', [
  { r: 'r4',  text: null },
  { r: 'r18', text: 'trabs est',  gloss: 'there is a beam' },
  { r: 'r19', text: 'in',         gloss: 'in' },
  { r: 'r21', text: 'oculo',      gloss: 'eye' },
  { r: 'r22', text: 'tuo',        gloss: 'your' },
]);

// ── Matt 7:8 — everyone who asks receives ────────────────────────────────────
// GK: πᾶς γὰρ ὁ αἰτῶν λαμβάνει καὶ ὁ ζητῶν εὑρίσκει καὶ τῷ κρούοντι
//     ἀνοιγήσεται (13r)
// VL: Omnis enim qui petit accipit et qui quaerit invenit et pulsanti aperietur
// Problem: "pulsanti" at ὁ r3, "qui quaerit" at ὁ r8 → full cascade
applyVulgate('matthew', '7', '8', [
  { r: 'r3',  text: 'qui',        gloss: 'who' },
  { r: 'r4',  text: 'petit',      gloss: 'asks' },
  { r: 'r5',  text: 'accipit',    gloss: 'receives' },
  { r: 'r6',  text: 'et',         gloss: 'and' },
  { r: 'r7',  text: 'qui',        gloss: 'who' },
  { r: 'r8',  text: 'quærit',     gloss: 'seeks' },
  { r: 'r9',  text: 'invenit',    gloss: 'finds' },
  { r: 'r10', text: 'et',         gloss: 'and' },
  { r: 'r11', text: null },
  { r: 'r12', text: 'pulsanti',   gloss: 'to one knocking' },
  { r: 'r13', text: 'aperietur',  gloss: 'it will be opened' },
]);

// ── Matt 7:11 — how much more will your Father give ─────────────────────────
// GK: εἰ οὖν ὑμεῖς πονηροὶ ὄντες οἴδατε δόματα ἀγαθὰ διδόναι τοῖς τέκνοις
//     ὑμῶν, πόσῳ μᾶλλον ὁ πατὴρ ὑμῶν ὁ ἐν τοῖς οὐρανοῖς δώσει ἀγαθὰ τοῖς
//     αἰτοῦσιν αὐτόν (26r)
// VL: Si ergo vos cum sitis mali nostis data bona dare filiis vestris quanto
//     magis Pater vester qui est in caelis dabit bona petentibus se
// Problem: "petentibus" at ὁ r15; "se" at ὁ r18; cascade r4-r26
applyVulgate('matthew', '7', '11', [
  { r: 'r4',  text: 'mali',       gloss: 'evil' },
  { r: 'r5',  text: 'cum sitis',  gloss: 'though you are' },
  { r: 'r6',  text: 'nostis',     gloss: 'you know' },
  { r: 'r7',  text: 'data',       gloss: 'gifts' },
  { r: 'r9',  text: 'dare',       gloss: 'to give' },
  { r: 'r10', text: null },
  { r: 'r11', text: 'filiis',     gloss: 'to children' },
  { r: 'r12', text: 'vestris',    gloss: 'your' },
  { r: 'r13', text: 'quanto',     gloss: 'how much' },
  { r: 'r14', text: 'magis',      gloss: 'more' },
  { r: 'r15', text: null },
  { r: 'r16', text: 'Pater',      gloss: 'Father' },
  { r: 'r17', text: 'vester',     gloss: 'your' },
  { r: 'r18', text: 'qui est',    gloss: 'who is' },
  { r: 'r19', text: 'in',         gloss: 'in' },
  { r: 'r21', text: 'cælis',      gloss: 'heavens' },
  { r: 'r22', text: 'dabit',      gloss: 'will give' },
  { r: 'r23', text: 'bona',       gloss: 'good things' },
  { r: 'r24', text: null },
  { r: 'r25', text: 'petentibus', gloss: 'to those asking' },
  { r: 'r26', text: 'se',         gloss: 'him' },
]);

// ── Matt 7:13 — enter through the narrow gate ────────────────────────────────
// GK: Εἰσέλθατε διὰ τῆς στενῆς πύλης· ὅτι πλατεῖα ἡ πύλη καὶ εὐρύχωρος
//     ἡ ὁδὸς ἡ ἀπάγουσα εἰς τὴν ἀπώλειαν καὶ πολλοί εἰσιν οἱ εἰσερχόμενοι
//     δι᾽ αὐτῆς (20r)
// VL: Intrate per angustam portam quia lata porta et spatiosa via est quae
//     ducit ad perditionem et multi sunt qui intrant per eam
// Problem: "porta" displaced at ἡ r14
applyVulgate('matthew', '7', '13', [
  { r: 'r14', text: null },
]);

// ── Matt 7:14 — narrow is the way to life ───────────────────────────────────
// GK: τί στενὴ ἡ πύλη καὶ τεθλιμμένη ἡ ὁδὸς ἡ ἀπάγουσα εἰς τὴν ζωήν
//     καὶ ὀλίγοι εἰσὶν οἱ εὑρίσκοντες αὐτήν (14r)
// VL: quam angusta porta et arcta via est quae ducit ad vitam et pauci sunt
//     qui inveniunt eam
// Problem: displaced word at ἡ r9
applyVulgate('matthew', '7', '14', [
  { r: 'r9',  text: null },
]);

// ── Matt 7:21 — not everyone who says Lord Lord ─────────────────────────────
// GK: Οὐ πᾶς ὁ λέγων μοι· κύριε κύριε, εἰσελεύσεται εἰς τὴν βασιλείαν
//     τῶν οὐρανῶν, ἀλλ᾽ ὁ ποιῶν τὸ θέλημα τοῦ πατρός μου τοῦ ἐν τοῖς
//     οὐρανοῖς (25r)
// VL: Non omnis qui dicit mihi Domine Domine intrabit in regnum caelorum sed
//     qui facit voluntatem Patris mei qui est in caelis
// Problem: "regnum" at τήν r10; cascade r10-r25
applyVulgate('matthew', '7', '21', [
  { r: 'r10', text: null },
  { r: 'r11', text: 'regnum',     gloss: 'kingdom' },
  { r: 'r12', text: null },
  { r: 'r13', text: 'cælorum',    gloss: 'of heaven' },
  { r: 'r14', text: 'sed',        gloss: 'but' },
  { r: 'r15', text: 'qui',        gloss: 'who' },
  { r: 'r16', text: 'facit',      gloss: 'does' },
  { r: 'r17', text: null },
  { r: 'r18', text: 'voluntatem', gloss: 'will' },
  { r: 'r19', text: null },
  { r: 'r20', text: 'Patris',     gloss: 'Father' },
  { r: 'r21', text: 'mei',        gloss: 'my' },
  { r: 'r22', text: 'qui est',    gloss: 'who is' },
  { r: 'r23', text: 'in',         gloss: 'in' },
  { r: 'r24', text: null },
  { r: 'r25', text: 'cælis',      gloss: 'heavens' },
]);

// ── Matt 7:22 — Lord did we not prophesy ────────────────────────────────────
// GK: πολλοὶ ἐροῦσίν μοι ἐν ἐκείνῃ τῇ ἡμέρᾳ· κύριε κύριε, οὐ τῷ σῷ
//     ὀνόματι ἐπροφητεύσαμεν, καὶ τῷ σῷ ὀνόματι δαιμόνια ἐξεβάλομεν, καὶ
//     τῷ σῷ ὀνόματι δυνάμεις πολλὰς ἐποιήσαμεν; (27r)
// VL: Multi dicent mihi in illa die Domine Domine nonne in tuo nomine
//     prophetavimus et in tuo nomine daemonia ejecimus et in tuo nomine
//     virtutes multas fecimus
// Problem: "virtutes" at τῇ r6; "multas" at τῷ r11 → cascade r6-r27
applyVulgate('matthew', '7', '22', [
  { r: 'r6',  text: null },
  { r: 'r11', text: 'in',         gloss: 'in' },
  { r: 'r12', text: 'tuo',        gloss: 'your' },
  { r: 'r13', text: 'nomine',     gloss: 'name' },
  { r: 'r14', text: 'prophetavimus', gloss: 'we prophesied' },
  { r: 'r15', text: 'et',         gloss: 'and' },
  { r: 'r16', text: 'in',         gloss: 'in' },
  { r: 'r17', text: 'tuo',        gloss: 'your' },
  { r: 'r18', text: 'nomine',     gloss: 'name' },
  { r: 'r19', text: 'daemonia',   gloss: 'demons' },
  { r: 'r20', text: 'ejecimus',   gloss: 'we cast out' },
  { r: 'r21', text: 'et',         gloss: 'and' },
  { r: 'r22', text: 'in',         gloss: 'in' },
  { r: 'r23', text: 'tuo',        gloss: 'your' },
  { r: 'r24', text: 'nomine',     gloss: 'name' },
  { r: 'r25', text: 'virtutes',   gloss: 'mighty works' },
  { r: 'r26', text: 'multas',     gloss: 'many' },
  { r: 'r27', text: 'fecimus',    gloss: 'we did' },
]);

// ── Matt 7:23 — depart from me, workers of lawlessness ──────────────────────
// GK: καὶ τότε ὁμολογήσω αὐτοῖς ὅτι οὐδέποτε ἔγνων ὑμᾶς· ἀποχωρεῖτε ἀπ᾽
//     ἐμοῦ οἱ ἐργαζόμενοι τὴν ἀνομίαν (15r)
// VL: et tunc confitebor illis quia numquam novi vos discedite a me qui
//     operamini iniquitatem
// Problem: "qui" at οἱ r12 → cascade r12-r15
applyVulgate('matthew', '7', '23', [
  { r: 'r12', text: 'qui',        gloss: 'who' },
  { r: 'r13', text: 'operamini',  gloss: 'work' },
  { r: 'r15', text: 'iniquitatem', gloss: 'lawlessness' },
]);

// ── Matt 7:25 — house built on rock ─────────────────────────────────────────
// GK: καὶ κατέβη ἡ βροχὴ καὶ ἦλθον οἱ ποταμοὶ καὶ ἔπνευσαν οἱ ἄνεμοι
//     καὶ προσέπεσαν τῇ οἰκίᾳ ἐκείνῃ, καὶ οὐκ ἔπεσεν· τεθεμελίωτο γὰρ ἐπὶ
//     τὴν πέτραν (25r)
// VL: et descendit pluvia et venerunt flumina et flaverunt venti et irruerunt
//     in domum illam et non cecidit fundata erat enim super petram
// Problem: "pluvia" at ἡ r3; "flumina" at οἱ r7; cascade r3-r25
applyVulgate('matthew', '7', '25', [
  { r: 'r3',  text: null },
  { r: 'r7',  text: null },
  { r: 'r15', text: 'in',         gloss: 'against' },
  { r: 'r16', text: 'domum',      gloss: 'house' },
  { r: 'r17', text: 'illam',      gloss: 'that' },
  { r: 'r18', text: 'et',         gloss: 'and' },
  { r: 'r19', text: 'non',        gloss: 'not' },
  { r: 'r20', text: 'cecidit',    gloss: 'it fell' },
  { r: 'r21', text: 'fundata erat', gloss: 'it had been founded' },
  { r: 'r22', text: 'enim',       gloss: 'for' },
  { r: 'r23', text: 'super',      gloss: 'upon' },
  { r: 'r24', text: null },
  { r: 'r25', text: 'petram',     gloss: 'rock' },
]);

// ── Matt 7:27 — house built on sand ─────────────────────────────────────────
// GK: καὶ κατέβη ἡ βροχὴ καὶ ἦλθον οἱ ποταμοὶ καὶ ἔπνευσαν οἱ ἄνεμοι
//     καὶ προσέκοψαν τῇ οἰκίᾳ ἐκείνῃ, καὶ ἔπεσεν καὶ ἦν ἡ πτῶσις αὐτῆς
//     μεγάλη (25r)
// VL: et descendit pluvia et venerunt flumina et flaverunt venti et irruerunt
//     in domum illam et cecidit et fuit ruina illius magna
// Problem: "pluvia" at ἡ r3; "flumina" at οἱ r7; cascade r3-r25
applyVulgate('matthew', '7', '27', [
  { r: 'r3',  text: null },
  { r: 'r7',  text: null },
  { r: 'r15', text: 'in',         gloss: 'against' },
  { r: 'r16', text: 'domum',      gloss: 'house' },
  { r: 'r17', text: 'illam',      gloss: 'that' },
  { r: 'r18', text: 'et',         gloss: 'and' },
  { r: 'r19', text: 'cecidit',    gloss: 'it fell' },
  { r: 'r20', text: 'et',         gloss: 'and' },
  { r: 'r21', text: 'fuit',       gloss: 'was' },
  { r: 'r23', text: 'ruina',      gloss: 'ruin' },
  { r: 'r24', text: 'illius',     gloss: 'its' },
  { r: 'r25', text: 'magna',      gloss: 'great' },
]);

// ── Matt 7:28 — crowds amazed at his teaching ───────────────────────────────
// GK: Καὶ ἐγένετο ὅτε ἐτέλεσεν ὁ Ἰησοῦς τοὺς λόγους τούτους ἐξεπλήσσοντο
//     οἱ ὄχλοι ἐπὶ τῇ διδαχῇ αὐτοῦ (16r)
// VL: Et factum est cum consummasset Jesus sermones hosce admirabantur turbæ
//     super doctrina ejus
// Problem: "ejus" at ὁ r5; "turbæ" at οἱ r12 → cascade r2-r16
applyVulgate('matthew', '7', '28', [
  { r: 'r2',  text: 'factum est', gloss: 'it came to pass' },
  { r: 'r3',  text: 'cum',        gloss: 'when' },
  { r: 'r4',  text: 'consummasset', gloss: 'he had finished' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'Jesus',      gloss: 'Jesus' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'sermones',   gloss: 'words' },
  { r: 'r9',  text: 'hosce',      gloss: 'these' },
  { r: 'r10', text: 'admirabantur', gloss: 'were amazed' },
  { r: 'r11', text: null },
  { r: 'r12', text: 'turbæ',      gloss: 'crowds' },
  { r: 'r13', text: 'super',      gloss: 'at' },
  { r: 'r14', text: null },
  { r: 'r15', text: 'doctrina',   gloss: 'teaching' },
  { r: 'r16', text: 'ejus',       gloss: 'his' },
]);

// ── Matt 7:29 — as one having authority ─────────────────────────────────────
// GK: ἦν γὰρ διδάσκων αὐτοὺς ὡς ἐξουσίαν ἔχων καὶ οὐχ ὡς οἱ γραμματεῖς
//     αὐτῶν (13r)
// VL: erat enim docens eos sicut potestatem habens et non sicut scribæ eorum
// Problem: "scribæ" at οἱ r11; cascade r11-r13
applyVulgate('matthew', '7', '29', [
  { r: 'r11', text: null },
  { r: 'r12', text: 'scribæ',     gloss: 'scribes' },
  { r: 'r13', text: 'eorum',      gloss: 'their' },
]);

// ═══════════════════════════════════════════════════════════════════════════════
// MATTHEW 9
// ═══════════════════════════════════════════════════════════════════════════════

// ── Matt 9:8 — crowds glorified God ─────────────────────────────────────────
// GK: ἰδόντες δὲ οἱ ὄχλοι ἐφοβήθησαν καὶ ἐδόξασαν τὸν θεὸν τὸν δόντα
//     ἐξουσίαν τοιαύτην τοῖς ἀνθρώποις (15r)
// VL: Videntes autem turbæ timuerunt et glorificaverunt Deum qui dedit
//     potestatem talem hominibus
// Problem: "turbæ" at οἱ r3; "qui" at τόν r10 → cascade r3-r15
applyVulgate('matthew', '9', '8', [
  { r: 'r3',  text: null },
  { r: 'r10', text: 'qui',        gloss: 'who' },
  { r: 'r11', text: 'dedit',      gloss: 'gave' },
  { r: 'r12', text: 'potestatem', gloss: 'authority' },
  { r: 'r13', text: 'talem',      gloss: 'such' },
  { r: 'r15', text: 'hominibus',  gloss: 'to men' },
]);

// ── Matt 9:12 — those who are well have no need ─────────────────────────────
// GK: ὁ δὲ ἀκούσας εἶπεν· οὐ χρείαν ἔχουσιν οἱ ἰσχύοντες ἰατροῦ ἀλλ᾽
//     οἱ κακῶς ἔχοντες (11r)
// VL: At ille audiens ait Non est opus valentibus medico sed male habentibus
// Problem: "valentibus" at οἱ r6 → cascade r6-r8
applyVulgate('matthew', '9', '12', [
  { r: 'r6',  text: null },
  { r: 'r7',  text: 'Non',        gloss: 'not' },
  { r: 'r8',  text: 'opus est',   gloss: 'there is need' },
]);

// ── Matt 9:13 — I came not to call the righteous ────────────────────────────
// GK: πορευθέντες δὲ μάθετε τί ἐστιν· ἔλεος θέλω καὶ οὐ θυσίαν· οὐ γὰρ
//     ἦλθον καλέσαι δικαίους ἀλλὰ ἁμαρτωλούς (19r)
// VL: Euntes autem discite quid est Misericordiam volo et non sacrificium Non
//     enim veni vocare justos sed peccatores
// Problem: displaced words at article rows r5, r18, r19
applyVulgate('matthew', '9', '13', [
  { r: 'r5',  text: 'est',        gloss: 'is' },
  { r: 'r6',  text: 'Misericordiam', gloss: 'mercy' },
  { r: 'r7',  text: 'volo',       gloss: 'I desire' },
  { r: 'r8',  text: 'et',         gloss: 'and' },
  { r: 'r9',  text: 'non',        gloss: 'not' },
  { r: 'r10', text: 'sacrificium', gloss: 'sacrifice' },
  { r: 'r11', text: 'Non',        gloss: 'not' },
  { r: 'r12', text: 'enim',       gloss: 'for' },
  { r: 'r13', text: 'veni',       gloss: 'I came' },
  { r: 'r14', text: 'vocare',     gloss: 'to call' },
  { r: 'r15', text: 'justos',     gloss: 'righteous' },
  { r: 'r16', text: 'sed',        gloss: 'but' },
  { r: 'r17', text: 'peccatores', gloss: 'sinners' },
  { r: 'r18', text: null },
  { r: 'r19', text: null },
]);

// ── Matt 9:14 — disciples of John ask about fasting ─────────────────────────
// GK: Τότε προσέρχονται αὐτῷ οἱ μαθηταὶ Ἰωάννου λέγοντες· διὰ τί ἡμεῖς
//     καὶ οἱ Φαρισαῖοι νηστεύομεν πολλά, οἱ δὲ μαθηταί σου οὐ νηστεύουσιν (18r)
// VL: Tunc accesserunt ad eum discipuli Joannis dicentes Quare nos et pharisæi
//     jejunamus frequenter discipuli autem tui non jejunant
// Problem: "ad eum" at αὐτῷ r3 (dative, legitimate place but triggers cascade)
//          "discipuli" at οἱ r17; "autem" at οἱ r4 already correct
applyVulgate('matthew', '9', '14', [
  { r: 'r3',  text: 'ad eum',     gloss: 'to him' },
  { r: 'r5',  text: 'discipuli',  gloss: 'disciples' },
  { r: 'r6',  text: 'Joannis',    gloss: 'of John' },
  { r: 'r7',  text: 'dicentes',   gloss: 'saying' },
  { r: 'r8',  text: null },
  { r: 'r17', text: 'autem',      gloss: 'but' },
  { r: 'r18', text: 'discipuli',  gloss: 'disciples' },
]);

// ── Matt 9:20 — woman with haemorrhage ──────────────────────────────────────
// GK: Καὶ ἰδοὺ γυνὴ αἱμορροοῦσα δώδεκα ἔτη προσελθοῦσα ὄπισθεν ἥψατο
//     τοῦ κρασπέδου τοῦ ἱματίου αὐτοῦ (14r)
// VL: Et ecce mulier quae sanguinis fluxum patiebatur duodecim annis accessit
//     retro et tetigit fimbriam vestimenti ejus
// Problem: VL periphrasis for αἱμορροοῦσα; "fimbriam" at τοῦ r10; cascade r4-r14
applyVulgate('matthew', '9', '20', [
  { r: 'r4',  text: 'quæ sanguinis fluxum patiebatur', gloss: 'who had a flow of blood' },
  { r: 'r5',  text: 'duodecim',   gloss: 'twelve' },
  { r: 'r6',  text: 'annis',      gloss: 'years' },
  { r: 'r7',  text: 'accessit',   gloss: 'came up' },
  { r: 'r8',  text: 'retro',      gloss: 'from behind' },
  { r: 'r9',  text: 'et tetigit', gloss: 'and touched' },
  { r: 'r10', text: null },
  { r: 'r11', text: 'fimbriam',   gloss: 'fringe' },
  { r: 'r12', text: null },
  { r: 'r13', text: 'vestimenti', gloss: 'of the garment' },
  { r: 'r14', text: 'ejus',       gloss: 'his' },
]);

// ── Matt 9:21 — if I only touch his garment ─────────────────────────────────
// GK: ἔλεγεν γὰρ ἐν ἑαυτῇ· ἐὰν μόνον ἅψωμαι τοῦ ἱματίου αὐτοῦ σωθήσομαι (11r)
// VL: dicebat enim intra se Si tantum tetigero vestimentum ejus salva ero
// Problem: "vestimentum" at τοῦ r8; cascade r6-r11
applyVulgate('matthew', '9', '21', [
  { r: 'r6',  text: 'tantum',     gloss: 'only' },
  { r: 'r7',  text: 'tetigero',   gloss: 'I touch' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'vestimentum', gloss: 'garment' },
  { r: 'r10', text: 'ejus',       gloss: 'his' },
  { r: 'r11', text: 'salva ero',  gloss: 'I will be saved' },
]);

// ── Matt 9:24 — the girl is not dead but sleeping ───────────────────────────
// GK: ἔλεγεν· ἀναχωρεῖτε· οὐ γὰρ ἀπέθανεν τὸ κοράσιον ἀλλὰ καθεύδει
//     (10r)
// VL: Recedite non enim mortua est puella sed dormit
// Problem: displaced content at article rows r1, r2, r7; cascade r1-r10
applyVulgate('matthew', '9', '24', [
  { r: 'r1',  text: null },
  { r: 'r2',  text: null },
  { r: 'r3',  text: 'Recedite',   gloss: 'depart' },
  { r: 'r4',  text: 'non',        gloss: 'not' },
  { r: 'r5',  text: 'enim',       gloss: 'for' },
  { r: 'r6',  text: 'mortua est', gloss: 'is dead' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'puella',     gloss: 'girl' },
  { r: 'r9',  text: 'sed',        gloss: 'but' },
  { r: 'r10', text: 'dormit',     gloss: 'she sleeps' },
]);

// ── Matt 9:28 — do you believe I can do this ────────────────────────────────
// GK: ἐλθόντι δὲ εἰς τὴν οἰκίαν προσῆλθον αὐτῷ οἱ τυφλοί, καὶ λέγει
//     αὐτοῖς ὁ Ἰησοῦς· πιστεύετε ὅτι δύναμαι τοῦτο ποιῆσαι; λέγουσιν
//     αὐτῷ· ναί, κύριε (23r)
// VL: cum autem venisset domum accesserunt ad eum caeci et dicit eis Jesus
//     Creditis quia possum hoc facere Dicunt ei Utique Domine
// Problem: "caeci" at τήν r4; "ad eum" at αὐτῷ r7; cascade r4-r23
applyVulgate('matthew', '9', '28', [
  { r: 'r4',  text: null },
  { r: 'r7',  text: 'ad eum',     gloss: 'to him' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'cæci',       gloss: 'blind men' },
  { r: 'r10', text: 'et',         gloss: 'and' },
  { r: 'r11', text: 'dicit',      gloss: 'says' },
  { r: 'r12', text: 'eis',        gloss: 'to them' },
  { r: 'r13', text: null },
  { r: 'r14', text: 'Jesus',      gloss: 'Jesus' },
  { r: 'r15', text: 'Creditis',   gloss: 'do you believe' },
  { r: 'r16', text: 'quia',       gloss: 'that' },
  { r: 'r17', text: 'possum',     gloss: 'I am able' },
  { r: 'r18', text: 'hoc',        gloss: 'this' },
  { r: 'r19', text: 'facere',     gloss: 'to do' },
  { r: 'r20', text: 'Dicunt',     gloss: 'they say' },
  { r: 'r21', text: 'ei',         gloss: 'to him' },
  { r: 'r22', text: 'Utique',     gloss: 'yes indeed' },
  { r: 'r23', text: 'Domine',     gloss: 'Lord' },
]);

// ── Matt 9:30 — their eyes were opened ──────────────────────────────────────
// GK: καὶ ἠνεῴχθησαν αὐτῶν οἱ ὀφθαλμοί. καὶ ἐνεβριμήθη αὐτοῖς ὁ Ἰησοῦς
//     λέγων· ὁράτε μηδεὶς γινωσκέτω (14r)
// VL: Et aperti sunt oculi eorum et comminatus est eis Jesus dicens Videte ne
//     quis sciat
// Problem: "oculi" at οἱ r2; "Jesus" at ὁ r9; cascade r2-r14
applyVulgate('matthew', '9', '30', [
  { r: 'r2',  text: 'aperti sunt', gloss: 'were opened' },
  { r: 'r3',  text: 'eorum',      gloss: 'their' },
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'oculi',      gloss: 'eyes' },
  { r: 'r7',  text: 'comminatus est', gloss: 'he warned sternly' },
  { r: 'r8',  text: 'eis',        gloss: 'them' },
  { r: 'r9',  text: null },
  { r: 'r10', text: 'Jesus',      gloss: 'Jesus' },
  { r: 'r11', text: 'dicens',     gloss: 'saying' },
  { r: 'r12', text: 'Videte',     gloss: 'see' },
  { r: 'r13', text: 'ne quis',    gloss: 'lest anyone' },
  { r: 'r14', text: 'sciat',      gloss: 'know' },
]);

// ── Matt 9:33 — mute man spoke ───────────────────────────────────────────────
// GK: καὶ ἐκβληθέντος τοῦ δαιμονίου ἐλάλησεν ὁ κωφός· καὶ ἐθαύμασαν οἱ
//     ὄχλοι λέγοντες· οὐδέποτε ἐφάνη οὕτως ἐν τῷ Ἰσραήλ (19r)
// VL: Et ejecto daemonio locutus est mutus et miratæ sunt turbæ dicentes
//     Numquam apparuit sic in Israël
// Problem: "mutus" at ὁ r5; "turbæ" at οἱ r11; cascade r3-r19
applyVulgate('matthew', '9', '33', [
  { r: 'r3',  text: null },
  { r: 'r5',  text: 'locutus est', gloss: 'spoke' },
  { r: 'r7',  text: 'mutus',      gloss: 'mute man' },
  { r: 'r8',  text: 'et',         gloss: 'and' },
  { r: 'r9',  text: 'miratæ sunt', gloss: 'marveled' },
  { r: 'r11', text: 'turbæ',      gloss: 'crowds' },
  { r: 'r12', text: 'dicentes',   gloss: 'saying' },
  { r: 'r13', text: null },
  { r: 'r14', text: 'Numquam',    gloss: 'never' },
  { r: 'r15', text: 'apparuit',   gloss: 'appeared' },
  { r: 'r16', text: 'sic',        gloss: 'thus' },
  { r: 'r17', text: 'in',         gloss: 'in' },
  { r: 'r19', text: 'Israël',     gloss: 'Israel' },
]);

// ── Verify ────────────────────────────────────────────────────────────────────
const verses = [
  ['matthew', '7',  '4'],
  ['matthew', '7',  '8'],
  ['matthew', '7',  '11'],
  ['matthew', '7',  '13'],
  ['matthew', '7',  '14'],
  ['matthew', '7',  '21'],
  ['matthew', '7',  '22'],
  ['matthew', '7',  '23'],
  ['matthew', '7',  '25'],
  ['matthew', '7',  '27'],
  ['matthew', '7',  '28'],
  ['matthew', '7',  '29'],
  ['matthew', '9',  '8'],
  ['matthew', '9',  '12'],
  ['matthew', '9',  '13'],
  ['matthew', '9',  '14'],
  ['matthew', '9',  '20'],
  ['matthew', '9',  '21'],
  ['matthew', '9',  '24'],
  ['matthew', '9',  '28'],
  ['matthew', '9',  '30'],
  ['matthew', '9',  '33'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
