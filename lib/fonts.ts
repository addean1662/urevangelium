/**
 * Single source-of-truth for font configuration.
 *
 * All fonts are loaded locally from /public/fonts/. No CDN calls at runtime.
 *
 * Font files must be placed in /public/fonts/ before production deployment.
 * See /public/fonts/LICENSES.md for license details and download sources.
 *
 * v2 hook: SBL Greek entry is commented out pending written license
 * clarification from the Society of Biblical Literature. When clearance
 * is obtained, uncomment and swap fontGreek below.
 */

export const FONT_CONFIG = {
  greek: {
    name: 'Cardo',
    cssVariable: '--font-greek',
    files: [
      { path: '/fonts/Cardo-Regular.woff2', weight: '400', style: 'normal' },
      { path: '/fonts/Cardo-Italic.woff2', weight: '400', style: 'italic' },
      { path: '/fonts/Cardo-Bold.woff2', weight: '700', style: 'normal' },
    ],
    license: 'SIL OFL 1.1',
    fallback: 'serif',
  },
  latin: {
    name: 'EB Garamond',
    cssVariable: '--font-latin',
    files: [
      { path: '/fonts/EBGaramond-Regular.woff2', weight: '400', style: 'normal' },
      { path: '/fonts/EBGaramond-Italic.woff2', weight: '400', style: 'italic' },
    ],
    license: 'SIL OFL 1.1',
    fallback: 'Cardo, serif',
  },
  syriac: {
    name: 'Beth Mardutho Estrangela Edessa',
    cssVariable: '--font-syriac',
    files: [
      { path: '/fonts/EstrangeloEdessa-BM.woff2', weight: '400', style: 'normal' },
    ],
    license: 'SIL OFL 1.1',
    fallback: '"Serto Jerusalem", serif',
  },
  syriacFallback: {
    name: 'Serto Jerusalem',
    cssVariable: '--font-syriac-fallback',
    files: [
      { path: '/fonts/SertoJerusalem.woff2', weight: '400', style: 'normal' },
    ],
    license: 'SIL OFL 1.1',
    fallback: 'serif',
  },

  // v2: SBL Greek — DO NOT enable until SBL written license clarification obtained.
  // sblGreek: {
  //   name: 'SBL Greek',
  //   cssVariable: '--font-greek-diplomatic',
  //   files: [
  //     { path: '/fonts/SBLGreek.woff2', weight: '400', style: 'normal' },
  //   ],
  //   license: 'SBL Font EULA — PENDING web-embedding clarification',
  //   fallback: 'Cardo, serif',
  //   note: 'Swap into --font-greek variable when cleared. See /public/fonts/LICENSES.md',
  // },
} as const;

export type FontScript = keyof typeof FONT_CONFIG;
