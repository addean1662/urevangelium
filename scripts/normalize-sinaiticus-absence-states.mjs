import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const WRITE = process.argv.includes('--write');
const totals = { records: 0, missingToEmpty: 0, lacunaToOmitted: 0, retainedOmitted: 0 };
for (const gospel of ['matthew','mark','luke','john']) {
  for (const chapter of fs.readdirSync(path.join(ROOT,'data',gospel)).filter((name) => Number.isInteger(Number(name)))) {
    for (const name of fs.readdirSync(path.join(ROOT,'data',gospel,chapter)).filter((item) => item.endsWith('.json'))) {
      const file = path.join(ROOT,'data',gospel,chapter,name);
      const data = JSON.parse(fs.readFileSync(file,'utf8'));
      let changed = false;
      for (const row of data.rows) {
        if (!row.sinaiticus) { row.sinaiticus = { type: 'empty' }; totals.missingToEmpty++; changed = true; continue; }
        if (row.sinaiticus.type === 'lacuna') {
          row.sinaiticus = { type: 'omitted', provenance: { witness: 'GA 01', source: 'CNTR Class 1 transcription', sourceReference: data._sinaiticusCertification?.sourceReference ?? (gospel+' '+chapter+':'+name.slice(0,-5)), classification: 'source-attested-textual-omission-not-physical-loss' } };
          totals.lacunaToOmitted++; changed = true;
        } else if (row.sinaiticus.type === 'omitted') totals.retainedOmitted++;
      }
      if (WRITE && changed) fs.writeFileSync(file, JSON.stringify(data,null,2)+'\n');
      totals.records++;
    }
  }
}
console.log(JSON.stringify({status:WRITE?'applied':'read-only',totals},null,2));
