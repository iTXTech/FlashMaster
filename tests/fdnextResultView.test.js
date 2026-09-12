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

test('identifier typography follows field semantics without changing display values or labels', () => {
  const fields = [
    { key: 'part_number', label: '料号', value: 'MT29F4G08ABAEA' },
    { key: 'marking_code', label: '丝印', value: 'JZ215' },
    { key: 'identifier', label: 'Flash ID', value: '2CDC90A65400' },
    { key: 'micron_part_number', label: 'Micron Part Number', value: 'MT29F4G08ABAEA' },
    { key: 'controller_code', label: 'Controller Code', value: 'SM2258' },
    { key: 'controller_revision', label: 'Controller Revision', value: 'A1' },
    { key: 'controller', label: '控制器', value: ['SM3257ENAA_8CE', 'SM3257ENLT'] },
    { key: 'vendor', label: 'Vendor', value: 'Micron' },
    { key: 'density', label: 'Capacity', value: 4096, unit: 'Mbit', display: '512MB' },
    { key: 'note', label: 'Note', value: 'MT29F4G08ABAEA is an example' }
  ];
  const rows = fieldRows(fields);
  assert.deepEqual(Array.from(rows, row => row.isIdentifier), [true, true, true, true, true, true, true, false, false, false]);
  assert.deepEqual(Array.from(rows, row => row.name), fields.map(field => field.label));
  assert.equal(rows[6].value, 'SM3257ENAA_8CE, SM3257ENLT');
  assert.deepEqual(Array.from(rows[6].items), fields[6].value);
  assert.equal(rows[8].value, '512MB');
  assert.equal(specificationRows(rows)[0].isIdentifier, true);
});

test('related identifiers use the same typography even without navigation while descriptive relations stay prose', () => {
  const rows = relationRows({ relations: [
    { target: { label: 'MT29F4G08ABAEA' }, action: { operation: 'part.decode', input: { query: 'MT29F4G08ABAEA' } } },
    { target: { identifier: '2CDC90A65400' } },
    { source: { device: { partNumber: 'MT29F4G08ABAEA' } } },
    { target: { label: 'Related manufacturer' } },
    { source: { partNumber: 'MT29F4G08ABAEA' }, target: { label: 'Micron' } }
  ] });
  assert.deepEqual(Array.from(rows, row => row.isIdentifier), [true, true, true, false, false]);
  assert.equal(rows[1].target, '2CDC90A65400');
  assert.equal(rows[3].target, 'Related manufacturer');
});

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

test('numeric capacities preserve device, DRAM and alternative component displays', () => {
  const result = {
    schemaVersion: 'fdnext.result.v2', operation: 'part.decode', status: 'ok',
    input: { query: 'MCP', lang: 'eng' }, device: { partNumber: 'MCP' },
    summary: { brief: [], full: [
      { id: 'storage', label: 'Storage', fields: [{ key: 'storage_density', label: 'Storage Density', value: 524288, unit: 'Mbit', display: '64GB' }] },
      { id: 'dram', label: 'DRAM', fields: [{ key: 'dram_density', label: 'DRAM Density', value: 32768, unit: 'Mbit', display: '32Gb' }] },
      { id: 'components', label: 'Components', fields: [{ key: 'component_density_options', label: 'Component Density Options', value: [262144, 524288], unit: 'Mbit', display: '32GB / 64GB' }] }
    ] }
  };
  const blocks = resultBlocks(result);
  assert.deepEqual(Array.from(blocks, block => [block.id, block.rows[0].value]), [
    ['storage', '64GB'], ['dram', '32Gb'], ['components', '32GB / 64GB']
  ]);
  const text = summaryText(result, 'full');
  assert.match(text, /Storage Density: 64GB/);
  assert.match(text, /DRAM Density: 32Gb/);
  assert.match(text, /Component Density Options: 32GB \/ 64GB/);
  assert.doesNotMatch(text, /524288|262144|32768|Mbit/);
});

test('decode links use compact navigation while preserving relation labels and metadata', () => {
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
    assert.equal(standard.isDecodeNavigation, true);
    assert.equal(standard.route.name, routeName);
    assert.equal(standard.route.query, 'TARGET');
    assert.equal(standard.fields[0].value, 'Retain association metadata');
    assert.equal(standard.label, 'Decode target');
    assert.equal(special.isDefaultNavigation, false);
    assert.equal(special.isDecodeNavigation, true);
    assert.equal(special.label, 'Alternative package');
    assert.equal(search.isDefaultNavigation, false);
    assert.equal(search.isDecodeNavigation, false);
    assert.equal(search.route.name, 'partsSearchRoute');
    assert.equal(search.label, 'Search parts');
    assert.equal(unavailable.isDefaultNavigation, false);
    assert.equal(unavailable.isDecodeNavigation, false);
    assert.equal(unavailable.route, null);
  }
});

test('mixed PN-to-ID and PN-to-PN decode links keep their distinct destinations', () => {
  const result = { operation: 'part.decode', relations: [
    { kind: 'identifier_for', target: { identifier: '983AA8927650' }, action: { operation: 'identifier.decode', input: { query: '983AA8927650' } } },
    { kind: 'alternate_part', target: { partNumber: 'TC58NVG5DCJTA00' }, action: { operation: 'part.decode', label: 'Decode part', input: { query: 'TC58NVG5DCJTA00' } } },
    { kind: 'alternate_part', target: { partNumber: 'Unresolved' }, action: { operation: 'part.decode' } }
  ] };
  const [id, pn, unresolved] = relationRows(result);
  assert.equal(id.isDecodeNavigation, true);
  assert.equal(id.route.name, 'idRoute');
  assert.equal(id.route.query, '983AA8927650');
  assert.equal(pn.isDecodeNavigation, true);
  assert.equal(pn.isDefaultNavigation, false);
  assert.equal(pn.route.name, 'partRoute');
  assert.equal(pn.route.query, 'TC58NVG5DCJTA00');
  assert.equal(pn.label, 'Decode part');
  assert.equal(unresolved.isDecodeNavigation, false);
  assert.equal(unresolved.route, null);
});
