// Coalesce in-flight automatic reads only. There is no settled-result cache:
// explicit submissions/retries always start their own request.
const inFlight = new Map();

export function automaticRequest(key, task, signal) {
  if (signal?.aborted) return Promise.reject(signal.reason);
  let entry = inFlight.get(key);
  if (!entry) {
    entry = { controller: new AbortController(), subscribers: new Set() };
    inFlight.set(key, entry);
    try {
      entry.promise = Promise.resolve(task(entry.controller.signal));
    } catch (error) {
      entry.promise = Promise.reject(error);
    }
    const forget = () => {
      if (inFlight.get(key) === entry) inFlight.delete(key);
    };
    entry.promise.then(forget, forget);
  }
  return new Promise((resolve, reject) => {
    const subscriber = {};
    entry.subscribers.add(subscriber);
    const cleanup = () => {
      signal?.removeEventListener('abort', abort);
      entry.subscribers.delete(subscriber);
    };
    const abort = () => {
      cleanup();
      reject(signal.reason);
      if (!entry.subscribers.size) {
        if (inFlight.get(key) === entry) inFlight.delete(key);
        entry.controller.abort();
      }
    };
    signal?.addEventListener('abort', abort, { once: true });
    entry.promise.then(value => { cleanup(); resolve(value); }, error => { cleanup(); reject(error); });
  });
}
