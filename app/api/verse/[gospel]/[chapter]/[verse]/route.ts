import { NextResponse } from 'next/server';
import { loadVerse } from '@/lib/data';
import { GOSPELS, type Gospel } from '@/lib/types';
import { VERSE_COUNTS } from '@/lib/verseCounts';
import { publicVerse } from '@/lib/publicVerse';

type Params = Promise<{ gospel: string; chapter: string; verse: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const { gospel, chapter: chapterText, verse: verseText } = await params;
  const chapter = Number(chapterText);
  const verse = Number(verseText);
  if (!GOSPELS.includes(gospel as Gospel) || !Number.isInteger(chapter) || !Number.isInteger(verse)) return NextResponse.json({ error: 'Verse not found' }, { status: 404 });
  const counts = VERSE_COUNTS[gospel as Gospel];
  if (chapter < 1 || chapter > counts.length || verse < 1 || verse > counts[chapter - 1]) return NextResponse.json({ error: 'Verse not found' }, { status: 404 });
  const data = await loadVerse(gospel as Gospel, chapter, verse);
  if (!data) return NextResponse.json({ error: 'Alignment data not populated' }, { status: 404 });
  return NextResponse.json(publicVerse(data), { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800', 'X-Robots-Tag': 'index, follow' } });
}
