import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const POPPLER = 'C:\\Users\\addea\\AppData\\Local\\Microsoft\\WinGet\\Packages\\oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe\\poppler-25.07.0\\Library\\bin\\pdftoppm.exe';
const TESSERACT = 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe';
const sources = {
  1: 'tmp/sources/horner/vol1-complete/copticversionofn01unse.pdf',
  2: 'tmp/sources/horner/vol2/copticversionofn02hornuoft.pdf',
  3: 'tmp/sources/horner/vol3/copticversionofn03hornuoft.pdf',
};
const pages = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources/horner-english/page-candidates.json'), 'utf8')).pages;
const args = process.argv.slice(2);
const option = (name) => args.includes(name) ? args[args.indexOf(name) + 1] : null;
const limit = Number(option('--limit') ?? 0);
const book = option('--book');
const force = args.includes('--force');
const concurrency = Math.max(1, Number(option('--concurrency') ?? 4));
const outputDir = path.join(ROOT, 'tmp/horner-ocr-shadow');
fs.mkdirSync(outputDir, { recursive: true });

const run = (command, commandArgs) => new Promise((resolve, reject) => {
  const child = spawn(command, commandArgs, { windowsHide: true });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', reject);
  child.on('close', (code) => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${path.basename(command)} exited ${code}: ${stderr}`)));
});

const pending = pages.filter((page) => page.scanPage && (!book || page.book.toLowerCase() === book.toLowerCase()))
  .filter((page) => force || !fs.existsSync(path.join(outputDir, `${page.book.toLowerCase()}-${page.printedPage}.json`)));
const selected = limit > 0 ? pending.slice(0, limit) : pending;
let cursor = 0;
let completed = 0;

const worker = async () => {
  while (cursor < selected.length) {
    const page = selected[cursor++];
    const stem = `${page.book.toLowerCase()}-${page.printedPage}`;
    const imageStem = path.join(outputDir, `${stem}-render`);
    const imagePath = `${imageStem}.png`;
    await run(POPPLER, ['-f', String(page.scanPage), '-l', String(page.scanPage), '-r', '300', '-png', '-singlefile', sources[page.volume], imageStem]);
    const ocr = await run(TESSERACT, [imagePath, 'stdout', '-l', 'eng', '--psm', '6']);
    const record = {
      volume: page.volume,
      book: page.book,
      printedPage: page.printedPage,
      pdfPage: page.scanPage,
      engine: 'Tesseract 5.4.0.20240606',
      mode: 'eng psm 6 at 300 dpi',
      text: ocr.stdout.trim(),
      textSha256: crypto.createHash('sha256').update(ocr.stdout.trim()).digest('hex'),
      status: 'INDEPENDENT_OCR_SHADOW_NOT_TRANSLATION_AUTHORITY',
    };
    fs.writeFileSync(path.join(outputDir, `${stem}.json`), `${JSON.stringify(record, null, 2)}\n`);
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    completed += 1;
    if (completed % 10 === 0 || completed === selected.length) console.log(JSON.stringify({ completed, selected: selected.length, remainingAfterRun: pending.length - selected.length }));
  }
};

await Promise.all(Array.from({ length: Math.min(concurrency, selected.length || 1) }, () => worker()));
console.log(JSON.stringify({ status: 'complete', completed, selected: selected.length, alreadyPresent: pages.length - pending.length }, null, 2));
