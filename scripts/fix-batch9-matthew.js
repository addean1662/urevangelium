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

// ── Matt 11:19 — "Friend of tax collectors and sinners" ───────────────────────
// GK: ἦλθεν ὁ υἱὸς τοῦ ἀνθρώπου ἐσθίων καὶ πίνων, καὶ λέγουσιν· ἰδοὺ ἄνθρωπος
//     φάγος καὶ οἰνοπότης, τελωνῶν φίλος καὶ ἁμαρτωλῶν. καὶ ἐδικαιώθη ἡ σοφία
//     ἀπὸ τῶν ἔργων αὐτῆς (27r)
// VL: venit filius hominis manducans et bibens et dicunt Ecce homo vorax et
//     potator vini publicanorum amicus et peccatorum Et justificata est sapientia
//     a filiis suis
// Problem: "filiis" at article r2 (ὁ); "suis" at genitive article r4 (τοῦ); cascade r15-r27
applyVulgate('matthew', '11', '19', [
  { r: 'r2',  text: null },
  { r: 'r4',  text: null },
  { r: 'r15', text: 'potator vini',     gloss: 'wine-drinker' },
  { r: 'r16', text: 'publicanorum',     gloss: 'of tax collectors' },
  { r: 'r17', text: 'amicus',           gloss: 'friend' },
  { r: 'r20', text: 'Et',              gloss: 'and' },
  { r: 'r21', text: 'justificata est',  gloss: 'was justified' },
  { r: 'r23', text: 'sapientia',        gloss: 'wisdom' },
  { r: 'r24', text: 'a',               gloss: 'by' },
  { r: 'r26', text: 'filiis',          gloss: 'children' },
  { r: 'r27', text: 'suis',            gloss: 'her' },
]);

// ── Matt 11:20 — "Woe to cities where mighty works were done" ─────────────────
// GK: Τότε ἤρξατο ὀνειδίζειν τὰς πόλεις ἐν αἷς ἐγένοντο αἱ πλεῖσται δυνάμεις
//     αὐτοῦ, ὅτι οὐ μετενόησαν (15r)
// VL: Tunc coepit exprobrare civitatibus in quibus factæ sunt plurimæ virtutes
//     ejus quia non egissent pœnitentiam
// Problem: "plurimæ" at article r9 (αἱ); cascade r4-r15
applyVulgate('matthew', '11', '20', [
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'civitatibus',      gloss: 'cities' },
  { r: 'r6',  text: 'in',              gloss: 'in' },
  { r: 'r7',  text: 'quibus',          gloss: 'which' },
  { r: 'r8',  text: 'factæ sunt',      gloss: 'were done' },
  { r: 'r9',  text: null },
  { r: 'r10', text: 'plurimæ',         gloss: 'very many' },
  { r: 'r11', text: 'virtutes',        gloss: 'mighty works' },
  { r: 'r12', text: 'ejus',           gloss: 'his' },
  { r: 'r13', text: 'quia',           gloss: 'because' },
  { r: 'r14', text: 'non',            gloss: 'not' },
  { r: 'r15', text: 'egissent pœnitentiam', gloss: 'had repented' },
]);

// ── Matt 11:21 — "Woe to Chorazin and Bethsaida" ─────────────────────────────
// GK: οὐαί σοι, Χοραζίν· οὐαί σοι, Βηθσαϊδά· ὅτι εἰ ἐν Τύρῳ καὶ Σιδῶνι
//     ἐγένοντο αἱ δυνάμεις αἱ γενόμεναι ἐν ὑμῖν, πάλαι ἂν ἐν σάκκῳ καὶ σποδῷ
//     μετενόησαν (26r)
// VL: Væ tibi Corozain væ tibi Bethsaida quia si in Tyro et Sidone factæ
//     essent virtutes quæ factæ sunt in vobis olim in cilicio et cinere
//     egissent pœnitentiam
// Problem: "essent" at article r14 (αἱ); "factæ essent" split; cascade r13-r26
applyVulgate('matthew', '11', '21', [
  { r: 'r13', text: 'factæ essent',    gloss: 'had been done' },
  { r: 'r14', text: null },
  { r: 'r17', text: 'factæ sunt',      gloss: 'were done' },
  { r: 'r18', text: 'in',             gloss: 'in' },
  { r: 'r19', text: 'vobis',          gloss: 'you' },
  { r: 'r20', text: 'olim',           gloss: 'long ago' },
  { r: 'r21', text: null },
  { r: 'r26', text: 'egissent pœnitentiam', gloss: 'they would have repented' },
]);

