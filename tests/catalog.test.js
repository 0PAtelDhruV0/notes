import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseCsv,Catalog} from '../src/services/catalog.js';
test('worldwide taxonomy is parsed and searchable by subsection',async()=>{
  const csv=await readFile(new URL('../catalog/worldwide-subjects.csv',import.meta.url),'utf8');
  const entries=parseCsv(csv);
  assert.equal(entries.length,1408);
  const cat=new Catalog(entries);
  assert.equal(cat.subjects.length,261);
  assert.equal(cat.fields.length,12);
  assert.ok(cat.search('Nuclear Engineering').length>=1);
  assert.ok(cat.search('reactor physics').length>=1);
  assert.ok(cat.subsections('Mathematics').length>0);
});
test('CSV parser handles quoted commas and escaped quotes',()=>{
  assert.deepEqual(parseCsv('broad_field,subject,subsection\nA,"Mathematics, Applied","He said ""hi"""\n'),[{broad_field:'A',subject:'Mathematics, Applied',subsection:'He said "hi"'}]);
});
