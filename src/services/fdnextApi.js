import { createExternalLinkPreviewProcessor } from '@/services/fdnextExternalLinkPreview';
import store from '@/store';

const WORKER_REQUEST_TIMEOUT_MS = 30000;

let engine;
let enginePromise;
let worker;
let workerDisabled = false;
let workerRequestId = 0;
const workerRequests = new Map();

async function getEngine() {
  if (engine) return engine;
  if (!enginePromise) {
    enginePromise = import('@itxtech/fdnext-core').then(({ createEngine }) => {
      if (engine) return engine;
      const processor = createExternalLinkPreviewProcessor();
      engine = createEngine({
        processors: [processor].filter(Boolean)
      });
      return engine;
    });
  }
  return enginePromise;
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

function isSingleFileBuild() {
  return typeof __FLASHMASTER_SINGLEFILE__ !== 'undefined' && Boolean(__FLASHMASTER_SINGLEFILE__);
}

function embeddedWorkerAvailable() {
  return typeof Worker !== 'undefined'
    && !isSingleFileBuild()
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
    worker = new Worker(new URL('./fdnextWorker.js', import.meta.url), {
      name: 'flashmaster-fdnext',
      type: 'module'
    });
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

async function embeddedInfo(payload) {
  const capabilities = (await getEngine()).getCapabilities({ lang: payload.lang });
  return {
    ...capabilities,
    server: {
      ...capabilities.server,
      name: 'Embedded iTXTech fdnext'
    }
  };
}

export const warmEmbeddedParser = () => runEmbeddedOperation('warm', {}, async () => {
  await getEngine();
  return { warmed: true };
});

export const getEmbeddedInfo = () => {
  const payload = { lang: currentLang() };
  return runEmbeddedOperation('info', payload, () => embeddedInfo(payload));
};

export const decodeEmbeddedPartNumber = pn => {
  const payload = {
    query: pn,
    lang: currentLang(),
    controllerGroup: currentControllerGroup()
  };
  return runEmbeddedOperation('decodePart', payload, async () => (await getEngine()).decodePart(payload));
};

export const searchEmbeddedPartNumber = (pn, limit = 0) => {
  const payload = {
    query: pn,
    lang: currentLang(),
    limit: limitValue(limit)
  };
  return runEmbeddedOperation('searchParts', payload, async () => (await getEngine()).searchParts(payload));
};

export const decodeEmbeddedFlashId = id => {
  const payload = {
    query: id,
    lang: currentLang(),
    idScheme: 'nand.flash_id',
    controllerGroup: currentControllerGroup()
  };
  return runEmbeddedOperation('decodeIdentifier', payload, async () => (await getEngine()).decodeIdentifier(payload));
};

export const searchEmbeddedFlashId = (id, limit = 0) => {
  const payload = {
    query: id,
    lang: currentLang(),
    idScheme: 'nand.flash_id',
    limit: limitValue(limit)
  };
  return runEmbeddedOperation('searchIdentifiers', payload, async () => (await getEngine()).searchIdentifiers(payload));
};
