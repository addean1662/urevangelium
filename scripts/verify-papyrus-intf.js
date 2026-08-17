// scripts/verify-papyrus-intf.js
//
// Fetches INTF NTVMR diplomatic transcriptions for every papyrus fragment
// and compares each extant cell against what INTF records for that verse.
//
// Read-only — never modifies data files. Produces papyrus-intf-report.txt.
//
// Rules applied (from session agreement):
//   1. Order is inviolable — papyrus words must stay in sequence
//   2. Contiguous forward scan only
//   3. Leading rows becoming 'lost' requires INTF confirmation (this script provides it)
//   4. Diacritics stripped for comparison only — stored data never touched
//   5. Nomina sacra expanded for comparison only — stored data never touched
//   6. Genuine variants flagged, not auto-corrected
//   7. Report only — no data writes
//
// Usage:
//   node scripts/verify-papyrus-intf.js              # all fragments
//   node scripts/verify-papyrus-intf.js P25 P71      # specific fragments

'use strict';
const fs   = require('fs');
const path = require('path');
const https = require('https');
const http  = require('http');

// ── Fragment → INTF GA number(s) ────────────────────────────────────────────
const FRAGMENT_GA = {
  'P1':     [10001], 'P2':  [10002], 'P3':  [10003], 'P4':  [10004],
  'P5':     [10005], 'P6':  [10006], 'P7':  [10007], 'P19': [10019],
  'P21':    [10021], 'P22': [10022], 'P25': [10025], 'P28': [10028],
  'P35':    [10035], 'P36': [10036], 'P37': [10037], 'P39': [10039],
  'P42':    [10042], 'P44': [10044], 'P45': [10045], 'P52': [10052],
  'P53':    [10053], 'P59': [10059], 'P60': [10060], 'P63': [10063],
  'P64+P67':[10064, 10067],  // Barcelona-Oxford codex, two INTF registrations
  'P66':    [10066], 'P69': [10069], 'P70': [10070], 'P71': [10071],
  'P73':    [10073], 'P75': [10075], 'P76': [10076], 'P77': [10077],
  'P80':    [10080], 'P82': [10082], 'P83': [10083], 'P84': [10084],
  'P86':    [10086], 'P88': [10088], 'P90': [10090], 'P93': [10093],
  'P95':    [10095], 'P97': [10097], 'P101':[10101], 'P102':[10102],
  'P103':   [10103], 'P104':[10104], 'P105':[10105], 'P106':[10106],
  'P107':   [10107], 'P108':[10108], 'P109':[10109], 'P110':[10110],
  'P111':   [10111], 'P119':[10119], 'P120':[10120], 'P121':[10121],
  'P122':   [10122], 'P128':[10128], 'P134':[10134], 'P137':[10137],
  'P138':   [10138], 'P141':[10141],
};

const BOOK_INTF = { matthew:'Matt', mark:'Mark', luke:'Luke', john:'John' };
const BOOK_KEY  = { matthew:'B01',  mark:'B02',  luke:'B03',  john:'B04'  };

// ── Normalisation (comparison only — never written to data) ─────────────────

// Known nomina sacra contractions → normalized expansions (lowercase, no diacritics)
const NS = {
  // 2-letter and 3-letter forms of Jesus (ΙΣ, ΙΗ, ΙΗΣ after normalize ς→σ)
  'ισ':'ιησους','ιη':'ιησους','ιησ':'ιησους',
  'ιυ':'ιησου','ιν':'ιησουν','ιης':'ιησους','ιηυ':'ιησου','ιηλ':'ιησουλ',
  'χυ':'χριστου','χν':'χριστον','χσ':'χριστος','χω':'χριστω',
  'θυ':'θεου','θν':'θεον','θσ':'θεος','θω':'θεω',
  'κυ':'κυριου','κν':'κυριον','κσ':'κυριος','κω':'κυριω',
  'υυ':'υιου','υν':'υιον','υσ':'υιος','υω':'υιω',
  'πνσ':'πνευματος','πνα':'πνευμα','πνι':'πνευματι',
  'ανοσ':'ανθρωπος','ανον':'ανθρωπον','ανου':'ανθρωπου',
  'δαδ':'δαυιδ','δδ':'δαυιδ',
  'ιλημ':'ιερουσαλημ','ιλη':'ιερουσαλημ',
  'ιηλ':'ισραηλ',
  'σρηλ':'ισραηλ',
  'πρσ':'πατρος',  // πρς (genitive of πατήρ / Father) → πατρος
  'πρ':'πατηρ',   // πρ (nominative πατήρ) → πατηρ
  'ανοι':'ανθρωποι', // ανοι (nom. pl. ἄνθρωποι) → ανθρωποι
  'σναι':'σταυρωθηναι', // σναι (σταυρωθῆναι abbrev.) → σταυρωθηναι
  'σν':'σταυρον',      // σν (σταυρόν abbrev.) → σταυρον
};

