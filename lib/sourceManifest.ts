export type CertificationStatus =
  | 'source-verified'
  | 'provisional'
  | 'requires-rebuild';

export type SourceRecord = {
  name: string;
  role: 'text' | 'verification' | 'alignment' | 'gloss';
  localFiles: string;
  version: string;
  license: string;
  url?: string;
};

export type ColumnSourceRecord = {
  id: string;
  position: string;
  label: string;
  tradition: string;
  displayedObject: string;
  traditionDate: string;
  witnessOrEditionDate: string;
  status: CertificationStatus;
  statusNote: string;
  coverage: string;
  sources: SourceRecord[];
  rules: string[];
  prohibited: string[];
  nextAction: string;
};

export const SOURCE_MANIFEST_VERSION = '2026-08-18.5';

export const COLUMN_SOURCES: ColumnSourceRecord[] = [
  {
    id: 'earliest-papyri',
    position: '1',
    label: 'Earliest Papyri',
    tradition: 'Greek papyrus witnesses',
    displayedObject: 'A governed composite selecting extant Gospel papyrus evidence word by word; it is not a single reconstructed Greek text.',
    traditionDate: 'Individual papyri range from the second through seventh centuries CE.',
    witnessOrEditionDate: 'Each displayed siglum carries its own paleographic date.',
    status: 'provisional',
    statusNote: 'Direct CNTR readings and INTF checks coexist with explicitly provisional coverage stubs.',
    coverage: '65 registered papyri; 2,132 distinct Gospel verses have at least one coverage record.',
    sources: [
      { name: 'CNTR Class 1 Gospel papyrus transcriptions', role: 'text', localFiles: 'data/sources/earliest-papyrus/P*.txt', version: 'Local acquisition is not yet pinned to a commit', license: 'CC BY-SA 4.0', url: 'https://github.com/Center-for-New-Testament-Restoration/transcriptions' },
      { name: 'INTF NTVMR diplomatic transcriptions', role: 'verification', localFiles: 'data/cache/intf/', version: 'Cached per GA witness; retrieval revision not yet recorded', license: 'External verification source', url: 'https://ntvmr.uni-muenster.de/' },
      { name: 'STEPBible TAGNT', role: 'alignment', localFiles: 'data/sources/greek-shared/TAGNT-Mat-Jhn-CC-BY.txt', version: 'Local acquisition is not yet pinned', license: 'CC BY 4.0', url: 'https://github.com/STEPBible/STEPBible-Data' },
    ],
    rules: [
      'Keep every papyrus word in manuscript order and align only by a contiguous forward scan.',
      'Show every siglum that actually attests the displayed location; multiple agreeing papyri may share a compact cell.',
      'Preserve disagreeing readings separately in the data even when the interface later offers a compact view.',
      'When attesting papyri disagree, display the reading of the papyrus ranked first by the public papyrus chronology: earliest starting year in the paleographic date range, then lower Gregory-Aland papyrus number as the deterministic display tie-breaker.',
      'Attach compact-view sigla only to papyri that attest the selected displayed reading; retain dissenting papyri and readings in provenance.',
      'Use lost status for non-extant material; a leading loss requires INTF confirmation.',
      'Strip diacritics and expand nomina sacra for comparison only, never as an unrecorded alteration of stored evidence.',
      'Coverage stubs may use TAGNT only as a visibly identified provisional reconstruction, never as transcribed papyrus text.',
    ],
    prohibited: ['Silent TAGNT substitution', 'Automatic correction of genuine variants', 'Reordering manuscript words', 'Treating verse coverage as proof that every word survives'],
    nextAction: 'Add per-reading provenance and a visible stub/reconstruction state, then finish CNTR-to-INTF word-level collation.',
  },
  {
    id: 'sahidic', position: '2', label: 'Sahidic', tradition: 'Sahidic Coptic New Testament',
    displayedObject: 'Sahidica NT 4.1.0, a normalized electronic Sahidic edition rather than one physical manuscript.',
    traditionDate: 'Sahidic Gospel tradition is ancient; the column does not display a single early codex.',
    witnessOrEditionDate: 'Sahidica NT version 4.1.0 (metadata dated 2021-03-31).',
    status: 'source-verified', statusNote: 'All four Gospels are occurrence-complete and diplomatically exact against the pinned Sahidica NT 4.1.0 files. This certifies the displayed source edition, not every manuscript in the Sahidic tradition; row placement and English remain separate review layers.',
    coverage: '48,275 Sahidica word-groups displayed exactly once: 13,857 Matthew, 8,390 Mark, 14,237 Luke, and 11,791 John; zero missing, unexpected, or altered forms, with occurrence provenance on every word-group.',
    sources: [
      { name: 'Sahidica NT 4.1.0 via Coptic SCRIPTORIUM', role: 'text', localFiles: 'data/sources/coptic-tt/*.tt', version: '4.1.0', license: 'Academic-use terms recorded in corpus metadata', url: 'https://copticscriptorium.org/' },
      { name: 'Crum through the KELLIA Comprehensive Coptic Lexicon', role: 'gloss', localFiles: 'scripts/coptic/kellia-lexicon.xml', version: 'CCL v1.2 (2020)', license: 'CC BY-SA 4.0' },
      { name: 'STEPBible TAGNT', role: 'alignment', localFiles: 'data/sources/greek-shared/TAGNT-Mat-Jhn-CC-BY.txt', version: 'Local acquisition is not yet pinned', license: 'CC BY 4.0' },
    ],
    rules: ['Preserve every Sahidica word-group exactly and attach edition, source file, verse, occurrence number, diplomatic form, and SHA-256 provenance.', 'Treat John 8 as the second logical chapter embedded in the distributed 43_John_07.tt file; keep John 7:53 and John 8:1–11 explicitly omitted.', 'Align Greek loans by transliteration and proper names by controlled fuzzy match.', 'Flag computational row placement as draft without weakening the independently verified source text.', 'Use Crum/KELLIA for native Coptic glosses and TAGNT only for identified Greek loans.'],
    prohibited: ['Calling Sahidica simply Horner', 'Claiming that one normalized edition represents every Sahidic manuscript', 'Presenting draft alignment as reviewed', 'Using a Greek-row gloss as evidence for native Coptic meaning', 'Filling Sahidica omissions from another tradition'],
    nextAction: 'Adjudicate computational row placements and certify English independently while retaining the completed source-text certification.',
  },
  {
    id: 'vaticanus', position: '3a', label: 'Vaticanus', tradition: 'Alexandrian Greek manuscript witness',
    displayedObject: 'Codex Vaticanus, GA 03.', traditionDate: 'The broader Alexandrian stream predates the codex.', witnessOrEditionDate: 'Codex: approximately 325 CE.',
    status: 'source-verified', statusNote: 'The four-Gospel column is generated from the pinned INTF original-hand transcription and automatically collated against pinned CNTR GA 03. English is published only from reproducible decision ledgers; system-generated lexical English is orange. This is internal source certification, not a claim of external peer review.', coverage: 'All 3,779 canonical Gospel verses are classified: 63,511 INTF source tokens displayed as 63,546 lexical words, explicit textual omissions, and physical lacunae. English is certified for 63,543 words (99.995%); 134 certified system-generated lexical glosses are orange and 3 manuscript-event cases remain without English.',
    sources: [
      { name: 'INTF NTVMR transcription of GA 03', role: 'text', localFiles: 'data/sources/vaticanus/intf/*.xml', version: 'NTVMR document 20003, PUBLISHED original-hand TEI; per-Gospel SHA-256 hashes recorded in the certification artifact', license: 'CC BY 4.0', url: 'https://ntvmr.uni-muenster.de/community/vmr/api/transcript/get/' },
      { name: 'CNTR Class 1 transcription of GA 03', role: 'verification', localFiles: 'data/sources/vaticanus/03.txt', version: 'CNTR commit 4c0e9f94117ec3dc4ae40094aec044bb7a416a53; SHA-256 cea945958d065699d3ab42f05d2afa3be54af4551a68e2e0a32090cd9fa0bb7f', license: 'CC BY-SA 4.0', url: 'https://github.com/Center-for-New-Testament-Restoration/transcriptions' },
      { name: 'STEPBible TAGNT', role: 'alignment', localFiles: 'data/sources/greek-shared/TAGNT-Mat-Jhn-CC-BY.txt', version: 'Local acquisition is not yet pinned', license: 'CC BY 4.0' },
      { name: 'MorphGNT SBLGNT morphology', role: 'verification', localFiles: 'data/sources/greek-shared/morphgnt/*-morphgnt.txt', version: 'Commit aaed91e57c8e4a8dc9a2383e129ca5e75fe6393d; per-file SHA-256 hashes recorded in the secondary-source ledger', license: 'Morphological parsing and lemmatization CC BY-SA', url: 'https://github.com/morphgnt/sblgnt' },
      { name: 'PROIEL Greek New Testament Treebank', role: 'verification', localFiles: 'data/sources/greek-shared/proiel/greek-nt.xml', version: 'Commit 8e388967a1335ed12335ddc655fe46993ee7d57a; SHA-256 recorded in the secondary-source ledger', license: 'CC BY-NC-SA 3.0', url: 'https://github.com/proiel/proiel-treebank' },
      { name: 'MorphGNT Morphological Lexicon', role: 'verification', localFiles: 'data/sources/greek-shared/morphgnt-lexicon/lexemes.yaml', version: 'Commit 0dca2af89f413cbb24f617ddbdc347e9d798ddf3; SHA-256 recorded in the secondary-source ledger', license: 'Content CC BY-SA 3.0', url: 'https://github.com/morphgnt/morphological-lexicon' },
      { name: 'MorphGNT Tischendorf 8 morphology', role: 'verification', localFiles: 'data/sources/greek-shared/tischendorf-morphgnt/*.txt', version: 'Dataset 2.8 at commit 795f2f4f9fe7cb98bf8736b0c5cb59c43aa9c32e; per-file SHA-256 hashes recorded in the secondary-source ledger', license: 'Public domain', url: 'https://github.com/morphgnt/tischendorf-data' },
      { name: 'TBESG / Abbott-Smith', role: 'gloss', localFiles: 'data/sources/greek-shared/TBESG-CC-BY.txt', version: 'SHA-256 312f723d7b8ef263bbdfb0451c9b8057125804dfff390b6f8544cff2a84b57f4', license: 'CC BY 4.0' },
    ],
    rules: ['Display GA 03, not a critical edition proxy.', 'Normalize case and accents only under the declared display policy.', 'Preserve lacunae, supplied text, uncertainty, corrections, and selected scribal hand.', 'Use TAGNT contextual English only after deterministic alignment to the INTF-controlled GA 03 word; verify its lexical identity against TBESG/Abbott-Smith.', 'For unmatched forms, require exact surface-form lemma agreement between MorphGNT and PROIEL, or a registered contextual/source-native rule with corroborating morphology.', 'Use pinned Tischendorf morphology only as an additional annotation witness; record its shared textual ancestry with PROIEL.', 'Withhold English whenever word alignment or lexical identification is ambiguous.', 'Exclude OCR and AI image transcription from certification.'],
    prohibited: ['NA28 text presented as Vaticanus', 'Silent resolution of corrections or uncertain letters', 'Filling a Vaticanus omission from another tradition', 'Crossing English meanings from another tradition column', 'Using OCR or AI image transcription to certify English', 'Treating Parker/Heinfetter as a diplomatic representation of GA 03'], nextAction: 'Retain the three remaining non-lexical or incomplete manuscript forms as explicit red manuscript-status annotations unless stronger Vaticanus-specific evidence emerges.',
  },
  {
    id: 'sinaiticus', position: '3b (toggle)', label: 'Sinaiticus', tradition: 'Alexandrian Greek manuscript witness',
    displayedObject: 'Codex Sinaiticus, GA 01.', traditionDate: 'The broader Alexandrian stream predates the codex.', witnessOrEditionDate: 'Codex: approximately 350 CE.',
    status: 'requires-rebuild', statusNote: 'GA 01 is present locally, but the generator used Westcott–Hort/TAGNT forms as proxies.', coverage: 'The local CNTR file covers the canonical Gospels.',
    sources: [
      { name: 'CNTR Class 1 transcription of GA 01', role: 'text', localFiles: 'data/sources/sinaiticus/01.txt', version: 'Local acquisition is not yet pinned', license: 'CC BY-SA 4.0', url: 'https://github.com/Center-for-New-Testament-Restoration/transcriptions' },
      { name: 'Codex Sinaiticus Project', role: 'verification', localFiles: 'External images/transcription', version: 'Record exact pages during collation', license: 'CC BY-NC 4.0', url: 'https://www.codexsinaiticus.org/' },
    ],
    rules: ['Display GA 01 rather than Westcott–Hort.', 'Declare whether the base hand or a corrector is selected.', 'Preserve correction layers and physical loss.', 'Normalize only for the declared display view.'],
    prohibited: ['Westcott–Hort presented as Sinaiticus', 'Combining corrector hands without attribution'], nextAction: 'Regenerate from 01.txt with an explicit first-hand/corrector policy.',
  },
  {
    id: 'vulgate', position: '4', label: 'Vulgate', tradition: 'Latin Vulgate received tradition',
    displayedObject: 'Clementine Vulgate, not the Stuttgart critical Vulgate.', traditionDate: 'Jerome’s Gospel revision began about 383 CE.', witnessOrEditionDate: 'Displayed recension: 1592/1598.',
    status: 'provisional', statusNote: 'Source-token concordance passes; naming, dating, and alignment review remain.', coverage: '3,778 local Gospel verse divisions.',
    sources: [
      { name: 'Biblia Sacra juxta Vulgatam Clementinam', role: 'text', localFiles: 'data/sources/vulgate/VulgClementine.txt', version: '1592/1598 received edition; digital revision not pinned', license: 'Public domain', url: 'https://github.com/scrollmapper/bible_databases' },
      { name: "Whitaker's Words", role: 'gloss', localFiles: 'data/sources/glosses/whitaker/DICTLINE.GEN', version: 'Local acquisition is not yet pinned', license: 'Public domain' },
    ],
    rules: ['Retain source-token order.', 'Give additional Latin words their own alignment rows.', 'Use empty cells only where Latin has no corresponding word.', 'Treat Whitaker as a lexical aid requiring contextual review.'],
    prohibited: ['Calling this text Weber–Gryson/Stuttgart', 'Dating the displayed edition to 383 CE', 'Dropping excess source words'], nextAction: 'Finish exact token-sequence validation and contextual gloss review under the Clementine identity.',
  },
  {
    id: 'bezae', position: '5', label: 'Bezae', tradition: 'Western bilingual manuscript witness',
    displayedObject: 'Codex Bezae Cantabrigiensis, GA 05 / VL 5, Greek and Latin sides.', traditionDate: 'The Western textual environment predates the codex.', witnessOrEditionDate: 'Codex: approximately 400 CE.',
    status: 'provisional', statusNote: 'Strong manuscript-specific source; TEI layers and a small amount of fallback alignment still require review.', coverage: 'Greek and Latin XML cover the surviving Gospel leaves, with physical lacunae represented separately.',
    sources: [{ name: 'ITSEE/IGNTP Codex Bezae TEI transcriptions', role: 'text', localFiles: 'data/sources/bezae/Bezae-Greek.xml; Bezae-Latin.xml', version: 'Local acquisition is not yet pinned', license: 'CC BY-NC-SA 3.0', url: 'https://itseeweb.cal.bham.ac.uk/igntp/bezae.html' }],
    rules: ['Keep Greek and Latin sides distinct within the same codex witness.', 'Use normalized matching only to place source tokens.', 'Represent side-specific physical loss separately.', 'Preserve TEI corrections, hands, supplied text, and uncertainty in the archival model.'],
    prohibited: ['Filling a physical lacuna from another tradition', 'Flattening alternative hands without declaring the selected layer'], nextAction: 'Define the base-reading policy and retain the full TEI evidence behind the normalized display.',
  },
  {
    id: 'peshitta', position: '6', label: 'Peshitta', tradition: 'Syriac Peshitta received tradition',
    displayedObject: 'An electronic received Peshitta text whose exact printed exemplar remains to be established.', traditionDate: 'Peshitta Gospel tradition: approximately fourth to fifth century CE.', witnessOrEditionDate: 'Digital source claims an Urmia/BFBS Lee relationship; exact exemplar unverified.',
    status: 'provisional', statusNote: 'Source-token concordance passes, but provenance, alignment, and glossing need specialist review.', coverage: 'All 3,778 local Gospel verse divisions are represented.',
    sources: [
      { name: 'scrollmapper Peshitta.txt', role: 'text', localFiles: 'data/sources/peshitta/Peshitta.txt', version: 'Digital revision not pinned; printed exemplar unverified', license: 'Public domain', url: 'https://github.com/scrollmapper/bible_databases' },
      { name: 'Payne Smith, A Compendious Syriac Dictionary', role: 'gloss', localFiles: 'data/sources/peshitta/payne-smith-proof-verses.tsv', version: '1903 reference; coverage currently limited', license: 'Public domain' },
    ],
    rules: ['Preserve Syriac source-token order and RTL display.', 'Keep alignment status separate from text-source status.', 'Use lemma-based lexical evidence for glosses.', 'Represent Greek-only articles with empty alignment cells where appropriate.'],
    prohibited: ['Claiming BFBS 1905 without an exemplar chain', 'Using proportional English translations as word-level lexical evidence'], nextAction: 'Establish the exemplar and replace translation-derived gloss fallbacks with reviewed Payne Smith/CAL analysis.',
  },
  {
    id: 'byzantine', position: '7', label: 'Byzantine', tradition: 'Byzantine Greek textual tradition',
    displayedObject: 'A Robinson–Pierpont Byzantine Textform electronic edition, not one medieval manuscript.', traditionDate: 'Byzantine-type readings emerge earlier; the mature tradition spans later centuries.', witnessOrEditionDate: 'Exact RP edition/repository revision must be pinned.',
    status: 'provisional', statusNote: 'The appropriate tradition source is local, but edition naming and silent TAGNT fallbacks remain unresolved.', coverage: '3,778 Gospel verses in four local CSV files.',
    sources: [
      { name: 'byztxt Byzantine Majority Text', role: 'text', localFiles: 'data/sources/byzantine/{MAT,MAR,LUK,JOH}.csv', version: 'Unpinned; repository presently identifies RP2018', license: 'Unlicense', url: 'https://github.com/byztxt/byzantine-majority-text' },
      { name: 'STEPBible TAGNT', role: 'alignment', localFiles: 'data/sources/greek-shared/TAGNT-Mat-Jhn-CC-BY.txt', version: 'Local acquisition is not yet pinned', license: 'CC BY 4.0' },
    ],
    rules: ['Use the pinned Byzantine CSV as the text authority.', 'Use TAGNT only for alignment, morphology, and glossing.', 'Treat the column as an edited textform rather than a physical witness.', 'Record edition-level uncertainty separately from manuscript lacunae.'],
    prohibited: ['Silent generic TAGNT fallback', 'Calling an unpinned file RP2005 or RP2018 with certainty', 'Applying physical-manuscript lacuna rules'], nextAction: 'Pin and name the exact byztxt revision, then require complete token concordance against its CSV.',
  },
];
