// VM modules isolate the real adapter and its imports without rewriting its source.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

const source = await readFile(new URL('../src/services/fdnextApi.js', import.meta.url), 'utf8');
const mainOperations = [
  'warmMainEmbeddedParser', 'getMainEmbeddedInfo',
  'decodeMainEmbeddedPartNumber', 'searchMainEmbeddedPartNumber',
  'decodeMainEmbeddedFlashId', 'searchMainEmbeddedFlashId'
];

async function createHarness({ fallback = false, fault } = {}) {
  const warnings = [];
  const timers = new Map();
  const posts = [];
  const listeners = new Map();
  const mainCalls = [];
  const originalError = new Error('Original worker failure');
  let timerId = 0;
  let constructions = 0;
  let terminations = 0;
  let mainImports = 0;
  const worker = {
    addEventListener: (type, listener) => listeners.set(type, listener),
    terminate: () => { terminations += 1; },
    postMessage: message => {
      if (fault === 'post') throw originalError;
      posts.push(message);
    }
  };
  const context = createContext({
    __FLASHMASTER_MAIN_THREAD_FALLBACK__: fallback,
    Worker: fault === 'unsupported' ? undefined : function Worker() {},
    console: { warn: (...args) => warnings.push(args) },
    setTimeout: (callback, delay) => {
      assert.equal(delay, 30000);
      timers.set(++timerId, callback);
      return timerId;
    },
    clearTimeout: id => timers.delete(id)
  });
  const makeModule = exports => new SyntheticModule(Object.keys(exports), function () {
    for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
  }, { context });
  const mainModule = makeModule(Object.fromEntries(mainOperations.map(operation => [operation, payload => {
    mainCalls.push({ operation, payload });
    return { fromMain: operation };
  }])));
  await mainModule.link(() => {});
  await mainModule.evaluate();
  const dependencies = {
    '@/services/fdnextWorkerFactory': makeModule({
      createFdnextWorker: () => {
        constructions += 1;
        if (fault === 'construct') throw originalError;
        return worker;
      }
    }),
    '@/store': makeModule({
      default: { getLang: () => 'eng', getControllerGroupParam: () => 'all' }
    })
  };
  const module = new SourceTextModule(source, {
    context,
    importModuleDynamically: specifier => {
      assert.equal(specifier, '@/services/fdnextMainEngine');
      mainImports += 1;
      return mainModule;
    }
  });
  await module.link(specifier => {
    assert.ok(dependencies[specifier], `Unexpected import: ${specifier}`);
    return dependencies[specifier];
  });
  await module.evaluate();
  const emit = (type, event = {}) => listeners.get(type)?.(event);
  return {
    api: module.namespace, warnings, timers, posts, mainCalls, originalError, emit,
    counts: () => ({ constructions, terminations, mainImports }),
    fail: () => {
      if (fault === 'error') emit('error', {
        message: originalError.message, error: originalError,
        filename: 'blob:worker', lineno: 2, colno: 3
      });
      if (fault === 'messageerror') emit('messageerror', { data: 'Do not log response payloads' });
      if (fault === 'timeout') [...timers.values()][0]();
    }
  };
}

const failures = [
  ['unsupported', 'Web Workers are not supported or are disabled in this browser.'],
  ['construct', 'Original worker failure'],
  ['error', 'Original worker failure'],
  ['post', 'Original worker failure'],
  ['messageerror', 'Embedded fdnext worker response could not be deserialized.'],
  ['timeout', 'Embedded fdnext worker request timed out.']
];

for (const [fault, message] of failures) {
  test(`single-file ${fault}: retain the first failure, never import the fallback stub`, async () => {
    const h = await createHarness({ fault });
    const pending = h.api.warmEmbeddedParser();
    h.fail();
    let firstError;
    await assert.rejects(pending, error => {
      firstError = error;
      assert.equal(error.message, message);
      assert.equal(error.workerTransportError, true);
      if (['construct', 'error', 'post'].includes(fault)) assert.equal(error.cause, h.originalError);
      if (fault === 'error') {
        assert.equal(error.filename, 'blob:worker');
        assert.equal(error.lineno, 2);
        assert.equal(error.colno, 3);
      }
      return true;
    });
    // Late failure events and subsequent requests must not replace the original cause.
    h.emit('error', { message: 'Late failure' });
    await assert.rejects(h.api.decodeEmbeddedPartNumber('PRIVATE-PN'), error => error === firstError);
    await assert.rejects(h.api.searchEmbeddedFlashId('PRIVATE-ID'), error => error === firstError);
    assert.equal(h.warnings.length, 1);
    assert.equal(h.warnings[0][1], firstError);
    assert.equal(h.timers.size, 0);
    assert.deepEqual(h.mainCalls, []);
    assert.deepEqual(h.counts(), {
      constructions: fault === 'unsupported' ? 0 : 1,
      terminations: ['unsupported', 'construct'].includes(fault) ? 0 : 1,
      mainImports: 0
    });
    assert.doesNotMatch(JSON.stringify(h.warnings), /PRIVATE-PN|PRIVATE-ID|Do not log response payloads/);
  });

  test(`web ${fault}: preserve lazy main-thread fallback and disable worker retries`, async () => {
    const h = await createHarness({ fallback: true, fault });
    const pending = h.api.warmEmbeddedParser();
    h.fail();
    assert.deepEqual(await pending, { fromMain: 'warmMainEmbeddedParser' });
    const before = h.counts();
    assert.deepEqual(await h.api.decodeEmbeddedPartNumber('MT29F2G08ABAEAWP'), {
      fromMain: 'decodeMainEmbeddedPartNumber'
    });
    assert.deepEqual(h.counts(), before);
    assert.equal(h.counts().mainImports, 1);
    assert.equal(h.mainCalls[1].payload.query, 'MT29F2G08ABAEAWP');
    assert.equal(h.mainCalls[1].payload.lang, 'eng');
    assert.equal(h.warnings.length, 1);
    assert.equal(h.timers.size, 0);
  });
}

