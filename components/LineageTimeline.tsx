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

// ── Witnesses ─────────────────────────────────────────────────────────────────
//
// Not rendered as SVG boxes — the alignment table column headers above ARE the
// top of the timeline. Connector lines for witness parents start at y = 0 (the
// SVG top edge) at the centre of the corresponding alignment-table column.
const WITNESS_IDS = new Set([
  'earliest-papyri', 'vaticanus', 'sinaiticus',
  'vulgate-jerome', 'peshitta', 'byzantine-textform',
]);

// ── Coordinate system ─────────────────────────────────────────────────────────
//
// SVG_W = 1440 matches the alignment table's min-w-[1440px].
// Witness anchor x = centre of each 1/6 column (2i+1)/12 × 1440.
//
// EARLIEST = 1350: the witness era (100–900 CE) is already represented by the
// column headers above; starting the Y-axis here removes the empty dead zone.
// SVG_H = 4000 gives ≈ 5.93 px/year, which provides 17 px of clear vertical
// space between adjacent Reformation-era nodes (e.g. Erasmus 1516 / Tyndale
// 1526, only 10 years apart with 42 px-tall boxes: 59 px gap − 42 px = 17 px).
const SVG_W    = 1440;
const SVG_H    = 4400;
const AXIS_X   = 38;
const EARLIEST = 1350;
const LATEST   = 2030;

// Each witness column is 240px (1440 ÷ 6). Sub-columns: source text 45% (108px)
// | dot 10% | English gloss 45%. Anchor = centre of source text = col_left + 54.
const WITNESS_ANCHOR_X: Record<string, number> = {
  'earliest-papyri':     54,   //    0 + 54
  'vaticanus':          294,   //  240 + 54
  'sinaiticus':         534,   //  480 + 54
  'vulgate-jerome':     774,   //  720 + 54
  'peshitta':          1014,   //  960 + 54
  'byzantine-textform': 1254,  // 1200 + 54
};

// Non-witness horizontal lanes.
//   Left  (x < 720): Alexandrian / eclectic-text tradition.
//   Centre (x 720–1000): Latin tradition + KJV synthesis zone.
//   Right  (x > 1100): Byzantine / TR tradition.
//   Syriac (x = 1014): Peshitta source-text column — BFBS spine runs here.
//     KJV is placed at x = 920 (right edge 999 < 1014) and
//     NKJV at x = 1160 (left edge 1081 > 1014) so the BFBS spine
//     passes cleanly between them without obscuring either label.
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
  'wycliffe-1382':              840,
  'clementine-vulgate':         780,
  'douay-rheims-1582-1610':     785,
  'challoner-1749':             730,
  'jerusalem-bible-1966':       820,
  'nabre-2011':                 860,
  'stuttgart-vulgate':         1000,
  // Syriac tradition — aligned with peshitta source-text anchor (1014)
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

function yearToY(year: number): number {
  return ((year - EARLIEST) / (LATEST - EARLIEST)) * SVG_H;
}

function nodeAnchorX(id: string): number {
  return WITNESS_ANCHOR_X[id] ?? NODE_X[id] ?? SVG_W / 2;
}

// All rendered nodes use the same height; Critical/Academic nodes are slightly
// wider to fit longer names like "Westcott-Hort 1881".
const NODE_H = 42;
function nodeW(tradition: string): number {
  return tradition === 'Critical/Academic' ? 170 : 158;
}

function connectorPath(
  px: number, py: number,
  cx: number, cy: number,
): string {
  const y2  = cy - NODE_H / 2;
  const mid = (py + y2) / 2;
  return `M ${px} ${py} C ${px} ${mid}, ${cx} ${mid}, ${cx} ${y2}`;
}

// Split a shortName into display name + year for the two-line label.
// "Erasmus 1516" → { name: "Erasmus", year: "1516" }
// "Nestle-Aland" → { name: "Nestle-Aland", year: "1898" } (falls back to node.date)
function splitLabel(shortName: string, date: number): { name: string; year: string } {
  const m = shortName.match(/^(.+?)\s(\d{4})$/);
  return m ? { name: m[1], year: m[2] } : { name: shortName, year: String(date) };
}

const RENDERED_NODES = NODES.filter(n => !WITNESS_IDS.has(n.id));

const TICK_YEARS: number[] = [];
for (let y = 1400; y <= 2025; y += 50) TICK_YEARS.push(y);
const LABEL_YEARS = new Set([1400, 1500, 1600, 1700, 1800, 1900, 2000, 2025]);