// ── Matt 11:23 — "Capernaum exalted to heaven, cast to Hades" ────────────────
// GK: καὶ σύ, Καφαρναούμ, μὴ ἕως οὐρανοῦ ὑψωθήσῃ; ἕως ᾅδου καταβήσῃ· ὅτι εἰ
//     ἐν Σοδόμοις ἐγενήθησαν αἱ δυνάμεις αἱ γενόμεναι ἐν σοί, ἔμεινεν ἂν μέχρι
//     τῆς σήμερον (27r)
// VL: Et tu Capharnaum numquid usque in cælum exaltaberis usque in infernum
//     descendes quia si in Sodomis factæ fuissent virtutes quæ factæ sunt in
//     te mansisset forte usque in hodiernum diem
// Problem: "factæ" at article r17 (αἱ); "virtutes" at article r19 (αἱ);
//          "mansissent" at genitive article r26 (τῆς); cascade r9-r27
applyVulgate('matthew', '11', '23', [
  { r: 'r9',  text: 'usque in',        gloss: 'down to' },
  { r: 'r10', text: 'infernum',        gloss: 'Hades' },
  { r: 'r11', text: 'descendes',       gloss: 'you will go down' },
  { r: 'r12', text: 'quia',           gloss: 'because' },
  { r: 'r13', text: 'si',             gloss: 'if' },
  { r: 'r14', text: 'in',             gloss: 'in' },
  { r: 'r15', text: 'Sodomis',        gloss: 'Sodom' },
  { r: 'r16', text: 'factæ fuissent', gloss: 'had been done' },
  { r: 'r17', text: null },
  { r: 'r18', text: 'virtutes',       gloss: 'mighty works' },
  { r: 'r19', text: 'quæ',           gloss: 'which' },
  { r: 'r20', text: 'factæ sunt',     gloss: 'were done' },
  { r: 'r21', text: 'in',            gloss: 'in' },
  { r: 'r22', text: 'te',            gloss: 'you' },
  { r: 'r23', text: 'mansisset',      gloss: 'it would have remained' },
  { r: 'r24', text: 'forte',         gloss: 'perhaps' },
  { r: 'r25', text: 'usque',         gloss: 'until' },
  { r: 'r26', text: 'in',            gloss: 'to' },
  { r: 'r27', text: 'hodiernum diem', gloss: 'this day' },
]);

// ── Matt 13:11 — "To you it is given to know the mysteries" ──────────────────
// GK: ὁ δὲ ἀποκριθεὶς εἶπεν αὐτοῖς· ὅτι ὑμῖν δέδοται γνῶναι τὰ μυστήρια
//     τῆς βασιλείας τῶν οὐρανῶν, ἐκείνοις δὲ οὐ δέδοται (19r)
// VL: Qui respondens dixit eis Quia vobis datum est nosse mysteria regni
//     cælorum illis autem non datum
// Problem: "est" at article r1 (ὁ); "datum est" split; cascade r1-r19
applyVulgate('matthew', '13', '11', [
  { r: 'r1',  text: 'Qui',            gloss: 'who' },
  { r: 'r2',  text: null },
  { r: 'r8',  text: 'datum est',      gloss: 'is given' },
  { r: 'r9',  text: 'nosse',          gloss: 'to know' },
  { r: 'r10', text: null },
  { r: 'r11', text: 'mysteria',       gloss: 'mysteries' },
  { r: 'r13', text: 'regni',          gloss: 'of the kingdom' },
  { r: 'r15', text: 'cælorum',        gloss: 'of heavens' },
  { r: 'r16', text: 'illis',          gloss: 'to those' },
  { r: 'r17', text: 'autem',          gloss: 'but' },
  { r: 'r18', text: 'non',            gloss: 'not' },
  { r: 'r19', text: 'datum',          gloss: 'given' },
]);

