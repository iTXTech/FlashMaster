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
    request.reject(error);
    workerRequests.delete(id);
  }
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
  workerRequests.delete(id);
  if (error) {
    request.reject(workerOperationError(error));
    return;
  }
  request.resolve(result);
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

function requestWorker(type, payload = {}) {
  const target = getWorker();
  if (!target) return null;
  const id = ++workerRequestId;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      disableWorker(workerTransportError('Embedded fdnext worker request timed out.'));
    }, WORKER_REQUEST_TIMEOUT_MS);
    workerRequests.set(id, { resolve, reject, timeout });
    try {
      target.postMessage({ id, type, payload });
    } catch (err) {
      disableWorker(workerTransportError(err?.message || 'Embedded fdnext worker transport failed.', err));
    }
  });
}

function runMainThreadFallback(fallback) {
  // Full/nano single-file builds deliberately omit the duplicate main-thread engine.
  // Keep the first worker failure visible instead of replacing it with a stub error.
  if (!MAIN_THREAD_FALLBACK_AVAILABLE) throw workerFailure;
  return fallback();
}

async function runEmbeddedOperation(type, payload, fallback) {
  const workerResult = requestWorker(type, payload);
  if (!workerResult) return runMainThreadFallback(fallback);
  try {
    return await workerResult;
  } catch (err) {
    if (err?.workerTransportError) {
      return runMainThreadFallback(fallback);
    }
    throw err;
  }
}

export const warmEmbeddedParser = () => runEmbeddedOperation('warm', {}, async () => {
  return runMainEngineOperation('warmMainEmbeddedParser');
});

export const getEmbeddedInfo = () => {
  const payload = { lang: currentLang() };
  return runEmbeddedOperation('info', payload, () => runMainEngineOperation('getMainEmbeddedInfo', payload));
};

export const decodeEmbeddedPartNumber = pn => {
  const payload = {
    query: pn,
    lang: currentLang(),
    controllerGroup: currentControllerGroup()
  };
  return runEmbeddedOperation('decodePart', payload, () => runMainEngineOperation('decodeMainEmbeddedPartNumber', payload));
};

export const searchEmbeddedPartNumber = (pn, limit = 0) => {
  const payload = {
    query: pn,
    lang: currentLang(),
    limit: limitValue(limit)
  };
  return runEmbeddedOperation('searchParts', payload, () => runMainEngineOperation('searchMainEmbeddedPartNumber', payload));
};

export const decodeEmbeddedFlashId = id => {
  const payload = {
    query: id,
    lang: currentLang(),
    idScheme: 'nand.flash_id',
    controllerGroup: currentControllerGroup()
  };
  return runEmbeddedOperation('decodeIdentifier', payload, () => runMainEngineOperation('decodeMainEmbeddedFlashId', payload));
};

export const searchEmbeddedFlashId = (id, limit = 0) => {
  const payload = {
    query: id,
    lang: currentLang(),
    idScheme: 'nand.flash_id',
    limit: limitValue(limit)
  };
  return runEmbeddedOperation('searchIdentifiers', payload, () => runMainEngineOperation('searchMainEmbeddedFlashId', payload));
};
