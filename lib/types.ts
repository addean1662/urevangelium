export type Gospel = 'matthew' | 'mark' | 'luke' | 'john';

// ── Gloss provenance ──────────────────────────────────────────────────────────

export const GLOSS_SOURCES = [
  // Greek witnesses
  'TAGNT',        // STEPBible Translators Amalgamated Greek NT (CC BY 4.0)
  'CNTR',         // Center for NT Restoration
  'Swanson',      // Swanson Greek NT
  'Lexical',      // Certified Vaticanus lexical-source chain
  'System',       // Site-generated residual annotation with explicit provenance
  // Coptic witnesses
  'Horner',       // G. W. Horner, The Coptic Version of the NT in the Southern Dialect (public domain)
  'Crum',         // W. E. Crum, A Coptic Dictionary (Oxford, 1939) via KELLIA Comprehensive Coptic Lexicon (CC BY-SA 4.0)
  // Latin witnesses
  'Whitaker',     // Whitaker's Words DICTLINE (public domain)
  'DouayRheims',  // Douay-Rheims Bible (public domain)
  'LewisShort',   // Lewis & Short Latin Dictionary (public domain)
  // Syriac witnesses
  'PayneSmith',   // Payne Smith Compendious Syriac Dictionary (public domain)
  'CAL',          // Comprehensive Aramaic Lexicon
  'Etheridge',    // Etheridge Peshitta translation (public domain)
  'Murdock',      // Murdock Peshitta translation (public domain)
  // Meta
  'alignment-orphan', // word has no counterpart in this witness; gloss = em-dash
] as const;

export type GlossSource = (typeof GLOSS_SOURCES)[number];

export function isGlossSource(value: unknown): value is GlossSource {
  return GLOSS_SOURCES.includes(value as GlossSource);
}

export type GlossCell = {
  gloss: string;
  source: GlossSource;
  deviation?: boolean; // true when source differs from the default for this witness
  generated?: boolean; // site-generated annotation; displayed in orange
  tooltip?: string;    // full lexicon entry for hover display
};

export const GOSPELS: Gospel[] = ['matthew', 'mark', 'luke', 'john'];

export const GOSPEL_CHAPTER_COUNTS: Record<Gospel, number> = {
  matthew: 28,
  mark: 16,
  luke: 24,
  john: 21,
};

// All known papyrus sigla sourced from CNTR class 1.
// Add here when a new P*.txt is added to data/sources/earliest-papyrus/.
export const PAPYRUS_SIGLA = [
  'P1', 'P4', 'P5', 'P22', 'P28', 'P37', 'P39', 'P45',
  'P52', 'P53', 'P64+P67', 'P66', 'P70', 'P75', 'P77',
  'P88', 'P90', 'P95', 'P104', 'P106', 'P119', 'P120',

  'P6',
  'P19',
  'P21',
  'P25',
  'P35',
  'P69',
  'P71',
  'P82',
  'P86',
  'P101',
  'P102',
  'P107',
  'P108',
  'P109',
  'P110',
  'P111',
  'P121',
  'P122',
  'P134',
  'P137',
  'P138',
  'P141',
  'P73',
  'P83',
  'P96',
  'P103',
  'P105',
  'P44',
  'P84',
  'P3',
  'P7',
  'P42',
  'P97',
  'P2',
  'P36',
  'P55',
  'P59',
  'P60',
  'P63',
  'P76',
  'P80',
  'P93',
  'P128',
] as const;

export type PapyrusSiglum = (typeof PAPYRUS_SIGLA)[number];

export type PapyrusFragment = {
  id: PapyrusSiglum;  // must be a known CNTR siglum — no free-text allowed
  date: string;       // e.g. "c. 175–225 CE"
};

export type NominaSacraExpansion = {
  contraction: string;   // e.g. "ΘΣ"
  expansion: string;     // e.g. "θεός"
};

export type CellSourceProvenance = {
  witness: string;          // e.g. "GA 03"
  source: string;           // stable source name
  sourceReference: string;  // e.g. "40001001"
  revision: string;         // upstream commit/release or immutable file hash
  readingLayer: 'base' | 'original-uncorrected' | 'corrector-a' | 'corrector-b' | 'corrector-c' | 'edition';
  diplomatic: string;       // exact MES word before display normalization
  normalization: string[];  // reversible operations applied for display/comparison
  verification: 'unreviewed' | 'machine-compared' | 'human-reviewed' | 'image-verified';
};

// A cell that contains actual text (optionally with nomina sacra markup and/or a gloss)
export type TextCell = {
  type: 'text';
  text: string;
  nominaSacra?: NominaSacraExpansion;
  gloss?: GlossCell;
  provenance?: CellSourceProvenance;
};

// A cell that is empty due to an alignment gap (language has no word for this unit)
export type EmptyCell = {
  type: 'empty';
};

// A source-attested textual omission: the witness has no word at this shared row.
export type OmittedCell = {
  type: 'omitted';
};

// A cell where the manuscript is physically damaged or not extant
export type LostCell = {
  type: 'lost';
};

// A cell where the passage is absent from this witness's canon
export type LacunaCell = {
  type: 'lacuna';
};

export type WitnessCell = TextCell | EmptyCell | OmittedCell | LostCell | LacunaCell;

// The Earliest Papyrus column has its own cell type
export type PapyrusExtantCell = {
  type: 'extant';
  fragments: PapyrusFragment[];  // all fragments covering this word
  text: string;
  condition?: {
    damaged?: boolean;
    damagedAfter?: number[];
    /** Verified, freely accessible image/scan containing this displayed reading. */
    sourceImageUrl?: string;
    missingAfter?: number[];
    supplied?: 'editor' | 'vid';
  };
  nominaSacra?: NominaSacraExpansion;
  gloss?: GlossCell;
};

export type PapyrusCell = PapyrusExtantCell | EmptyCell | LostCell | LacunaCell;

// Bezae Cantabrigiensis (D/05) — bilingual Greek/Latin codex
// greek and latin are stored separately; no English gloss is shown
// 'lost' = folio physically damaged/missing (shows red "lost" on each side)
// 'empty' = alignment gap row where neither Greek nor Latin has a word
// No 'lacuna' type: Bezae covers all four Gospels; use 'lost' for physical damage,
// 'empty' for alignment gaps, and greekLost/latinLost for per-side losses in a text row.
export type BezaeCell =
  | { type: 'text'; greek?: string; latin?: string; greekLost?: true; latinLost?: true }
  | { type: 'empty' }
  | { type: 'lost' };

// One row in the alignment table = one word (or alignment slot)
export type AlignmentRow = {
  id: string;           // unique within a verse, e.g. "r1", "r2"
  papyrus: PapyrusCell;
  coptic?: WitnessCell; // optional — Sahidic Coptic (Horner); data not yet populated for most verses
  vaticanus: WitnessCell;
  sinaiticus: WitnessCell;
  bezae?: BezaeCell;    // optional — data not yet populated for most verses
  vulgate: WitnessCell;
  peshitta: WitnessCell;
  byzantine: WitnessCell;
};

// Complete data for one verse
export type VerseData = {
  gospel: Gospel;
  chapter: number;
  verse: number;
  rows: AlignmentRow[];
};

// Manifest entry for Gospel navigation — one entry per verse
export type VerseManifestEntry = {
  chapter: number;
  verse: number;
  populated: boolean;   // false = editorial placeholder; true = real aligned data
};

export type GospelManifest = {
  gospel: Gospel;
  verses: VerseManifestEntry[];
};