// ── Matt 13:23 — "Good-ground: understands and bears fruit" ──────────────────
// GK: ὁ δὲ ἐπὶ τὴν καλὴν γῆν σπαρείς, οὗτός ἐστιν ὁ τὸν λόγον ἀκούων καὶ
//     συνιείς, ὃς δὴ καρποφορεῖ καὶ ποιεῖ ὃ μὲν ἑκατόν, ὃ δὲ ἑξήκοντα,
//     ὃ δὲ τριάκοντα (30r)
// VL: Qui autem in bonam terram seminatus est hic est qui verbum audit et
//     intelligit et fructum affert et facit aliud quidem centesimum aliud
//     autem sexagesimum aliud vero trigesimum
// Problem: "aliud" at article r1 (ὁ); triple article cascade through r30
applyVulgate('matthew', '13', '23', [
  { r: 'r1',  text: 'Qui',            gloss: 'who' },
  { r: 'r2',  text: 'autem',          gloss: 'but' },
  { r: 'r3',  text: 'in',             gloss: 'into' },
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'bonam',          gloss: 'good' },
  { r: 'r6',  text: null },
  { r: 'r7',  text: 'terram',         gloss: 'ground' },
  { r: 'r8',  text: 'seminatus est',  gloss: 'was sown' },
  { r: 'r9',  text: 'hic',           gloss: 'this one' },
  { r: 'r11', text: 'qui',           gloss: 'who' },
  { r: 'r13', text: 'verbum',        gloss: 'word' },
  { r: 'r14', text: 'audit',         gloss: 'hears' },
  { r: 'r15', text: 'et',            gloss: 'and' },
  { r: 'r16', text: 'intelligit',    gloss: 'understands' },
  { r: 'r17', text: 'et fructum',    gloss: 'and fruit' },
  { r: 'r19', text: 'affert',        gloss: 'bears' },
  { r: 'r20', text: 'et',            gloss: 'and' },
  { r: 'r21', text: 'facit',         gloss: 'makes' },
  { r: 'r22', text: 'aliud',         gloss: 'one' },
  { r: 'r23', text: 'quidem',        gloss: 'indeed' },
  { r: 'r24', text: 'centesimum',    gloss: 'a hundredfold' },
  { r: 'r25', text: 'aliud',         gloss: 'another' },
  { r: 'r26', text: 'autem',         gloss: 'then' },
  { r: 'r27', text: 'sexagesimum',   gloss: 'sixtyfold' },
  { r: 'r28', text: 'aliud',         gloss: 'another' },
  { r: 'r29', text: 'vero',          gloss: 'truly' },
  { r: 'r30', text: 'trigesimum',    gloss: 'thirtyfold' },
]);

// ── Matt 13:29 — "Do not pull up tares lest you uproot the wheat" ─────────────
// GK: ὁ δὲ ἔφη· οὔ, μήποτε συλλέγοντες τὰ ζιζάνια ἐκριζώσητε ἅμα αὐτοῖς
//     τὸν σῖτον (13r)
// VL: At ille ait Non ne forte colligentes zizania eradicetis simul et triticum
// Problem: "Et" at article r1 (ὁ); displaced to r2; cascade r1-r13
applyVulgate('matthew', '13', '29', [
  { r: 'r1',  text: 'ille',           gloss: 'he' },
  { r: 'r2',  text: 'Et',             gloss: 'and' },
  { r: 'r12', text: null },
  { r: 'r13', text: 'et triticum',    gloss: 'and the wheat' },
]);

