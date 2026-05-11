# Translation Lineage Timeline

A vertical chronological SVG timeline showing the descent of the Bible from six manuscript witnesses through major critical editions to canonical English translations. Mounted beneath the alignment table on every verse page.

## Data model

Source: `/data/lineage/translations.json` — an array of 25 `TranslationNode` objects.

```typescript
interface TranslationNode {
  id: string;          // kebab-case, stable across edits
  name: string;        // Full display name
  shortName: string;   // Short label that fits in the SVG node box (≤ 18 chars)
  date: number;        // Primary date (year CE) — used for vertical positioning
  dateRange: string;   // Human-readable range, e.g. "1382–1395"
  language: string;    // "Greek", "Latin", "Syriac", "English"
  tradition: string;   // "Manuscript witness" | "Critical/Academic" | "Protestant" | "Catholic"
  parents: string[];   // IDs of parent nodes; first element = primary lineage
  primarySource: string; // One-sentence source description shown in tooltip
  description: string; // One-sentence historical characterisation shown in tooltip
}
```

### `tradition` field

Controls node visual hierarchy:
- `"Manuscript witness"` → larger node (148×34 px), heavier stroke, 12px text
- `"Critical/Academic"` → medium node (132×28 px), hairline stroke, 10px text
- `"Protestant"` / `"Catholic"` / `"Orthodox"` → smaller node (118×26 px), hairline stroke, 10px text

### `parents` array

- First element: primary lineage — rendered as a solid 1.5px bezier curve
- Subsequent elements: secondary influence — rendered as dashed 0.75px curves
- Empty array `[]` for the six manuscript witnesses (root nodes)

## Node selection rationale

**25 nodes total** — 6 witnesses, 9 critical editions, 10 English translations.

Dropped from the spec's initial 30-node list (to reduce post-1960 density):
- `coverdale-1535` — stepping stone; Tyndale and Geneva descriptions note the lineage
- `bishops-bible-1568` — KJV description covers its role
- `american-standard-1901` — RSV description notes descent via ASV
- `new-american-standard-1971` — parallel track; less canonical for the main lineage
- `christian-standard-2017` — least essential for the core lineage story

## Key historical notes

### KJV and the Textus Receptus
The Elzevir Textus Receptus (1633) **postdates** the KJV (1611) — it cannot be a KJV parent. The KJV's Greek base was Beza (1598) and Stephanus (1550–1559). The data uses `stephanus-1550` as KJV's Greek parent. The `textus-receptus-elzevir` node is correctly a child of Stephanus and a parent of the NKJV (1982).

### Douay-Rheims and the Clementine Vulgate
The DR NT (1582) predates the Clementine Vulgate (1592), so the connection is anachronistic for the NT portion. However, the complete DR Bible (OT 1609–1610) postdates the Clementine, and the line represents the shared Catholic Latin Vulgate reform tradition. The description notes this. If strict chronological accuracy is needed in a future revision, change DR's parent to `vulgate-jerome`.

### Nestle-Aland date
The `nestle-aland-28` node uses `date: 1898` (Eberhard Nestle's first edition) so that RSV (1952) and NIV (1978), which used earlier NA editions, correctly appear as descendants rather than as temporal ancestors. The `dateRange` field reads "1898–2012 (NA28)".

## Component

**`/components/LineageTimeline.tsx`** — `'use client'` directive (requires `useState` for hover tooltip and click highlight).

### Time scale
Piecewise linear mapping from year → SVG pixel, with denser spacing in the 1516–1650 Reformation cluster and the 1880–2020 modern cluster. Compressed spacing in the 500–1380 medieval gap (no nodes).

```
[100→50px] [500→300px] [1380→430px] [1520→600px]
[1650→880px] [1880→955px] [1960→1200px] [2020→1650px]
```

### Horizontal lanes
Six named tradition columns. Nodes are assigned to lanes by textual tradition; nodes at the same date in the same lane are offset by a second lane to avoid overlap.

| Lane | x    | Content |
|------|------|---------|
| 0    | 150  | Alexandrian witnesses + Westcott-Hort |
| 1    | 235  | Sinaiticus + Nestle-Aland tradition |
| 2    | 315  | Byzantine + TR tradition |
| 3    | 395  | Robinson-Pierpont |
| 4    | 490  | Latin tradition (Vulgate) |
| 5    | 570  | Stuttgart Vulgate |
| 6    | 650  | Syriac tradition |
| 7    | 820  | Protestant English main stream |
| 8    | 900  | Protestant English secondary stream |
| 9    | 985  | Catholic English + NIV |

### Interactions
- **Hover**: node fills `--color-accent-gold-soft`; tooltip appears (fixed-positioned, matching `HoverTooltip.tsx` styling)
- **Click**: node flashes `--color-accent-gold` for 900ms; page smooth-scrolls so the node is vertically centred in the viewport

### Mobile / narrow viewports
Below 1024px the outer `<div>` has `overflow-x: auto`; the SVG has `minWidth: 900px`. This produces horizontal scroll — simpler than collapsing to a vertical list and avoids hiding the bezier curves.

## Adding nodes

1. Add the node object to `/data/lineage/translations.json`
2. Add an entry to `NODE_X` in `LineageTimeline.tsx` with the SVG x-coordinate
3. Run `npx tsc --noEmit` to verify types
4. Check that the new node's y-position (from `yearToY(date)`) doesn't overlap neighbours in the same lane; adjust the piecewise `SCALE` or the node's `x` if needed