function normalize(s) {
  // Strip Unicode diacritics, lowercase, strip trailing punctuation/paragraph marks,
  // unify final sigma ς (U+03C2) → medial sigma σ (U+03C3) for consistent comparison.
  // Strip embedded newlines first — INTF TEI sometimes uses literal \n for in-word line breaks.
  return s.replace(/\n/g, '')
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .toLowerCase()
          .replace(/ς/g, 'σ')   // ς → σ
          .replace(/᾽/g, '')  // strip Greek koronis (elision mark, e.g. μετ᾽)
          .replace(/[.,;:·¶!?'"»«¶]+$/, '')
          .trim()
          .replace(/ωι$/, 'ω')  // iota adscript dative ω-stem ≡ iota subscript ῳ
          .replace(/ηι$/, 'η'); // iota adscript dative η-stem ≡ iota subscript ῃ
}

function normForMatch(s) {
  const n = normalize(s);
  // Normalize the NS result too — NS values may retain final-sigma ς (U+03C2)
  // while normalize() converts ς→σ, causing false mismatches on nominative forms.
  return normalize(NS[n] ?? n);
}

// ── HTTP fetch (follows one redirect) ───────────────────────────────────────
function fetchURL(url, redirected = false) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers:{ 'User-Agent':'urevangelium-intf-verifier/1.0' } }, res => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && !redirected) {
        return fetchURL(res.headers.location, true).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ── TEI XML parser ───────────────────────────────────────────────────────────
// Returns { abKey: [word, ...] } where abKey = e.g. "B01K19V1"
function parseTranscript(xml) {
  const result = {};

  // Match every <ab ...>...</ab> block (non-greedy, handles multiline)
  const abRe = /<ab\b([^>]*)>([\s\S]*?)<\/ab>/g;
  let abM;
  while ((abM = abRe.exec(xml)) !== null) {
    const attrs   = abM[1];
    const content = abM[2];

    const nAttr = attrs.match(/\bn="([^"]+)"/);
    if (!nAttr) continue;
    // Normalize alt-format keys like "Matt.20.24", "Luke.4.29", "John.17.8"
    // into B-format "B01K20V24", "B03K4V29", "B04K17V8"
    const ALT_BOOK = { Matt:'B01', Mark:'B02', Luke:'B03', John:'B04' };
    const altM = nAttr[1].match(/^(Matt|Mark|Luke|John)\.(\d+)\.(\d+)$/);
    const key = altM ? `${ALT_BOOK[altM[1]]}K${altM[2]}V${altM[3]}` : nAttr[1];

    // Extract <w> text content (strip all child tags, keep text nodes)
    const words = [];
    const wRe = /<w\b[^>]*>([\s\S]*?)<\/w>/g;
    let wM;
    while ((wM = wRe.exec(content)) !== null) {
      const text = wM[1].replace(/<[^>]+>/g, '').trim();
      if (text) words.push(text);
    }
    // Accumulate across split <ab> parts (part="I", "M", "F")
    if (words.length) {
      result[key] = (result[key] || []).concat(words);
    }
  }
  return result;
}

// ── Verse key builder ────────────────────────────────────────────────────────
function verseKey(gospel, chapter, verse) {
  return `${BOOK_KEY[gospel]}K${chapter}V${verse}`;
}

// ── Load all verse JSON files ────────────────────────────────────────────────
function loadVerses() {
  const out = [];
  for (const g of ['matthew','mark','luke','john']) {
    const gDir = path.join('data', g);
    if (!fs.existsSync(gDir)) continue;
    for (const ch of fs.readdirSync(gDir).sort((a,b)=>+a-+b)) {
      const cDir = path.join(gDir, ch);
      if (!fs.statSync(cDir).isDirectory()) continue;
      for (const vf of fs.readdirSync(cDir).sort((a,b)=>+a.replace('.json','')-+b.replace('.json',''))) {
        if (!vf.endsWith('.json')) continue;
        try { out.push(JSON.parse(fs.readFileSync(path.join(cDir,vf),'utf8'))); }
        catch(e) {}
      }
    }
  }
  return out;
}

