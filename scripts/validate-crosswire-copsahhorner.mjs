import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const dir = path.join(ROOT, 'data/sources/crosswire-copsahhorner');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const files = {
  'CopSahHorner-raw.zip': path.join(dir, 'CopSahHorner-raw.zip'),
  'copsahhorner.conf': path.join(dir, 'raw/mods.d/copsahhorner.conf'),
  'nt.bzs': path.join(dir, 'raw/modules/texts/ztext/copsahhorner/nt.bzs'),
  'nt.bzv': path.join(dir, 'raw/modules/texts/ztext/copsahhorner/nt.bzv'),
  'nt.bzz': path.join(dir, 'raw/modules/texts/ztext/copsahhorner/nt.bzz'),
};
const errors = [];
for (const [name, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) { errors.push(`${name} missing`); continue; }
  const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (actual !== manifest.sha256[name]) errors.push(`${name} SHA-256 mismatch: ${actual}`);
}
const conf = fs.readFileSync(files['copsahhorner.conf'], 'utf8');
for (const expected of ['TextSource=Slavic Bible for Windows', 'DistributionLicense=Public Domain', 'Version=1.5']) if (!conf.includes(expected)) errors.push(`Module metadata missing ${expected}`);
if (manifest.admissibility.authoritativeHornerCoptic !== false) errors.push('Unverified CrossWire text must not be marked authoritative');
if (manifest.admissibility.englishTranslationSource !== false) errors.push('Coptic-only module must not be marked as English translation');
console.log(JSON.stringify({ status: errors.length ? 'failed' : 'verified-local-package-provenance-insufficient', files: Object.keys(files).length, errors }, null, 2));
if (errors.length) process.exitCode = 1;
