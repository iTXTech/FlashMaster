import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import { automaticRequest } from '../src/services/automaticRequests.js';
import { DEFAULT_HTTP_REQUEST_TIMEOUT_MS, runWithRequestTimeout } from '../src/services/requestControl.js';

const source = await readFile(new URL('../src/services/flashApi.js', import.meta.url), 'utf8');
async function harness() {
  const settings = { embedded: false, lang: 'chs', server: 'https://test.example', group: 'all' };
  const calls = [];
  const embeddedCalls = [];
  const context = createContext({ URL, fetch: (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    calls.push({ url: new URL(url), signal, complete: () => resolve({ ok: true, text: async () => JSON.stringify({ schemaVersion: 'fdnext.result.v1', items: [] }) }) });
  }) });
  const synthetic = values => new SyntheticModule(Object.keys(values), function () {
    for (const [key, value] of Object.entries(values)) this.setExport(key, value);
  }, { context });
  const dependencies = {
    '@/store': synthetic({ default: {
      isEmbeddedParser: () => settings.embedded,
      getLang: () => settings.lang,
      getServerAddress: () => settings.server,
      getControllerGroupParam: () => settings.group
    } }),
    '@/services/fdnextApi': synthetic(Object.fromEntries([
      'decodeEmbeddedFlashId', 'decodeEmbeddedPartNumber', 'getEmbeddedInfo',
      'searchEmbeddedFlashId', 'searchEmbeddedPartNumber', 'warmEmbeddedParser'
    ].map(name => [name, (...args) => { embeddedCalls.push({ name, args }); return { schemaVersion: 'fdnext.result.v1', items: [] }; }]))),
    '@/services/fdnextResultView': synthetic({ FDNEXT_CAPABILITIES_SCHEMA_VERSIONS: ['fdnext.capabilities.v1'], summaryText: () => 'summary' }),
    '@/services/requestControl': synthetic({ DEFAULT_HTTP_REQUEST_TIMEOUT_MS, runWithRequestTimeout }),
    '@/services/automaticRequests': synthetic({ automaticRequest })
  };
  const module = new SourceTextModule(source, { context });
  await module.link(specifier => dependencies[specifier]);
  await module.evaluate();
  return { api: module.namespace, settings, calls, embeddedCalls };
}

test('HTTP searches retain full-response contract; only automatic reads coalesce and forward cancellation', async () => {
  const h = await harness();
  const controller = new AbortController();
  const first = h.api.searchPartNumber('MT29F', 10, { automatic: true, signal: controller.signal });
  const second = h.api.searchPartNumber('MT29F', 10, { automatic: true });
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].url.searchParams.get('limit'), '10');
  controller.abort();
  await assert.rejects(first, { name: 'AbortError' });
  assert.equal(h.calls[0].signal.aborted, false);
  h.calls[0].complete();
  await second;
  const manual = [h.api.searchPartNumber('MT29F'), h.api.searchPartNumber('MT29F')];
  assert.equal(h.calls.length, 3);
  for (const call of h.calls.slice(1)) {
    assert.equal(call.url.searchParams.has('limit'), false);
    assert.equal(call.url.searchParams.has('page'), false);
    assert.equal(call.url.searchParams.has('offset'), false);
    call.complete();
  }
  await Promise.all(manual);
});

test('context keys invalidate displayed summaries and automatic reads across parser, language and controller changes', async () => {
  const h = await harness();
  const keys = [h.api.lookupContextKey('parts/decode', 'NW403')];
  for (const [setting, value] of [['lang', 'eng'], ['group', 'smi'], ['server', 'https://other.example'], ['embedded', true]]) {
    h.settings[setting] = value;
    keys.push(h.api.lookupContextKey('parts/decode', 'NW403'));
  }
  keys.push(h.api.lookupContextKey('parts/decode', 'NW404'));
  keys.push(h.api.lookupContextKey('identifiers/decode', 'NW403'));
  assert.equal(new Set(keys).size, keys.length);
  const controller = new AbortController();
  await h.api.decodeFlashId('2CDA', { signal: controller.signal });
  assert.equal(h.embeddedCalls[0].args[1].signal, controller.signal);
  await h.api.searchFlashId('2CD', 10, { signal: controller.signal, automatic: true });
  assert.equal(h.embeddedCalls[1].args[1], 10);
  assert.equal(h.embeddedCalls[1].args[2].automatic, true);
});
