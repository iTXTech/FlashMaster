import { createEngine } from '@itxtech/fdnext-core';
import {
  compileDecodePack,
  defaultDecodePack
} from '@itxtech/fdnext-decodepack';
import { embeddedResourceBundle } from '../../vendor/fdnext/packages/resources';
import { createExternalLinkPreviewProcessor } from '@/services/fdnextExternalLinkPreview';
import { summaryText } from '@/services/fdnextResultView';
import store from '@/store';

let engine;

function getEngine() {
  if (!engine) {
    const decodePack = compileDecodePack(defaultDecodePack);
    const processors = [
      createExternalLinkPreviewProcessor()
    ].filter(Boolean);
    engine = createEngine({
      resources: embeddedResourceBundle,
      decoders: decodePack.partDecoders,
      identifierDecoders: decodePack.identifierDecoders,
      processors
    });
  }
  return engine;
}

function currentLang() {
  return store.getLang();
}

function limitOption(limit) {
  const value = Number(limit);
  return Number.isFinite(value) && value > 0 ? { limit: value } : {};
}

export const getEmbeddedInfo = () => {
  const capabilities = getEngine().getCapabilities();
  return {
    ...capabilities,
    server: {
      ...capabilities.server,
      name: 'Embedded iTXTech fdnext'
    }
  };
};

export const decodeEmbeddedPartNumber = pn => getEngine().decodePart({
  query: pn,
  lang: currentLang()
});

export const searchEmbeddedPartNumber = (pn, limit = 0) => getEngine().searchParts({
  query: pn,
  lang: currentLang(),
  ...limitOption(limit)
});

export const summarizeEmbeddedPartNumber = pn => summaryText(decodeEmbeddedPartNumber(pn));

export const decodeEmbeddedFlashId = id => getEngine().decodeIdentifier({
  query: id,
  lang: currentLang(),
  idScheme: 'nand.flash_id'
});

export const searchEmbeddedFlashId = (id, limit = 0) => getEngine().searchIdentifiers({
  query: id,
  lang: currentLang(),
  idScheme: 'nand.flash_id',
  ...limitOption(limit)
});

export const summarizeEmbeddedFlashId = id => summaryText(decodeEmbeddedFlashId(id));
