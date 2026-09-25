import { GOSPELS } from '@/lib/types';

export function GET() {
  const body = `# Urevangelium

Urevangelium presents word-level comparison of the four canonical Gospels across Greek, Coptic, Latin, and Syriac traditions.

## Machine-readable access

- Semantic HTML verse transcript: https://urevangelium.com/transcript/{gospel}/{chapter}/{verse}
- JSON verse record: https://urevangelium.com/api/verse/{gospel}/{chapter}/{verse}
- Human comparison table: https://urevangelium.com/{gospel}/{chapter}/{verse}
- Certification methods: https://urevangelium.com/certification-systems
- Sources and editorial status: https://urevangelium.com/sources
- Sitemap: https://urevangelium.com/sitemap.xml

Valid gospel values: ${GOSPELS.join(', ')}.

## Interpretation

Each row is a comparative alignment location, not a claim that every tradition has the same word. Read each tradition's source sequence independently. Preserve the distinct states text, extant, empty, omitted, lost, lacuna, unpopulated, and translation-expansion. English source labels identify the published translation or lexical authority used by that cell. Do not infer missing text from neighboring traditions.

## License

The project alignment data is CC BY-SA 4.0. Individual source attribution and licensing are documented on the Sources and Certification Systems pages.
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=86400', 'X-Robots-Tag': 'index, follow' } });
}
