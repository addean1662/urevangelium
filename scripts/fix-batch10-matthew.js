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

// ── Matt 1:5 — Genealogy: Salmon→Boaz→Obed→Jesse ─────────────────────────────
// GK: Σαλμών δέ ἐγέννησεν τόν Βόες ἐκ τῆς Ῥαχάβ · Βόες δέ ἐγέννησεν τόν Ἰωβήδ
//     ἐκ τῆς Ῥούθ · Ἰωβήδ δέ ἐγέννησεν τόν Ἰεσσαί (21r)
// VL: Salmon autem genuit Booz de Rahab Booz autem genuit Obed ex Ruth Obed
//     autem genuit Jesse
// Problem: article rows r4/r7/r12/r15/r20 carry proper names/verbs — full cascade
applyVulgate('matthew', '1', '5', [
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'Booz',   gloss: 'Boaz' },
  { r: 'r6',  text: 'de',     gloss: 'of' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'Rahab',  gloss: 'Rahab' },
  { r: 'r9',  text: 'Booz',   gloss: 'Boaz' },
  { r: 'r10', text: 'autem',  gloss: 'but' },
  { r: 'r11', text: 'genuit', gloss: 'begat' },
  { r: 'r12', text: null },
  { r: 'r13', text: 'Obed',   gloss: 'Obed' },
  { r: 'r14', text: 'ex',     gloss: 'of' },
  { r: 'r15', text: null },
  { r: 'r16', text: 'Ruth',   gloss: 'Ruth' },
  { r: 'r17', text: 'Obed',   gloss: 'Obed' },
  { r: 'r20', text: null },
  { r: 'r21', text: 'Jesse',  gloss: 'Jesse' },
]);

// ── Matt 1:17 — Three groups of 14 generations ────────────────────────────────
// GK: Πᾶσαι οὖν αἱ γενεαί ἀπό Ἀβραάμ ἕως Δαυίδ γενεαί δεκατέσσαρες καί
//     ἀπό Δαυίδ ἕως τῆς μετοικεσίας Βαβυλῶνος γενεαί δεκατέσσαρες καί ἀπό
//     τῆς μετοικεσίας Βαβυλῶνος ἕως τοῦ Χριστοῦ γενεαί δεκατέσσαρες (29r)
// VL: Omnes itaque generationes ab Abraham usque ad David generationes
//     quatuordecim et a David usque ad transmigrationem Babylonis generationes
//     quatuordecim et a transmigratione Babylonis usque ad Christum generationes
//     quatuordecim
// Problem: "Christum" at article r3 (αἱ); double article cascade r15, r22
applyVulgate('matthew', '1', '17', [
  { r: 'r3',  text: null },
  { r: 'r8',  text: 'ad David',            gloss: 'to David' },
  { r: 'r9',  text: 'generationes',        gloss: 'generations' },
  { r: 'r10', text: 'quatuordecim',        gloss: 'fourteen' },
  { r: 'r11', text: 'et',                  gloss: 'and' },
  { r: 'r12', text: 'a',                   gloss: 'from' },
  { r: 'r13', text: 'David',               gloss: 'David' },
  { r: 'r14', text: 'usque',               gloss: 'until' },
  { r: 'r15', text: null },
  { r: 'r16', text: 'ad transmigrationem', gloss: 'to the exile' },
  { r: 'r17', text: 'Babylonis',           gloss: 'of Babylon' },
  { r: 'r18', text: 'generationes',        gloss: 'generations' },
  { r: 'r19', text: 'quatuordecim',        gloss: 'fourteen' },
  { r: 'r20', text: 'et',                  gloss: 'and' },
  { r: 'r21', text: 'a',                   gloss: 'from' },
  { r: 'r22', text: null },
  { r: 'r23', text: 'transmigratione',     gloss: 'exile' },
  { r: 'r24', text: 'Babylonis',           gloss: 'of Babylon' },
  { r: 'r25', text: 'usque',               gloss: 'until' },
  { r: 'r27', text: 'ad Christum',         gloss: 'to the Christ' },
  { r: 'r28', text: 'generationes',        gloss: 'generations' },
  { r: 'r29', text: 'quatuordecim',        gloss: 'fourteen' },
]);

