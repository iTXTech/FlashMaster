import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import * as vue from 'vue';
import { compileScript, parse } from 'vue/compiler-sfc';
import { renderToString } from 'vue/server-renderer';
import * as i18n from 'vue-i18n';
import * as display from '../src/services/display.js';

const context = createContext({ URL });
const synthetic = exports => new SyntheticModule(Object.keys(exports), function () {
  for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
}, { context });
async function messages(locale) {
  const module = new SourceTextModule(await readFile(new URL(`../src/lang/${locale}.js`, import.meta.url), 'utf8'), { context });
  await module.link(() => synthetic({ default: '' }));
  await module.evaluate();
  return module.namespace.default;
}
const chs = await messages('chs');
const eng = await messages('eng');
const slot = { setup: (_, { slots }) => () => vue.h('div', slots.default?.()) };
const locations = Object.fromEntries(['idRoute', 'idsSearchRoute', 'partRoute', 'partsSearchRoute', 'settingsRoute'].map(name => [name, query => ({ name, query })]));
const dependencies = {
  vue: synthetic(vue),
  'vue-i18n': synthetic(i18n),
  'vue-router': synthetic({ useRoute: () => ({ params: { locale: 'zh' } }) }),
  '@/services/display': synthetic(display),
  '@/router/locations': synthetic({ ...locations, localizeRouteLocation: value => value }),
  '@/services/vendorLogos': synthetic({ default: () => '', isVendorLogoDark: () => false }),
  '@/components/DecodeSpecificationSheet.vue': synthetic({ default: slot }),
  '@/components/ExternalLinks.vue': synthetic({ default: { props: ['links'], setup: props => () => vue.h('div', props.links.map(link => vue.h('a', { href: link.url }, link.label))) } }),
  '@/components/VendorLogo.vue': synthetic({ default: slot })
};
const resultView = new SourceTextModule(await readFile(new URL('../src/services/fdnextResultView.js', import.meta.url), 'utf8'), { context });
await resultView.link(name => dependencies[name]);
await resultView.evaluate();
dependencies['@/services/fdnextResultView'] = resultView;
const { descriptor } = parse(await readFile(new URL('../src/components/DecodeResultPanel.vue', import.meta.url), 'utf8'));
const component = new SourceTextModule(compileScript(descriptor, { id: 'decode-panel-test', inlineTemplate: true }).content, { context });
await component.link(name => dependencies[name]);
await component.evaluate();

async function render(props, locale = 'chs') {
  const app = vue.createSSRApp(component.namespace.default, { kind: 'pn', ...props });
  app.use(i18n.createI18n({ legacy: false, locale, messages: { chs, eng } }));
  for (const name of ['v-btn', 'v-menu', 'v-list', 'v-list-item', 'v-icon', 'router-link']) app.component(name, slot);
  return renderToString(app);
}

const missing = {
  status: 'not_found', operation: 'identifier.decode', input: { query: '123456789ABC' },
  links: [{ category: 'ads', label: 'Advertisement', url: 'https://example.com/ad' }]
};

test('idle guidance has fillable examples without result identity or copy controls in either language', async () => {
  for (const locale of ['chs', 'eng']) {
    const html = await render({}, locale);
    assert.match(html, /decode-state-examples/);
    assert.match(html, /K9OKGY8S7C-CCK0/);
    assert.doesNotMatch(html, /decode-copy-actions|decode-vendor|decodeState\./);
  }
});

test('an unmatched Flash ID keeps its label and external links but has no empty identity or summary controls', async () => {
  const html = await render({ kind: 'fid', result: missing });
  assert.ok(html.includes(chs.flashId));
  assert.doesNotMatch(html, /料号:|decode-copy-actions|decode-vendor/);
  assert.match(html, /123456789ABC/);
  assert.match(html, /https:\/\/example.com\/ad/);
  assert.ok(html.includes(chs.decodeState.search));
});

test('partial vendor identity and candidates remain visible and copyable without specification blocks', async () => {
  for (const extra of [
    { device: { vendor: { name: 'Micron' } } },
    { candidates: [{ device: { partNumber: 'CANDIDATE-PN' } }] }
  ]) {
    const html = await render({ result: { ...missing, ...extra } });
    assert.match(html, /decode-copy-actions/);
    assert.match(html, /Micron|CANDIDATE-PN/);
  }
});

test('invalid input preserves diagnostics without offering an empty result summary', async () => {
  const html = await render({ kind: 'fid', result: {
    ...missing, status: 'invalid_input', warnings: [{ code: 'invalid_nand_flash_id', message: 'Invalid hexadecimal bytes' }]
  } });
  assert.match(html, /Invalid hexadecimal bytes/);
  assert.match(html, /decode-state--error/);
  assert.doesNotMatch(html, /decode-copy-actions|decode-vendor/);
});

test('failed requests retain the submitted query and reason, with settings recovery limited to HTTP', async () => {
  for (const http of [true, false]) {
    const html = await render({ error: { kind: 'request_failed', query: 'FAILED-PN', message: 'Connection refused', http } });
    assert.match(html, /FAILED-PN/);
    assert.match(html, /Connection refused/);
    assert.ok(html.includes(chs.decodeState.retry));
    assert.equal(html.includes(chs.decodeState.serverSettings), http);
    assert.doesNotMatch(html, /decode-state-examples|decode-copy-actions/);
  }
});

test('pending requests add no result panel or status, even when a previous result or failure exists', async () => {
  for (const props of [{}, { result: missing }, { error: { kind: 'timeout', query: 'OLD-PN' } }]) {
    const html = await render({ ...props, loading: true });
    assert.doesNotMatch(html, /decode-result-panel|decode-state|OLD-PN|123456789ABC/);
  }
});
