'use client';

import { useState, useRef } from 'react';
import type { MouseEvent } from 'react';
import rawData from '@/data/lineage/translations.json';

interface TranslationNode {
  id: string;
  name: string;
  shortName: string;
  date: number;
  dateRange: string;
  language: string;
  tradition: string;
  parents: string[];
  primarySource: string;
  description: string;
}

const NODES    = rawData as TranslationNode[];
const NODE_MAP = new Map(NODES.map(n => [n.id, n]));

// ── Manuscript witnesses ───────────────────────────────────────────────────────
//
// Not rendered as boxes in the genealogy section — the alignment-table column
// headers serve that role.  In the early section they are rendered as labelled
// witness nodes at their specific historical dates.
const WITNESS_IDS = new Set([
  'earliest-papyri', 'vaticanus', 'sinaiticus',
  'vulgate-jerome', 'peshitta', 'byzantine-textform',
]);

// ── Coordinate system ─────────────────────────────────────────────────────────
//
// Two-phase Y mapping:
//   Phase 1 — Tradition origins: 100–1350 AD → 0–EARLY_H px (compressed).
//             Each tradition stream starts at its historically recoverable date,
//             not all at y = 0.  The representative witness node appears at its
//             own date.  A dotted pre-witness line joins them.
//
//   Phase 2 — Translation genealogy: 1350–2030 AD → EARLY_H–SVG_H px.
//             Preserves the existing per-year spacing (~6.47 px/yr) so all
//             translation node positions remain correct.
//
// EARLY_H = 800 gives 0.64 px/year for 100–1350 AD.
// The genealogy section gains +EARLY_H offset automatically via yearToY.
const SVG_W     = 1440;
const AXIS_X    = 38;
const EARLY_START = 100;
const EARLY_END   = 1350;
const TOP_PAD     = 28;    // breathing room above 100 AD so the "100" label isn't clipped
const EARLY_H     = 800;   // height of tradition-origin section (100–1350 AD)
const LATE_H      = 1750;  // height of translation-genealogy section (1350–2025 AD)
const DIVIDER_Y   = TOP_PAD + EARLY_H;  // y of the 1350 AD section break = 828
const SVG_H       = TOP_PAD + EARLY_H + LATE_H;  // 2578
const LATEST      = 2030;

// Piecewise vertical scale — 100 px per "inch".  Century-aligned zone boundaries.
//
//   1350–1400   (50 yr)    50 px  —  1.0 px/yr  minimal bridge from section break
//   1400–1500  (100 yr)   200 px  —  2.0 px/yr  2 in: Wycliffe / Gutenberg era
//   1500–1600  (100 yr)   400 px  —  4.0 px/yr  4 in: Reformation / printed editions
//   1600–1700  (100 yr)   200 px  —  2.0 px/yr  2 in: Elzevir TR, Clementine
//   1700–1800  (100 yr)   100 px  —  1.0 px/yr  1 in: near-empty 18th century
//   1800–1900  (100 yr)   200 px  —  2.0 px/yr  2 in: Challoner, revision movement
//   1900–2000  (100 yr)   400 px  —  4.0 px/yr  4 in: modern translation explosion
//   2000–2025   (25 yr)   200 px  —  8.0 px/yr  2 in: ESV, NET, CSB, LSB cluster
//   ──────────────────────────────────────────────────────────────────
//   Total                1750 px = LATE_H ✓
const LATE_STOPS: { year: number; offset: number }[] = [
  { year: 1350, offset:    0 },
  { year: 1400, offset:   50 },
  { year: 1500, offset:  250 },
  { year: 1600, offset:  650 },
  { year: 1700, offset:  850 },
  { year: 1800, offset:  950 },
  { year: 1900, offset: 1150 },
  { year: 2000, offset: 1550 },
  { year: 2025, offset: 1750 },
];

function yearToY(year: number): number {
  if (year <= EARLY_END) {
    return TOP_PAD + ((year - EARLY_START) / (EARLY_END - EARLY_START)) * EARLY_H;
  }
  for (let i = 1; i < LATE_STOPS.length; i++) {
    const prev = LATE_STOPS[i - 1];
    const next = LATE_STOPS[i];
    if (year <= next.year) {
      const t = (year - prev.year) / (next.year - prev.year);
      return DIVIDER_Y + prev.offset + t * (next.offset - prev.offset);
    }
  }
  return DIVIDER_Y + LATE_H;
}

// ── Column x anchors — 7 columns at 1440 px ───────────────────────────────────
//
// Column width: 1440 / 7 ≈ 205.71 px.
// Column pair centre (dot separator): col_left + 50 % = col_index × 205.71 + 102.86 px.
// These values align each tradition line with the centre of its alignment-table column.
// Coptic (col 1) and Bezae (col 4) are new entries vs. the old 6-column layout.
// Sinaiticus shares col 2 with Vaticanus (toggle; never shown simultaneously).
const WITNESS_ANCHOR_X: Record<string, number> = {
  'earliest-papyri':     103,    // col 0 centre
  'coptic':              309,    // col 1 centre
  'vaticanus':           514,    // col 2 centre
  'sinaiticus':          514,    // col 2 centre (toggle replaces Vaticanus)
  'vulgate-jerome':      720,    // col 3 centre
  'bezae':               926,    // col 4 centre
  'peshitta':           1131,    // col 5 centre
  'byzantine-textform': 1337,    // col 6 centre
};

// ── Tradition-origin data for the early (100–1350 AD) section ─────────────────
interface TraditionSpec {
  id: string;
  witnessId: string;       // maps to WITNESS_ANCHOR_X for column x
  traditionStart: number;  // year the tradition becomes recoverable
  witnessYear: number;     // year of the representative witness
  witnessEnd: number | null; // non-null for range witnesses (Greek papyri only)
  witnessLabel: string;
  witnessSubLabel: string;
  tooltipTradition: string;
  tooltipWitness: string;
  traditionLabel?: string;       // source-period name shown near the tradition-start diamond
  traditionLabelAbove?: boolean; // if true, render above the diamond; default = left of diamond
  preWitnessLabel?: string;      // relationship label shown on the pre-witness arrow (right side)
  fadeYear?: number;             // post this year, post-witness line becomes faded/dashed
}

