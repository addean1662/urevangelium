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

export const SOURCE_MANIFEST_VERSION = '2026-08-21.3';

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
    status: 'source-verified', statusNote: 'All four Gospels are occurrence-complete and diplomatically exact against pinned Sahidica NT 4.1.0. This certifies the source-form inventory, not parallel-row placement: 42,803 placements remain computationally provisional and the current audit identifies 3,174 source-order breaks. Parallel alignment and published-translation alignment remain under review.',
    coverage: '48,275 Sahidica word-groups displayed exactly once: 13,857 Matthew, 8,390 Mark, 14,237 Luke, and 11,791 John; zero missing, unexpected, or altered forms, with occurrence provenance on every word-group.',
    sources: [
      { name: 'Sahidica NT 4.1.0 via Coptic SCRIPTORIUM', role: 'text', localFiles: 'data/sources/coptic-tt/*.tt', version: '4.1.0', license: 'Free-electronic-edition permission identified; SCRIPTORIUM academic-use wording requires documented clarification', url: 'https://copticscriptorium.org/' },
      { name: 'Crum through KELLIA CCL — lexical aid, not contextual translation', role: 'gloss', localFiles: 'scripts/coptic/kellia-lexicon.xml', version: 'CCL v1.2 (2020)', license: 'CC BY-SA 4.0' },
      { name: 'Urevangelium Sahidic English evidence ledger', role: 'verification', localFiles: 'data/sources/coptic-english/manifest.json; docs/audits/coptic-english-system/', version: 'v1; one deterministic decision per Sahidica word-group', license: 'Project-generated provenance and admission metadata' },
      { name: 'CrossWire CopSahHorner 1.5', role: 'verification', localFiles: 'data/sources/crosswire-copsahhorner/', version: '1.5; package hash verified', license: 'Public domain module; transcription provenance insufficient for authoritative admission' },
      { name: 'George W. Horner — proposed published translation authority, subject to Coptic-text applicability', role: 'verification', localFiles: 'data/sources/horner-pilot/', version: 'The Coptic Version of the New Testament in the Southern Dialect; qualified human transcription pending', license: 'Public-use rights and transcription provenance must be recorded before admission' },
      { name: 'STEPBible TAGNT', role: 'alignment', localFiles: 'data/sources/greek-shared/TAGNT-Mat-Jhn-CC-BY.txt', version: 'Local acquisition is not yet pinned', license: 'CC BY 4.0' },
    ],
    rules: ['Preserve every Sahidica word-group exactly and attach edition, source file, verse, occurrence number, diplomatic form, and SHA-256 provenance.', 'Preserve Sahidica source order and word-group boundaries independently; never reshape the Coptic sequence merely to fit another tradition’s grid.', 'Represent many-to-many correspondence with alignment links or spans while retaining provenance for every Sahidica source unit.', 'Treat John 8 as the second logical chapter embedded in the distributed 43_John_07.tt file; keep John 7:53 and John 8:1–11 explicitly omitted.', 'Describe SCRIPTORIUM segmentation and linguistic annotation as automatic source layers, not manually Coptologist-validated facts.', 'Display Crum/KELLIA only as lexical aid.', 'Admit Horner English verbatim only when Horner’s underlying Coptic is exact or nonlexically equivalent to the corresponding Sahidica span.'],
    prohibited: ['Calling Sahidica simply Horner', 'Claiming that one normalized edition represents every Sahidic manuscript', 'Presenting automatic SCRIPTORIUM annotations as manually validated', 'Using TAGNT, another tradition, a dictionary, or project-generated wording as Sahidic translation', 'Filling Sahidica omissions from another tradition', 'Extracting Logos content for public redistribution without written permission'],
    nextAction: 'Acquire a qualified Horner Coptic-and-English transcription for contextual translation units, while preserving the complete multi-source decision ledger; repair parallel placement separately.',
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
    status: 'source-verified', statusNote: 'All 59,029 Clementine Gospel tokens are displayed once in source order under a hash-pinned local source audit. All 3,776 selected Douay-Rheims 1899 translation units are source-admitted and internally aligned as 32,288 ordered row or phrase-span objects. Every Latin token and every published English word is accounted for once. This is internal source-constrained alignment, not a claim that the Douay translators published an interlinear and not independent scholarly review.', coverage: 'All four Gospels: 59,029/59,029 Latin source tokens across 3,779 local Gospel verse divisions; 82,900/82,900 Douay-Rheims words across 3,776 admitted source units; 32,288 displayed English row/span objects, including 14,910 multi-Latin phrase spans.',
    sources: [
      { name: 'Biblia Sacra juxta Vulgatam Clementinam', role: 'text', localFiles: 'data/sources/vulgate/VulgClementine.txt', version: '1592/1598 received edition; local SHA-256 F2BCC2BF6C7CCEC7258AE096A200F9C685B783A9E0A656232365792EBEC028AC; upstream revision still to be identified', license: 'Public domain', url: 'https://github.com/scrollmapper/bible_databases' },
      { name: 'Douay-Rheims American Edition (1899; displayed published translation units)', role: 'verification', localFiles: 'data/sources/vulgate-english/challoner-1899/*.usfm; data/sources/vulgate-english/admitted-units.json', version: 'eBible engDRA source files dated 2022-11-03; 3,776 internally admitted units, ledger generated 2026-08-19', license: 'Public domain', url: 'https://ebible.org/find/show.php?id=engDRA' },
      { name: 'Original Rheims New Testament (1582; secondary translation witness—not yet displayed)', role: 'verification', localFiles: 'data/sources/vulgate-english/rheims-1582/*.json', version: 'janvier-s structured transcription acquired 2026-08-18', license: 'CC0 1.0', url: 'https://github.com/janvier-s/original-douay-rheims' },
      { name: "Whitaker's Words (lexical aid only)", role: 'gloss', localFiles: 'data/sources/glosses/whitaker/DICTLINE.GEN', version: 'Local acquisition is not yet pinned', license: 'Public domain' },
      { name: 'Lewis and Short, A Latin Dictionary (Perseus TEI; corroborating lexical evidence)', role: 'verification', localFiles: 'data/sources/glosses/lewis-short/vulgate-gospels-evidence.json', version: 'PerseusDL/lexica commit 40038e40937fa639639802e73dac15e6c938496b; scoped Gospel extraction', license: 'Public domain', url: 'https://github.com/PerseusDL/lexica' },
    ],
    rules: ['Retain source-token order.', 'Give additional Latin words their own alignment rows.', 'Use empty cells only where Latin has no corresponding word.', 'Treat Whitaker as a lexical aid requiring contextual review.', 'Keep published English in source-supported translation units; Urevangelium aligns but does not translate.'],
    prohibited: ['Calling this text Weber–Gryson/Stuttgart', 'Dating the displayed edition to 383 CE', 'Dropping excess source words', 'Presenting Whitaker lexical output as contextual translation', 'Subdividing published English more finely than its source supports', 'Silently harmonizing Challoner and Rheims'], nextAction: 'Obtain independent scholarly review of the Vulgate source audit, whole-unit English alignment method, and edition-specific adjudication ledger.',
  },
  {
    id: 'bezae', position: '5', label: 'Bezae', tradition: 'Western bilingual manuscript witness',
    displayedObject: 'Codex Bezae Cantabrigiensis, GA 05 / VL 5, Greek and Latin sides.', traditionDate: 'The Western textual environment predates the codex.', witnessOrEditionDate: 'Codex: approximately 400 CE.',
    status: 'source-verified', statusNote: 'The site display is internally certified against hash-pinned ITSEE/IGNTP TEI files. Every one of 48,920 visible Greek forms and 52,749 visible Latin forms consumes a unique exact occurrence in its corresponding TEI verse, with zero unsupported or reused occurrences. This is display-scope certification; unused apparatus layers remain outside the claim.', coverage: 'All 3,779 Gospel verse files classified: 59,984 Bezae text rows, 3,398 full physical-loss rows, 19 Greek-side loss rows, 94 full textual-omission rows, 236 Greek-side omission rows, 6,425 explicit comparison gaps, and 1,780 unpopulated post-generation display gaps.',
    sources: [{ name: 'ITSEE/IGNTP Codex Bezae TEI transcriptions', role: 'text', localFiles: 'data/sources/bezae/Bezae-Greek.xml; Bezae-Latin.xml', version: 'Display certificate pins canonical-text SHA-256: Greek 494725684D6211ACDA3D4ABCB147054CC54C26E22D76B3552170EEA94E8B0256 and Latin E8A392C42938C710129DA854697F80814558BA6A838786297075C3417B27036A', license: 'CC BY-NC-SA 3.0', url: 'https://itseeweb.cal.bham.ac.uk/igntp/bezae.html' }],
    rules: ['Keep Greek and Latin sides distinct within the same codex witness.', 'Require each displayed form to consume one unique occurrence in the corresponding TEI verse.', 'Treat a shared row as comparative placement, not literal bilingual equivalence or diplomatic sequence.', 'Represent full and side-specific physical loss separately from alignment and unpopulated display gaps.', 'Within an apparatus element, use the first encoded rdg as the displayed base-reading stream while retaining alternatives in the TEI.'],
    prohibited: ['Filling a physical lacuna from another tradition', 'Treating blank post-generation rows as manuscript omissions', 'Claiming comparison-row order is diplomatic sequence', 'Flattening unused apparatus readings into the certified display'], nextAction: 'Retain the pinned TEI files and rerun certify:bezae:display whenever Bezae cells or source files change.',
  },
  {
    id: 'peshitta', position: '6', label: 'Peshitta', tradition: 'Syriac Peshitta received tradition',
    displayedObject: 'The scrollmapper electronic Syriac Peshitta text at pinned commit ba07bc991644d82b24426b920245eb4422daa769; its exact printed exemplar remains unestablished.', traditionDate: 'Peshitta Gospel tradition: approximately fourth to fifth century CE.', witnessOrEditionDate: 'Pinned electronic revision committed 2024-11-19; no BFBS/Urmia exemplar claim is made.',
    status: 'source-verified', statusNote: 'All four Gospels are exact and occurrence-complete against the hash-pinned electronic source: 50,477/50,477 Syriac tokens in source order. Alignment relations for all 728 governed Syriac-only rows are certified. Murdock 1851 English is certified in ordinary left-aligned English cells accompanying the Syriac rows; merged cells and continuation arrows are prohibited, and row allocation does not imply one-to-one lexical equivalence.', coverage: 'All 3,779 Gospel verse records; 50,477 source tokens and 84,136 admitted Murdock English words accounted exactly once; 45,983 populated English cells, 4,494 honest blank English cells, 23,650 bounded phrase groups, 22,007 cross-tradition lexical anchors, zero merged cells, zero arrow glyphs, and zero accounting failures.',
    sources: [
      { name: 'scrollmapper Peshitta.txt', role: 'text', localFiles: 'data/sources/peshitta/Peshitta.txt', version: 'Commit ba07bc991644d82b24426b920245eb4422daa769; SHA-256 6E6E13089148E2D9809103F4B0BBB602D95086C28B37F44B086E800C5690651B', license: 'Public domain', url: 'https://github.com/scrollmapper/bible_databases/tree/ba07bc991644d82b24426b920245eb4422daa769' },
      { name: 'ETCBC/syrnt Text-Fabric morphology', role: 'alignment', localFiles: 'data/sources/peshitta/etcbc-syrnt/tf/0.1', version: 'Commit dae3eb6ff62b9b272fb503646796c25d248175ce', license: 'MIT', url: 'https://github.com/ETCBC/syrnt/tree/dae3eb6ff62b9b272fb503646796c25d248175ce' },
      { name: 'Payne Smith, A Compendious Syriac Dictionary', role: 'gloss', localFiles: 'data/sources/peshitta/payne-smith-proof-verses.tsv', version: '1903 reference; proof-verse evidence only and withheld after the source rebuild pending occurrence remapping', license: 'Public domain' },
      { name: 'Etheridge (1846) and Murdock (1851) Peshitta translations', role: 'verification', localFiles: 'data/sources/peshitta/etheridge.txt; data/sources/peshitta/murdock.txt', version: 'Verse-level contextual witnesses; proportional word extraction prohibited', license: 'Public domain' },
      { name: 'Murdock 1851 Gospel translation units', role: 'gloss', localFiles: 'data/sources/peshitta/murdock-gospels.json; data/sources/peshitta/murdock-admitted-units.json', version: 'Two-transcription collation acquired 2026-08-21; certificate hashes recorded locally', license: 'Public domain' },
    ],
    rules: ['Preserve every Syriac source token exactly once, in source order, with source-file hash and occurrence provenance.', 'Preserve RTL display without changing logical token order.', 'Certify one-to-one, one-to-many, many-to-one, and source-specific units as distinct alignment relation types.', 'Use Greek, Latin, and Coptic only as alignment evidence; retain Murdock as the sole displayed English authority.', 'Allocate bounded phrases in source order across ordinary accompanying English cells; never use merged cells, continuation arrows, or fabricated lexical equivalence.'],
    prohibited: ['Claiming BFBS 1905 without an exemplar chain', 'Treating a certified alignment or English span as lexical equivalence', 'Using proportional English translations as word-level lexical evidence', 'Borrowing displayed wording from another tradition', 'Normalizing samekh forms in the archival display', 'Dropping source overflow words to fit Greek-derived rows'], nextAction: 'Obtain independent Syriacist review of the internal row-phrase adjudication and facsimile review of the 17 Murdock source-boundary spans.',
  },
  {
    id: 'byzantine', position: '7', label: 'Byzantine', tradition: 'Byzantine Greek textual tradition',
    displayedObject: 'The Robinson–Pierpont 2018 Byzantine Textform electronic edition, not one medieval manuscript.', traditionDate: 'Byzantine-type readings emerge earlier; the mature tradition spans later centuries.', witnessOrEditionDate: 'Displayed edition: RP2018, byztxt v3.3.2.',
    status: 'source-verified', statusNote: 'All four Gospels are rebuilt exclusively from the hash-pinned RP2018 v3.3.2 CSVs. Every one of 66,130 source tokens is displayed once in source order, and every token has English admitted by the Byzantine-specific evidence chain. Direct contextual TAGNT English is distinguished from orange project-adjudicated lexical output. This is internal source and process certification, not independent scholarly review.', coverage: '3,778 RP2018 Gospel verse records and 66,130 tokens; 66,130/66,130 English placements admitted; Luke 17:36 is explicitly omitted because RP2018 has no verse record there.',
    sources: [
      { name: 'Robinson–Pierpont 2018 Byzantine Textform via byztxt', role: 'text', localFiles: 'data/sources/byzantine/{MAT,MAR,LUK,JOH}.csv', version: 'v3.3.2; commit 27a45ff1b7be6c17ccbfeac414f3f55732ae8e28; per-file SHA-256 hashes recorded in the certification ledger', license: 'Unlicense / public domain', url: 'https://github.com/byztxt/byzantine-majority-text/tree/v3.3.2' },
      { name: 'STEPBible TAGNT', role: 'alignment', localFiles: 'data/sources/greek-shared/TAGNT-Mat-Jhn-CC-BY.txt', version: 'Local acquisition is not yet pinned', license: 'CC BY 4.0' },
      { name: 'STEPBible TBESG / Abbott-Smith', role: 'gloss', localFiles: 'data/sources/greek-shared/TBESG-CC-BY.txt', version: 'SHA-256 recorded in docs/audits/byzantine-english-shadow.json', license: 'CC BY 4.0' },
      { name: 'MorphGNT, PROIEL, and MorphGNT lexicon', role: 'verification', localFiles: 'data/sources/greek-shared/{morphgnt,proiel,morphgnt-lexicon}', version: 'Per-file SHA-256 hashes recorded in the English certification ledger', license: 'Source licenses retained in each local source directory' },
    ],
    rules: ['Use the pinned Byzantine CSV as the sole text authority.', 'Admit contextual TAGNT English only for an explicitly Byzantine-aligned token with RP2018 identity evidence.', 'Display project-adjudicated TBESG or MorphGNT-lexicon output in orange.', 'Require exact RP2018 surface and morphology identity before any English admission.', 'Treat the column as an edited textform rather than a physical witness.', 'Represent a verse absent from RP2018 as omitted rather than filling it from another Greek tradition.'],
    prohibited: ['Silent generic TAGNT fallback', 'Calling the edited textform one physical manuscript', 'Applying physical-manuscript lacuna rules', 'Borrowing readings or English from another Greek column', 'Displaying unresolved generated English as source translation'], nextAction: 'Seek independent specialist review of the published ledger and adjudication rules; preserve the current pinned source versions until a separately audited migration.',
  },
];
