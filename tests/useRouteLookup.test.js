import assert from 'node:assert/strict';
import { test } from 'node:test';
import { effectScope, nextTick, ref } from 'vue';
import { useRouteLookup } from '../src/composables/useRouteLookup.js';

function setup(t, initialQuery = 'A') {
  const query = ref(initialQuery);
  const locale = ref('chs');
  const draft = ref('');
  const calls = [];
  const scope = effectScope();
  t.after(() => scope.stop());
  const lookup = scope.run(() => useRouteLookup({
    query: () => query.value,
    locale,
    navigate: value => { query.value = value; },
    reset: value => {
      draft.value = value;
      calls.push(['reset', value]);
    },
    run: (value, { recordUsage }) => calls.push(['run', value, recordUsage])
  }));
  return { query, locale, draft, calls, lookup };
}

test('back/forward reload the route even when the unsubmitted draft already matches', async t => {
  const h = setup(t);
  h.draft.value = 'B';
  h.lookup.submit(h.draft.value);
  await nextTick();
  h.draft.value = 'A';
  h.query.value = 'A';
  await nextTick();
  h.query.value = 'B';
  await nextTick();

  assert.equal(h.draft.value, 'B');
  assert.deepEqual(h.calls, ['A', 'B', 'A', 'B'].flatMap(query => [
    ['reset', query], ['run', query, true]
  ]));
});

test('submission runs once, same-query retry runs again, and language refresh does not count usage', async t => {
  const h = setup(t);
  h.lookup.submit('B');
  h.locale.value = 'eng';
  await nextTick();
  h.lookup.submit('B');
  await nextTick();
  h.draft.value = 'UNSUBMITTED';
  h.locale.value = 'chs';
  await nextTick();

  assert.equal(h.draft.value, 'B');
  assert.deepEqual(h.calls.filter(([type]) => type === 'run'), [
    ['run', 'A', true], ['run', 'B', true], ['run', 'B', true], ['run', 'B', false]
  ]);
});

test('an empty route resets without querying and language changes preserve its draft', async t => {
  const h = setup(t);
  h.query.value = '';
  await nextTick();
  assert.equal(h.draft.value, '');
  assert.deepEqual(h.calls.at(-1), ['reset', '']);
  h.draft.value = 'UNSUBMITTED';
  h.locale.value = 'eng';
  await nextTick();

  assert.equal(h.draft.value, 'UNSUBMITTED');
  assert.equal(h.calls.length, 3);
});
