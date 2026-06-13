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

export function warmMainEmbeddedParser() {
  getEngine();
  return { warmed: true };
}

export function getMainEmbeddedInfo(payload = {}) {
  const capabilities = getEngine().getCapabilities({ lang: payload.lang });
  return {
    ...capabilities,
    server: {
      ...capabilities.server,
      name: 'Embedded iTXTech fdnext'
    }
  };
}

export function decodeMainEmbeddedPartNumber(payload) {
  return getEngine().decodePart(payload);
}

export function searchMainEmbeddedPartNumber(payload) {
  return getEngine().searchParts(payload);
}

export function decodeMainEmbeddedFlashId(payload) {
  return getEngine().decodeIdentifier(payload);
}

export function searchMainEmbeddedFlashId(payload) {
  return getEngine().searchIdentifiers(payload);
}
