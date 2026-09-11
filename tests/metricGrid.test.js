import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import * as vue from 'vue';
import * as i18n from 'vue-i18n';
import { compileScript, parse } from 'vue/compiler-sfc';
import { renderToString } from 'vue/server-renderer';
import * as display from '../src/services/display.js';

// Render the real SFCs and list preview without requiring a browser or Vuetify.
const context = createContext({ console });
const modules = new Map();
for (const [name, exports] of Object.entries({ vue, 'vue-i18n': i18n, '@/services/display': display })) {
  modules.set(name, new SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
  }, { context }));
}

async function componentModule(name) {
  if (modules.has(name)) return modules.get(name);
  const filename = new URL(`../src/${name.slice(2)}`, import.meta.url);
  const { descriptor } = parse(await readFile(filename, 'utf8'));
  const { content } = compileScript(descriptor, { id: name, inlineTemplate: true });
  const module = new SourceTextModule(content, { context });
  modules.set(name, module);
  await module.link(componentModule);
  return module;
}

const module = await componentModule('@/components/MetricGrid.vue');
await module.evaluate();

async function render(items, props = {}) {
  const app = vue.createSSRApp(module.namespace.default, { items, ...props });
  app.use(i18n.createI18n({
    legacy: false,
    locale: 'en',
    messages: { en: { showMoreItems: 'Show {0} more', collapseItems: 'Collapse' } }
  }));
  app.component('v-btn', {
    setup: (_, { slots }) => () => vue.h('button', slots.default?.())
  });
  return renderToString(app);
}

test('voltage and package names do not expand scalar values or stack their peers', async () => {
  const html = await render([
    { key: 'dram_voltage', label: 'Voltage', value: '1.2V VDD' },
    { key: 'package', label: 'Package', value: 'FBGA-96, 7.5x13' },
    { key: 'revision', label: 'Revision', value: 'Rev F' }
  ]);
  assert.equal([...html.matchAll(/class="metric"/g)].length, 3);
  assert.doesNotMatch(html, /metric-grid--stacked|metric--long|metric--list|metric--multiline/);
  for (const value of ['1.2V VDD', 'FBGA-96, 7.5x13', 'Rev F']) assert.ok(html.includes(value));
});

test('long scalar text remains complete and does not turn neighboring fields into full rows', async () => {
  const value = 'Micron automotive solid state drive with self-encrypting storage';
  const html = await render([
    { key: 'description', label: 'Description', value },
    { key: 'capacity', label: 'Capacity', value: '256GB' }
  ]);
  assert.equal([...html.matchAll(/class="metric"/g)].length, 2);
  assert.ok(html.includes(value));
  assert.ok(html.includes('256GB'));
});

test('only multiple list entries reserve a full row and retain the bounded preview', async () => {
  const items = Array.from({ length: 10 }, (_, index) => `Controller-${index}`);
  const html = await render([
    { key: 'controller', label: 'Controllers', value: items.join(', '), items },
    { key: 'voltage', label: 'Voltage', value: '3.3V' },
    { key: 'other', label: 'Single controller', value: 'Single', items: ['Single'] }
  ], { listLimit: 4 });
  assert.equal([...html.matchAll(/class="metric metric--list"/g)].length, 1);
  assert.equal([...html.matchAll(/class="metric"/g)].length, 2);
  assert.ok(html.includes('Controller-3'));
  assert.ok(!html.includes('Controller-4'));
  assert.ok(html.includes('Show 6 more'));
  assert.ok(html.includes('Single'));
  assert.ok(html.includes('3.3V'));
});

test('a single multiline field keeps its line breaks without a duplicate label', async () => {
  const html = await render([
    { key: 'notes', label: 'Notes', value: 'First line\nSecond line' }
  ], { hideSingleLabel: true });
  assert.match(html, /metric-grid--single/);
  assert.ok(html.includes('First line\nSecond line'));
  assert.doesNotMatch(html, /metric-label/);
});
