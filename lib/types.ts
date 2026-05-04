export type Gospel = 'matthew' | 'mark' | 'luke' | 'john';

// ── Gloss provenance ──────────────────────────────────────────────────────────

export const GLOSS_SOURCES = [
  // Greek witnesses
  'TAGNT',        // STEPBible Translators Amalgamated Greek NT (CC BY 4.0)
  'CNTR',         // Center for NT Restoration
  'Swanson',      // Swanson Greek NT
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
  tooltip?: string;    // full lexicon entry for hover display
};

export const GOSPELS: Gospel[] = ['matthew', 'mark', 'luke', 'john'];

export const GOSPEL_CHAPTER_COUNTS: Record<Gospel, number> = {
  matthew: 28,
  mark: 16,
  luke: 24,
  john: 21,
};

export type PapyrusFragment = {
  id: string;       // e.g. "P66", "P75", "P45", "P64+P67"
  date: string;     // e.g. "c. 175–225 CE"
};

export type NominaSacraExpansion = {
  contraction: string;   // e.g. "ΘΣ"
  expansion: string;     // e.g. "θεός"
};

// A cell that contains actual text (optionally with nomina sacra markup and/or a gloss)
export type TextCell = {
  type: 'text';
  text: string;
  nominaSacra?: NominaSacraExpansion;
  gloss?: GlossCell;
};

// A cell that is empty due to an alignment gap (language has no word for this unit)
export type EmptyCell = {
  type: 'empty';
};

// A cell where the manuscript is physically damaged or not extant
export type LostCell = {
  type: 'lost';
};

// A cell where the passage is absent from this witness's canon
export type LacunaCell = {
  type: 'lacuna';
};

export type WitnessCell = TextCell | EmptyCell | LostCell | LacunaCell;

// The Earliest Papyrus column has its own cell type
export type PapyrusExtantCell = {
  type: 'extant';
  fragments: PapyrusFragment[];  // all fragments covering this word
  text: string;
  nominaSacra?: NominaSacraExpansion;
  gloss?: GlossCell;
};

export type PapyrusCell = PapyrusExtantCell | LostCell | LacunaCell;

// One row in the alignment table = one word (or alignment slot)
export type AlignmentRow = {
  id: string;           // unique within a verse, e.g. "r1", "r2"
  papyrus: PapyrusCell;
  vaticanus: WitnessCell;
  sinaiticus: WitnessCell;
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
