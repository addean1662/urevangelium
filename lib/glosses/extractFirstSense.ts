// Extract the first gloss sense from a Whitaker DICTLINE definition string.
// DICTLINE groups senses with semicolons (major groups) then commas (variants).
// We want the first comma-unit of the first semicolon-group.
// "man, human being, person, fellow" → "man"
// "in, on, at (space)"               → "in"
// "therefore"                         → "therefore" (no change)

export function extractFirstSense(definition: string): string {
  if (!definition) return '';
  const firstGroup = definition.split(';')[0].trim();
  const firstSense = firstGroup.split(',')[0].trim();
  return firstSense.replace(/,+$/, '').trim();
}
