'use strict';
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'data');
const SRC  = path.join(BASE, 'sources');

// ── Source parsers ─────────────────────────────────────────────────────────

const GOSPEL_MAP = { Matthew: 'matthew', Mark: 'mark', Luke: 'luke', John: 'john' };

function parseSource(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const idx = {}; // gospel → ch → v → text
  let cur = null;
  for (const line of lines) {
    const h = line.match(/^###\s+(\S+)/);
    if (h) { cur = GOSPEL_MAP[h[1]] || null; if (cur) idx[cur] = {}; continue; }
    if (!cur) continue;
    const m = line.match(/^\[(\d+):(\d+)\]\s+(.*)/);
    if (!m) continue;
    const ch = +m[1], v = +m[2];
    const text = m[3].replace(/[܀。]/g, '').replace(/\s*[.!?]\s*$/, '').trim();
    if (!idx[cur][ch]) idx[cur][ch] = {};
    idx[cur][ch][v] = text;
  }
  return idx;
}

console.log('Parsing source files...');
const VUGL_SRC = parseSource(path.join(SRC, 'vulgate',  'VulgClementine.txt'));
const PESH_SRC = parseSource(path.join(SRC, 'peshitta', 'Peshitta.txt'));

// ── Greek normalization ────────────────────────────────────────────────────
// Strip all diacritical marks and lowercase for accent-insensitive comparison.
// Greek has grave/acute/circumflex/breathing variants of same letters in
// running text (e.g. δέ vs δὲ). We need to match both.

function normG(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// ── Greek article set (normalized, no diacritics, lowercase) ───────────────

const ARTICLES_NORM = new Set([
  'ο','η','το','τον','την','του','της','τω','τοις','των','τους','τας','τα','αι','οι',
]);

function isArticle(text) { return ARTICLES_NORM.has(normG(text)); }

// ── Peshitta function-word map (normalized keys) ───────────────────────────
// Returns: { text, gloss }  → place that Syriac word
//          null              → place empty cell
//          undefined         → not a function word; leave unchanged

const PESH_FIXED_NORM = {
  'γαρ':       { text: 'ܓܝܪ',  gloss: 'for'      },
  'εγεννησεν': { text: 'ܐܘܠܕ', gloss: 'begat'    },
  'αλλα':      { text: 'ܐܠܐ',  gloss: 'but'      },
  'ιδου':      { text: 'ܗܐ',   gloss: 'behold'   },
  'αμην':      { text: 'ܐܡܝܢ', gloss: 'truly'    },
};

// Matthew 1:2-17 = genealogy; Peshitta omits δέ there
function isGenealogy(gospel, ch, v) {
  return gospel === 'matthew' && ch === 1 && v >= 2 && v <= 17;
}

function peshFunc(greek, gospel, ch, v) {
  const n = normG(greek);
  if (n === 'δε') return isGenealogy(gospel, ch, v) ? null : { text: 'ܕܝܢ', gloss: 'but' };
  return PESH_FIXED_NORM[n]; // undefined if not a known function word
}

// ── Vulgate tokeniser ──────────────────────────────────────────────────────

function vulgTokens(text) {
  return text
    .replace(/[.,;:!?()\[\]{}«»—–æÆ]/g, ' ')
    .split(/\s+/).filter(w => w.length > 0);
}

// ── Quick gloss table for common Vulgate words ─────────────────────────────

const VG = {
  et:'and', in:'in', non:'not', est:'is', erat:'was', erant:'were', sunt:'are',
  autem:'but/however', sed:'but', quia:'because/that', ut:'that/so that',
  cum:'when/with', ergo:'therefore', igitur:'therefore', itaque:'and so',
  per:'through/by', ad:'to', de:'from/of', ex:'from/out of', ab:'from/by',
  si:'if', nisi:'unless', sicut:'just as', quasi:'as if',
  qui:'who/which', quae:'who/which', quod:'which/that',
  quem:'whom', cui:'to whom', cuius:'whose', quos:'whom (pl)', quibus:'to whom (pl)',
  ego:'I', tu:'you', nos:'we', vos:'you (pl)',
  me:'me', te:'you', eum:'him', eam:'her', eos:'them', eis:'to them', ei:'to him',
  meum:'my', tuum:'your', suum:'his/her/their', suam:'his/her', suo:'his/her',
  meus:'my', tuus:'your', suus:'his/her', noster:'our', vester:'your',
  hic:'this', haec:'this', hoc:'this', huic:'to this', hinc:'from here',
  ille:'he/that', illa:'she/that', illud:'that', illi:'to him/those', illum:'him',
  ipse:'himself/he', ipsa:'herself', ipsum:'himself', ipsi:'themselves',
  omnis:'every/all', omnes:'all', omnia:'all things', omnem:'all',
  unus:'one', duo:'two', tres:'three', quatuor:'four', septem:'seven',
  Deus:'God', deus:'God', Dei:'of God', Deo:'to God', Deum:'God',
  Dominus:'Lord', dominus:'lord', Domini:'of the Lord', Domino:'to the Lord', Dominum:'Lord',
  Jesus:'Jesus', Jesu:'Jesus', Jesum:'Jesus', Christi:'of Christ', Christus:'Christ',
  angelus:'angel', angeli:'of an angel', angelum:'angel', angelo:'to an angel',
  spiritus:'spirit', Spiritus:'Spirit', Sanctus:'Holy', sanctus:'holy',
  pater:'father', patris:"of the father", patrem:'father', patre:'by the father',
  mater:'mother', matris:"of the mother", matrem:'mother',
  filius:'son', filium:'son', filii:'sons/of the son', filio:'to the son',
  vir:'man/husband', virum:'man', mulier:'woman', mulierem:'woman',
  rex:'king', regem:'king', regis:"of the king", regi:'to the king',
  populus:'people', populi:"of the people", populo:'to the people', populum:'people',
  terra:'land/earth', terram:'land', terrae:"of the land", terris:'in the lands',
  caelum:'heaven', caeli:"of heaven", caelo:'in heaven', caelos:'heavens',
  vita:'life', vitam:'life', vitae:"of life",
  dies:'day', diem:'day', die:'on the day', diebus:'in the days',
  nox:'night', noctem:'night', nocte:'at night',
  verbum:'word', verbi:"of the word", verba:'words',
  genuit:'begat', natus:'born', nati:"of the born",
  dixit:'said', dicit:'says', dicens:'saying', dixerunt:'said (pl)',
  respondit:'answered', venit:'came', venerunt:'came',
  ivit:'went', abiit:'went away', surrexit:'arose', misit:'sent',
  vidit:'saw', audivit:'heard', dedit:'gave', accepit:'received/took', fecit:'made/did',
  ecce:'behold', Amen:'truly/amen',
  David:'David', Abraham:'Abraham', Isaac:'Isaac', Jacob:'Jacob',
  Maria:'Mary', Mariam:'Mary', Mariae:"of Mary",
  Joseph:'Joseph', Herodes:'Herod', Herodem:'Herod',
  Bethlehem:'Bethlehem', Jerosolymam:'Jerusalem', Jerosolyma:'Jerusalem',
  Galilaeam:'Galilee', Galilaea:'Galilee', Aegyptum:'Egypt', Aegyptus:'Egypt',
  Nazareth:'Nazareth', Iesse:'Jesse', Jesse:'Jesse',
  propter:'because of', ante:'before', post:'after',
  supra:'above', sub:'under', super:'upon/over', contra:'against', inter:'between',
  pro:'for', prope:'near', circa:'around', ultra:'beyond', usque:'until/even',
  incipiens:'beginning', a:'from', novissimis:'the last', primos:'the first',
  Voca:'call', redde:'pay back', operarios:'the workers',
  vineae:'of the vineyard', procuratori:'to the steward',
  mercedem:'the wages', illis:'to them',
};

function vulgGloss(w) { return VG[w] || VG[w.toLowerCase()] || '?'; }

// ── Process one verse ──────────────────────────────────────────────────────

const report = { cascadesFixed: [], cascadesSkipped: [], peshCells: 0 };

function processVerse(filePath, gospel, ch, v) {
  let data;
  try { data = JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (e) { console.error(`  ERROR reading ${filePath}: ${e.message}`); return; }

  let changed = false;

  // ── 1. Detect Vulgate cascade ──────────────────────────────────────────
  const hasCascade = data.rows.some(
    r => isArticle(r.vaticanus?.text) && r.vulgate?.type === 'text'
  );

  if (hasCascade) {
    const srcText = VUGL_SRC[gospel]?.[ch]?.[v];
    if (srcText) {
      const tokens = vulgTokens(srcText);
      const nonArtCount = data.rows.filter(r => !isArticle(r.vaticanus?.text)).length;
      const delta = tokens.length - nonArtCount;

      if (delta === 0) {
        // Exact match — apply full re-alignment
        let ti = 0;
        data.rows = data.rows.map(row => {
          if (isArticle(row.vaticanus?.text)) return { ...row, vulgate: { type: 'empty' } };
          const w = tokens[ti++];
          if (!w) return { ...row, vulgate: { type: 'empty' } };
          return { ...row, vulgate: { type: 'text', text: w, gloss: { gloss: vulgGloss(w), source: 'Whitaker' } } };
        });
        report.cascadesFixed.push(`${gospel} ${ch}:${v} (${tokens.length} words)`);
        changed = true;
      } else {
        // Mismatch — clear article rows only, flag for manual review
        data.rows = data.rows.map(row => {
          if (isArticle(row.vaticanus?.text) && row.vulgate?.type === 'text') {
            changed = true;
            return { ...row, vulgate: { type: 'empty' } };
          }
          return row;
        });
        report.cascadesSkipped.push(
          `${gospel} ${ch}:${v} (token delta ${delta > 0 ? '+' : ''}${delta}; src="${srcText.substring(0,60)}...")`
        );
      }
    }
  }

  // ── 2. Peshitta structural rules ─────────────────────────────────────
  data.rows = data.rows.map(row => {
    const g = row.vaticanus?.text || '';
    const cur = row.peshitta;

    if (isArticle(g)) {
      if (cur?.type !== 'empty') {
        report.peshCells++;
        changed = true;
        return { ...row, peshitta: { type: 'empty' } };
      }
      return row;
    }

    const fw = peshFunc(g, gospel, ch, v);
    if (fw === undefined) return row; // not a function word — leave as-is

    const next = fw
      ? { type: 'text', text: fw.text, gloss: { gloss: fw.gloss, source: 'PayneSmith' } }
      : { type: 'empty' };

    if (JSON.stringify(cur) !== JSON.stringify(next)) {
      report.peshCells++;
      changed = true;
      return { ...row, peshitta: next };
    }
    return row;
  });

  if (changed) fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ── Walk all gospels ───────────────────────────────────────────────────────

const GOSPELS = ['matthew', 'mark', 'luke', 'john'];

for (const gospel of GOSPELS) {
  const gDir = path.join(BASE, gospel);
  if (!fs.existsSync(gDir)) { console.log(`Skipping ${gospel} (no data dir)`); continue; }

  const chapters = fs.readdirSync(gDir).map(Number).filter(Boolean).sort((a, b) => a - b);

  for (const ch of chapters) {
    const cDir = path.join(gDir, String(ch));
    const verses = fs.readdirSync(cDir)
      .filter(f => f.endsWith('.json'))
      .map(f => parseInt(f))
      .sort((a, b) => a - b);

    for (const v of verses) {
      processVerse(path.join(cDir, `${v}.json`), gospel, ch, v);
    }
    process.stdout.write(`  ${gospel} ch${ch}\n`);
  }
}

// ── Write report ───────────────────────────────────────────────────────────

fs.writeFileSync(
  path.join(__dirname, 'align-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n═══ Alignment Summary ═══');
console.log(`Vulgate cascades fully re-aligned:  ${report.cascadesFixed.length}`);
console.log(`Vulgate cascades partially cleared: ${report.cascadesSkipped.length} (need manual review)`);
console.log(`Peshitta cells corrected:           ${report.peshCells}`);
console.log('Report → scripts/align-report.json');
