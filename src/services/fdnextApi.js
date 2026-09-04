import { createFdnextWorker } from '@/services/fdnextWorkerFactory';
import store from '@/store';

const WORKER_REQUEST_TIMEOUT_MS = 30000;
const MAIN_THREAD_FALLBACK_AVAILABLE = typeof __FLASHMASTER_MAIN_THREAD_FALLBACK__ === 'undefined'
  || __FLASHMASTER_MAIN_THREAD_FALLBACK__;

let mainEngineApiPromise;
let worker;
let workerDisabled = false;
let workerFailure;
let workerRequestId = 0;
const workerRequests = new Map();
let activeWorkerRequestId;

async function getMainEngineApi() {
  if (!mainEngineApiPromise) {
    mainEngineApiPromise = import('@/services/fdnextMainEngine');
  }
  return mainEngineApiPromise;
}

async function runMainEngineOperation(operation, payload) {
  const api = await getMainEngineApi();
  return api[operation](payload);
}

function abortError(signal) {
  return signal?.reason || Object.assign(new Error('Request aborted.'), { name: 'AbortError' });
}

function currentLang() {
  return store.getLang();
}

function currentControllerGroup() {
  return store.getControllerGroupParam();
}

function limitValue(limit) {
  const value = Number(limit);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function workerTransportError(message, cause) {
  const err = new Error(message, { cause });
  err.workerTransportError = true;
  return err;
}

function workerOperationError(error) {
  const err = new Error(error?.message || 'Embedded fdnext worker operation failed.');
  err.workerOperationError = true;
  return err;
}

function rejectWorkerRequests(error) {
  for (const [id, request] of workerRequests.entries()) {
    clearTimeout(request.timeout);
    request.cleanup();
    request.reject(error);
    workerRequests.delete(id);
  }
  activeWorkerRequestId = undefined;
}

function disableWorker(error) {
  if (workerDisabled) return;
  workerDisabled = true;
  workerFailure = error;
  rejectWorkerRequests(error);
  worker?.terminate?.();
  worker = null;
  // Log once per session, without request payloads or query values.
  console.warn('[FlashMaster] Embedded fdnext worker disabled.', error);
}

function handleWorkerMessage(event) {
  const { id, result, error } = event.data || {};
  const request = workerRequests.get(id);
  if (!request) return;
  clearTimeout(request.timeout);
  request.cleanup();
  workerRequests.delete(id);
  activeWorkerRequestId = undefined;
  if (error) {
    request.reject(workerOperationError(error));
  } else {
    request.resolve(result);
  }
  dispatchNextWorkerRequest();
}

function handleWorkerFailure(event) {
  const error = workerTransportError(
    event?.message || event?.error?.message
      || 'Embedded fdnext worker failed to load or execute (browser provided no error details).',
    event?.error
  );
  if (event?.filename) {
    error.filename = event.filename;
    error.lineno = event.lineno;
    error.colno = event.colno;
  }
  disableWorker(error);
}

function handleWorkerMessageError() {
  disableWorker(workerTransportError('Embedded fdnext worker response could not be deserialized.'));
}

function getWorker() {
  if (workerDisabled) return null;
  if (typeof Worker === 'undefined') {
    disableWorker(workerTransportError('Web Workers are not supported or are disabled in this browser.'));
    return null;
  }
  if (worker) return worker;
  try {
    worker = createFdnextWorker();
    worker.addEventListener('message', handleWorkerMessage);
    worker.addEventListener('error', handleWorkerFailure);
    worker.addEventListener('messageerror', handleWorkerMessageError);
    return worker;
  } catch (err) {
    disableWorker(workerTransportError(err?.message || 'Embedded fdnext worker is unavailable.', err));
    return null;
  }
}

function dispatchNextWorkerRequest() {
  if (activeWorkerRequestId !== undefined || workerDisabled) return;
  const pending = [...workerRequests.entries()];
  // User actions take precedence over suggestions that have not started yet.
  const next = pending.find(([, request]) => !request.automatic) || pending[0];
  if (!next) return;
  const [id, request] = next;
  activeWorkerRequestId = id;
  request.timeout = setTimeout(() => {
    disableWorker(workerTransportError('Embedded fdnext worker request timed out.'));
  }, WORKER_REQUEST_TIMEOUT_MS);
  try {
    worker.postMessage({ id, type: request.type, payload: request.payload });
  } catch (err) {
    disableWorker(workerTransportError(err?.message || 'Embedded fdnext worker transport failed.', err));
  }
}

function requestWorker(type, payload = {}, { signal, automatic = false } = {}) {
  if (signal?.aborted) return Promise.reject(abortError(signal));
  const target = getWorker();
  if (!target) return null;
  const id = ++workerRequestId;
  return new Promise((resolve, reject) => {
    const cleanup = () => signal?.removeEventListener('abort', abort);
    const abort = () => {
      cleanup();
      reject(abortError(signal));
      // Synchronous work already running inside the worker cannot be stopped.
      // Keep its transport slot until the reply, but discard queued stale work.
      if (activeWorkerRequestId !== id) workerRequests.delete(id);
    };
    workerRequests.set(id, { type, payload, automatic, resolve, reject, cleanup });
    signal?.addEventListener('abort', abort, { once: true });
    dispatchNextWorkerRequest();
  });
}

function runMainThreadFallback(fallback) {
  // Full/nano single-file builds deliberately omit the duplicate main-thread engine.
  // Keep the first worker failure visible instead of replacing it with a stub error.
  if (!MAIN_THREAD_FALLBACK_AVAILABLE) throw workerFailure;
  return fallback();
}

async function runEmbeddedOperation(type, payload, fallback, options = {}) {
  const checkedFallback = async () => {
    if (options.signal?.aborted) throw abortError(options.signal);
    const result = await fallback();
    if (options.signal?.aborted) throw abortError(options.signal);
    return result;
  };
  const workerResult = requestWorker(type, payload, options);
  if (!workerResult) return runMainThreadFallback(checkedFallback);
  try {
    return await workerResult;
  } catch (err) {
    if (err?.workerTransportError) {
      return runMainThreadFallback(checkedFallback);
    }
    throw err;
  }
}

export const warmEmbeddedParser = () => runEmbeddedOperation('warm', {}, async () => {
  return runMainEngineOperation('warmMainEmbeddedParser');
});

export const getEmbeddedInfo = (options = {}) => {
  const payload = { lang: currentLang() };
  return runEmbeddedOperation('info', payload, () => runMainEngineOperation('getMainEmbeddedInfo', payload), options);
};

export const decodeEmbeddedPartNumber = (pn, options = {}) => {
  const payload = {
    query: pn,
    lang: currentLang(),
    controllerGroup: currentControllerGroup()
  };
  return runEmbeddedOperation('decodePart', payload, () => runMainEngineOperation('decodeMainEmbeddedPartNumber', payload), options);
};

export const searchEmbeddedPartNumber = (pn, limit = 0, options = {}) => {
  const payload = {
    query: pn,
    lang: currentLang(),
    limit: limitValue(limit)
  };
  return runEmbeddedOperation('searchParts', payload, () => runMainEngineOperation('searchMainEmbeddedPartNumber', payload), options);
};

export const decodeEmbeddedFlashId = (id, options = {}) => {
  const payload = {
    query: id,
    lang: currentLang(),
    idScheme: 'nand.flash_id',
    controllerGroup: currentControllerGroup()
  };
  return runEmbeddedOperation('decodeIdentifier', payload, () => runMainEngineOperation('decodeMainEmbeddedFlashId', payload), options);
};

export const searchEmbeddedFlashId = (id, limit = 0, options = {}) => {
  const payload = {
    query: id,
    lang: currentLang(),
    idScheme: 'nand.flash_id',
    limit: limitValue(limit)
  };
  return runEmbeddedOperation('searchIdentifiers', payload, () => runMainEngineOperation('searchMainEmbeddedFlashId', payload), options);
};
