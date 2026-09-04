import assert from 'node:assert/strict';
import { test } from 'node:test';
import { automaticRequest } from '../src/services/automaticRequests.js';

test('identical automatic reads share work, but each subscriber can cancel independently', async () => {
  let complete;
  let calls = 0;
  let transportSignal;
  const task = signal => { calls++; transportSignal = signal; return new Promise(resolve => { complete = resolve; }); };
  const controller = new AbortController();
  const first = automaticRequest('same-query', task, controller.signal);
  const second = automaticRequest('same-query', task);
  controller.abort();
  await assert.rejects(first, { name: 'AbortError' });
  assert.equal(transportSignal.aborted, false);
  complete('result');
  assert.equal(await second, 'result');
  assert.equal(calls, 1);
  assert.equal(await automaticRequest('same-query', () => { calls++; return 'fresh'; }), 'fresh');
  assert.equal(calls, 2);
});

test('last subscriber cancellation aborts transport and permits a fresh same-query request', async () => {
  let transportSignal;
  let finishOld;
  const controller = new AbortController();
  const old = automaticRequest('replace-query', signal => {
    transportSignal = signal;
    return new Promise(resolve => { finishOld = resolve; });
  }, controller.signal);
  controller.abort();
  await assert.rejects(old, { name: 'AbortError' });
  assert.equal(transportSignal.aborted, true);
  assert.equal(await automaticRequest('replace-query', () => 'fresh'), 'fresh');
  finishOld('obsolete');
});

test('failures and pre-aborted subscribers never poison later requests', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(automaticRequest('retry-query', () => { throw new Error('must not run'); }, controller.signal), { name: 'AbortError' });
  await assert.rejects(automaticRequest('retry-query', () => { throw new Error('offline'); }), /offline/);
  assert.equal(await automaticRequest('retry-query', () => 'recovered'), 'recovered');
});