// ── Matt 1:22 — "All this happened to fulfill what was spoken" ─────────────────
// GK: Τοῦτο δέ ὅλον γέγονεν ἵνα πληρωθῇ τό ῥηθέν ὑπό τοῦ κυρίου διά τοῦ
//     προφήτου λέγοντος (15r)
// VL: Hoc autem totum factum est ut adimpleretur quod dictum est a Domino per
//     prophetam dicentem
// Problem: "factum est" split (r4/r5); "est" at article r10 (τοῦ); cascade
applyVulgate('matthew', '1', '22', [
  { r: 'r4',  text: 'factum est',      gloss: 'came to pass' },
  { r: 'r5',  text: 'ut',              gloss: 'so that' },
  { r: 'r6',  text: 'adimpleretur',    gloss: 'might be fulfilled' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'quod dictum est', gloss: 'that which was spoken' },
  { r: 'r9',  text: 'a',               gloss: 'by' },
  { r: 'r10', text: null },
  { r: 'r11', text: 'Domino',          gloss: 'the Lord' },
  { r: 'r12', text: 'per',             gloss: 'through' },
  { r: 'r13', text: null },
]);

// ── Matt 2:2 — Magi ask where the King of the Jews is born ───────────────────
// GK: λέγοντες ποῦ ἐστίν ὁ τεχθείς βασιλεύς τῶν Ἰουδαίων εἴδομεν γάρ αὐτοῦ
//     τόν ἀστέρα ἐν τῇ ἀνατολῇ καί ἤλθομεν προσκυνῆσαι αὐτῷ (20r)
// VL: dicentes Ubi est qui natus est rex Judæorum vidimus enim stellam ejus in
//     oriente et venimus adorare eum
// Problem: "adorare" at article r4 (ὁ); full 16-row cascade
applyVulgate('matthew', '2', '2', [
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'qui natus est', gloss: 'who was born' },
  { r: 'r6',  text: 'rex',          gloss: 'king' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'Judæorum',     gloss: 'of the Jews' },
  { r: 'r9',  text: 'vidimus',      gloss: 'we saw' },
  { r: 'r10', text: 'enim',         gloss: 'for' },
  { r: 'r11', text: 'ejus',         gloss: 'his' },
  { r: 'r13', text: 'stellam',      gloss: 'star' },
  { r: 'r14', text: 'in',           gloss: 'in' },
  { r: 'r16', text: 'oriente',      gloss: 'the east' },
  { r: 'r17', text: 'et',           gloss: 'and' },
  { r: 'r18', text: 'venimus',      gloss: 'we came' },
  { r: 'r19', text: 'adorare',      gloss: 'to worship' },
  { r: 'r20', text: 'eum',          gloss: 'him' },
]);

// ── Matt 2:5 — Scribes answer: in Bethlehem of Judea ─────────────────────────
// GK: οἱ δέ εἶπαν αὐτῷ Ἐν Βηθλέεμ τῆς Ἰουδαίας οὕτως γάρ γέγραπται διά τοῦ
//     προφήτου (14r)
// VL: At illi dixerunt ei In Bethlehem Judæ sic enim scriptum est per prophetam
// Problem: "prophetam" at article r1 (οἱ); cascade r1-r14
applyVulgate('matthew', '2', '5', [
  { r: 'r1',  text: 'illi',          gloss: 'they' },
  { r: 'r3',  text: 'dixerunt',      gloss: 'said' },
  { r: 'r4',  text: 'ei',            gloss: 'to him' },
  { r: 'r11', text: 'scriptum est',  gloss: 'it is written' },
  { r: 'r12', text: 'per',           gloss: 'through' },
  { r: 'r14', text: 'prophetam',     gloss: 'prophet' },
]);

