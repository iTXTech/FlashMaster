import assert from 'node:assert/strict';
import { test } from 'node:test';
import { effectScope, shallowRef } from 'vue';
import { useCapabilityInventory } from '../src/composables/useCapabilityInventory.js';

function setup(t, input) {
  const scope = effectScope();
  t.after(() => scope.stop());
  const data = shallowRef(input);
  return { data, inventory: scope.run(() => useCapabilityInventory(() => data.value)) };
}

const sample = () => ({
  inventory: { controllers: { defaultGroups: ['selected'], items: ['SM2263XT', 'SM2320'], groups: [
    { id: 'all', title: 'All', count: 2, items: ['SM2263XT', 'SM2320'] },
    { id: 'selected', title: 'Selected', description: 'Curated', count: 1, items: ['SM2263XT'] },
    { id: 'empty', title: 'Empty', count: 0, items: [] }
  ] } },
  decoders: {
    partNumber: Array.from({ length: 45 }, (_, i) => ({ id: `vendor.test.${i}`, priority: i })),
    identifier: [{ id: 'flashid.test.v1', idScheme: 'nand.flash_id', priority: 0 }]
  }
});

test('group browsing preserves upstream metadata, order and query defaults without modifying the response', t => {
  const input = sample();
  const original = structuredClone(input);
  const { inventory: view } = setup(t, input);
  assert.equal(view.controllerGroup.value, 'all');
  assert.deepEqual(view.groups.value.map(group => group.id), ['all', 'selected', 'empty']);
  view.controllerGroup.value = 'selected';
  assert.equal(view.selectedGroup.value.description, 'Curated');
  assert.deepEqual(view.filteredControllers.value, ['SM2263XT']);
  view.controllerQuery.value = ' sm2263xt ';
  assert.deepEqual(view.controllers.pagedItems.value, ['SM2263XT']);
  view.controllerQuery.value = 'unknown';
  assert.deepEqual(view.filteredControllers.value, []);
  view.controllerQuery.value = null;
  assert.deepEqual(view.filteredControllers.value, ['SM2263XT']);
  view.controllerGroup.value = 'empty';
  assert.deepEqual(view.controllerItems.value, []);
  assert.deepEqual(input, original);
});

test('decoder search and category changes reset pagination and retain IDs, zero priority and schemes', t => {
  const { inventory: view } = setup(t, sample());
  view.decoders.page.value = 3;
  assert.equal(view.decoders.pagedItems.value[0].id, 'vendor.test.40');
  view.decoderQuery.value = 'VENDOR.TEST.44';
  assert.equal(view.decoders.page.value, 1);
  assert.deepEqual(view.decoders.pagedItems.value.map(item => item.id), ['vendor.test.44']);
  view.decoderQuery.value = '';
  view.decoders.page.value = 2;
  view.decoderKind.value = 'identifier';
  assert.equal(view.decoders.page.value, 1);
  assert.deepEqual(view.decoders.pagedItems.value, [{ id: 'flashid.test.v1', idScheme: 'nand.flash_id', priority: 0 }]);
  view.decoderQuery.value = 'NAND.FLASH_ID';
  assert.equal(view.filteredDecoders.value.length, 1);
  assert.equal(view.controllerQuery.value, '');
});

test('flat or partially grouped inventory keeps every distinct model and handles a replaced/empty response', t => {
  const { data, inventory: view } = setup(t, {
    inventory: { controllers: { items: ['A', 'A', 'B'], groups: [{ id: 'custom', items: ['A', 'C'] }] } }
  });
  assert.deepEqual(view.controllerItems.value, ['A', 'B', 'C']);
  view.controllerGroup.value = 'custom';
  assert.deepEqual(view.controllerItems.value, ['A', 'C']);
  view.controllerQuery.value = 'C';
  data.value = { inventory: { controllers: { items: Array.from({ length: 49 }, (_, i) => `SM${i}`) } } };
  assert.equal(view.controllerGroup.value, null);
  assert.equal(view.controllerQuery.value, '');
  view.controllers.page.value = 3;
  assert.deepEqual(view.controllers.pagedItems.value, ['SM48']);
  view.controllerQuery.value = 'sm1';
  assert.equal(view.controllers.page.value, 1);
  assert.equal(view.filteredControllers.value.length, 11);
  data.value = {};
  assert.deepEqual(view.controllers.pagedItems.value, []);
  assert.deepEqual(view.decoders.pagedItems.value, []);
  assert.equal(view.controllers.pageCount.value, 1);
});