// ── Displacement diagnosis ───────────────────────────────────────────────────
// Given our word list and INTF word list (both normalized), determine the issue.
function diagnose(ourNorm, intfNorm) {
  const oStr = ourNorm.join(' ');
  const iStr = intfNorm.join(' ');

  if (oStr === iStr) return { type: 'OK' };

  // INTF words appear as a contiguous subsequence within ours
  if (oStr.includes(iStr)) {
    // Find offset: how many words before the INTF sequence starts?
    for (let i = 0; i <= ourNorm.length - intfNorm.length; i++) {
      if (ourNorm.slice(i, i + intfNorm.length).join(' ') === iStr) {
        if (i === 0) {
          // Correct start, but our data extends beyond INTF coverage
          return { type: 'OVER_EXTENDED', extraWords: ourNorm.length - intfNorm.length };
        }
        return { type: 'DISPLACEMENT', leadingLost: i, correctStart: i };
      }
    }
  }

  // Our words appear as a contiguous subset of INTF (partial coverage — OK)
  if (iStr.includes(oStr)) return { type: 'PARTIAL_SUBSET' };

  // Check if there's a partial overlap (displacement with some variation)
  // Find longest common subsequence start
  let bestLen = 0, bestOurOffset = -1, bestIntfOffset = -1;
  for (let oi = 0; oi < ourNorm.length; oi++) {
    for (let ii = 0; ii < intfNorm.length; ii++) {
      let len = 0;
      while (oi+len < ourNorm.length && ii+len < intfNorm.length
             && ourNorm[oi+len] === intfNorm[ii+len]) len++;
      if (len > bestLen) { bestLen = len; bestOurOffset = oi; bestIntfOffset = ii; }
    }
  }
  if (bestLen >= 3) {
    return {
      type: 'PARTIAL_MATCH',
      ourOffset: bestOurOffset,
      intfOffset: bestIntfOffset,
      matchLen: bestLen
    };
  }

  return { type: 'MISMATCH' };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const targetFrags = new Set(process.argv.slice(2));

  console.log('Loading verse data...');
  const verses = loadVerses();

  // Determine which (docID, gospel) pairs need fetching
  const toFetch = new Map(); // `${docID}:${gospel}` → { docID, gospel, fragId }
  for (const v of verses) {
    if (!v.rows.some(r => r.papyrus?.type === 'extant')) continue;
    const frags = new Set();
    for (const r of v.rows) for (const f of r.papyrus?.fragments||[]) frags.add(f.id);
    for (const fragId of frags) {
      if (targetFrags.size && !targetFrags.has(fragId)) continue;
      const gaList = FRAGMENT_GA[fragId];
      if (!gaList) continue;
      for (const docID of gaList) {
        const k = `${docID}:${v.gospel}`;
        if (!toFetch.has(k)) toFetch.set(k, { docID, gospel: v.gospel, fragId });
      }
    }
  }

  // Cache directory
  const cacheDir = path.join('data','cache','intf');
  fs.mkdirSync(cacheDir, { recursive: true });

  // Fetch / load from cache
  const transcripts = {}; // key → parsed verse map
  console.log(`Fetching ${toFetch.size} INTF transcriptions (cached where available)...\n`);
  let fetchCount = 0;
  for (const [k, { docID, gospel, fragId }] of toFetch) {
    const cacheFile = path.join(cacheDir, `${docID}-${gospel}.json`);
    if (fs.existsSync(cacheFile)) {
      transcripts[k] = JSON.parse(fs.readFileSync(cacheFile,'utf8'));
      process.stdout.write(`  [cache] ${fragId}(${docID}) ${gospel}: ${Object.keys(transcripts[k]).length} verses\n`);
      continue;
    }
    const bookCode = BOOK_INTF[gospel];
    const url = `https://ntvmr.uni-muenster.de/community/vmr/api/transcript/get/?docID=${docID}&indexContent=${bookCode}&detail=pageText`;
    process.stdout.write(`  Fetching ${fragId}(${docID}) ${gospel}... `);
    try {
      const xml = await fetchURL(url);
      const parsed = parseTranscript(xml);
      transcripts[k] = parsed;
      fs.writeFileSync(cacheFile, JSON.stringify(parsed, null, 2));
      console.log(`${Object.keys(parsed).length} verses`);
      fetchCount++;
    } catch(e) {
      console.log(`FAILED: ${e.message}`);
      transcripts[k] = {};
    }
    if (fetchCount > 0) await new Promise(r => setTimeout(r, 300));
  }

  // Compare
  console.log('\nComparing against INTF...');
  const issues = [];
  let okCount = 0;

  for (const v of verses) {
    if (!v.rows.some(r => r.papyrus?.type === 'extant')) continue;
    const fragSet = new Set();
    // Only collect fragments from extant rows; lost rows may retain stale fragments arrays.
    for (const r of v.rows) {
      if (r.papyrus?.type === 'extant') {
        for (const f of r.papyrus.fragments || []) fragSet.add(f.id);
      }
    }

    for (const fragId of fragSet) {
      if (targetFrags.size && !targetFrags.has(fragId)) continue;
      const gaList = FRAGMENT_GA[fragId];
      if (!gaList) continue;

      const abKey = verseKey(v.gospel, v.chapter, v.verse);

      // Collect INTF words for this frag (union of all docIDs)
      let intfWords = null;
      for (const docID of gaList) {
        const k = `${docID}:${v.gospel}`;
        const parsed = transcripts[k] || {};
        if (parsed[abKey]) {
          intfWords = intfWords ? [...intfWords, ...parsed[abKey]] : [...parsed[abKey]];
        }
      }

      // Our extant papyrus words in row order (only rows where this fragment is present)
      const ourRows  = v.rows.filter(r => r.papyrus?.type === 'extant' && r.papyrus.fragments?.some(f => f.id === fragId));
      const ourWords = ourRows.map(r => r.papyrus.text);

      if (!intfWords || intfWords.length === 0) {
        // INTF has nothing for this verse — our data claims extant
        issues.push({
          ref:      `${v.gospel} ${v.chapter}:${v.verse}`,
          frag:     fragId,
          diag:     { type: 'NOT_IN_INTF' },
          ourWords,
          intfWords: [],
        });
        continue;
      }

      const ourNorm  = ourWords.map(normForMatch);
      const intfNorm = intfWords.map(normForMatch);
      const diag     = diagnose(ourNorm, intfNorm);

      if (diag.type === 'OK' || diag.type === 'PARTIAL_SUBSET') {
        okCount++;
        continue;
      }

      issues.push({ ref:`${v.gospel} ${v.chapter}:${v.verse}`, frag:fragId, diag, ourWords, intfWords });
    }
  }

  // ── Build report ────────────────────────────────────────────────────────────
  const lines = [
    'Papyrus INTF Verification Report',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Summary`,
    `  Verified OK:       ${okCount}`,
    `  Issues found:      ${issues.length}`,
    `    DISPLACEMENT:    ${issues.filter(i=>i.diag.type==='DISPLACEMENT').length}`,
    `    OVER_EXTENDED:   ${issues.filter(i=>i.diag.type==='OVER_EXTENDED').length}`,
    `    PARTIAL_MATCH:   ${issues.filter(i=>i.diag.type==='PARTIAL_MATCH').length}`,
    `    MISMATCH:        ${issues.filter(i=>i.diag.type==='MISMATCH').length}`,
    `    NOT_IN_INTF:     ${issues.filter(i=>i.diag.type==='NOT_IN_INTF').length}`,
    '',
  ];

  const order = ['DISPLACEMENT','OVER_EXTENDED','PARTIAL_MATCH','MISMATCH','NOT_IN_INTF'];
  for (const issueType of order) {
    const group = issues.filter(i => i.diag.type === issueType);
    if (!group.length) continue;
    lines.push(`${'─'.repeat(72)}`);
    lines.push(`${issueType} (${group.length})`);
    lines.push('');
    for (const iss of group) {
      lines.push(`  ${iss.ref} [${iss.frag}]`);
      lines.push(`    INTF: ${iss.intfWords.join(' ')}`);
      lines.push(`    OURS: ${iss.ourWords.join(' ')}`);
      if (iss.diag.type === 'DISPLACEMENT') {
        lines.push(`    FIX:  set rows 1–${iss.diag.leadingLost} to lost; papyrus starts at row ${iss.diag.correctStart + 1}`);
      } else if (iss.diag.type === 'OVER_EXTENDED') {
        lines.push(`    INFO: our data has ${iss.diag.extraWords} extra word(s) beyond INTF coverage — trailing rows may need lost`);
      } else if (iss.diag.type === 'PARTIAL_MATCH') {
        lines.push(`    INFO: ${iss.diag.matchLen}-word match at our[${iss.diag.ourOffset}] / intf[${iss.diag.intfOffset}]`);
      }
      lines.push('');
    }
  }

  const reportPath = 'papyrus-intf-report.txt';
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
  console.log(`\nReport written to ${reportPath}`);
  console.log(`OK: ${okCount}  Issues: ${issues.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
