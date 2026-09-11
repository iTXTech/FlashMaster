import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import * as display from '../src/services/display.js';

const context = createContext({ URL });
const synthetic = exports => new SyntheticModule(Object.keys(exports), function () {
  for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
}, { context });
const dependencies = {
  '@/services/display': synthetic(display),
  '@/router/locations': synthetic(Object.fromEntries(['idRoute', 'idsSearchRoute', 'partRoute', 'partsSearchRoute'].map(name => [name, query => ({ name, query })]))),
  '@/services/vendorLogos': synthetic({ default: () => '', isVendorLogoDark: () => false })
};
const module = new SourceTextModule(await readFile(new URL('../src/services/fdnextResultView.js', import.meta.url), 'utf8'), { context });
await module.link(name => dependencies[name]);
await module.evaluate();
const { resultBlocks, summaryText, technicalLinksText, fieldRows, specificationRows, isFdnextResult, externalLinkRows, relationRows } = module.namespace;
const fixtures = ['raw-nand', 'dram', 'emcp', 'emmc', 'ufs'];

for (const family of fixtures) {
  test(`${family}: page exposes every full field, including fields outside the brief summary`, async () => {
    const result = JSON.parse(await readFile(new URL(`../vendor/fdnext/packages/core/test/fixtures/fdnext-result/${family}.part.decode.json`, import.meta.url), 'utf8'));
    assert.equal(isFdnextResult(result), true);
    const expected = result.summary.full.flatMap(block => block.fields);
    const rows = resultBlocks(result).flatMap(block => block.rows);
    assert.deepEqual(Array.from(rows, row => row.key), expected.map(field => field.key));
    assert.ok(rows.length > result.summary.brief.length);
    const full = summaryText(result, 'full');
    for (const row of rows) assert.ok(full.includes(`${row.name}: ${row.value}`));
  });
}

test('brief and full copies retain identity, scope and warnings and exclude all external promotion', () => {
  const fields = [
    { key: 'density', label: 'Device capacity', value: '256GB' },
    { key: 'component_density', label: 'NAND component capacity', value: '512Gb' },
    { key: 'component_voltage', label: 'NAND component voltage', value: '3.3V' },
    { key: 'sector_size', label: 'Sector size', value: '512B' },
    { key: 'controller', label: 'Controllers', value: Array.from({ length: 12 }, (_, i) => `CTRL-${i}`) }
  ];
  const result = {
    schemaVersion: 'fdnext.result.v2', status: 'ok', input: { query: 'JZ215', lang: 'eng' },
    device: { partNumber: 'MTFDHBL256TDQ-1AT12ATYY', markingCode: 'JZ215', vendor: { name: 'Micron' }, productType: 'nvme' },
    summary: { brief: fields.slice(0, 2), full: [{ id: 'storage', label: 'Storage', fields }] },
    warnings: [{ code: 'partial', message: 'Do not infer the component count' }],
    links: [{ id: 'ad', label: 'Promotional title', hint: 'Promotional hint', category: 'ads', url: 'https://example.com/ad?utm_source=test' }]
  };
  for (const mode of ['brief', 'full']) {
    const text = summaryText(result, mode);
    for (const value of ['JZ215', 'MTFDHBL256TDQ-1AT12ATYY', '256GB', '512Gb', 'Do not infer the component count']) assert.ok(text.includes(value));
    assert.doesNotMatch(text, /Promotional|example.com|utm_source/);
  }
  assert.match(summaryText(result, 'brief'), /12 items/);
  assert.doesNotMatch(summaryText(result, 'brief'), /CTRL-11/);
  assert.match(summaryText(result, 'full'), /CTRL-11/);
  assert.match(summaryText(result, 'full'), /NAND component voltage: 3.3V/);
  assert.match(summaryText(result, 'full'), /Sector size: 512B/);
});

test('technical source copy uses explicit categories and keeps functional URL parameters', () => {
  const result = { links: [
    { id: 'ds', category: 'ds', label: 'Datasheet', url: 'https://example.com/pdf?id=42&utm_source=fm#page=3' },
    { id: 'ref', category: 'ref', label: 'Reference', url: 'https://example.com/reference?part=AB' },
    { id: 'ad', category: 'ads', label: 'Ad', url: 'https://example.com/ad' },
    { id: 'unknown', label: 'Unknown', url: 'https://example.com/unknown' },
    { id: 'tool', category: 'tl', label: 'Tool', url: 'https://example.com/search' }
  ] };
  const text = technicalLinksText(result);
  assert.match(text, /id=42#page=3/);
  assert.match(text, /part=AB/);
  assert.doesNotMatch(text, /utm_|Ad:|Unknown|Tool/);
  assert.equal(externalLinkRows(result.links).length, 5);
  assert.equal(externalLinkRows(result.links).find(row => row.id === 'ad').isAdvertisement, true);
  assert.equal(isFdnextResult({ schemaVersion: 'fdnext.result.v1' }), false);
});

test('zero, false, long values and scoped labels remain available without inference', () => {
  const rows = fieldRows([
    { key: 'zero', label: 'Zero', value: 0 },
    { key: 'false', label: 'Flag', value: false },
    { key: 'dram_voltage', label: 'DRAM Voltage', value: '1.2V VDD' },
    { key: 'dram_speed', label: 'DRAM Speed', value: 'DDR4-2666 CL18' }
  ]);
  assert.equal(rows[0].value, 0);
  assert.equal(rows[1].value, false);
  const specs = specificationRows(rows, { compactLabels: true });
  assert.equal(specs[2].label, 'Voltage');
  assert.equal(specs[2].name, 'DRAM Voltage');
  assert.equal(specs[2].mobileLong, false);
  assert.equal(specs[3].mobileLong, true);
  assert.equal(specs[3].value, 'DDR4-2666 CL18');
});

test('default PN and ID associations remain reciprocal while special relations keep their labels', () => {
  for (const [operation, nextOperation, routeName] of [
    ['part.decode', 'identifier.decode', 'idRoute'],
    ['identifier.decode', 'part.decode', 'partRoute']
  ]) {
    const relation = {
      kind: 'identifier_for', target: { label: 'TARGET' },
      action: { operation: nextOperation, label: 'Decode target', input: { query: 'TARGET' } },
      fields: [{ key: 'note', label: 'Note', value: 'Retain association metadata' }]
    };
    const [standard, special, search, unavailable] = relationRows({ operation, relations: [
      relation,
      { ...relation, kind: 'alternative', label: 'Alternative package' },
      { ...relation, action: { operation: 'part.search', label: 'Search parts', input: { query: 'TARGET' } } },
      { ...relation, action: undefined }
    ] });
    assert.equal(standard.isDefaultNavigation, true);
    assert.equal(standard.route.name, routeName);
    assert.equal(standard.route.query, 'TARGET');
    assert.equal(standard.fields[0].value, 'Retain association metadata');
    assert.equal(standard.label, 'Decode target');
    assert.equal(special.isDefaultNavigation, false);
    assert.equal(special.label, 'Alternative package');
    assert.equal(search.isDefaultNavigation, false);
    assert.equal(search.route.name, 'partsSearchRoute');
    assert.equal(search.label, 'Search parts');
    assert.equal(unavailable.isDefaultNavigation, false);
    assert.equal(unavailable.route, null);
  }
});
