import assert from 'node:assert/strict';
import { test } from 'node:test';
import { effectScope, shallowRef } from 'vue';
import { usePagedItems } from '../src/composables/usePagedItems.js';

test('large responses only project the current page, preserving absolute identity and total', t => {
  const scope = effectScope();
  t.after(() => scope.stop());
  const raw = shallowRef(Array.from({ length: 15527 }, (_, id) => ({ id })));
  const calls = [];
  const project = shallowRef((item, index) => { calls.push(index); return { ...item, key: index }; });
  const paging = scope.run(() => usePagedItems(() => raw.value, 10, () => project.value));
  assert.equal(paging.pageCount.value, 1553);
  assert.equal(paging.pagedItems.value.length, 10);
  assert.deepEqual(calls, Array.from({ length: 10 }, (_, i) => i));
  paging.page.value = 1553;
  assert.deepEqual(paging.pagedItems.value.map(item => item.key), [15520, 15521, 15522, 15523, 15524, 15525, 15526]);
  assert.equal(calls.length, 17);
  // A display/language projection change must not reset the user's page.
  project.value = item => ({ ...item, translated: true });
  assert.equal(paging.pagedItems.value[0].id, 15520);
  assert.equal(paging.page.value, 1553);
  paging.perPage.value = 50;
  assert.equal(paging.page.value, 1);
  assert.equal(paging.pagedItems.value.length, 50);
  raw.value = [];
  assert.equal(paging.pageCount.value, 1);
  assert.deepEqual(paging.pagedItems.value, []);
});
