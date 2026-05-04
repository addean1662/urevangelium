# Urevangelium Design System

## Visual posture

Urevangelium's palette is anchored to six theologically-loaded elements. Linen is the page where reading happens — the working cream surface, slightly cooler and more cloth-like than warm paper-cream. Wood holds the witness header bands — every column is a wooden frame around its manuscript witness, the way a codex is bound. Iron is the weight of the ink — primary text in iron-darkened black, secondary text in cooler iron-slate. Thorns mute the tertiary register — metadata, captions, what should whisper. Blood marks what is missing and what was shed — the lacuna dots in the Earliest Papyrus column carry blood-red. Resurrection is the elevated surface — dawn-light cream for hover and highlighted states, the lift of attention. Gold persists as the rare accent metal — used sparingly, the way gold is used sparingly in any honest scriptorium.

The page has three structural depths of wood. The site header is deepest wood (`--color-band`, `#3D2817`) — the spine of the codex, the outermost binding. The witness column headers are lighter walnut (`--color-witness-band`, `#5C3A1F`) — the chapter frames inside the binding, one shade lifted so the eye moves from spine to section to text. The body is linen (`--color-bg-page`, `#EFE8DA`) — the working surface where the words live.

## Color Tokens

All tokens are defined as `@theme` custom properties in `app/globals.css` and exposed as Tailwind utilities via `--color-*` prefix.

### Page surfaces
| Token | Value | Element | Tailwind class |
|---|---|---|---|
| `--color-bg-page` | `#EFE8DA` | Linen | `bg-bg-page` / `text-bg-page` |
| `--color-bg-elevated` | `#FAF6E8` | Resurrection, dawn-light | `bg-bg-elevated` |

### Header bands
| Token | Value | Element | Tailwind class |
|---|---|---|---|
| `--color-band` | `#3D2817` | Wood — deepest, site header spine | `bg-band` / `text-band` |
| `--color-band-elevated` | `#5C3A1F` | Warmer wood — band hover state | `bg-band-elevated` |
| `--color-witness-band` | `#5C3A1F` | Lighter walnut — witness column header rows | `bg-witness-band` |

### Ink scale
| Token | Value | Element | Usage |
|---|---|---|---|
| `--color-ink-primary` | `#1F1A14` | Iron-darkened ink | Body text, labels |
| `--color-ink-secondary` | `#4D5560` | Iron | Subtitles, nav labels |
| `--color-ink-muted` | `#796A4D` | Thorns | Disabled, placeholders, gap dashes |
| `--color-ink-on-band` | `#EFE8DA` | Linen on wood | Text on header bands |
| `--color-ink-on-band-muted` | `#C8B89A` | Faded linen on wood — lifted for legibility | Dates, secondary text on bands |

### Accents
| Token | Value | Element | Usage |
|---|---|---|---|
| `--color-accent-gold` | `#B8893A` | Gold | Deviation badges, highlights |
| `--color-accent-gold-soft` | `#D4A85A` | Lighter gold | Hover accents |

### Semantic state
| Token | Value | Element | Usage |
|---|---|---|---|
| `--color-semantic-extant` | `#6B8C45` | Lifted olive-leaf green | Papyrus extant dot |
| `--color-semantic-lacuna` | `#6B1717` | Blood, deepened | Lacuna dot, LostDots characters |

### Script language tints (Chronology page)
| Token | Value | Element | Language |
|---|---|---|---|
| `--color-lang-greek` | `#B8893A` | Gold | Greek witnesses |
| `--color-lang-latin` | `#8B4423` | Terracotta-toward-wood | Latin (Vulgate) |
| `--color-lang-syriac` | `#4D5560` | Iron | Syriac (Peshitta) |
| `--color-lang-context` | `#796A4D` | Thorns | Contextual annotations |

### Borders and rules
| Token | Value | Element | Usage |
|---|---|---|---|
| `--color-rule-hairline` | `#C4B89E` | Linen-toned | Cell borders, subtle dividers |
| `--color-rule-strong` | `#3D2817` | Wood | Section dividers (= band color) |

## Typography

All fonts are served from `/public/fonts/` via `@font-face` in `globals.css`.

| Token | Stack | Usage |
|---|---|---|
| `--font-ui` | EB Garamond, Georgia, serif | Body, UI chrome, gloss text |
| `--font-greek` | Cardo, EB Garamond, serif | Greek witness columns |
| `--font-latin` | EB Garamond, Cardo, serif | Latin witness column |
| `--font-syriac` | EstrangeloEdessa-BM, Estrangelo Edessa, serif | Syriac witness column |

### EB Garamond weights
- 400 Regular + Italic — body, glosses
- 600 SemiBold — UI labels
- 700 Bold — section headings

### Cardo
- 400 Regular + Italic (greek-ext, greek, latin subsets)
- Greek Extended range required for polytonic Greek

### EstrangeloEdessa-BM
Beth Mardutho OFL Estrangela Edessa. File (`EstrangeloEdessa-BM.woff2`) requires separate download from Beth Mardutho; falls back to system `Estrangelo Edessa` if absent. See `/public/fonts/LICENSES.md`.

## Utility classes

Defined in `globals.css` base styles:

```css
.font-greek  { font-family: var(--font-greek); }
.font-latin  { font-family: var(--font-latin); }
.font-syriac { font-family: var(--font-syriac); }
```

## Site header

The site header (`components/SiteHeader.tsx`) uses `bg-band` (deepest wood, `#3D2817`) and spans the full viewport width. It carries two elements:

- **Left — wordmark group**: "Urevangelium" as `<h1>` at `text-lg font-semibold`, with a small italic subtitle directly beneath it: "ur-eh-van-GAY-lee-um · the original Gospel" at `text-[11px]` in `text-ink-on-band-muted`. The subtitle is for first-time visitors — pronunciation guide and one-word translation of the project name.
- **Right — tagline**: "The Gospels across their earliest witnesses, and the tradition they carried forward" in `text-sm text-ink-on-band-muted`. This is the canonical project tagline.

The alignment table is full-bleed by design — the data requires the horizontal space. No max-width or side padding is applied to the content wrapper.

## Column pair tinting

Alternating witness columns (Vaticanus, Vulgate, Byzantine) use `rgba(250,246,232,0.8)` as `backgroundColor` on `<col>` elements. This value approximates `--color-bg-elevated` (`#FAF6E8`) at 80% opacity over `--color-bg-page`. Row `<tr>` elements must carry no background so `<col>` color shows through.
