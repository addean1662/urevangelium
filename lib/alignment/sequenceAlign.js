/** Deterministic global sequence alignment. Inputs must already be normalized. */

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    for (let j = 0; j <= b.length; j++) previous[j] = current[j];
  }
  return previous[b.length];
}

export function similarity(a, b) {
  if (a === b) return 1;
  const longest = Math.max(a.length, b.length);
  return longest ? 1 - levenshtein(a, b) / longest : 1;
}

function pairScore(a, b) {
  if (a === b) return 8;
  if (Math.min(a.length, b.length) < 3) return -9;
  const likeness = similarity(a, b);
  if (likeness >= 0.8) return 4 + likeness;
  if (likeness >= 0.65) return 1 + likeness;
  return -9;
}

/**
 * Returns ordered operations. Ties prefer matches, then a source-only gap,
 * then a display-only gap, making repeated runs stable.
 */
export function alignSequences(source, display) {
  const rows = source.length + 1;
  const cols = display.length + 1;
  const gap = -3;
  const scores = Array.from({ length: rows }, () => new Float64Array(cols));
  const trace = Array.from({ length: rows }, () => new Uint8Array(cols)); // 1 diag, 2 source-only, 3 display-only
  for (let i = 1; i < rows; i++) { scores[i][0] = i * gap; trace[i][0] = 2; }
  for (let j = 1; j < cols; j++) { scores[0][j] = j * gap; trace[0][j] = 3; }

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const diagonal = scores[i - 1][j - 1] + pairScore(source[i - 1], display[j - 1]);
      const sourceOnly = scores[i - 1][j] + gap;
      const displayOnly = scores[i][j - 1] + gap;
      if (diagonal >= sourceOnly && diagonal >= displayOnly) { scores[i][j] = diagonal; trace[i][j] = 1; }
      else if (sourceOnly >= displayOnly) { scores[i][j] = sourceOnly; trace[i][j] = 2; }
      else { scores[i][j] = displayOnly; trace[i][j] = 3; }
    }
  }

  const operations = [];
  let i = source.length;
  let j = display.length;
  while (i > 0 || j > 0) {
    const direction = trace[i][j];
    if (direction === 1) {
      const likeness = similarity(source[i - 1], display[j - 1]);
      operations.push({ type: likeness === 1 ? 'exact' : likeness >= 0.8 ? 'orthographic' : 'ambiguous', sourceIndex: i - 1, displayIndex: j - 1, similarity: likeness });
      i--; j--;
    } else if (direction === 2) {
      operations.push({ type: 'source-only', sourceIndex: i - 1, displayIndex: null, similarity: null });
      i--;
    } else {
      operations.push({ type: 'display-only', sourceIndex: null, displayIndex: j - 1, similarity: null });
      j--;
    }
  }
  return operations.reverse();
}
