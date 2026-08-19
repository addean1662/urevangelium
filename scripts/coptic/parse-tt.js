'use strict';
/**
 * parse-tt.js
 * Parses Sahidica NT TreeTagger SGML files into structured verse/word data.
 *
 * TT format overview:
 *   <verse_n verse_n="N" translation="WEB text">
 *     <norm_group orig_group="ⲡϫⲱⲱⲙⲉ" ...>
 *       <norm xml:id="uN" pos="ART" lemma="ⲡ" ...>ⲡ</norm>
 *       <norm xml:id="uN" pos="N" lemma="ϫⲱⲱⲙⲉ" lang="Greek" ...>ϫⲱⲱⲙⲉ</norm>
 *     </norm_group>
 *     ...
 *   </verse_n>
 *
 * We extract display words at norm_group level, taking the head morpheme
 * (first N/V/NPROP/ADJ) for POS/lemma/lang metadata.
 */

const SKIP_PUNCT = /^[.,:;·!?\s·⳰⳱\[\](){}]+$/;
const HEAD_POS = new Set(['N', 'V', 'NPROP', 'ADJ', 'NUM', 'VSTAT']);
const SKIP_POS  = new Set(['PUNCT']);

/**
 * @param {string} content - full UTF-8 content of a .tt chapter file
 * @returns {Map<number, {verse: number, translation: string, words: CopticWord[]}>}
 */
function parseTTChapter(content) {
  const result = new Map();

  for (const record of parseTTChapterSequence(content)) {
    if (record.words.length > 0) result.set(record.verse, record);
  }

  return result;
}

/**
 * Preserve document order and repeated verse numbers. This is required for the
 * distributed Sahidica 4.1.0 John file, where John 8 follows John 7 in the
 * physical 43_John_07.tt file and therefore repeats verse numbers.
 */
function parseTTChapterSequence(content) {
  const result = [];

  // Locate all <verse_n ...> tag positions
  const verseTagRe = /<verse_n\s[^>]*verse_n="(\d+)"[^>]*>/g;
  const verseStarts = [];
  let m;
  while ((m = verseTagRe.exec(content)) !== null) {
    // Extract translation attr from the full tag
    const tag = content.slice(m.index, content.indexOf('>', m.index) + 1);
    const tMatch = tag.match(/translation="((?:[^"\\]|\\.)*)"/);
    const translation = tMatch
      ? tMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      : '';
    verseStarts.push({ num: parseInt(m[1]), start: m.index, translation });
  }

  for (let i = 0; i < verseStarts.length; i++) {
    const { num, start, translation } = verseStarts[i];
    const end = i + 1 < verseStarts.length ? verseStarts[i + 1].start : content.length;
    const block = content.slice(start, end);
    const words = extractWords(block);
    result.push({ verse: num, translation, words });
  }

  return result;
}

/**
 * @typedef {{ text: string, pos: string, lemma: string, lang?: string, identity?: string }} CopticWord
 */

function extractWords(verseBlock) {
  const words = [];

  // Extract all entity identity annotations visible in this block
  // We build a position→identity map so we can annotate each norm_group
  const identityByHeadToken = new Map();
  const entityOpenRe = /<entity\s[^>]*>/g;
  let em;
  while ((em = entityOpenRe.exec(verseBlock)) !== null) {
    const tag = em[0];
    const idMatch = tag.match(/identity="([^"]+)"/);
    const headMatch = tag.match(/head_tok="#?([^"]+)"/);
    if (idMatch && headMatch) identityByHeadToken.set(headMatch[1], idMatch[1]);
  }

  // Two TT format variants in the Sahidica corpus:
  //   Matthew/Luke/John: <norm_group orig_group="TEXT" ...>...</norm_group>
  //   Mark:              <orig_group orig_group="TEXT">...<norm_group>...</norm_group>...</orig_group>
  //                      (lang info is in <lang lang="Greek"> child elements, not norm attrs)
  const hasNormGroupOrig = /<norm_group\s[^>]*orig_group="/.test(verseBlock);
  const outerTag = hasNormGroupOrig ? 'norm_group' : 'orig_group';
  const groupRe = new RegExp(
    `<${outerTag}\\s[^>]*orig_group="([^"]+)"[^>]*>([\\s\\S]*?)<\\/${outerTag}>`,
    'g'
  );

  let gm;
  while ((gm = groupRe.exec(verseBlock)) !== null) {
    const origGroup = gm[1].trim();
    if (SKIP_PUNCT.test(origGroup)) continue;

    const groupContent = gm[2];
    // Parse <norm> elements — capture both attributes and inner content for lang detection.
    // Matthew: lang="Greek" is an attribute on <norm>.
    // Mark:    <lang lang="Greek"> is a child element inside <norm>...</norm>.
    const normRe = /<norm\s([^>]*)>([\s\S]*?)<\/norm>/g;
    let nm;
    let headNorm = null;
    let firstNorm = null;

    while ((nm = normRe.exec(groupContent)) !== null) {
      const attrs = nm[1];
      const normContent = nm[2];

      const posM   = attrs.match(/\bpos="([^"]+)"/);
      const lemmaM = attrs.match(/\blemma="([^"]+)"/);
      const tokenIdM = attrs.match(/\bxml:id="([^"]+)"/);
      if (!posM || !lemmaM) continue;

      const pos   = posM[1];
      const lemma = lemmaM[1];

      // lang: attribute on <norm> (Matthew) OR <lang lang="..."> child (Mark)
      const langAttrM = attrs.match(/\blang="([^"]+)"/);
      const langElemM = normContent.match(/<lang\s[^>]*lang="([^"]+)"/);
      const lang = langAttrM ? langAttrM[1] : (langElemM ? langElemM[1] : undefined);

      const norm = { pos, lemma, lang, tokenId: tokenIdM ? tokenIdM[1] : undefined };
      if (!firstNorm) firstNorm = norm;
      if (!headNorm && HEAD_POS.has(pos)) headNorm = norm;
    }

    const head = headNorm || firstNorm;
    if (!head || SKIP_POS.has(head.pos)) continue;

    const identity = head.pos === 'NPROP' && head.tokenId
      ? identityByHeadToken.get(head.tokenId)
      : null;

    words.push({
      text: origGroup,
      pos: head.pos,
      lemma: head.lemma,
      lang: head.lang,
      identity: identity || undefined,
    });
  }

  return words;
}

module.exports = { parseTTChapter, parseTTChapterSequence };