// ── Matt 2:9 — Star goes before the Magi to where the child was ──────────────
// GK: Οἱ δέ ἀκούσαντες τοῦ βασιλέως ἐπορεύθησαν καί ἰδού ὁ ἀστήρ ὅν εἶδον
//     ἐν τῇ ἀνατολῇ προῆγεν αὐτούς ἕως ἐλθών ἐστάθη ἐπάνω οὗ ἦν τό παιδίον (25r)
// VL: Qui cum audissent regem abierunt et ecce stella quam viderant in oriente
//     antecedebat eos usque dum veniens staret supra ubi erat puer
// Problem: "erat" at article r1 (Οἱ); "puer" at genitive article r4 (τοῦ); double cascade
applyVulgate('matthew', '2', '9', [
  { r: 'r1',  text: 'Qui',           gloss: 'who' },
  { r: 'r2',  text: 'cum',           gloss: 'when' },
  { r: 'r3',  text: 'audissent',     gloss: 'they had heard' },
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'regem',         gloss: 'the king' },
  { r: 'r6',  text: 'abierunt',      gloss: 'they departed' },
  { r: 'r7',  text: 'et',            gloss: 'and' },
  { r: 'r8',  text: 'ecce',          gloss: 'behold' },
  { r: 'r10', text: 'stella',        gloss: 'star' },
  { r: 'r11', text: 'quam',          gloss: 'which' },
  { r: 'r12', text: 'viderant',      gloss: 'they had seen' },
  { r: 'r13', text: 'in',            gloss: 'in' },
  { r: 'r15', text: 'oriente',       gloss: 'the east' },
  { r: 'r16', text: 'antecedebat',   gloss: 'went before' },
  { r: 'r17', text: 'eos',           gloss: 'them' },
  { r: 'r18', text: 'usque',         gloss: 'until' },
  { r: 'r19', text: 'dum veniens',   gloss: 'coming' },
  { r: 'r20', text: 'staret',        gloss: 'it stood' },
  { r: 'r21', text: 'supra',         gloss: 'over' },
  { r: 'r22', text: 'ubi',           gloss: 'where' },
  { r: 'r23', text: 'erat',          gloss: 'was' },
  { r: 'r25', text: 'puer',          gloss: 'the child' },
]);

// ── Matt 2:13 — Angel tells Joseph to flee to Egypt ──────────────────────────
// GK: ἰδού ἄγγελος κυρίου φαίνεται κατ' ὄναρ τῷ Ἰωσήφ λέγων ἐγερθείς παράλαβε
//     τό παιδίον καί τήν μητέρα αὐτοῦ καί φεῦγε εἰς Αἴγυπτον καί ἴσθι ἐκεῖ ἕως
//     ἄν εἴπω σοι μέλλει γάρ Ἡρῴδης ζητεῖν τό παιδίον τοῦ ἀπολέσαι αὐτό (40r)
// VL: ecce angelus Domini apparuit in somnis Joseph dicens Surge et accipe puerum
//     et matrem ejus et fuge in Ægyptum et esto ibi usque dum dicam tibi Futurum
//     est enim Herodes ut quærat puerum ad perdendum eum
// Problem: "puerum" at dative article r10 (τῷ); cascade r10-r40
applyVulgate('matthew', '2', '13', [
  { r: 'r10', text: null },
  { r: 'r14', text: 'et accipe',     gloss: 'and take' },
  { r: 'r15', text: null },
  { r: 'r16', text: 'puerum',        gloss: 'the child' },
  { r: 'r17', text: 'et',            gloss: 'and' },
  { r: 'r18', text: null },
  { r: 'r19', text: 'matrem',        gloss: 'mother' },
  { r: 'r20', text: 'ejus',          gloss: 'his' },
  { r: 'r21', text: 'et',            gloss: 'and' },
  { r: 'r22', text: 'fuge',          gloss: 'flee' },
  { r: 'r23', text: 'in',            gloss: 'into' },
  { r: 'r24', text: 'Ægyptum',       gloss: 'Egypt' },
  { r: 'r25', text: 'et',            gloss: 'and' },
  { r: 'r26', text: 'esto',          gloss: 'remain' },
  { r: 'r27', text: 'ibi',           gloss: 'there' },
  { r: 'r28', text: 'usque',         gloss: 'until' },
  { r: 'r29', text: null },
  { r: 'r30', text: 'dicam',         gloss: 'I tell' },
  { r: 'r31', text: 'tibi',          gloss: 'you' },
  { r: 'r32', text: 'Futurum est',   gloss: 'it will come to pass' },
  { r: 'r33', text: 'enim',          gloss: 'for' },
  { r: 'r34', text: 'Herodes',       gloss: 'Herod' },
  { r: 'r35', text: 'ut quærat',     gloss: 'that he should seek' },
  { r: 'r36', text: null },
  { r: 'r37', text: 'puerum',        gloss: 'the child' },
  { r: 'r38', text: null },
  { r: 'r39', text: 'ad perdendum',  gloss: 'to destroy' },
  { r: 'r40', text: 'eum',           gloss: 'him' },
]);

