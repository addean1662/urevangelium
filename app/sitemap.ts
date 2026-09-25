import type { MetadataRoute } from 'next';
import { GOSPELS } from '@/lib/types';
import { VERSE_COUNTS } from '@/lib/verseCounts';

const origin = 'https://urevangelium.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const urls: MetadataRoute.Sitemap = [
    { url: origin, changeFrequency: 'weekly', priority: 1 },
    { url: `${origin}/sources`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${origin}/certification-systems`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${origin}/earliest-papyri`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${origin}/vaticanus`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${origin}/byzantine`, changeFrequency: 'monthly', priority: 0.7 },
  ];
  for (const gospel of GOSPELS) {
    VERSE_COUNTS[gospel].forEach((count, chapterIndex) => {
      const chapter = chapterIndex + 1;
      for (let verse = 1; verse <= count; verse += 1) {
        urls.push({ url: `${origin}/${gospel}/${chapter}/${verse}`, changeFrequency: 'monthly', priority: 0.6 });
        urls.push({ url: `${origin}/transcript/${gospel}/${chapter}/${verse}`, changeFrequency: 'monthly', priority: 0.5 });
      }
    });
  }
  return urls;
}
