import { z } from 'zod';
import { GLOSS_SOURCES, PAPYRUS_SIGLA } from '@/lib/types';

const GlossSourceSchema = z.enum(GLOSS_SOURCES);

const GlossCellSchema = z.object({
  gloss: z.string(),
  source: GlossSourceSchema,
  deviation: z.boolean().optional(),
  tooltip: z.string().optional(),
});

const NominaSacraSchema = z.object({
  contraction: z.string(),
  expansion: z.string(),
});

const TextCellSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
  nominaSacra: NominaSacraSchema.optional(),
  gloss: GlossCellSchema.optional(),
});

const EmptyCellSchema = z.object({ type: z.literal('empty') });
const OmittedCellSchema = z.object({ type: z.literal('omitted') });
const LostCellSchema = z.object({ type: z.literal('lost') });
const LacunaCellSchema = z.object({ type: z.literal('lacuna') });

const WitnessCellSchema = z.discriminatedUnion('type', [
  TextCellSchema,
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