// ── Matt 2:15 — "Out of Egypt I called my son" ───────────────────────────────
// GK: καί ἦν ἐκεῖ ἕως τῆς τελευτῆς Ἡρῴδου ἵνα πληρωθῇ τό ῥηθέν ὑπό κυρίου
//     διά τοῦ προφήτου λέγοντος ἐξ Αἰγύπτου ἐκάλεσα τόν υἱόν μου (24r)
// VL: et erat ibi usque ad obitum Herodis ut adimpleretur quod dictum est a
//     Domino per prophetam dicentem Ex Ægypto vocavi filium meum
// Problem: "vocavi" at genitive article r5 (τῆς); "meum" at genitive article r13 (τοῦ)
applyVulgate('matthew', '2', '15', [
  { r: 'r4',  text: 'usque ad',       gloss: 'until' },
  { r: 'r5',  text: null },
  { r: 'r6',  text: 'obitum',         gloss: 'the death' },
  { r: 'r7',  text: 'Herodis',        gloss: 'of Herod' },
  { r: 'r8',  text: 'ut',             gloss: 'that' },
  { r: 'r9',  text: 'adimpleretur',   gloss: 'might be fulfilled' },
  { r: 'r10', text: null },
  { r: 'r11', text: 'quod dictum est', gloss: 'that which was spoken' },
  { r: 'r12', text: 'a',              gloss: 'by' },
  { r: 'r13', text: null },
  { r: 'r14', text: 'Domino',         gloss: 'the Lord' },
  { r: 'r15', text: 'per',            gloss: 'through' },
  { r: 'r17', text: 'prophetam',      gloss: 'prophet' },
  { r: 'r18', text: 'dicentem',       gloss: 'saying' },
  { r: 'r19', text: 'Ex',             gloss: 'out of' },
  { r: 'r20', text: 'Ægypto',         gloss: 'Egypt' },
  { r: 'r21', text: 'vocavi',         gloss: 'I called' },
  { r: 'r23', text: 'filium',         gloss: 'son' },
  { r: 'r24', text: 'meum',           gloss: 'my' },
]);

