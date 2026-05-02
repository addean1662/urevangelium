export type Gospel = 'matthew' | 'mark' | 'luke' | 'john';

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

// A cell that contains actual text (optionally with nomina sacra markup)
export type TextCell = {
  type: 'text';
  text: string;
  nominaSacra?: NominaSacraExpansion;
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