test('a generic browser error still reports a worker failure, without inventing a cause', async () => {
  const h = await createHarness();
  const pending = h.api.getEmbeddedInfo();
  h.emit('error');
  await assert.rejects(pending, error => {
    assert.match(error.message, /failed to load or execute.*no error details/);
    assert.equal(error.cause, undefined);
    return true;
  });
  assert.equal(h.counts().mainImports, 0);
});

test('one timeout rejects every pending request and clears all timers', async () => {
  const h = await createHarness({ fault: 'timeout' });
  const pending = Promise.allSettled([h.api.getEmbeddedInfo(), h.api.searchEmbeddedPartNumber('MT29')]);
  h.fail();
  const results = await pending;
  assert.ok(results.every(result => result.status === 'rejected'));
  assert.equal(results[0].reason, results[1].reason);
  assert.equal(h.counts().terminations, 1);
  assert.equal(h.timers.size, 0);
  assert.equal(h.warnings.length, 1);
});

for (const fallback of [false, true]) {
  test(`parser operation errors do not disable the worker or trigger fallback (${fallback})`, async () => {
    const h = await createHarness({ fallback });
    const pending = h.api.decodeEmbeddedPartNumber('MT29');
    h.emit('message', { data: { id: h.posts[0].id, error: { message: 'Parser error' } } });
    await assert.rejects(pending, error => error.message === 'Parser error' && error.workerOperationError);
    const next = h.api.getEmbeddedInfo();
    h.emit('message', { data: { id: h.posts[1].id, result: { ready: true } } });
    assert.deepEqual(await next, { ready: true });
    assert.deepEqual(h.counts(), { constructions: 1, terminations: 0, mainImports: 0 });
    assert.equal(h.timers.size, 0);
    assert.equal(h.warnings.length, 0);
  });
}

test('healthy operations reuse one worker and preserve payloads/results', async () => {
  const h = await createHarness();
  const operations = [
    [() => h.api.warmEmbeddedParser(), 'warm'],
    [() => h.api.getEmbeddedInfo(), 'info'],
    [() => h.api.decodeEmbeddedPartNumber('MT29'), 'decodePart'],
    [() => h.api.searchEmbeddedPartNumber('MT29', 5), 'searchParts'],
    [() => h.api.decodeEmbeddedFlashId('2CDA'), 'decodeIdentifier'],
    [() => h.api.searchEmbeddedFlashId('2CDA', 8), 'searchIdentifiers']
  ];
  for (const [operation, type] of operations) {
    const pending = operation();
    const request = h.posts.at(-1);
    assert.equal(request.type, type);
    if (type !== 'warm') assert.equal(request.payload.lang, 'eng');
    if (type === 'searchParts') assert.equal(request.payload.limit, 5);
    if (type === 'searchIdentifiers') assert.equal(request.payload.limit, 8);
    if (type.includes('Identifier')) assert.equal(request.payload.idScheme, 'nand.flash_id');
    const result = { type, ok: true };
    h.emit('message', { data: { id: request.id, result } });
    assert.equal(await pending, result);
  }
  assert.deepEqual(h.counts(), { constructions: 1, terminations: 0, mainImports: 0 });
  assert.equal(h.timers.size, 0);
  assert.equal(h.warnings.length, 0);
});

test('queued stale suggestions are dropped and explicit lookups have priority', async () => {
  const h = await createHarness();
  const busy = h.api.warmEmbeddedParser();
  const obsolete = new AbortController();
  const stale = h.api.searchEmbeddedPartNumber('OLD', 10, { automatic: true, signal: obsolete.signal });
  const latest = h.api.searchEmbeddedPartNumber('NEW', 10, { automatic: true });
  const lookup = h.api.decodeEmbeddedFlashId('2CDA');
  obsolete.abort();
  await assert.rejects(stale, { name: 'AbortError' });
  assert.equal(h.posts.length, 1);
  h.emit('message', { data: { id: h.posts[0].id, result: 'warm' } });
  assert.equal(await busy, 'warm');
  assert.equal(h.posts[1].type, 'decodeIdentifier');
  h.emit('message', { data: { id: h.posts[1].id, result: 'decode' } });
  assert.equal(await lookup, 'decode');
  assert.equal(h.posts[2].payload.query, 'NEW');
  h.emit('message', { data: { id: h.posts[2].id, result: 'suggest' } });
  assert.equal(await latest, 'suggest');
  assert.equal(h.posts.length, 3);
  assert.equal(h.timers.size, 0);
});

test('cancelling running work discards its result without disabling or replacing the engine', async () => {
  const h = await createHarness();
  const controller = new AbortController();
  const stale = h.api.searchEmbeddedPartNumber('OLD', 10, { automatic: true, signal: controller.signal });
  controller.abort();
  await assert.rejects(stale, { name: 'AbortError' });
  const next = h.api.decodeEmbeddedPartNumber('NEW');
  assert.equal(h.posts.length, 1);
  h.emit('message', { data: { id: h.posts[0].id, result: 'stale' } });
  assert.equal(h.posts[1].payload.query, 'NEW');
  h.emit('message', { data: { id: h.posts[1].id, result: 'fresh' } });
  assert.equal(await next, 'fresh');
  assert.deepEqual(h.counts(), { constructions: 1, terminations: 0, mainImports: 0 });
  assert.equal(h.timers.size, 0);
});