// ── Matt 2:16 — Herod massacres children in Bethlehem ────────────────────────
// GK: Ἡρῴδης ἰδών ὅτι ἐνεπαίχθη ὑπό τῶν μάγων ἐθυμώθη λίαν καί ἀποστείλας
//     ἀνεῖλεν πάντας τούς παῖδας τούς ἐν Βηθλέεμ καί ἐν πᾶσιν τοῖς ὁρίοις
//     αὐτῆς ἀπό διετοῦς καί κατωτέρω κατά τόν χρόνον ὅν ἠκρίβωσεν παρά τῶν μάγων (37r)
// VL: Herodes videns quoniam illusus esset a magis iratus est valde et mittens
//     occidit omnes pueros qui erant in Bethlehem et in omnibus finibus ejus a
//     bimatu et infra secundum tempus quod exquisierat a magis
// Problem: "magis" at article r23 (τοῖς); many displaced cascades throughout
applyVulgate('matthew', '2', '16', [
  { r: 'r5',  text: 'illusus esset', gloss: 'had been deceived' },
  { r: 'r6',  text: 'a',             gloss: 'by' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'magis',         gloss: 'the Magi' },
  { r: 'r9',  text: 'iratus est',    gloss: 'was angry' },
  { r: 'r10', text: 'valde',         gloss: 'greatly' },
  { r: 'r11', text: 'et',            gloss: 'and' },
  { r: 'r12', text: 'mittens',       gloss: 'sending' },
  { r: 'r13', text: 'occidit',       gloss: 'killed' },
  { r: 'r14', text: 'omnes',         gloss: 'all' },
  { r: 'r15', text: null },
  { r: 'r16', text: 'pueros',        gloss: 'children' },
  { r: 'r17', text: null },
  { r: 'r18', text: 'in',            gloss: 'in' },
  { r: 'r19', text: 'Bethlehem',     gloss: 'Bethlehem' },
  { r: 'r20', text: 'et',            gloss: 'and' },
  { r: 'r21', text: 'in',            gloss: 'in' },
  { r: 'r22', text: 'omnibus',       gloss: 'all' },
  { r: 'r23', text: null },
  { r: 'r24', text: 'finibus',       gloss: 'borders' },
  { r: 'r25', text: 'ejus',          gloss: 'its' },
  { r: 'r26', text: 'a',             gloss: 'from' },
  { r: 'r27', text: 'bimatu',        gloss: 'two years old' },
  { r: 'r28', text: 'et',            gloss: 'and' },
  { r: 'r29', text: 'infra',         gloss: 'under' },
  { r: 'r30', text: 'secundum',      gloss: 'according to' },
  { r: 'r32', text: 'tempus',        gloss: 'the time' },
  { r: 'r33', text: 'quod',          gloss: 'which' },
  { r: 'r34', text: 'exquisierat',   gloss: 'he had ascertained' },
  { r: 'r35', text: 'a',             gloss: 'from' },
  { r: 'r37', text: 'magis',         gloss: 'the Magi' },
]);

// ── Matt 2:20 — Return to Israel: "those who sought the child's life are dead" ─
// GK: λέγων ἐγερθείς παράλαβε τό παιδίον καί τήν μητέρα αὐτοῦ καί πορεύου εἰς
//     γῆν Ἰσραήλ τεθνήκασιν γάρ οἱ ζητοῦντες τήν ψυχήν τοῦ παιδίου (22r)
// VL: dicens Surge et accipe puerum et matrem ejus et vade in terram Israël
//     defuncti sunt enim qui quærebant animam pueri
// Problem: "quærebant" at article r4 (τό); "animam" at article r7 (τήν);
//          "pueri" at article r17 (οἱ); triple cascade
applyVulgate('matthew', '2', '20', [
  { r: 'r3',  text: 'et accipe',     gloss: 'and take' },
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'puerum',        gloss: 'the child' },
  { r: 'r6',  text: 'et',            gloss: 'and' },
  { r: 'r7',  text: null },
  { r: 'r8',  text: 'matrem',        gloss: 'mother' },
  { r: 'r9',  text: 'ejus',          gloss: 'his' },
  { r: 'r10', text: 'et',            gloss: 'and' },
  { r: 'r11', text: 'vade',          gloss: 'go' },
  { r: 'r12', text: 'in',            gloss: 'into' },
  { r: 'r13', text: 'terram',        gloss: 'the land' },
  { r: 'r14', text: 'Israël',        gloss: 'of Israel' },
  { r: 'r15', text: 'defuncti sunt', gloss: 'have died' },
  { r: 'r16', text: 'enim',          gloss: 'for' },
  { r: 'r17', text: 'qui',           gloss: 'who' },
  { r: 'r18', text: 'quærebant',     gloss: 'were seeking' },
  { r: 'r20', text: 'animam',        gloss: 'the life' },
  { r: 'r22', text: 'pueri',         gloss: 'of the child' },
]);