export function LineageTimeline() {
  const [tooltip, setTooltip] = useState<{
    node: TranslationNode;
    x: number;
    y: number;
  } | null>(null);

  const [hoveredId, setHoveredId]         = useState<string | null>(null);
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
  function handleNodeLeave() {
    setHoveredId(null);
    setTooltip(null);
  }
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

  return (
    <div className="overflow-x-auto" style={{ position: 'relative' }}>

      {/* ── Chart title ────────────────────────────────────────────────────── */}
      <div style={{
        textAlign: 'center',
        padding: '14px 24px 10px',
        minWidth: SVG_W,
      }}>
        <div style={{
          fontFamily: 'EB Garamond, Georgia, serif',
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--color-ink-primary)',
          letterSpacing: '0.01em',
          lineHeight: 1.25,
        }}>
          Trace Your New Testament Back to the Gospel Sources
        </div>
        <div style={{
          fontFamily: 'EB Garamond, Georgia, serif',
          fontSize: 13,
          fontStyle: 'italic',
          color: 'var(--color-ink-muted)',
          marginTop: 5,
        }}>
          See how the Four Gospels in the Bible you read today connect to the Greek, Latin, Syriac, and Byzantine witnesses shown above.
        </div>
      </div>

      {/* ── Tooltip ────────────────────────────────────────────────────────── */}
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
            fontFamily: 'EB Garamond, Georgia, serif',
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

      {/* ── SVG ────────────────────────────────────────────────────────────── */}
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ display: 'block', minWidth: SVG_W }}
        onMouseLeave={() => { setTooltip(null); setHoveredId(null); }}
      >

        {/* ── Year axis ──────────────────────────────────────────────────── */}
        <line
          x1={AXIS_X} y1={0} x2={AXIS_X} y2={SVG_H}
          stroke="var(--color-rule-hairline)"
          strokeWidth={0.5}
        />
        {TICK_YEARS.map(year => {
          const y       = yearToY(year);
          const labeled = LABEL_YEARS.has(year);
          return (
            <g key={year}>
              <line
                x1={AXIS_X - (labeled ? 10 : 5)} y1={y}
                x2={AXIS_X}                        y2={y}
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
                    fontFamily: 'EB Garamond, Georgia, serif',
                  }}
                >
                  {year}
                </text>
              )}
            </g>
          );
        })}

        {/* ── Textus Receptus tradition band (behind everything) ─────────── */}
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
                  fontFamily: 'EB Garamond, Georgia, serif',
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

        {/* ── Connector lines (rendered beneath nodes) ───────────────────── */}
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
              py = 0;
            } else {
              const parent = NODE_MAP.get(parentId);
              if (!parent) return null;
              if (parent.date > node.date) return null; // skip anachronistic arcs
              py = yearToY(parent.date) + NODE_H / 2;
            }

            return (
              <path
                key={`${node.id}→${parentId}`}
                d={connectorPath(px, py, cx, cy)}
                stroke={
                  isWitness
                    ? 'rgba(92,58,31,0.50)'
                    : 'var(--color-rule-hairline)'
                }
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

        {/* ── Nodes ──────────────────────────────────────────────────────── */}
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

          const mainTextFill = isHighlighted
            ? 'var(--color-ink-primary)'
            : 'var(--color-ink-primary)';

          const yearTextFill = isHighlighted
            ? 'var(--color-ink-secondary)'
            : 'var(--color-ink-muted)';

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
              {/* Two-line label: name top-aligned (bold) + year below.
                  Name sits just inside the incoming connector line so the
                  line reads as arriving directly at the source's name. */}
              <text
                x={cx} y={cy - 11}
                textAnchor="middle" dominantBaseline="middle"
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: 'EB Garamond, Georgia, serif',
                  fill: mainTextFill,
                  pointerEvents: 'none',
                  userSelect: 'none',
                  transition: 'fill 0.15s ease',
                }}
              >
                {name}
              </text>
              <text
                x={cx} y={cy + 6}
                textAnchor="middle" dominantBaseline="middle"
                style={{
                  fontSize: 10,
                  fontWeight: 400,
                  fontFamily: 'EB Garamond, Georgia, serif',
                  fill: yearTextFill,
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {year}
              </text>
            </g>
          );
        })}

        {/* ── Legend ─────────────────────────────────────────────────────── */}
        {(() => {
          const lx = 55;  // left of legend box
          const ly = 28;
          const lw = 210;
          const lh = 128;
          const font = {
            fontSize: 10,
            fill: 'var(--color-ink-muted)',
            fontFamily: 'EB Garamond, Georgia, serif',
            pointerEvents: 'none' as const,
            userSelect: 'none' as const,
          };
          const rows: Array<{ y: number; label: string; dash?: boolean; witness?: boolean; band?: boolean }> = [
            { y: 62,  label: 'Manuscript tradition',   witness: true },
            { y: 84,  label: 'Translation / revision' },
            { y: 106, label: 'Textual influence',      dash: true },
            { y: 122, label: 'Edition tradition',      band: true },
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
              <text x={lx + 10} y={ly + 20}
                style={{ ...font, fontSize: 11, fontWeight: 700, fill: 'var(--color-ink-primary)' }}>
                Line key
              </text>
              {rows.map(({ y, label, dash, witness, band }) => (
                <g key={label}>
                  {band ? (
                    <rect x={lx + 10} y={y - 6} width={40} height={12}
                      fill="rgba(92,58,31,0.08)" rx={2} />
                  ) : (
                    <line
                      x1={lx + 10} y1={y} x2={lx + 50} y2={y}
                      stroke={witness ? 'rgba(92,58,31,0.50)' : 'var(--color-rule-hairline)'}
                      strokeWidth={witness ? 2.5 : dash ? 0.75 : 1.5}
                      strokeDasharray={dash ? '5 4' : undefined}
                    />
                  )}
                  <text x={lx + 58} y={y + 4} style={font}>{label}</text>
                </g>
              ))}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