const TRADITIONS: TraditionSpec[] = [
  {
    id: 'trad-papyrus',
    witnessId: 'earliest-papyri',
    traditionStart: 125,
    witnessYear: 125,
    witnessEnd: 250,
    witnessLabel: 'Greek Papyri',
    witnessSubLabel: 'c. 125–250 AD',
    tooltipTradition:
      'Tradition begins: c. 125 AD — the oldest surviving NT manuscripts. ' +
      'The Greek papyri ARE the tradition; there is no earlier recoverable stream behind them.',
    tooltipWitness:
      'Representative witnesses: P52 (c. 125), P4+P64+P67, P66 (c. 200), P75 (c. 175–225), ' +
      'P45 (c. 225–250). The papyri span c. 125–250 AD and typically agree with ' +
      'the later Alexandrian text type.',
  },
  {
    id: 'trad-coptic',
    witnessId: 'coptic',
    traditionStart: 250,
    witnessYear: 300,
    witnessEnd: null,
    witnessLabel: 'Sahidic NT',
    witnessSubLabel: 'c. 300 AD',
    fadeYear: 900,
    tooltipTradition:
      'Tradition begins: c. 250 AD — the Coptic NT tradition was established in Sahidic ' +
      'before Antony heard Matthew read in Coptic c. 270 AD. ' +
      'A distinct versional stream, not a branch of the Alexandrian tradition.',
    tooltipWitness:
      'Representative witness: Sahidic NT (ed. Horner 1911–1924). ' +
      'Sahidic manuscripts date from c. 300 AD. The earliest and most complete Coptic NT tradition.',
  },
  {
    id: 'trad-alexandrian',
    witnessId: 'vaticanus',
    traditionStart: 175,
    witnessYear: 325,
    witnessEnd: null,
    witnessLabel: 'Vaticanus',
    witnessSubLabel: 'c. 325 AD',
    tooltipTradition:
      'Tradition begins: c. 175 AD — the Alexandrian text type is attested by Greek papyri ' +
      '(P75 c. 175–225, P66 c. 200) well before the great 4th-century codices. ' +
      'These papyri, not Vaticanus, mark the tradition\'s beginning.',
    tooltipWitness:
      'Representative witness: Codex Vaticanus (B/03) — c. 325 AD. ' +
      'The most complete Alexandrian codex, but the tradition it represents predates it by 150 years.',
  },
  {
    id: 'trad-latin',
    witnessId: 'vulgate-jerome',
    traditionStart: 150,
    witnessYear: 383,
    witnessEnd: null,
    witnessLabel: 'Vulgate',
    witnessSubLabel: '383 AD',
    tooltipTradition:
      'Tradition begins: c. 150 AD — Old Latin (Vetus Latina) Gospel texts circulated in ' +
      'North Africa and Rome within a century of the originals. ' +
      'The Latin tradition predates Jerome\'s Vulgate by over two centuries.',
    tooltipWitness:
      'Representative witness: Jerome\'s Vulgate revision — 383 AD, commissioned by Pope Damasus I. ' +
      'Jerome revised the Gospels against Greek manuscripts, replacing the fragmented Old Latin ' +
      'versions with a standardized Latin text.',
    traditionLabel: 'Old Latin / Vetus Latina',
    traditionLabelAbove: true,
    preWitnessLabel: 'Latin revision base',
  },
  {
    id: 'trad-western',
    witnessId: 'bezae',
    traditionStart: 165,
    witnessYear: 400,
    witnessEnd: null,
    witnessLabel: 'Bezae',
    witnessSubLabel: 'c. 400 AD',
    tooltipTradition:
      'Tradition begins: c. 150 AD — the Western text type is attested in Old Latin versions, ' +
      'patristic citations (Justin Martyr, Marcion, Irenaeus, Tertullian), and early Gospel harmonies. ' +
      'It predates any single surviving codex.',
    tooltipWitness:
      'Representative witness: Codex Bezae (D/05) — c. 400 AD. ' +
      'The primary surviving Greek-Latin bilingual codex for the Western text tradition; ' +
      'notable for extensive additions and divergences from the Alexandrian type.',
  },
  {
    id: 'trad-syriac',
    witnessId: 'peshitta',
    traditionStart: 170,
    witnessYear: 400,
    witnessEnd: null,
    witnessLabel: 'Peshitta',
    witnessSubLabel: 'c. 400 AD',
    tooltipTradition:
      'Tradition begins: c. 170 AD — the Old Syriac Gospel tradition (Curetonian Syriac, ' +
      'Sinaitic Syriacus) is attested in Tatian\'s Diatessaron (c. 170 AD) and ' +
      'predates the Peshitta by centuries.',
    tooltipWitness:
      'Representative witness: Peshitta — c. 400 AD. ' +
      'The standardized Syriac NT used across all Syriac-speaking churches. ' +
      'The Peshitta displaced the earlier Old Syriac versions but is not their origin.',
    traditionLabel: 'Old Syriac tradition',
    preWitnessLabel: 'Syriac standardization',
  },
  {
    id: 'trad-byzantine',
    witnessId: 'byzantine-textform',
    traditionStart: 300,
    witnessYear: 500,
    witnessEnd: null,
    witnessLabel: 'Byzantine',
    witnessSubLabel: 'c. 500 AD',
    tooltipTradition:
      'Tradition begins: c. 300 AD — Byzantine-type readings begin appearing in manuscripts ' +
      'and patristic citations; the recognizable Byzantine tradition becomes established ' +
      'later than every other stream shown here.',
    tooltipWitness:
      'Representative witness: Byzantine Textform — c. 500 AD. ' +
      'Preserved in thousands of medieval Greek manuscripts copied throughout the Byzantine empire; ' +
      'the basis for Erasmus\'s printed Greek NT and the Textus Receptus.',
  },
];

// ── Translation-genealogy node positions ──────────────────────────────────────
const NODE_X: Record<string, number> = {
  // Alexandrian critical text
  'westcott-hort':              540,
  'nestle-aland-28':            440,
  // English from critical text — literal/formal chain
  'revised-version-1881':       760,
  'asv-1901':                   780,
  'revised-standard-1952':      620,
  'nasb-1971':                  700,
  'new-revised-standard-1989':  540,
  'english-standard-2001':      380,
  'lsb-2021':                   700,
  // English from critical text — eclectic/study
  'new-international-1978':     300,
  'net-2005':                   480,
  'csb-2017':                   240,
  // Dynamic / meaning-based lane (far left)
  'good-news-bible-1966':       200,
  'nlt-1996':                   170,
  'the-message-2002':           130,
  // Latin tradition
  'wycliffe-1382':              680,
  'clementine-vulgate':         780,
  'douay-rheims-1582-1610':     785,
  'challoner-1749':             730,
  'jerusalem-bible-1966':       820,
  'nabre-2011':                 860,
  'stuttgart-vulgate':         1000,
  // Syriac tradition
  'bfbs-peshitta':             1014,
  // TR / Byzantine English
  'web-2000':                  1090,
  'new-king-james-1982':       1160,
  // TR stream: Erasmus → Stephanus → Beza → KJV / Elzevir
  'erasmus-greek-nt':          1310,
  'stephanus-1550':            1290,
  'beza-1598':                 1265,
  'tyndale-nt-1526':           1120,
  'bishops-bible-1568':        1060,
  'geneva-1560':                980,
  'kjv-1611':                   920,
  'textus-receptus-elzevir':   1220,
  'robinson-pierpont':         1360,
};

function getDisplayParents(n: TranslationNode): string[] {
  return n.parents;
}

function nodeAnchorX(id: string): number {
  return WITNESS_ANCHOR_X[id] ?? NODE_X[id] ?? SVG_W / 2;
}

const NODE_H = 34;   // matches EARLY_NODE_H — unified card height
function nodeW(_tradition: string): number {
  return 106;         // matches EARLY_NODE_W — unified card width
}

function connectorPath(px: number, py: number, cx: number, cy: number): string {
  const y2  = cy - NODE_H / 2;
  const mid = (py + y2) / 2;
  return `M ${px} ${py} C ${px} ${mid}, ${cx} ${mid}, ${cx} ${y2}`;
}


function splitLabel(shortName: string, date: number): { name: string; year: string } {
  const m = shortName.match(/^(.+?)\s(\d{4})$/);
  return m ? { name: m[1], year: m[2] } : { name: shortName, year: String(date) };
}

const RENDERED_NODES = NODES.filter(n => !WITNESS_IDS.has(n.id));