// ── Matt 2:23 — He settled in Nazareth, fulfilling the prophecy ──────────────
// GK: καί ἐλθών κατῴκησεν εἰς πόλιν λεγομένην Ναζαρέτ ὅπως πληρωθῇ τό ῥηθέν
//     διά τῶν προφητῶν ὅτι Ναζωραῖος κληθήσεται (17r)
// VL: Et veniens habitavit in civitate quæ vocatur Nazareth ut adimpleretur quod
//     dictum est per prophetas Quoniam Nazaræus vocabitur
// Problem: "est" at article r13 (τῶν); cascade r6-r17
applyVulgate('matthew', '2', '23', [
  { r: 'r6',  text: 'quæ vocatur',   gloss: 'which is called' },
  { r: 'r7',  text: 'Nazareth',      gloss: 'Nazareth' },
  { r: 'r8',  text: 'ut',            gloss: 'so that' },
  { r: 'r9',  text: 'adimpleretur',  gloss: 'might be fulfilled' },
  { r: 'r10', text: null },
  { r: 'r11', text: 'quod dictum est', gloss: 'that which was spoken' },
  { r: 'r12', text: 'per',           gloss: 'through' },
  { r: 'r13', text: null },
  { r: 'r14', text: 'prophetas',     gloss: 'prophets' },
  { r: 'r15', text: 'Quoniam',       gloss: 'that' },
  { r: 'r16', text: 'Nazaræus',      gloss: 'a Nazarene' },
  { r: 'r17', text: 'vocabitur',     gloss: 'he will be called' },
]);

// ── Matt 3:2 — "Repent, for the kingdom of heaven is at hand" ─────────────────
// GK: καί λέγων μετανοεῖτε ἤγγικεν γάρ ἡ βασιλεία τῶν οὐρανῶν (9r)
// VL: et dicens Pœnitentiam agite appropinquavit enim regnum cælorum
// Problem: "cælorum" at article r6 (ἡ); cascade r3-r9
applyVulgate('matthew', '3', '2', [
  { r: 'r3',  text: 'Pœnitentiam agite', gloss: 'repent' },
  { r: 'r4',  text: 'appropinquavit',    gloss: 'has drawn near' },
  { r: 'r5',  text: 'enim',              gloss: 'for' },
  { r: 'r6',  text: null },
  { r: 'r7',  text: 'regnum',            gloss: 'kingdom' },
  { r: 'r9',  text: 'cælorum',           gloss: 'of heaven' },
]);

// ── Matt 3:3 — "A voice crying in the wilderness" ─────────────────────────────
// GK: οὗτος γάρ ἐστίν ὁ ῥηθείς διά Ἠσαΐου τοῦ προφήτου λέγοντος φωνή βοῶντος
//     ἐν τῇ ἐρήμῳ ἑτοιμάσατε τήν ὁδόν κυρίου εὐθείας ποιεῖτε τάς τρίβους αὐτοῦ (24r)
// VL: Hic est enim qui dictus est per Isaiam prophetam dicentem Vox clamantis
//     in deserto Parate viam Domini rectas facite semitas ejus
// Problem: "semitas" at article r4 (ὁ); "ejus" at article r8 (τοῦ); cascade
applyVulgate('matthew', '3', '3', [
  { r: 'r2',  text: 'enim',             gloss: 'for' },
  { r: 'r3',  text: 'est',              gloss: 'is' },
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'qui dictus est',   gloss: 'who was spoken of' },
  { r: 'r6',  text: 'per',              gloss: 'through' },
  { r: 'r7',  text: 'Isaiam',           gloss: 'Isaiah' },
  { r: 'r8',  text: null },
  { r: 'r9',  text: 'prophetam',        gloss: 'prophet' },
  { r: 'r10', text: 'dicentem',         gloss: 'saying' },
  { r: 'r11', text: 'Vox',              gloss: 'voice' },
  { r: 'r12', text: 'clamantis',        gloss: 'of one crying' },
  { r: 'r13', text: 'in',               gloss: 'in' },
  { r: 'r15', text: 'deserto',          gloss: 'the wilderness' },
  { r: 'r16', text: 'Parate',           gloss: 'prepare' },
  { r: 'r18', text: 'viam',             gloss: 'the way' },
  { r: 'r19', text: 'Domini',           gloss: 'of the Lord' },
  { r: 'r20', text: 'rectas',           gloss: 'straight' },
  { r: 'r21', text: 'facite',           gloss: 'make' },
  { r: 'r23', text: 'semitas',          gloss: 'paths' },
  { r: 'r24', text: 'ejus',             gloss: 'his' },
]);

