import { createEngine } from '@itxtech/fdnext-core';
import { createExternalLinkPreviewProcessor } from '@/services/fdnextExternalLinkPreview';

let engine;

function getEngine() {
  if (!engine) {
    const processor = createExternalLinkPreviewProcessor();
    engine = createEngine({
      processors: [processor].filter(Boolean)
    });
  }
  return engine;
}

function embeddedInfo(payload = {}) {
  const capabilities = getEngine().getCapabilities({ lang: payload.lang });
  return {
    ...capabilities,
    server: {
      ...capabilities.server,
      name: 'Embedded iTXTech fdnext'
    }
  };
}

const handlers = {
  warm() {
    getEngine();
    return { warmed: true };
  },
  info(payload) {
    return embeddedInfo(payload);
  },
  decodePart(payload) {
    return getEngine().decodePart(payload);
  },
  searchParts(payload) {
    return getEngine().searchParts(payload);
  },
  decodeIdentifier(payload) {
    return getEngine().decodeIdentifier(payload);
  },
  searchIdentifiers(payload) {
    return getEngine().searchIdentifiers(payload);
  }
};

self.addEventListener('message', event => {
  const { id, type, payload } = event.data || {};
  const handler = handlers[type];
  try {
    if (!handler) {
      throw new Error(`Unsupported embedded fdnext worker operation: ${type}`);
    }
    self.postMessage({ id, result: handler(payload || {}) });
  } catch (err) {
    self.postMessage({
      id,
      error: {
        message: err?.message || String(err)
      }
    });
  }
});
