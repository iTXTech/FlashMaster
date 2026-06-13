import { createFdnextWorker } from '@/services/fdnextWorkerFactory';
import store from '@/store';

const WORKER_REQUEST_TIMEOUT_MS = 30000;

let mainEngineApiPromise;
let worker;
let workerDisabled = false;
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

function embeddedWorkerAvailable() {
  return typeof Worker !== 'undefined'
    && !workerDisabled;
}

function workerTransportError(message) {
  const err = new Error(message);
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
  const error = workerTransportError(event?.message || 'Embedded fdnext worker failed.');
  workerDisabled = true;
  rejectWorkerRequests(error);
  worker?.terminate?.();
  worker = null;
}

function getWorker() {
  if (!embeddedWorkerAvailable()) return null;
  if (worker) return worker;
  try {
    worker = createFdnextWorker();
    worker.addEventListener('message', handleWorkerMessage);
    worker.addEventListener('error', handleWorkerFailure);
    return worker;
  } catch (err) {
    workerDisabled = true;
    rejectWorkerRequests(workerTransportError(err?.message || 'Embedded fdnext worker is unavailable.'));
    return null;
  }
}

function requestWorker(type, payload = {}) {
  const target = getWorker();
  if (!target) return null;
  const id = ++workerRequestId;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      workerRequests.delete(id);
      reject(workerTransportError('Embedded fdnext worker request timed out.'));
    }, WORKER_REQUEST_TIMEOUT_MS);
    workerRequests.set(id, { resolve, reject, timeout });
    target.postMessage({ id, type, payload });
  });
}

async function runEmbeddedOperation(type, payload, fallback) {
  const workerResult = requestWorker(type, payload);
  if (!workerResult) return fallback();
  try {
    return await workerResult;
  } catch (err) {
    if (err?.workerTransportError) {
      return fallback();
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