// ── Matt 3:10 — "The ax is already at the root of the trees" ──────────────────
// GK: Ἤδη δέ καί ἡ ἀξίνη πρός τήν ῥίζαν τῶν δένδρων κεῖται πᾶν οὖν δένδρον
//     μή ποιοῦν καρπόν καλόν ἐκκόπτεται καί εἰς πῦρ βάλλεται (23r)
// VL: Jam enim securis ad radicem arborum posita est Omnis ergo arbor quæ non
//     facit fructum bonum excidetur et in ignem mittetur
// Problem: "mittetur" at article r4 (ἡ); "securis" at r3 (καί); double cascade
applyVulgate('matthew', '3', '10', [
  { r: 'r3',  text: null },
  { r: 'r4',  text: null },
  { r: 'r5',  text: 'securis',      gloss: 'ax' },
  { r: 'r6',  text: 'ad',           gloss: 'to' },
  { r: 'r8',  text: 'radicem',      gloss: 'root' },
  { r: 'r10', text: 'arborum',      gloss: 'of trees' },
  { r: 'r11', text: 'posita est',   gloss: 'is laid' },
  { r: 'r16', text: 'non facit',    gloss: 'does not produce' },
  { r: 'r17', text: 'fructum',      gloss: 'fruit' },
  { r: 'r18', text: 'bonum',        gloss: 'good' },
  { r: 'r19', text: 'excidetur',    gloss: 'will be cut down' },
  { r: 'r20', text: 'et',           gloss: 'and' },
  { r: 'r21', text: 'in',           gloss: 'into' },
  { r: 'r22', text: 'ignem',        gloss: 'fire' },
  { r: 'r23', text: 'mittetur',     gloss: 'will be thrown' },
]);

// ── Matt 3:13 — Jesus comes to be baptized by John ────────────────────────────
// GK: Τότε παραγίνεται ὁ Ἰησοῦς ἀπό τῆς Γαλιλαίας ἐπί τόν Ἰορδάνην πρός τόν
//     Ἰωάννην τοῦ βαπτισθῆναι ὑπ' αὐτοῦ (17r)
// VL: Tunc venit Jesus a Galilæa in Jordanem ad Joannem ut baptizaretur ab eo
// Problem: "eo" at article r3 (ὁ); cascade r15-r17
applyVulgate('matthew', '3', '13', [
  { r: 'r3',  text: null },
  { r: 'r15', text: 'ut baptizaretur', gloss: 'to be baptized' },
  { r: 'r16', text: 'ab',              gloss: 'by' },
  { r: 'r17', text: 'eo',              gloss: 'him' },
]);

// Verify
const verses = [
  ['matthew', '1', '5'],  ['matthew', '1', '17'], ['matthew', '1', '22'],
  ['matthew', '2', '2'],  ['matthew', '2', '5'],  ['matthew', '2', '9'],
  ['matthew', '2', '13'], ['matthew', '2', '15'], ['matthew', '2', '16'],
  ['matthew', '2', '20'], ['matthew', '2', '23'], ['matthew', '3', '2'],
  ['matthew', '3', '3'],  ['matthew', '3', '10'], ['matthew', '3', '13'],
];
verses.forEach(([g, c, v]) => {
  const d = JSON.parse(fs.readFileSync(`data/${g}/${c}/${v}.json`, 'utf8'));
  const text = d.rows.filter(r => r.vulgate?.type === 'text').map(r => r.vulgate.text).join(' ');
  console.log(`${g} ${c}:${v}: ${text}`);
});