// ── Matt 13:34 — "Jesus spoke all these things in parables" ──────────────────
// GK: Ταῦτα πάντα ἐλάλησεν ὁ Ἰησοῦς ἐν παραβολαῖς τοῖς ὄχλοις, καὶ χωρὶς
//     παραβολῆς οὐδὲν ἐλάλει αὐτοῖς (11r)
// VL: Hæc omnia locutus est Jesus in parabolis ad turbas et sine parabola
//     non loquebatur eis
// Problem: "est" at article r4 (ὁ); "locutus est" split; cascade
applyVulgate('matthew', '13', '34', [
  { r: 'r3',  text: 'locutus est',    gloss: 'spoke' },
  { r: 'r4',  text: null },
]);

// ── Matt 13:35 — "I will utter things hidden since the foundation" ────────────
// GK: ὅπως πληρωθῇ τὸ ῥηθὲν διὰ τοῦ προφήτου λέγοντος· ἀνοίξω ἐν παραβολαῖς
//     τὸ στόμα μου, ἐρεύξομαι κεκρυμμένα ἀπὸ καταβολῆς κόσμου (19r)
// VL: ut adimpleretur quod dictum est per prophetam dicentem Aperiam in
//     parabolis os meum eructabo abscondita a constitutione mundi
// Problem: "constitutione" at article r3 (τό); "mundi" at genitive article r6 (τοῦ);
//          double cascade r3-r19
applyVulgate('matthew', '13', '35', [
  { r: 'r3',  text: null },
  { r: 'r5',  text: 'per',            gloss: 'through' },
  { r: 'r6',  text: null },
  { r: 'r7',  text: 'prophetam',      gloss: 'a prophet' },
  { r: 'r8',  text: 'dicentem',       gloss: 'saying' },
  { r: 'r9',  text: 'Aperiam',        gloss: 'I will open' },
  { r: 'r10', text: 'in',             gloss: 'in' },
  { r: 'r11', text: 'parabolis',      gloss: 'parables' },
  { r: 'r13', text: 'os',             gloss: 'mouth' },
  { r: 'r14', text: 'meum',           gloss: 'my' },
  { r: 'r15', text: 'eructabo',       gloss: 'I will utter' },
  { r: 'r16', text: 'abscondita',     gloss: 'hidden things' },
  { r: 'r17', text: 'a',              gloss: 'from' },
  { r: 'r18', text: 'constitutione',  gloss: 'foundation' },
  { r: 'r19', text: 'mundi',          gloss: 'of the world' },
]);

// ── Matt 13:39 — "The enemy who sowed them is the devil" ─────────────────────
// GK: ὁ δὲ ἐχθρὸς ὁ σπείρας αὐτά ἐστιν ὁ διάβολος· ὁ δὲ θερισμός ἐστιν
//     ἡ συντέλεια τοῦ αἰῶνος, οἱ δὲ θερισταί εἰσιν ἄγγελοι (21r)
// VL: Inimicus autem qui seminavit ea est diabolus Messis vero consummatio
//     sæculi est Messores autem angeli sunt
// Problem: "sunt" at article r1 (ὁ); "Inimicus/autem" swapped; cascade
applyVulgate('matthew', '13', '39', [
  { r: 'r1',  text: null },
  { r: 'r2',  text: 'autem',          gloss: 'but' },
  { r: 'r3',  text: 'Inimicus',       gloss: 'the enemy' },
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'qui seminavit',  gloss: 'who sowed' },
  { r: 'r6',  text: 'ea',             gloss: 'them' },
  { r: 'r7',  text: 'est',            gloss: 'is' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'diabolus',       gloss: 'the devil' },
  { r: 'r10', text: null },
  { r: 'r12', text: 'Messis vero',    gloss: 'the harvest indeed' },
  { r: 'r13', text: 'consummatio',    gloss: 'end' },
  { r: 'r15', text: 'sæculi',         gloss: 'of the age' },
  { r: 'r16', text: 'est',            gloss: 'is' },
  { r: 'r17', text: null },
  { r: 'r19', text: 'Messores autem', gloss: 'but the reapers' },
  { r: 'r20', text: 'angeli',         gloss: 'angels' },
  { r: 'r21', text: 'sunt',           gloss: 'are' },
]);