// Genealogy section year-axis ticks — century-aligned, finer in dense zones.
const TICK_YEARS: number[] = [
  1400, 1450,
  1500, 1525, 1550, 1575, 1600,
  1650, 1700, 1750, 1800, 1850,
  1900, 1925, 1950, 1975, 2000, 2025,
];
const LABEL_YEARS = new Set([1400, 1500, 1600, 1700, 1800, 1900, 2000, 2025]);

// Scale-break indicators — labeled bands at zone-entry points.
const SCALE_BREAKS: { year: number; label: string }[] = [
  { year: 1500, label: 'Reformation / printed edition zoom' },
  { year: 1900, label: 'Modern translation zoom' },
];

// Early section year-axis ticks
const EARLY_TICK_YEARS: number[] = [];
for (let y = 100; y <= 1300; y += 50) EARLY_TICK_YEARS.push(y);
const EARLY_LABEL_YEARS = new Set([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300]);

// Early-section witness node geometry
const EARLY_NODE_H  = 34;
const EARLY_NODE_W  = 106;
const W_STROKE      = 'rgba(92,58,31,0.50)';   // solid witness/tradition line
const PRE_W_STROKE  = 'rgba(92,58,31,0.28)';   // dotted pre-witness line
const GUIDE_STROKE  = 'rgba(92,58,31,0.10)';   // faint guide above tradition start
const ARC_STROKE    = 'rgba(92,58,31,0.38)';   // directed influence arcs

// Early-section S-curve connectors — same visual language as the genealogy
// connectorPath below.  Each curve departs vertically from one column line,
// sweeps to the horizontal midpoint, then arrives vertically at the destination.
// This matches the family-tree branch style used everywhere else in the chart.
const EARLY_CONNECTORS: {
  x1: number; year1: number;
  x2: number; year2: number;
  label: string; displayYear: string;
}[] = [
  // Alexandrian stream → Sahidic NT translation.
  // Branches off the Alexandrian tradition at c. 200 AD (peak papyri period)
  // and arrives at the Sahidic witness date c. 300 AD — 100-year diagonal.
  { x1: 514, year1: 200, x2: 309, year2: 300, label: 'from Alexandrian-type Greek', displayYear: 'c. 252 AD' },
  // Greek manuscripts → Vulgate correction.
  // Branches off the Alexandrian tradition at c. 220 AD and arrives at Vulgate c. 383 AD.
  // year1=220 ensures the curve departs above the Vaticanus witness card (top ≈ y 155).
  { x1: 514, year1: 220, x2: 720, year2: 383, label: 'Greek manuscript correction', displayYear: 'c. 383 AD' },
];

