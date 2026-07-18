export const DEFAULT_HTTP_REQUEST_TIMEOUT_MS = 15_000;
export const SUGGESTION_REQUEST_TIMEOUT_MS = 6_000;

export class RequestTimeoutError extends Error {
  constructor(message = 'Request timed out.') {
    super(message);
    this.name = 'RequestTimeoutError';
    this.code = 'REQUEST_TIMEOUT';
  }
}

export function isRequestTimeoutError(error) {
  return error?.code === 'REQUEST_TIMEOUT' || error?.name === 'RequestTimeoutError';
}

export function isRequestAbortError(error) {
  return !isRequestTimeoutError(error) && (
    error?.name === 'AbortError'
    || error?.code === 20
    || String(error?.message || '').toLowerCase().includes('abort')
  );
}

export async function runWithRequestTimeout(task, {
  signal: parentSignal,
  timeoutMs = DEFAULT_HTTP_REQUEST_TIMEOUT_MS,
  timeoutMessage
} = {}) {
  const controller = new AbortController();
  const timeoutError = new RequestTimeoutError(timeoutMessage);
  let timedOut = false;
  let timeout;

  const abortFromParent = () => {
    controller.abort(parentSignal?.reason);
  };

  if (parentSignal?.aborted) {
    abortFromParent();
  } else {
    parentSignal?.addEventListener('abort', abortFromParent, { once: true });
  }

  if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
    timeout = setTimeout(() => {
      timedOut = true;
      controller.abort(timeoutError);
    }, timeoutMs);
  }

  try {
    return await task(controller.signal);
  } catch (error) {
    if (timedOut) {
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    parentSignal?.removeEventListener('abort', abortFromParent);
  }
}