// ── Matt 13:41 — "Son of Man sends angels to gather evildoers" ───────────────
// GK: ἀποστελεῖ ὁ υἱὸς τοῦ ἀνθρώπου τοὺς ἀγγέλους αὐτοῦ, καὶ συλλέξουσιν
//     ἐκ τῆς βασιλείας αὐτοῦ πάντα τὰ σκάνδαλα καὶ τοὺς ποιοῦντας τὴν
//     ἀνομίαν (22r)
// VL: Mittet Filius hominis angelos suos et colligent de regno ejus omnia
//     scandala et eos qui faciunt iniquitatem
// Problem: "faciunt" at article r2 (ὁ); "iniquitatem" at genitive article r4 (τοῦ);
//          cascade r2-r22
applyVulgate('matthew', '13', '41', [
  { r: 'r2',  text: null },
  { r: 'r4',  text: null },
  { r: 'r20', text: 'eos qui faciunt', gloss: 'those who do' },
  { r: 'r22', text: 'iniquitatem',    gloss: 'lawlessness' },
]);

// ── Matt 13:47 — "Kingdom of heaven like a net gathering all kinds" ───────────
// GK: Πάλιν ὁμοία ἐστὶν ἡ βασιλεία τῶν οὐρανῶν σαγήνῃ βληθείσῃ εἰς τὴν
//     θάλασσαν καὶ ἐκ παντὸς γένους συναγαγούσῃ (17r)
// VL: Iterum simile est regnum cælorum sagenæ missæ in mare et ex omni
//     genere piscium congreganti
// Problem: "congreganti" at article r4 (ἡ); cascade r4-r17
applyVulgate('matthew', '13', '47', [
  { r: 'r4',  text: null },
  { r: 'r16', text: 'genere piscium', gloss: 'kind of fish' },
  { r: 'r17', text: 'congreganti',    gloss: 'gathering' },
]);

// ── Matt 13:53 — "Jesus departed from there after these parables" ─────────────
// GK: Καὶ ἐγένετο ὅτε ἐτέλεσεν ὁ Ἰησοῦς τὰς παραβολὰς ταύτας, μετῆρεν
//     ἐκεῖθεν (11r)
// VL: Et factum est cum consummasset Jesus parabolas istas transiit inde
// Problem: "inde" at article r5 (ὁ); "factum est" split; cascade r2-r11
applyVulgate('matthew', '13', '53', [
  { r: 'r2',  text: 'factum est',     gloss: 'it came to pass' },
  { r: 'r3',  text: 'cum',            gloss: 'when' },
  { r: 'r4',  text: 'consummasset',   gloss: 'he had finished' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'Jesus',          gloss: 'Jesus' },
  { r: 'r8',  text: 'parabolas',      gloss: 'parables' },
  { r: 'r9',  text: 'istas',          gloss: 'these' },
  { r: 'r10', text: 'transiit',       gloss: 'departed' },
  { r: 'r11', text: 'inde',           gloss: 'from there' },
]);

// Verify
const verses = [
  ['matthew', '11', '19'],
  ['matthew', '11', '20'],
  ['matthew', '11', '21'],
  ['matthew', '11', '23'],
  ['matthew', '13', '11'],
  ['matthew', '13', '23'],
  ['matthew', '13', '29'],
  ['matthew', '13', '34'],
  ['matthew', '13', '35'],
  ['matthew', '13', '39'],
  ['matthew', '13', '41'],
  ['matthew', '13', '47'],
  ['matthew', '13', '53'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