function earlyConnPath(x1: number, y1: number, x2: number, y2: number): string {
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

// Background bands — pale zones showing textual-family affinity.
// x / width in SVG units; y spans the full early section (TOP_PAD → DIVIDER_Y).
const EARLY_BANDS: {
  x: number; width: number;
  label: string; labelX: number;
  subLabel?: string;
}[] = [
  // Greek Papyri + Vaticanus share the Alexandrian stream (Coptic in between is
  // translated FROM this stream, shown by the directed arc)
  { x: 47, width: 520, label: 'Alexandrian / proto-Alexandrian stream', labelX: 309 },
  // Bezae — Western Greek-Latin textual environment; Bezae witnesses this stream
  { x: 873, width: 106, label: 'Western textual stream', subLabel: 'Bezae witnesses', labelX: 926 },
  // Byzantine — later Greek standardization
  { x: 1284, width: 106, label: 'Byzantine standard tradition', labelX: 1337 },
];

// ── Lane activity markers — 500–1350 AD ──────────────────────────────────────
//
// Rendered as small tick marks + italic labels inside each vertical tradition
// lane.  These show ongoing copying, standardisation, and revision without
// implying cross-tradition descent.  side:'right' labels sit between a lane
// and the next lane to its right; side:'left' labels sit between the lane and
// the next lane to its left.
const LANE_ACTIVITIES: {
  witnessId: string;
  year: number;          // y anchor (midpoint for period labels)
  lines: string[];       // 1–2 label lines
  side: 'left' | 'right';
  branch?: boolean;      // true → one-sided stub (side revision, not main-lane event)
}[] = [
  // All labels go LEFT — each tradition's annotations sit in the gap to its left.
  // Coptic lane (col 1 — labels left, into the Papyrus↔Coptic gap)
  { witnessId: 'coptic', year: 600,  lines: ['Sahidic dominant'],                           side: 'left' },
  { witnessId: 'coptic', year: 1000, lines: ['Bohairic NT', 'dominant c. 1000+'],            side: 'left' },
  // Alexandrian / Vaticanus lane (col 2 — labels left, into the Coptic↔Vaticanus gap)
  { witnessId: 'vaticanus', year: 450,  lines: ['c. 400–500:', 'major uncials copied'],       side: 'left' },
  { witnessId: 'vaticanus', year: 900,  lines: ['after 600:', 'minority Greek stream'],        side: 'left' },
  // Post-1350: Renaissance humanist recovery of Greek manuscripts (anchors on the Vaticanus guide line)
  { witnessId: 'vaticanus', year: 1440, lines: ['c. 1400s:', 'humanist return', 'to Greek MSS'], side: 'left' },
  // Vulgate / Latin lane (col 3 — labels left, into the Vaticanus↔Vulgate gap)
  // Carolingian revision and Paris Bible are major events → rendered as cards via TRADITION_EVENTS
  { witnessId: 'vulgate-jerome', year: 600, lines: ['c. 500–700:', 'Old Latin persists'], side: 'left' },
  // Bezae / Western lane (col 4 — labels left, into the Vulgate↔Bezae gap)
  { witnessId: 'bezae', year: 750, lines: ['after 500: Western', 'in select witnesses'], side: 'left' },
  // Peshitta / Syriac lane (col 5 — labels left, into the Bezae↔Peshitta gap)
  // Philoxenian & Harklean are named institutional revision events → cards in TRADITION_EVENTS
  { witnessId: 'peshitta', year: 950, lines: ['c. 600–1300:', 'Peshitta standard text'], side: 'left' },
  // Byzantine lane (col 6 — labels left, into the Peshitta↔Byzantine gap)
  { witnessId: 'byzantine-textform', year: 650,  lines: ['c. 500–800:', 'Byzantine expands'],          side: 'left' },
  { witnessId: 'byzantine-textform', year: 850,  lines: ['c. 800–900:', 'minuscule copying'],          side: 'left' },
  { witnessId: 'byzantine-textform', year: 1100, lines: ['c. 900–1300:', 'majority tradition'],        side: 'left' },
];

// ── Named institutional events — rendered as full witness-style cards ─────────
//
// These are specific works, revisions, or editions, not gradual transmission
// phenomena.  Each gets a dated card on its tradition line, identical in style
// to the founding-witness cards above.
const TRADITION_EVENTS: {
  witnessId: string;
  year: number;
  label: string;
  subLabel: string;
}[] = [
  // Latin / Vulgate lane
  { witnessId: 'vulgate-jerome', year: 800,  label: 'Carolingian',     subLabel: 'revision · c. 800 AD'    },
  { witnessId: 'vulgate-jerome', year: 1225, label: 'Paris Bible',     subLabel: 'c. 1220–1230 AD'         },
  // Post-1350 Vulgate tradition (guide line auto-drawn from section break down to card)
  { witnessId: 'vulgate-jerome', year: 1455, label: 'Gutenberg Bible', subLabel: 'printed Vulgate c. 1455' },
  // Alexandrian / Greek manuscript lane — Complutensian Polyglot (Greek NT printed 1514; published 1522)
  { witnessId: 'vaticanus',      year: 1514, label: 'Complutensian',   subLabel: 'NT printed 1514 · pub. 1522' },
  // Syriac / Peshitta lane (side revisions that did not replace the Peshitta)
  { witnessId: 'peshitta',       year: 508,  label: 'Philoxenian',     subLabel: 'revision · 508 AD'       },
  { witnessId: 'peshitta',       year: 616,  label: 'Harklean',        subLabel: 'revision · 616 AD'       },
];

// ── Textual evidence flows — witness columns that inform critical editions ────
// These are NOT textual descent.  Rendered as sparse dotted beziers with a
// faint colour so they read as "evidence" rather than "ancestry."
const TEXTUAL_EVIDENCE_FLOWS: {
  witnessId: string;
  targetNodeId: string;
  labelLines: string[];
  labelSide: 'left' | 'right';
}[] = [
  {
    witnessId:    'coptic',
    targetNodeId: 'westcott-hort',
    labelLines:   ['Coptic witnesses', 'inform critical editions'],
    labelSide:    'right',
  },
  {
    witnessId:    'bezae',
    targetNodeId: 'nestle-aland-28',
    labelLines:   ['Western witnesses', 'inform variant decisions'],
    labelSide:    'left',
  },
];

// ── Parallel sub-traditions within a single column ────────────────────────────
//
// Bohairic appears as a side-by-side sub-lane inside the Coptic column,
// offset +30 px from the Sahidic centre.  It is NOT descended from Sahidic;
// both are translations of the same Alexandrian Greek source.  It gets its
// own diamond, dashed guide, named card, and solid continuation line.
const PARALLEL_TRADITIONS: {
  parentWitnessId: string;
  xOffset: number;
  startYear: number;
  cardYear: number;
  cardLabel: string;
  cardSubLabel: string;
}[] = [
  // Bohairic represented via LANE_ACTIVITIES annotation; no separate sub-lane needed.
];

// ── Component ─────────────────────────────────────────────────────────────────

interface NodeTip { node: TranslationNode; x: number; y: number }
interface EarlyTip {
  kind: 'tradition' | 'witness';
  title: string;
  body: string;
  x: number; y: number;
}

export function LineageTimeline() {
  const [tooltip, setTooltip]         = useState<NodeTip | null>(null);
  const [earlyTip, setEarlyTip]       = useState<EarlyTip | null>(null);
  const [hoveredId, setHoveredId]     = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const svgRef         = useRef<SVGSVGElement>(null);

  function handleNodeEnter(e: MouseEvent, node: TranslationNode) {
    setHoveredId(node.id);
    setTooltip({ node, x: e.clientX + 14, y: e.clientY - 90 });
  }
  function handleNodeMove(e: MouseEvent, node: TranslationNode) {
    setTooltip({ node, x: e.clientX + 14, y: e.clientY - 90 });
  }
  function handleNodeLeave() { setHoveredId(null); setTooltip(null); }

  function handleNodeClick(node: TranslationNode) {
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    setHighlightedId(node.id);
    highlightTimer.current = setTimeout(() => setHighlightedId(null), 900);
    if (!svgRef.current) return;
    const svgRect   = svgRef.current.getBoundingClientRect();
    const svgTop    = window.scrollY + svgRect.top;
    const fraction  = yearToY(node.date) / SVG_H;
    const nodePageY = svgTop + fraction * svgRect.height;
    window.scrollTo({ top: Math.max(0, nodePageY - window.innerHeight / 2), behavior: 'smooth' });
  }

  function handleEarlyEnter(e: MouseEvent, tip: Omit<EarlyTip, 'x' | 'y'>) {
    setEarlyTip({ ...tip, x: e.clientX + 14, y: e.clientY - 90 });
  }
  function handleEarlyMove(e: MouseEvent, tip: Omit<EarlyTip, 'x' | 'y'>) {
    setEarlyTip(t => t ? { ...t, x: e.clientX + 14, y: e.clientY - 90 } : null);
  }
  function handleEarlyLeave() { setEarlyTip(null); }

  const sharedFont = 'EB Garamond, Georgia, serif';

  // ── Render early tradition column for one TraditionSpec ─────────────────────
  function renderTradition(t: TraditionSpec) {
    const x       = WITNESS_ANCHOR_X[t.witnessId] ?? SVG_W / 2;
    const yTrad   = yearToY(t.traditionStart);
    const yWit    = yearToY(t.witnessYear);
    const yWitEnd = t.witnessEnd != null ? yearToY(t.witnessEnd) : yWit + EARLY_NODE_H;
    const yBottom = DIVIDER_Y;

    const tradTip  = { kind: 'tradition' as const, title: t.witnessLabel, body: t.tooltipTradition };
    const witTip   = { kind: 'witness'   as const, title: t.witnessLabel, body: t.tooltipWitness  };

    // Papyrus uses a range bar (125–250); all others use a point witness node.
    // Push the range bar top below the tradition diamond (yTrad ± 6) so they don't collide.
    const isPapyrus = t.witnessEnd != null;
    const witnessTop    = isPapyrus ? Math.max(yWit, yTrad + EARLY_NODE_H / 2) : yWit - EARLY_NODE_H / 2;
    const witnessBottom = isPapyrus ? yWitEnd  : yWit + EARLY_NODE_H / 2;

    return (
      <g key={t.id}>
        {/* Faint guide line above tradition start (nothing recoverable before here) */}
        <line
          x1={x} y1={TOP_PAD} x2={x} y2={yTrad}
          stroke={GUIDE_STROKE}
          strokeWidth={1}
          strokeDasharray="2 5"
        />

        {/* Tradition-start diamond marker — hover shows tradition tooltip */}
        <g
          style={{ cursor: 'pointer' }}
          onMouseEnter={e => handleEarlyEnter(e, tradTip)}
          onMouseMove={e  => handleEarlyMove(e, tradTip)}
          onMouseLeave={handleEarlyLeave}
        >
          <polygon
            points={`${x},${yTrad - 6} ${x + 6},${yTrad} ${x},${yTrad + 6} ${x - 6},${yTrad}`}
            fill={W_STROKE}
            opacity={0.9}
          />
          {/* Invisible wider hit area */}
          <rect x={x - 16} y={yTrad - 16} width={32} height={32} fill="transparent" />
        </g>

        {/* Source-period name near the tradition-start diamond.
            traditionLabelAbove=true → centered above the diamond (connects visually
            to the downward arrow below it).  Default → left of the diamond. */}
        {t.traditionLabel && (
          <text
            x={t.traditionLabelAbove ? x : x - EARLY_NODE_W / 2 - 6}
            y={t.traditionLabelAbove ? yTrad - 11 : yTrad}
            dominantBaseline={t.traditionLabelAbove ? 'auto' : 'middle'}
            textAnchor={t.traditionLabelAbove ? 'middle' : 'end'}
            style={{
              fontSize: 9,
              fontStyle: 'italic',
              fill: 'var(--color-ink-muted)',
              fontFamily: sharedFont,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {t.traditionLabel}
          </text>
        )}

        {/* Pre-witness dotted line: tradition start → witness date (only when they differ).
            Arrow is added when the line represents a directional dependency. */}
        {witnessTop > yTrad + 8 && (
          <line
            x1={x} y1={yTrad + 7} x2={x} y2={witnessTop - 2}
            stroke={PRE_W_STROKE}
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        {/* Pre-witness period label (e.g. "Old Latin / Vetus Latina") */}
        {t.preWitnessLabel && !isPapyrus && witnessTop - yTrad > 40 && (
          <text
            x={x + EARLY_NODE_W / 2 + 6}
            y={(yTrad + witnessTop) / 2}
            dominantBaseline="middle"
            textAnchor="start"
            style={{
              fontSize: 9,
              fontStyle: 'italic',
              fill: 'var(--color-ink-muted)',
              fontFamily: sharedFont,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {t.preWitnessLabel}
          </text>
        )}

        {/* Witness node — hover shows witness tooltip */}
        <g
          style={{ cursor: 'pointer' }}
          onMouseEnter={e => handleEarlyEnter(e, witTip)}
          onMouseMove={e  => handleEarlyMove(e, witTip)}
          onMouseLeave={handleEarlyLeave}
        >
          <rect
            x={x - EARLY_NODE_W / 2}
            y={witnessTop}
            width={EARLY_NODE_W}
            height={witnessBottom - witnessTop}
            rx={3}
            fill="var(--color-bg-elevated)"
            stroke={W_STROKE}
            strokeWidth={1.25}
          />
          <text
            x={x} y={witnessTop + (witnessBottom - witnessTop) / 2 - (isPapyrus ? 8 : 5)}
            textAnchor="middle" dominantBaseline="middle"
            style={{
              fontSize: 12,
              fontWeight: 700,
              fontFamily: sharedFont,
              fill: 'var(--color-ink-primary)',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {t.witnessLabel}
          </text>
          <text
            x={x} y={witnessTop + (witnessBottom - witnessTop) / 2 + (isPapyrus ? 8 : 7)}
            textAnchor="middle" dominantBaseline="middle"
            style={{
              fontSize: 10,
              fontFamily: sharedFont,
              fill: 'var(--color-ink-muted)',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {t.witnessSubLabel}
          </text>
        </g>

        {/* Post-witness line — solid to fadeYear (if set), dashed thereafter */}
        {t.fadeYear ? (
          <>
            <line
              x1={x} y1={witnessBottom + 1} x2={x} y2={yearToY(t.fadeYear)}
              stroke={W_STROKE} strokeWidth={2.5} strokeLinecap="round"
            />
            <line
              x1={x} y1={yearToY(t.fadeYear)} x2={x} y2={yBottom}
              stroke={PRE_W_STROKE} strokeWidth={1.5} strokeDasharray="4 3" strokeLinecap="round"
            />
          </>
        ) : (
          <line
            x1={x} y1={witnessBottom + 1} x2={x} y2={yBottom}
            stroke={W_STROKE} strokeWidth={2.5} strokeLinecap="round"
          />
        )}
      </g>
    );
  }

  return (
    <div className="overflow-x-auto" style={{ position: 'relative' }}>

      {/* ── Chart title ──────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '4px 24px 0', minWidth: SVG_W }}>
        <div style={{
          fontFamily: sharedFont,
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--color-ink-primary)',
          letterSpacing: '0.01em',
          lineHeight: 1.15,
        }}>
          Trace Your New Testament Back to the Gospel Sources
        </div>
      </div>

      {/* ── Translation-node tooltip ─────────────────────────────────────────── */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            top: Math.max(8, tooltip.y),
            left: Math.min(tooltip.x, window.innerWidth - 326),
            background: '#1a1510',
            border: '1px solid rgba(200,170,120,.25)',
            borderRadius: 4,
            padding: '10px 14px',
            boxShadow: '0 4px 16px rgba(0,0,0,.65)',
            zIndex: 9999,
            maxWidth: 312,
            color: 'rgba(200,180,150,.85)',
            fontSize: 13,
            lineHeight: 1.55,
            pointerEvents: 'none',
            fontFamily: sharedFont,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2, color: 'rgba(230,215,185,.95)' }}>
            {tooltip.node.name}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(200,170,120,.65)', marginBottom: 6 }}>
            {tooltip.node.dateRange} · {tooltip.node.language}
          </div>
          <div style={{ marginBottom: 5 }}>{tooltip.node.primarySource}</div>
          <div style={{ color: 'rgba(200,180,150,.7)', fontStyle: 'italic' }}>
            {tooltip.node.description}
          </div>
        </div>
      )}

      {/* ── Early tradition tooltip ──────────────────────────────────────────── */}
      {earlyTip && (
        <div
          style={{
            position: 'fixed',
            top: Math.max(8, earlyTip.y),
            left: Math.min(earlyTip.x, window.innerWidth - 326),
            background: '#1a1510',
            border: '1px solid rgba(200,170,120,.25)',
            borderRadius: 4,
            padding: '10px 14px',
            boxShadow: '0 4px 16px rgba(0,0,0,.65)',
            zIndex: 9999,
            maxWidth: 320,
            color: 'rgba(200,180,150,.85)',
            fontSize: 13,
            lineHeight: 1.55,
            pointerEvents: 'none',
            fontFamily: sharedFont,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4, color: 'rgba(230,215,185,.95)' }}>
            {earlyTip.title} —{' '}
            <span style={{ fontWeight: 400, fontStyle: 'italic', color: 'rgba(200,170,120,.8)' }}>
              {earlyTip.kind === 'tradition' ? 'tradition begins' : 'representative witness'}
            </span>
          </div>
          <div>{earlyTip.body}</div>
        </div>
      )}

      {/* ── SVG ─────────────────────────────────────────────────────────────── */}
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ display: 'block', minWidth: SVG_W }}
        onMouseLeave={() => {
          setTooltip(null);
          setHoveredId(null);
          setEarlyTip(null);
        }}
      >
        <defs>
          {/* Arrowhead for directed influence arcs and pre-witness arrows.
              orient="auto" rotates to match path tangent at the endpoint. */}
          <marker
            id="trad-arrow"
            markerWidth="7" markerHeight="5"
            refX="7" refY="2.5"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0 0 L 7 2.5 L 0 5 Z" fill="rgba(92,58,31,0.50)" />
          </marker>
        </defs>

        {/* ── Year axis (shared vertical line) ────────────────────────────── */}
        <line
          x1={AXIS_X} y1={0} x2={AXIS_X} y2={SVG_H}
          stroke="var(--color-rule-hairline)"
          strokeWidth={0.5}
        />

        {/* Early section ticks (100–1300 AD) */}
        {EARLY_TICK_YEARS.map(year => {
          const y       = yearToY(year);
          const labeled = EARLY_LABEL_YEARS.has(year);
          return (
            <g key={`et-${year}`}>
              <line
                x1={AXIS_X - (labeled ? 10 : 5)} y1={y}
                x2={AXIS_X} y2={y}
                stroke="var(--color-rule-hairline)"
                strokeWidth={labeled ? 0.75 : 0.4}
              />
              {labeled && (
                <text
                  x={AXIS_X - 14} y={y}
                  textAnchor="end" dominantBaseline="middle"
                  style={{
                    fontSize: 11,
                    fill: 'var(--color-ink-muted)',
                    fontFamily: sharedFont,
                  }}
                >
                  {year}
                </text>
              )}
            </g>
          );
        })}

        {/* Genealogy section ticks (1400–2025 AD) */}
        {TICK_YEARS.map(year => {
          const y       = yearToY(year);
          const labeled = LABEL_YEARS.has(year);
          return (
            <g key={`gt-${year}`}>
              <line
                x1={AXIS_X - (labeled ? 10 : 5)} y1={y}
                x2={AXIS_X} y2={y}
                stroke="var(--color-rule-hairline)"
                strokeWidth={labeled ? 0.75 : 0.5}
              />
              {labeled && (
                <text
                  x={AXIS_X - 14} y={y}
                  textAnchor="end" dominantBaseline="middle"
                  style={{
                    fontSize: 13,
                    fill: 'var(--color-ink-muted)',
                    fontFamily: sharedFont,
                  }}
                >
                  {year}
                </text>
              )}
            </g>
          );
        })}

        {/* ── Scale-break indicators — subtle bands at zone-entry points ──── */}
        {SCALE_BREAKS.map(sb => {
          const sy = yearToY(sb.year);
          return (
            <g key={`sb-${sb.year}`}>
              {/* Thin dotted hairline spanning full width */}
              <line
                x1={AXIS_X + 4} y1={sy} x2={SVG_W - 8} y2={sy}
                stroke="rgba(92,58,31,0.15)"
                strokeWidth={0.75}
                strokeDasharray="2 6"
              />
              {/* Label floated to the right, just above the line */}
              <text
                x={SVG_W - 12} y={sy - 5}
                textAnchor="end" dominantBaseline="auto"
                style={{
                  fontSize: 9,
                  fontStyle: 'italic',
                  letterSpacing: '0.04em',
                  fill: 'rgba(92,58,31,0.45)',
                  fontFamily: sharedFont,
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {sb.label}
              </text>
            </g>
          );
        })}

        {/* ── Early section header label ───────────────────────────────────── */}
        <text
          x={SVG_W / 2} y={4}
          textAnchor="middle" dominantBaseline="hanging"
          style={{
            fontSize: 11,
            fill: 'var(--color-ink-muted)',
            fontFamily: sharedFont,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          Tradition Origins · 1st – 14th Century AD
        </text>

        {/* ── Textual-family bands (rendered first, behind everything) ──────── */}
        {EARLY_BANDS.map(band => (
          <g key={`band-${band.labelX}`}>
            <rect
              x={band.x} y={TOP_PAD}
              width={band.width} height={EARLY_H}
              fill="rgba(92,58,31,0.038)"
              stroke="rgba(92,58,31,0.10)"
              strokeWidth={0.5}
              rx={4}
            />
            <text
              x={band.labelX} y={TOP_PAD + 7}
              textAnchor="middle" dominantBaseline="hanging"
              style={{
                fontSize: 8.5,
                fontStyle: 'italic',
                fill: 'var(--color-ink-muted)',
                fontFamily: sharedFont,
                letterSpacing: '0.04em',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              {band.label}
            </text>
            {band.subLabel && (
              <text
                x={band.labelX} y={TOP_PAD + 19}
                textAnchor="middle" dominantBaseline="hanging"
                style={{
                  fontSize: 8,
                  fontStyle: 'italic',
                  fill: 'var(--color-ink-muted)',
                  fontFamily: sharedFont,
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {band.subLabel}
              </text>
            )}
          </g>
        ))}

        {/* ── S-curve connectors — same family-tree branch style as genealogy ── */}
        {EARLY_CONNECTORS.map((conn, i) => {
          const y1   = yearToY(conn.year1);
          const y2   = yearToY(conn.year2);
          const midX = (conn.x1 + conn.x2) / 2;
          const midY = (y1 + y2) / 2;
          const labelStyle = {
            fontFamily: sharedFont,
            fill: 'var(--color-ink-muted)',
            pointerEvents: 'none' as const,
            userSelect: 'none' as const,
          };
          return (
            <g key={`conn-${i}`}>
              <path
                d={earlyConnPath(conn.x1, y1, conn.x2, y2)}
                fill="none"
                stroke={ARC_STROKE}
                strokeWidth={1.25}
                strokeDasharray="5 3"
                markerEnd="url(#trad-arrow)"
              />
              {/* Labels above the curve midpoint — name on top, date just below it */}
              <text
                x={midX} y={midY - 22}
                textAnchor="middle" dominantBaseline="auto"
                style={{ ...labelStyle, fontSize: 9, fontStyle: 'italic' }}
              >
                {conn.label}
              </text>
              <text
                x={midX} y={midY - 10}
                textAnchor="middle" dominantBaseline="auto"
                style={{ ...labelStyle, fontSize: 8 }}
              >
                {conn.displayYear}
              </text>
            </g>
          );
        })}

        {/* ── Tradition columns (early section) ───────────────────────────── */}
        {TRADITIONS.map(t => renderTradition(t))}

        {/* ── Parallel sub-traditions (Bohairic alongside Sahidic) ─────────── */}
        {PARALLEL_TRADITIONS.map((pt, i) => {
          const px  = WITNESS_ANCHOR_X[pt.parentWitnessId] + pt.xOffset;
          const sy  = yearToY(pt.startYear);
          const cy  = yearToY(pt.cardYear);
          const ct  = cy - EARLY_NODE_H / 2;
          const cb  = cy + EARLY_NODE_H / 2;
          return (
            <g key={`ptrad-${i}`}>
              {/* Faint guide above the parallel tradition origin */}
              <line
                x1={px} y1={TOP_PAD} x2={px} y2={sy - 6}
                stroke={GUIDE_STROKE} strokeWidth={1} strokeDasharray="2 5"
              />
              {/* Diamond at tradition-origin year */}
              <polygon
                points={`${px},${sy - 5} ${px + 5},${sy} ${px},${sy + 5} ${px - 5},${sy}`}
                fill={PRE_W_STROKE} opacity={0.9}
              />
              {/* Dashed guide from origin to card */}
              <line
                x1={px} y1={sy + 6} x2={px} y2={ct - 2}
                stroke={PRE_W_STROKE} strokeWidth={1} strokeDasharray="3 4"
              />
              {/* Named witness card */}
              <rect
                x={px - EARLY_NODE_W / 2} y={ct}
                width={EARLY_NODE_W} height={EARLY_NODE_H}
                rx={3}
                fill="var(--color-bg-elevated)" stroke={W_STROKE} strokeWidth={1.25}
              />
              <text
                x={px} y={cy - 6}
                textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 12, fontWeight: 700, fontFamily: sharedFont,
                  fill: 'var(--color-ink-primary)', pointerEvents: 'none', userSelect: 'none' }}
              >
                {pt.cardLabel}
              </text>
              <text
                x={px} y={cy + 7}
                textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 10, fontFamily: sharedFont,
                  fill: 'var(--color-ink-muted)', pointerEvents: 'none', userSelect: 'none' }}
              >
                {pt.cardSubLabel}
              </text>
              {/* Solid continuation line to section break */}
              <line
                x1={px} y1={cb + 1} x2={px} y2={DIVIDER_Y}
                stroke={W_STROKE} strokeWidth={2.5} strokeLinecap="round"
              />
              {/* Short continuation arrow below section break — Bohairic persists as Coptic church standard */}
              <line
                x1={px} y1={DIVIDER_Y} x2={px} y2={DIVIDER_Y + 24}
                stroke={W_STROKE} strokeWidth={1.5} strokeDasharray="3 3" strokeLinecap="round"
              />
              <text
                x={px + 6} y={DIVIDER_Y + 26}
                textAnchor="start" dominantBaseline="hanging"
                style={{
                  fontSize: 8.5, fontStyle: 'italic',
                  fill: 'var(--color-ink-muted)', fontFamily: sharedFont,
                  pointerEvents: 'none', userSelect: 'none',
                }}
              >
                continues in Coptic liturgical tradition
              </text>
            </g>
          );
        })}

        {/* ── Lane activity markers (500–1350 AD) ─────────────────────────── */}
        {LANE_ACTIVITIES.map((act, i) => {
          const ax   = WITNESS_ANCHOR_X[act.witnessId];
          const ay   = yearToY(act.year);
          // branch stubs extend only to one side (side revision visual)
          const branchLen = 20;
          const tickX1 = act.branch
            ? (act.side === 'right' ? ax : ax - branchLen)
            : ax - 5;
          const tickX2 = act.branch
            ? (act.side === 'right' ? ax + branchLen : ax)
            : ax + 5;
          const tx   = act.branch
            ? (act.side === 'right' ? ax + branchLen + 4 : ax - branchLen - 4)
            : (act.side === 'right' ? ax + 8 : ax - 8);
          const anch = act.side === 'right' ? 'start' : 'end';
          const lineH = 11;
          const offset = -(act.lines.length - 1) * lineH / 2;
          return (
            <g key={`lact-${i}`}>
              <line
                x1={tickX1} y1={ay} x2={tickX2} y2={ay}
                stroke={PRE_W_STROKE} strokeWidth={act.branch ? 1 : 0.75}
                strokeDasharray={act.branch ? undefined : undefined}
              />
              {act.lines.map((ln, li) => (
                <text
                  key={li}
                  x={tx} y={ay + offset + li * lineH}
                  textAnchor={anch} dominantBaseline="middle"
                  style={{
                    fontSize: 8.5,
                    fontStyle: 'italic',
                    fill: 'var(--color-ink-muted)',
                    fontFamily: sharedFont,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  {ln}
                </text>
              ))}
            </g>
          );
        })}

        {/* ── Named institutional event cards — pre-1350 full render; post-1350 guide only ── */}
        {/* Post-1350 card rects are rendered LAST (after genealogy connector lines) so they   */}
        {/* sit on top. Only the guide line is drawn here for post-1350 events.                */}
        {TRADITION_EVENTS.map((ev, i) => {
          const ex  = WITNESS_ANCHOR_X[ev.witnessId];
          const ey  = yearToY(ev.year);
          const top = ey - EARLY_NODE_H / 2;
          const bot = ey + EARLY_NODE_H / 2;
          if (ev.year > EARLY_END) {
            // Guide line only — card rect rendered at end of SVG
            return (
              <line key={`ev-guide-${i}`}
                x1={ex} y1={DIVIDER_Y} x2={ex} y2={top - 2}
                stroke={GUIDE_STROKE} strokeWidth={1} strokeDasharray="2 5"
              />
            );
          }
          return (
            <g key={`ev-${i}`}>
              <rect
                x={ex - EARLY_NODE_W / 2} y={top}
                width={EARLY_NODE_W} height={EARLY_NODE_H}
                rx={3} fill="var(--color-bg-elevated)" stroke={W_STROKE} strokeWidth={1.25}
              />
              <text x={ex} y={top + (bot - top) / 2 - 6}
                textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 11, fontWeight: 700, fontFamily: sharedFont,
                  fill: 'var(--color-ink-primary)', pointerEvents: 'none', userSelect: 'none' }}>
                {ev.label}
              </text>
              <text x={ex} y={top + (bot - top) / 2 + 7}
                textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 9, fontFamily: sharedFont,
                  fill: 'var(--color-ink-muted)', pointerEvents: 'none', userSelect: 'none' }}>
                {ev.subLabel}
              </text>
            </g>
          );
        })}

        {/* ── Section divider at 1350 AD ───────────────────────────────────── */}
        <line
          x1={50} y1={DIVIDER_Y} x2={SVG_W - 50} y2={DIVIDER_Y}
          stroke="var(--color-rule-hairline)"
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />
        <text
          x={SVG_W / 2 - 8} y={DIVIDER_Y - 7}
          textAnchor="end" dominantBaseline="auto"
          style={{
            fontSize: 11,
            fill: 'var(--color-ink-muted)',
            fontFamily: sharedFont,
            letterSpacing: '0.08em',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          Translation Genealogy
        </text>
        <text
          x={SVG_W / 2 + 8} y={DIVIDER_Y - 7}
          textAnchor="start" dominantBaseline="auto"
          style={{
            fontSize: 11,
            fill: 'var(--color-ink-muted)',
            fontFamily: sharedFont,
            letterSpacing: '0.08em',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          1350 CE to Present
        </text>

        {/* ── Textus Receptus tradition band (behind genealogy nodes) ─────── */}
        {(() => {
          const yTop  = yearToY(1516) - NODE_H / 2 - 6;
          const yBot  = yearToY(1633) + NODE_H / 2 + 6;
          const midY  = (yTop + yBot) / 2;
          const bandX = 1404;
          const bandW = 46;
          return (
            <g>
              <rect
                x={bandX} y={yTop} width={bandW} height={yBot - yTop}
                fill="rgba(92,58,31,0.055)" rx={4}
              />
              <line
                x1={bandX} y1={yTop} x2={bandX} y2={yBot}
                stroke="rgba(92,58,31,0.20)" strokeWidth={0.75} strokeDasharray="4 3"
              />
              <text
                x={bandX + bandW / 2} y={midY}
                textAnchor="middle" dominantBaseline="middle"
                transform={`rotate(-90,${bandX + bandW / 2},${midY})`}
                style={{
                  fontSize: 11,
                  fill: 'var(--color-ink-muted)',
                  fontFamily: sharedFont,
                  letterSpacing: '0.07em',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                Textus Receptus Tradition
              </text>
            </g>
          );
        })()}

        {/* ── Textual evidence flows (Coptic + Bezae → critical editions) ─── */}
        {TEXTUAL_EVIDENCE_FLOWS.map(flow => {
          const px         = WITNESS_ANCHOR_X[flow.witnessId];
          const targetNode = NODES.find(n => n.id === flow.targetNodeId);
          if (!targetNode) return null;
          const cx  = NODE_X[flow.targetNodeId];
          const cy  = yearToY(targetNode.date);
          const y2  = cy - NODE_H / 2;
          const mid = (DIVIDER_Y + y2) / 2;
          const d   = `M ${px} ${DIVIDER_Y} C ${px} ${mid}, ${cx} ${mid}, ${cx} ${y2}`;
          const lx  = flow.labelSide === 'right' ? px + 8 : px - 8;
          const ta  = flow.labelSide === 'right' ? 'start' : 'end';
          return (
            <g key={`ev-flow-${flow.witnessId}`}>
              <path
                d={d}
                stroke="rgba(92,58,31,0.22)"
                strokeWidth={1}
                strokeDasharray="3 6"
                fill="none"
                strokeLinecap="round"
              />
              {flow.labelLines.map((line, i) => (
                <text
                  key={i}
                  x={lx} y={DIVIDER_Y + 18 + i * 11}
                  textAnchor={ta}
                  style={{
                    fontSize: 8.5,
                    fontStyle: 'italic',
                    fill: 'var(--color-ink-muted)',
                    fontFamily: sharedFont,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}

        {/* ── Connector lines (genealogy section, rendered beneath nodes) ──── */}
        {RENDERED_NODES.flatMap(node => {
          const cx      = NODE_X[node.id] ?? SVG_W / 2;
          const cy      = yearToY(node.date);
          const parents = getDisplayParents(node);

          return parents.map((parentId, idx) => {
            const isWitness = WITNESS_IDS.has(parentId);
            const isPrimary = idx === 0;
            const px        = nodeAnchorX(parentId);

            let py: number;
            if (isWitness) {
              // Witness lines start at the section divider (1350 AD mark),
              // connecting the tradition-origin columns above to their
              // first translation descendant below.
              py = DIVIDER_Y;
            } else {
              const parent = NODE_MAP.get(parentId);
              if (!parent) return null;
              if (parent.date > node.date) return null;
              py = yearToY(parent.date) + NODE_H / 2;
            }

            return (
              <path
                key={`${node.id}→${parentId}`}
                d={connectorPath(px, py, cx, cy)}
                stroke={isWitness ? 'rgba(92,58,31,0.50)' : 'var(--color-rule-hairline)'}
                strokeWidth={
                  isWitness
                    ? (isPrimary ? 2.5 : 1.5)
                    : (isPrimary ? 2.0 : 0.75)
                }
                strokeDasharray={isPrimary ? undefined : '5 4'}
                fill="none"
                strokeLinecap="round"
              />
            );
          }).filter(Boolean);
        })}

        {/* ── Translation nodes ────────────────────────────────────────────── */}
        {RENDERED_NODES.map(node => {
          const cx            = NODE_X[node.id] ?? SVG_W / 2;
          const cy            = yearToY(node.date);
          const w             = nodeW(node.tradition);
          const isHovered     = hoveredId === node.id;
          const isHighlighted = highlightedId === node.id;

          const fill = isHighlighted
            ? 'var(--color-accent-gold)'
            : isHovered
            ? 'var(--color-accent-gold-soft)'
            : 'var(--color-bg-elevated)';

          const { name, year } = splitLabel(node.shortName, node.date);

          return (
            <g
              key={node.id}
              style={{ cursor: 'pointer' }}
              onMouseEnter={e => handleNodeEnter(e, node)}
              onMouseMove={e  => handleNodeMove(e, node)}
              onMouseLeave={handleNodeLeave}
              onClick={() => handleNodeClick(node)}
            >
              <rect
                x={cx - w / 2} y={cy - NODE_H / 2}
                width={w} height={NODE_H}
                rx={3}
                style={{
                  fill,
                  stroke: 'var(--color-rule-hairline)',
                  strokeWidth: 1,
                  transition: 'fill 0.15s ease',
                }}
              />
              <text
                x={cx} y={cy - 6}
                textAnchor="middle" dominantBaseline="middle"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: sharedFont,
                  fill: 'var(--color-ink-primary)',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  transition: 'fill 0.15s ease',
                }}
              >
                {name}
              </text>
              <text
                x={cx} y={cy + 7}
                textAnchor="middle" dominantBaseline="middle"
                style={{
                  fontSize: 9,
                  fontWeight: 400,
                  fontFamily: sharedFont,
                  fill: 'var(--color-ink-muted)',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {year}
              </text>
            </g>
          );
        })}

        {/* ── Legend (positioned at top of genealogy section) ──────────────── */}
        {(() => {
          const lx = 55;
          const ly = DIVIDER_Y + 28;
          const lw = 210;
          const lh = 184;
          const font = {
            fontSize: 10,
            fill: 'var(--color-ink-muted)',
            fontFamily: sharedFont,
            pointerEvents: 'none' as const,
            userSelect: 'none' as const,
          };
          // rows spaced 18 px apart, starting at y=46
          const rows: Array<{
            y: number; label: string;
            fade?: boolean; dash?: boolean; witness?: boolean; band?: boolean; diamond?: boolean;
          }> = [
            { y: 46,  label: 'Tradition beginning',   diamond: true },
            { y: 64,  label: 'Tradition stream',       witness: true },
            { y: 82,  label: 'Fading tradition',       fade: true },
            { y: 100, label: 'Pre-witness period',     dash: true, witness: false },
            { y: 118, label: 'Translation / revision' },
            { y: 136, label: 'Textual influence',      dash: true },
            { y: 156, label: 'Edition tradition',      band: true },
          ];
          return (
            <g>
              <rect
                x={lx} y={ly} width={lw} height={lh}
                fill="var(--color-bg-elevated)"
                stroke="var(--color-rule-hairline)"
                strokeWidth={0.75}
                rx={3}
              />
              <text x={lx + 10} y={ly + 22}
                style={{ ...font, fontSize: 11, fontWeight: 700, fill: 'var(--color-ink-primary)' }}>
                Line key
              </text>
              {rows.map(({ y, label, fade, dash, witness, band, diamond }) => (
                <g key={label}>
                  {band ? (
                    <rect x={lx + 10} y={ly + y - 6} width={40} height={12}
                      fill="rgba(92,58,31,0.08)" rx={2} />
                  ) : diamond ? (
                    <polygon
                      points={`${lx + 30},${ly + y - 6} ${lx + 36},${ly + y} ${lx + 30},${ly + y + 6} ${lx + 24},${ly + y}`}
                      fill={W_STROKE}
                    />
                  ) : fade ? (
                    <line
                      x1={lx + 10} y1={ly + y} x2={lx + 50} y2={ly + y}
                      stroke={PRE_W_STROKE} strokeWidth={1.5} strokeDasharray="4 3"
                    />
                  ) : (
                    <line
                      x1={lx + 10} y1={ly + y} x2={lx + 50} y2={ly + y}
                      stroke={witness === true ? W_STROKE : 'var(--color-rule-hairline)'}
                      strokeWidth={witness === true ? 2.5 : dash ? 0.75 : 1.5}
                      strokeDasharray={dash ? (witness === false ? '4 3' : '5 4') : undefined}
                    />
                  )}
                  <text x={lx + 58} y={ly + y + 4} style={font}>{label}</text>
                </g>
              ))}
            </g>
          );
        })()}

        {/* ── Post-1350 tradition event cards — rendered last, on top of all genealogy lines ── */}
        {TRADITION_EVENTS.filter(ev => ev.year > EARLY_END).map((ev, i) => {
          const ex  = WITNESS_ANCHOR_X[ev.witnessId];
          const ey  = yearToY(ev.year);
          const top = ey - EARLY_NODE_H / 2;
          const bot = ey + EARLY_NODE_H / 2;
          return (
            <g key={`ev-late-${i}`}>
              <rect
                x={ex - EARLY_NODE_W / 2} y={top}
                width={EARLY_NODE_W} height={EARLY_NODE_H}
                rx={3} fill="var(--color-bg-elevated)" stroke={W_STROKE} strokeWidth={1.25}
              />
              <text x={ex} y={top + (bot - top) / 2 - 6}
                textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 11, fontWeight: 700, fontFamily: sharedFont,
                  fill: 'var(--color-ink-primary)', pointerEvents: 'none', userSelect: 'none' }}>
                {ev.label}
              </text>
              <text x={ex} y={top + (bot - top) / 2 + 7}
                textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 9, fontFamily: sharedFont,
                  fill: 'var(--color-ink-muted)', pointerEvents: 'none', userSelect: 'none' }}>
                {ev.subLabel}
              </text>
            </g>
          );
        })}

      </svg>
    </div>
  );
}
