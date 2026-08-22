import { z } from 'zod';
import { GLOSS_SOURCES, PAPYRUS_SIGLA } from '@/lib/types';

const GlossSourceSchema = z.enum(GLOSS_SOURCES);

const GlossCellSchema = z.object({
  gloss: z.string(),
  source: GlossSourceSchema,
  deviation: z.boolean().optional(),
  generated: z.boolean().optional(),
  experimental: z.boolean().optional(),
  automaticAnnotation: z.boolean().optional(),
  tooltip: z.string().optional(),
  spanId: z.string().optional(),
  spanRole: z.enum(['start', 'continuation']).optional(),
});

const NominaSacraSchema = z.object({
  contraction: z.string(),
  expansion: z.string(),
});

const CellSourceProvenanceSchema = z.object({
  witness: z.string(),
  source: z.string(),
  sourceReference: z.string(),
  revision: z.string(),
  readingLayer: z.enum(['base', 'original-uncorrected', 'corrector-a', 'corrector-b', 'corrector-c', 'edition']),
  diplomatic: z.string(),
  normalization: z.array(z.string()),
  verification: z.enum(['unreviewed', 'machine-compared', 'human-reviewed', 'image-verified']),
}).passthrough();

const SahidicSourceProvenanceSchema = z.object({
  authority: z.string(),
  edition: z.string(),
  versionDate: z.string(),
  sourceFile: z.string(),
  sourceReference: z.string(),
  sourceToken: z.number().int().positive(),
  diplomatic: z.string(),
  sourceSha256: z.string(),
  verification: z.literal('exact-source-word-group'),
  placementMethod: z.string().optional(),
}).passthrough();

const SourceProvenanceSchema = z.union([CellSourceProvenanceSchema, SahidicSourceProvenanceSchema]);

const AlignedSourceUnitSchema = z.object({
  text: z.string(),
  gloss: GlossCellSchema.optional(),
  provenance: SourceProvenanceSchema.optional(),
}).passthrough();

const TextCellSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
  sourceUnits: z.array(AlignedSourceUnitSchema).min(1).optional(),
  manuscriptStatus: z.enum(['damaged', 'scribal-error-question']).optional(),
  nominaSacra: NominaSacraSchema.optional(),
  gloss: GlossCellSchema.optional(),
  provenance: z.record(z.string(), z.unknown()).optional(),
});

const EmptyCellSchema = z.object({ type: z.literal('empty') });
const OmittedCellSchema = z.object({ type: z.literal('omitted') });
const LostCellSchema = z.object({ type: z.literal('lost') });
const LacunaCellSchema = z.object({ type: z.literal('lacuna') });
const TranslationOnlyCellSchema = z.object({
  type: z.literal('translation'),
  gloss: GlossCellSchema,
  provenance: z.object({
    authority: z.string(),
    sourceReference: z.string(),
    englishIndex: z.number().int().nonnegative(),
    alignmentGroupId: z.string(),
    status: z.literal('published-translation-row'),
  }),
});

const WitnessCellSchema = z.discriminatedUnion('type', [
  TextCellSchema,
  TranslationOnlyCellSchema,
  EmptyCellSchema,
  OmittedCellSchema,
  LostCellSchema,
  LacunaCellSchema,
]);

const PapyrusFragmentSchema = z.object({
  id: z.enum(PAPYRUS_SIGLA),  // rejects any siglum not in PAPYRUS_SIGLA
  date: z.string(),
});

const PapyrusExtantCellSchema = z.object({
  type: z.literal('extant'),
  fragments: z.array(PapyrusFragmentSchema).min(1),
  text: z.string(),
  condition: z.object({
    damaged: z.boolean().optional(),
    damagedAfter: z.array(z.number().int().nonnegative()).optional(),
    sourceImageUrl: z.string().url().startsWith('https://').optional(),
    missingAfter: z.array(z.number().int().nonnegative()).optional(),
    manuscriptStatus: z.enum(['scribal-error-question']).optional(),
    supplied: z.enum(['editor', 'vid']).optional(),
  }).optional(),
  nominaSacra: NominaSacraSchema.optional(),
  gloss: GlossCellSchema.optional(),
});

const PapyrusCellSchema = z.discriminatedUnion('type', [
  PapyrusExtantCellSchema,
  EmptyCellSchema,
  LostCellSchema,
  LacunaCellSchema,
]);

const AlignmentRowSchema = z.object({
  id: z.string(),
  alignmentGroupIds: z.array(z.string()).optional(),
  rowKind: z.enum(['source', 'translation-expansion']).optional(),
  papyrus: PapyrusCellSchema,
  coptic: WitnessCellSchema.optional(),
  vaticanus: WitnessCellSchema,
  sinaiticus: WitnessCellSchema,
  vulgate: WitnessCellSchema,
  peshitta: WitnessCellSchema,
  byzantine: WitnessCellSchema,
}).passthrough(); // allow _note and other editorial fields

export const VerseDataSchema = z.object({
  gospel: z.enum(['matthew', 'mark', 'luke', 'john']),
  chapter: z.number().int().positive(),
  verse: z.number().int().positive(),
  rows: z.array(AlignmentRowSchema).min(1),
}).passthrough(); // allow _note
